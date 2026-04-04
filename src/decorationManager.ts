// src/decorationManager.ts
// Manages TextEditorDecorationType lifecycle — one type per color, reused across editors.

import * as vscode from "vscode";
import { Highlight } from "./types";
import { findRangeInDocument } from "./highlightMatcher";

// Cache of decoration types keyed by hex color
const decorationTypeCache = new Map<string, vscode.TextEditorDecorationType>();

/**
 * Get or create a decoration type for a given hex color.
 * Decoration types are expensive — we reuse them.
 */
export function getOrCreateDecorationType(
  color: string
): vscode.TextEditorDecorationType {
  const cached = decorationTypeCache.get(color);
  if (cached) { return cached; }

  // Parse color to create semi-transparent background + ruler marker
  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: hexToRgba(color, 0.28),
    border: `1px solid ${hexToRgba(color, 0.7)}`,
    borderRadius: "2px",
    overviewRulerColor: color,
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    // Subtle gutter indicator
    gutterIconPath: undefined,
    // Light theme gets a slightly darker tint
    light: {
      backgroundColor: hexToRgba(color, 0.22),
      border: `1px solid ${hexToRgba(color, 0.6)}`,
    },
    dark: {
      backgroundColor: hexToRgba(color, 0.30),
      border: `1px solid ${hexToRgba(color, 0.8)}`,
    },
  });

  decorationTypeCache.set(color, decorationType);
  return decorationType;
}

/**
 * Apply highlights for a given editor.
 * Groups highlights by color for efficient setDecorations calls.
 */
export function applyHighlightsToEditor(
  editor: vscode.TextEditor,
  highlights: Highlight[],
  fuzzyThreshold: number = 0.75
): void {
  // Clear all existing decorations first
  for (const [, decType] of decorationTypeCache) {
    editor.setDecorations(decType, []);
  }

  if (highlights.length === 0) { return; }

  // Group by color
  const byColor = new Map<string, vscode.DecorationOptions[]>();

  for (const h of highlights) {
    const range = findRangeInDocument(
      editor.document,
      h.codeSnippet,
      h.codeHash,
      fuzzyThreshold
    );
    if (!range) { continue; }

    if (!byColor.has(h.color)) {
      byColor.set(h.color, []);
    }

    const hoverMsg = new vscode.MarkdownString(
      `**Code Mark** — \`${h.tag || "No tag"}\`\n\n` +
      `*${new Date(h.createdAt).toLocaleDateString()}*`
    );
    hoverMsg.isTrusted = true;

    byColor.get(h.color)!.push({
      range,
      hoverMessage: hoverMsg,
    });
  }

  // Apply decorations per color group
  for (const [color, decorations] of byColor) {
    const decType = getOrCreateDecorationType(color);
    editor.setDecorations(decType, decorations);
  }
}

/**
 * Clear all Code Mark decorations from an editor.
 */
export function clearAllDecorations(editor: vscode.TextEditor): void {
  for (const [, decType] of decorationTypeCache) {
    editor.setDecorations(decType, []);
  }
}

/**
 * Dispose all decoration types. Call on extension deactivate.
 */
export function disposeAllDecorations(): void {
  for (const [, decType] of decorationTypeCache) {
    decType.dispose();
  }
  decorationTypeCache.clear();
}

/**
 * Find which highlight the cursor is currently inside (if any).
 * Returns the highlight ID or undefined.
 */
export function findHighlightAtCursor(
  editor: vscode.TextEditor,
  highlights: Highlight[],
  fuzzyThreshold: number = 0.75
): Highlight | undefined {
  const cursorPos = editor.selection.active;

  for (const h of highlights) {
    const range = findRangeInDocument(
      editor.document,
      h.codeSnippet,
      h.codeHash,
      fuzzyThreshold
    );
    if (range && range.contains(cursorPos)) {
      return h;
    }
  }
  return undefined;
}

// --- Utility ---

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
