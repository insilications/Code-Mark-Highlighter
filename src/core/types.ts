import type * as vscode from "vscode";

import type { jumpToHighlight } from "../extension/highlightNavigator";

/**
 * Runtime representation of one bookmark/highlight.
 *
 * Notice that filePath deliberately does not live here. The containing FileHighlights Map already
 * establishes which file owns the highlight.
 *
 * Keeping filePath out of every Highlight:
 *
 * - Avoids having two sources of truth;
 * - Avoids repeating the same filepath for every highlight in a file;
 * - Makes moving an entire file's highlights cheaper and less error-prone.
 */
export interface Highlight {
  /** Unique identifier (UUID v4). */
  id: string;

  /** The exact text that was highlighted. */
  codeSnippet: string;

  /**
   * A representation of codeSnippet suitable for display in the UI.
   *
   * This can be escaped/dedented independently of the exact source text kept in codeSnippet.
   */
  codeSnippetDisplay: string;

  /**
   * SHA-256 hash of codeSnippet.
   *
   * This is intended as a fast rejection/indexing mechanism. If semantic correctness requires
   * proving that two snippets are identical, compare codeSnippet as well after the hashes match.
   */
  codeHash: string;

  /** User-assigned tag, e.g. "TODO", "Bug", "Important". */
  tag: string;

  /** Hex color string, e.g. "#FFD700". */
  color: string;

  /** ISO 8601 timestamp. */
  createdAt: string;

  /** ISO 8601 timestamp. */
  updatedAt: string;

  /**
   * Current source location of the highlight.
   *
   * This may change after edits or fuzzy relocation.
   */
  range: vscode.Range;
}

/**
 * Runtime index.
 *
 * Key: Canonical file identifier/path used by the extension.
 *
 * Value: All highlights belonging to that file, always sorted by source range.
 *
 * The HighlightRepository below owns the invariants around this Map. Avoid mutating the Map or its
 * arrays from arbitrary locations in the extension.
 */
export type FileHighlights = Map<string, Highlight[]>;

/**
 * JSON-compatible representation of vscode.Position.
 *
 * Vscode.Position is a class, so the persistence layer deliberately converts it to plain data
 * rather than depending on implementation details of class serialization.
 */
export interface PositionSerialized {
  line: number;
  character: number;
}

/**
 * Compact representation of a range:
 *
 * [start, end]
 *
 * A tuple is sufficient because the meaning and ordering of both positions is fixed.
 */
export type RangeSerialized = [PositionSerialized, PositionSerialized];

/**
 * Persistence representation of Highlight.
 *
 * All regular Highlight properties are already JSON-compatible except vscode.Range, which is
 * replaced with RangeSerialized.
 */
export interface HighlightSerialized extends Omit<Highlight, "range"> {
  range: RangeSerialized;
}

/**
 * JSON-compatible representation of FileHighlights.
 *
 * Map is preferable at runtime, while Record is preferable at the persistence boundary because JSON
 * has no native Map representation.
 */
export type FileHighlightsSerialized = Record<string, HighlightSerialized[]>;

/**
 * Root persistence model written to `.vscode/codemark.json` and/or workspaceState.
 *
 * Version exists specifically so future releases can migrate older data instead of having to infer
 * its schema.
 */
export interface HighlightStore {
  version: number;
  fileHighlights: FileHighlightsSerialized;
}

/**
 * A deliberately smaller representation for the webview.
 *
 * The webview does not automatically need every internal property of a Highlight. In particular,
 * transmitting codeSnippet and codeHash on every refresh would be wasted serialization and IPC work
 * if the UI never uses them.
 *
 * Add fields here only when the webview actually needs them.
 */
export interface HighlightViewModel {
  id: string;
  codeSnippet: string;
  codeSnippetDisplay: string;
  // Normalized lowercase version of `codeSnippetDisplay` for searching/filtering.
  codeSnippetDisplaySearch: string;
  codeHash: string;
  tag: string;
  // Normalized lowercase version of `tag` for searching/filtering.
  tagSearch: string;
  color: string;
  /**
   * Useful if the webview displays source location information.
   *
   * Lines/characters remain zero-based here. Convert to one-based values only at the presentation
   * point if the UI displays human-facing line numbers.
   */
  range: RangeSerialized;
}

/**
 * One file as seen by the webview.
 *
 * Instances of this interface are emitted in filepath-sorted order. Highlights are already
 * source-range-sorted because that is an invariant of the runtime repository.
 */
export interface FileHighlightsViewModel {
  filePath: string;
  // Normalized lowercase version of `filePath` for searching/filtering.
  filePathSearch: string;
  highlights: HighlightViewModel[];
}

export interface ColorOption {
  label: string;
  emoji: string;
  hex: string;
}

type JumpParamsTuple = Parameters<typeof jumpToHighlight>;

export interface IJumpToHighlightParams {
  filePath: JumpParamsTuple[0];
  codeSnippet: JumpParamsTuple[1];
  codeHash: JumpParamsTuple[2];
  fuzzyThreshold: JumpParamsTuple[3];
  jumpInSplitEditor: JumpParamsTuple[4];
}
