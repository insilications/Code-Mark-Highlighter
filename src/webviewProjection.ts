import { serializeRange } from "./core/serialization";
import type { Highlight, HighlightViewModel } from "./core/types";
import { compareStringsOrdinal } from "./highlightUtils";

/**
 * One Intl.Collator instance is shared for the lifetime of the module.
 *
 * Creating a collator is relatively expensive; invoking an existing one is much cheaper.
 *
 * Numeric=true gives users the natural ordering:
 *
 * File2.ts file10.ts
 *
 * Instead of:
 *
 * File10.ts file2.ts
 *
 * This comparator is presentation-only. It must never be used to determine whether two file keys
 * refer to the same file.
 */
const FILE_PATH_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

/**
 * Human-friendly filepath ordering for the webview.
 *
 * Sensitivity="base" means the collator can consider differently-cased paths equal for sorting
 * purposes. That is fine for presentation, but we add an exact ordinal tie-breaker so distinct
 * paths always have a deterministic relative order.
 *
 * The Map itself continues to use exact JavaScript string identity.
 */
export function compareFilePathsForDisplay(a: string, b: string): number {
  const displayOrder: number = FILE_PATH_COLLATOR.compare(a, b);

  return displayOrder === 0 ? compareStringsOrdinal(a, b) : displayOrder;
}

/**
 * Populates the `highlights` property of a file's webview model (`FileHighlightsViewModel`).
 *
 * Converts only the fields currently useful to the webview.
 *
 * Persistence Model !== Presentation Model
 *
 * If the webview later needs updatedAt, for example, add it here rather than automatically
 * transmitting every runtime/storage field forever.
 */
export function createHighlightViewModels(highlights: readonly Highlight[]): HighlightViewModel[] {
  const result = new Array<HighlightViewModel>(highlights.length);

  for (let i: number = 0; i < highlights.length; i++) {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    const highlight: Highlight = highlights[i]!;
    const codeSnippetDisplay: string = highlight.codeSnippetDisplay;
    const tag: string = highlight.tag;
    result[i] = {
      id: highlight.id,
      codeSnippet: highlight.codeSnippet,
      codeSnippetDisplay,
      codeSnippetDisplaySearch: codeSnippetDisplay.toLowerCase(),
      codeHash: highlight.codeHash,
      tag,
      tagSearch: tag.toLowerCase(),
      color: highlight.color,
      range: serializeRange(highlight.range),
    };
  }

  return result;
}
