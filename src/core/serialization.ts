import * as vscode from "vscode";

import { sortHighlightsByRange } from "../highlightUtils";
import { HIGHLIGHT_STORE_VERSION } from "./constants";
import type {
  FileHighlights,
  FileHighlightsSerialized,
  Highlight,
  HighlightSerialized,
  HighlightStore,
  RangeSerialized,
} from "./types";

/** Converts vscode.Range into plain JSON-compatible data. */
export function serializeRange(range: vscode.Range): RangeSerialized {
  return [
    {
      line: range.start.line,
      character: range.start.character,
    },
    {
      line: range.end.line,
      character: range.end.character,
    },
  ];
}

/** Restores a real vscode.Range from its persisted representation. */
export function deserializeRange(serialized: RangeSerialized): vscode.Range {
  const [start, end] = serialized;

  return new vscode.Range(start.line, start.character, end.line, end.character);
}

/**
 * Converts one runtime Highlight to its persistence representation.
 *
 * Properties are copied explicitly rather than using:
 *
 * ```
 * { ...highlight, range: ... }
 * ```
 *
 * That is intentional. The persistence schema should be explicit and should not accidentally start
 * storing a future runtime-only property merely because somebody added it to Highlight.
 */
export function serializeHighlight(highlight: Highlight): HighlightSerialized {
  return {
    id: highlight.id,
    codeSnippet: highlight.codeSnippet,
    codeSnippetDisplay: highlight.codeSnippetDisplay,
    codeHash: highlight.codeHash,
    tag: highlight.tag,
    color: highlight.color,
    createdAt: highlight.createdAt,
    updatedAt: highlight.updatedAt,
    range: serializeRange(highlight.range),
  };
}

/** Restores one runtime Highlight. */
export function deserializeHighlight(serialized: HighlightSerialized): Highlight {
  return {
    id: serialized.id,
    codeSnippet: serialized.codeSnippet,
    codeSnippetDisplay: serialized.codeSnippetDisplay,
    codeHash: serialized.codeHash,
    tag: serialized.tag,
    color: serialized.color,
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt,
    range: deserializeRange(serialized.range),
  };
}

/**
 * Serializes an array without using Array.prototype.map().
 *
 * Preallocating the exact result length avoids dynamic array growth and keeps this path friendly to
 * frequent persistence/webview operations.
 */
export function serializeHighlights(highlights: readonly Highlight[]): HighlightSerialized[] {
  const result = new Array<HighlightSerialized>(highlights.length);

  for (let i = 0; i < highlights.length; i++) {
    result[i] = serializeHighlight(highlights[i]!);
  }

  return result;
}

/**
 * Deserializes one file's highlight array and re-establishes the source-order invariant.
 *
 * Sorting at the persistence boundary is useful defensive behavior:
 *
 * - Older versions may not have persisted sorted arrays;
 * - Hand-edited `.vscode/codemark.json` files may be out of order;
 * - Future migrations might reconstruct highlights in a different order.
 *
 * This cost is paid when data is loaded, not during the editor hot path.
 */
export function deserializeHighlights(serialized: readonly HighlightSerialized[]): Highlight[] {
  const result = new Array<Highlight>(serialized.length);

  for (let i = 0; i < serialized.length; i++) {
    result[i] = deserializeHighlight(serialized[i]!);
  }

  sortHighlightsByRange(result);

  return result;
}

/**
 * Converts the runtime Map to the JSON-compatible Record representation.
 *
 * Object.create(null) is used deliberately. Filepaths are arbitrary strings and therefore should
 * not interact with Object.prototype keys such as "**proto**" or "constructor".
 *
 * JSON.stringify() handles null-prototype objects normally.
 *
 * Empty file buckets are intentionally omitted because the repository's invariant is that a file
 * exists only while it owns at least one highlight.
 */
export function serializeFileHighlights(
  fileHighlights: ReadonlyMap<string, readonly Highlight[]>,
): FileHighlightsSerialized {
  const result = Object.create(null) as FileHighlightsSerialized;

  for (const [filePath, highlights] of fileHighlights) {
    if (highlights.length !== 0) {
      result[filePath] = serializeHighlights(highlights);
    }
  }

  return result;
}

/**
 * Restores the runtime Map.
 *
 * Object.keys() enumerates only own properties, which is exactly what we want for persisted file
 * keys.
 *
 * Empty arrays are ignored so that loading automatically restores the repository invariant that
 * every Map entry represents an actual highlighted file.
 */
export function deserializeFileHighlights(serialized: FileHighlightsSerialized): FileHighlights {
  const result: FileHighlights = new Map();

  const filePaths = Object.keys(serialized);

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i]!;
    const serializedHighlights = serialized[filePath]!;

    if (serializedHighlights.length === 0) {
      continue;
    }

    result.set(filePath, deserializeHighlights(serializedHighlights));
  }

  return result;
}

/** Creates the complete persistence object. */
export function serializeHighlightStore(
  fileHighlights: ReadonlyMap<string, readonly Highlight[]>,
): HighlightStore {
  return {
    version: HIGHLIGHT_STORE_VERSION,
    fileHighlights: serializeFileHighlights(fileHighlights),
  };
}

/**
 * Restores FileHighlights from the persistence object.
 *
 * For version 1 there is no migration step. Once version 2 exists, this function is the natural
 * place to dispatch to migrations.
 *
 * JSON.parse() and workspaceState are runtime data boundaries: TypeScript types alone cannot prove
 * their contents are valid. A production loader can perform schema validation before calling this
 * function if the file is user-editable or untrusted.
 */
export function deserializeHighlightStore(store: HighlightStore): FileHighlights {
  if (store.version !== HIGHLIGHT_STORE_VERSION) {
    throw new Error(`Unsupported highlight store version: ${store.version}`);
  }

  return deserializeFileHighlights(store.fileHighlights);
}
