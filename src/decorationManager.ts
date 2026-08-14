import * as vscode from "vscode";

import { hexToRgba } from "./core/utils";
import { type Highlight } from "./types";

// Cache of decoration types keyed by hex color
const decorationTypeCache = new Map<string, vscode.TextEditorDecorationType>();

/**
 * Get or create a decoration type for a given hex color. Decoration types are expensive — we reuse
 * them.
 */
export function getOrCreateDecorationType(color: string): vscode.TextEditorDecorationType {
  const cached: vscode.TextEditorDecorationType | undefined = decorationTypeCache.get(color);
  if (cached) {
    return cached;
  }

  // Parse color to create semi-transparent background + ruler marker
  const decorationType: vscode.TextEditorDecorationType =
    vscode.window.createTextEditorDecorationType({
      borderWidth: "0 0 0 4px",
      borderStyle: "solid",
      borderColor: hexToRgba(color, 1.0),
      isWholeLine: true,
    });

  decorationTypeCache.set(color, decorationType);
  return decorationType;
}

/**
 * Apply highlights for a given editor. Groups highlights by color for efficient setDecorations
 * calls.
 */
export function applyHighlightsToEditor(
  editor: vscode.TextEditor,
  highlights: readonly Highlight[],
  // fuzzyThreshold: number = 0.75,
): void {
  // Clear all existing decorations first
  for (const [, decType] of decorationTypeCache) {
    editor.setDecorations(decType, []);
  }

  // Group by color
  const byColor = new Map<string, vscode.DecorationOptions[]>();

  for (const h of highlights) {
    // const range = findRangeInDocument(editor.document, h.codeSnippet, h.codeHash, fuzzyThreshold);
    // if (!range) {
    //   continue;
    // }

    if (!byColor.has(h.color)) {
      byColor.set(h.color, []);
    }

    // oxlint-disable-next-line typescript/no-non-null-assertion
    byColor.get(h.color)!.push({
      range: h.range,
    });
  }

  // Apply decorations per color group
  for (const [color, decorations] of byColor) {
    const decType = getOrCreateDecorationType(color);
    editor.setDecorations(decType, decorations);
  }
}

/** Clear all Code Mark decorations from an editor. */
export function clearAllDecorations(editor: vscode.TextEditor): void {
  for (const [, decType] of decorationTypeCache) {
    editor.setDecorations(decType, []);
  }
}

/** Dispose all decoration types. Call on extension deactivate. */
export function disposeAllDecorations(): void {
  for (const [, decType] of decorationTypeCache) {
    decType.dispose();
  }
  decorationTypeCache.clear();
}
