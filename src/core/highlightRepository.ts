import type * as vscode from "vscode";

import { saveHighlights } from "@/extension/storage";

import {
  insertHighlightSorted,
  rangesEqual,
  repairHighlightRanges,
  sortHighlightsByRange,
} from "./highlightUtils";
import { deserializeHighlightStore, serializeHighlightStore } from "./serialization";
import type { FileHighlights, FileHighlightsViewModel, Highlight, HighlightStore } from "./types";
import { compareFilePathsForDisplay, createHighlightViewModels } from "./webviewProjection";

/**
 * Owns the mutable runtime highlight state and, more importantly, its invariants.
 *
 * The underlying representation remains deliberately uncomplicated:
 *
 * ```
 * Map<string, Highlight[]>;
 * ```
 *
 * The repository adds behavior without replacing that efficient representation with a more
 * elaborate tree/index structure.
 *
 * Important invariants:
 *
 * 1. Every Map key owns at least one Highlight.
 * 2. Every Highlight[] is sorted by compareHighlightsByRange().
 * 3. SortedFilePathsCache, when present, contains exactly the Map keys in display order.
 *
 * The sorted filepath cache is not a second source of truth. It is disposable derived state and can
 * always be reconstructed from fileHighlights.
 */
export class HighlightRepository {
  /** Authoritative runtime storage. */
  private readonly fileHighlights: FileHighlights;

  /**
   * Lazily-created sorted view of the current file keys.
   *
   * The strings themselves are not copied; this array merely holds references to the same filepath
   * strings already used as Map keys, so its memory cost is small.
   *
   * Undefined means "the cache needs to be rebuilt."
   */
  private sortedFilePathsCache: string[] | undefined;

  /**
   * If an existing FileHighlights instance is supplied, this repository takes ownership of it.
   *
   * That ownership-transfer approach avoids an unnecessary complete Map/array copy during startup
   * after deserializeHighlightStore().
   *
   * Consequently, callers should not continue mutating a supplied Map directly after handing it to
   * this repository.
   */
  public constructor(fileHighlights: FileHighlights = new Map()) {
    this.fileHighlights = fileHighlights;
  }

  /**
   * Convenience constructor for persisted data.
   *
   * DeserializeHighlightStore() already restores all ordering invariants, so no second sorting pass
   * is necessary here.
   */
  public static fromStore(store: HighlightStore): HighlightRepository {
    return new HighlightRepository(deserializeHighlightStore(store));
  }

  /**
   * Number of files that currently contain at least one highlight.
   *
   * Map.size is O(1).
   */
  public get fileCount(): number {
    return this.fileHighlights.size;
  }

  /** Whether the repository contains any highlights for a file. */
  // oxlint-disable-next-line legibility/no-trivial-wrapper-functions
  public hasFile(filePath: string): boolean {
    return this.fileHighlights.has(filePath);
  }

  /**
   * Returns the already-range-sorted highlights for one file.
   *
   * The readonly array type discourages callers from inserting/removing elements directly and
   * bypassing repository invariants.
   *
   * Highlight objects themselves remain mutable because range relocation and metadata editing are
   * legitimate runtime operations.
   */
  // oxlint-disable-next-line legibility/no-trivial-wrapper-functions
  public getHighlights(filePath: string): readonly Highlight[] | undefined {
    return this.fileHighlights.get(filePath);
  }

  /**
   * Adds one Highlight.
   *
   * For existing file:
   * - binary-search insertion point.
   * - splice into its already-sorted array.
   * - filepath cache remains valid.
   * - Returns the resulting array index or the position where the highlight was inserted.
   *
   * New file:
   * - create the bucket.
   * - invalidate the filepath cache because the set of keys changed.
   * - Returns 0 because the new highlight is the first and only entry in its array.
   *
   * No global filepath sorting occurs here.
   */
  public addHighlight(filePath: string, highlight: Highlight): number {
    const highlights: Highlight[] | undefined = this.fileHighlights.get(filePath);

    if (highlights !== undefined) {
      return insertHighlightSorted(highlights, highlight);
    }

    this.fileHighlights.set(filePath, [highlight]);

    this.invalidateSortedFilePaths();

    saveHighlights(this.fileHighlights);
    return 0;
  }

  /**
   * Adds several highlights to one file.
   *
   * For a batch, appending everything and sorting once avoids repeated array shifts from performing
   * many individual sorted insertions.
   *
   * A single-item batch delegates to addHighlight(), where binary insertion is preferable.
   */
  public addHighlights(filePath: string, newHighlights: readonly Highlight[]): void {
    const newHighlightsLength: number = newHighlights.length;

    if (newHighlightsLength === 0) {
      return;
    }

    if (newHighlightsLength === 1) {
      this.addHighlight(filePath, newHighlights[0]!);
      return;
    }

    let highlights: Highlight[] | undefined = this.fileHighlights.get(filePath);

    if (highlights === undefined) {
      highlights = new Array<Highlight>(newHighlightsLength);

      for (let i: number = 0; i < newHighlightsLength; i++) {
        highlights[i] = newHighlights[i]!;
      }

      sortHighlightsByRange(highlights);

      this.fileHighlights.set(filePath, highlights);

      this.invalidateSortedFilePaths();

      return;
    }

    const oldLength = highlights.length;

    highlights.length = oldLength + newHighlightsLength;

    for (let i = 0; i < newHighlightsLength; i++) {
      highlights[oldLength + i] = newHighlights[i]!;
    }

    sortHighlightsByRange(highlights);
  }

  /**
   * Removes one highlight by UUID.
   *
   * There is deliberately no secondary id -> Highlight index yet.
   *
   * A linear scan inside one file is likely cheaper overall for normal bookmark counts than
   * maintaining another data structure on every mutation. If profiling eventually proves otherwise,
   * an id index can be added behind this repository without changing its callers.
   *
   * If the final highlight is removed, the entire file entry disappears and the sorted-filepath
   * cache is invalidated.
   */
  public removeHighlight(filePath: string, highlightId: string): Highlight | undefined {
    const highlights: Highlight[] | undefined = this.fileHighlights.get(filePath);

    if (highlights === undefined) {
      return undefined;
    }

    for (let i: number = 0; i < highlights.length; i++) {
      const highlight: Highlight = highlights[i]!;

      if (highlight.id !== highlightId) {
        continue;
      }

      highlights.splice(i, 1);

      if (highlights.length === 0) {
        this.fileHighlights.delete(filePath);
        this.invalidateSortedFilePaths();
      }

      return highlight;
    }

    return undefined;
  }

  /**
   * Removes all highlights belonging to one file.
   *
   * This is a structural change, so successful deletion invalidates the cached filepath ordering.
   */
  public deleteFile(filePath: string): boolean {
    // oxlint-disable-next-line legibility/no-hidden-side-effects
    const deleted: boolean = this.fileHighlights.delete(filePath);

    if (deleted) {
      this.invalidateSortedFilePaths();
    }

    return deleted;
  }

  /**
   * Replaces all highlights belonging to a file.
   *
   * The incoming array is copied before being stored. Unlike the constructor's explicit
   * ownership-transfer contract, this public mutation method should not leave the repository
   * dependent on an array that another caller may subsequently mutate.
   *
   * The copied array is sorted exactly once.
   */
  public replaceHighlights(filePath: string, newHighlights: readonly Highlight[]): void {
    if (newHighlights.length === 0) {
      this.deleteFile(filePath);
      return;
    }

    const fileAlreadyExists: boolean = this.fileHighlights.has(filePath);

    const highlights = new Array<Highlight>(newHighlights.length);

    for (let i = 0; i < newHighlights.length; i++) {
      highlights[i] = newHighlights[i]!;
    }

    sortHighlightsByRange(highlights);

    this.fileHighlights.set(filePath, highlights);

    /**
     * Replacing the contents of an existing bucket does not alter filepath ordering. Only
     * introducing a new Map key invalidates the cache.
     */
    if (!fileAlreadyExists) {
      this.invalidateSortedFilePaths();
    }
  }

  /**
   * Updates one Highlight range while preserving the sorted-array invariant.
   *
   * This path is appropriate when exactly one highlight has moved.
   *
   * For fuzzy repair of many highlights, repairRangesForFile() is preferable because it performs
   * one final sort instead of repeated remove/reinsert operations.
   */
  public updateHighlightRange(
    filePath: string,
    highlightId: string,
    newRange: vscode.Range,
  ): boolean {
    const highlights: Highlight[] | undefined = this.fileHighlights.get(filePath);

    if (highlights === undefined) {
      return false;
    }

    for (let i: number = 0; i < highlights.length; i++) {
      const highlight: Highlight = highlights[i]!;

      if (highlight.id !== highlightId) {
        continue;
      }

      if (rangesEqual(highlight.range, newRange)) {
        return false;
      }

      /**
       * Remove before changing the range so the array temporarily contains only entries whose
       * ordering invariant is still valid.
       */
      highlights.splice(i, 1);

      highlight.range = newRange;

      insertHighlightSorted(highlights, highlight);

      return true;
    }

    return false;
  }

  /**
   * Runs a fuzzy/range repair pass for a single file.
   *
   * This is an important hot-path property:
   *
   * ```
   * fuzzy relocation does NOT invalidate sortedFilePathsCache.
   * ```
   *
   * The file still exists under the same key. Only ranges inside its local array changed.
   *
   * All changed ranges are committed first and the array is sorted once.
   */
  public repairRangesForFile(
    filePath: string,
    repair: (highlight: Highlight) => vscode.Range | undefined,
  ): number {
    const highlights: Highlight[] | undefined = this.fileHighlights.get(filePath);

    if (highlights === undefined) {
      return 0;
    }

    return repairHighlightRanges(highlights, repair);
  }

  /**
   * Returns file keys in display order.
   *
   * First call after a structural file change:
   *
   * ```
   * O(F log F)
   * ```
   *
   * Every subsequent call while the set of files remains unchanged:
   *
   * ```
   * O(1);
   * ```
   *
   * Where F is the number of files containing highlights.
   *
   * Crucially, editing ranges, repairing fuzzy matches, changing tags/colors, or adding/removing
   * highlights from an existing non-empty file does not invalidate this cache.
   */
  public getSortedFilePaths(): readonly string[] {
    if (this.sortedFilePathsCache === undefined) {
      const filePaths: string[] = Array.from(this.fileHighlights.keys());

      filePaths.sort(compareFilePathsForDisplay);

      this.sortedFilePathsCache = filePaths;
    }

    return this.sortedFilePathsCache;
  }

  /**
   * Builds a webview projection.
   *
   * Filepath sorting is normally absent from this hot path because getSortedFilePaths() reuses its
   * cached result.
   *
   * A fresh result array is still intentionally produced because Highlight contents may have
   * changed since the previous webview update.
   */
  public createWebviewModel(): FileHighlightsViewModel[] {
    const filePaths: readonly string[] = this.getSortedFilePaths();

    const result = new Array<FileHighlightsViewModel>(filePaths.length);

    for (let i: number = 0; i < filePaths.length; i++) {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      const filePath: string = filePaths[i]!;

      /**
       * This non-null assertion follows directly from the cache invariant: cached filepaths are
       * derived from the Map keys and the cache is invalidated whenever a key disappears.
       */

      // oxlint-disable-next-line typescript/no-non-null-assertion
      const highlights: Highlight[] = this.fileHighlights.get(filePath)!;

      result[i] = {
        filePath,
        filePathSearch: filePath.toLowerCase(),
        highlights: createHighlightViewModels(highlights),
      };
    }

    return result;
  }

  /** Produces the model suitable for workspaceState or JSON persistence. */
  public toStore(): HighlightStore {
    return serializeHighlightStore(this.fileHighlights);
  }

  /**
   * Removes all data.
   *
   * Avoid assigning a new Map: retaining the same Map instance keeps ownership and references
   * inside the repository simple.
   */
  public clear(): void {
    if (this.fileHighlights.size === 0) {
      return;
    }

    this.fileHighlights.clear();
    this.invalidateSortedFilePaths();
  }

  /**
   * Marks only the derived filepath ordering as stale.
   *
   * Keeping invalidation in one tiny method makes the important structural invariant easy to audit:
   * every operation that adds/removes a Map key must reach this method.
   */
  private invalidateSortedFilePaths(): void {
    this.sortedFilePathsCache = undefined;
  }
}
