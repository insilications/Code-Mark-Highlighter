import type * as vscode from "vscode";

import type { Highlight } from "./types";

/**
 * Compares two vscode.Range objects in document order.
 *
 * Ordering is:
 *
 * 1. Start line
 * 2. Start character
 * 3. End line
 * 4. End character
 *
 * Comparing the numeric fields directly avoids creating intermediate values and keeps this
 * comparator suitable for Array.prototype.sort().
 */
export function compareRanges(a: vscode.Range, b: vscode.Range): number {
  return (
    a.start.line - b.start.line ||
    a.start.character - b.start.character ||
    a.end.line - b.end.line ||
    a.end.character - b.end.character
  );
}

/**
 * Exact, allocation-free range equality check.
 *
 * We keep this utility local to our model rather than relying on object identity because fuzzy
 * repair replaces a Range with a newly-created Range even when its coordinates could theoretically
 * be identical.
 */
export function rangesEqual(a: vscode.Range, b: vscode.Range): boolean {
  return (
    a.start.line === b.start.line &&
    a.start.character === b.start.character &&
    a.end.line === b.end.line &&
    a.end.character === b.end.character
  );
}

/**
 * Cheap deterministic string comparison using JavaScript's native UTF-16 ordering.
 *
 * This is used only as a final tie-breaker when two highlights occupy exactly the same range.
 */
export function compareStringsOrdinal(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Total ordering for Highlight objects.
 *
 * The source range is the meaningful ordering criterion. id is used only as a deterministic
 * tie-breaker when two highlights have identical ranges.
 *
 * Having a total order is useful for binary insertion: two independently constructed arrays will
 * still end up in the same deterministic order.
 */
export function compareHighlightsByRange(a: Highlight, b: Highlight): number {
  const rangeOrder: number = compareRanges(a.range, b.range);

  return rangeOrder !== 0 ? rangeOrder : compareStringsOrdinal(a.id, b.id);
}

/**
 * Sorts a file's highlight array in-place.
 *
 * In-place sorting is intentional: the repository owns these arrays, so allocating another array
 * would only increase GC pressure.
 *
 * Call this once after a batch operation such as fuzzy relocation. Do not sort after every
 * individual repaired highlight.
 */
export function sortHighlightsByRange(highlights: Highlight[]): void {
  highlights.sort(compareHighlightsByRange);
}

/**
 * Finds where a Highlight should be inserted into an already-sorted array.
 *
 * Binary search makes the search portion O(log n). Array insertion itself is still O(n) because
 * subsequent elements may have to be shifted, but for the compact per-file collections expected
 * here this is generally preferable to a tree:
 *
 * - Arrays have excellent iteration locality;
 * - Decoration generation naturally walks them sequentially;
 * - Serialization naturally walks them sequentially;
 * - The implementation remains small and predictable.
 */
export function findHighlightInsertionIndex(
  highlights: readonly Highlight[],
  highlight: Highlight,
): number {
  let low: number = 0;
  let high: number = highlights.length;

  while (low < high) {
    const middle: number = low + ((high - low) >>> 1);

    // oxlint-disable-next-line typescript/no-non-null-assertion
    if (compareHighlightsByRange(highlights[middle]!, highlight) <= 0) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

/**
 * Inserts one highlight while preserving the range-order invariant.
 *
 * Returns the resulting array index, which can occasionally be useful to the caller for follow-up
 * work.
 */
export function insertHighlightSorted(highlights: Highlight[], highlight: Highlight): number {
  const index: number = findHighlightInsertionIndex(highlights, highlight);

  highlights.splice(index, 0, highlight);

  return index;
}

/**
 * Performs a batch of fuzzy range repairs efficiently.
 *
 * The callback returns:
 *
 * - A new Range if this highlight was successfully relocated;
 * - Null if the highlight should remain unchanged.
 *
 * All modifications happen first. The array is sorted only once afterward, regardless of how many
 * ranges changed.
 *
 * This is substantially preferable to sorting after every fuzzy match.
 *
 * Returns the number of ranges that actually changed.
 */
export function repairHighlightRanges(
  highlights: Highlight[],
  repair: (highlight: Highlight) => vscode.Range | null,
): number {
  let changedCount: number = 0;

  for (let i: number = 0; i < highlights.length; i++) {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    const highlight: Highlight = highlights[i]!;
    const repairedRange: vscode.Range | null = repair(highlight);

    if (repairedRange !== null && !rangesEqual(highlight.range, repairedRange)) {
      highlight.range = repairedRange;
      changedCount++;
    }
  }

  if (changedCount !== 0) {
    sortHighlightsByRange(highlights);
  }

  return changedCount;
}
