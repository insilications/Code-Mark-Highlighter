// src/commands.ts
// Implements all Code Mark commands

import * as vscode from "vscode";
import * as crypto from "crypto";
import litedent from 'litedent';
import { Highlight, PRESET_COLORS, DEFAULT_TAGS } from "./types";
import {
  loadHighlights,
  addHighlight,
  addHighlight2,
  removeHighlight,
  updateHighlight,
  getHighlightsForFile,
  removeHighlightsForFile,
  saveHighlights,
} from "./storage";
import { hashText, updateHighlightRangesInEditor } from "./highlightMatcher";
import { applyHighlightsToEditor, findHighlightAtCursor } from "./decorationManager";
import { SidebarProvider } from "./sidebarProvider";

function getFuzzyThreshold(): number {
  return vscode.workspace
    .getConfiguration("codemark")
    .get<number>("fuzzyMatchThreshold", 0.75);
}

function getWorkspaceRelativePath(uri: vscode.Uri): string {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    const rel = vscode.workspace.asRelativePath(uri, false);
    return rel;
  }
  return uri.fsPath;
}

/** Generate a UUID v4 */
function uuidv4(): string {
  return crypto.randomUUID();
}

/** Prompt user to choose a color from presets or enter custom hex */
async function pickColor(currentColor?: string): Promise<string | undefined> {
  const items = PRESET_COLORS.map((c) => ({
    label: `${c.emoji}  ${c.label}`,
    description: c.hex,
    hex: c.hex,
    picked: c.hex === currentColor,
  }));
  items.push({
    label: "✏️  Custom color…",
    description: "Enter a hex color code",
    hex: "__custom__",
    picked: false,
  });

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Choose a highlight color",
    title: "Code Mark — Pick Color",
  });

  if (!picked) { return undefined; }

  if (picked.hex === "__custom__") {
    const custom = await vscode.window.showInputBox({
      prompt: "Enter a hex color (e.g. #FF6B6B)",
      value: currentColor ?? "#FFD700",
      validateInput: (v) =>
        /^#[0-9A-Fa-f]{6}$/.test(v) ? undefined : "Must be a valid hex color like #FF6B6B",
    });
    return custom;
  }

  return picked.hex;
}

/** Prompt user to choose or enter a tag */
async function pickTag(currentTag?: string): Promise<string | undefined> {
  const items = DEFAULT_TAGS.map((t) => ({
    label: t,
    picked: t === currentTag,
  }));

  const result = await vscode.window.showQuickPick(
    [{ label: currentTag ?? "", picked: true }, ...items, { label: "➕ Custom tag…", picked: false }],
    {
      placeHolder: "Choose a tag (or press Escape to skip)",
      title: "Code Mark — Set Tag",
    }
  );

  if (!result) { return currentTag ?? ""; }
  if (result.label === "➕ Custom tag…") {
    const custom = await vscode.window.showInputBox({
      prompt: "Enter a custom tag",
      value: currentTag ?? "",
    });
    return custom ?? currentTag ?? "";
  }
  return result.label;
}

// ─── Command: Highlight Code ──────────────────────────────────────────────────

export async function highlightCode(
  context: vscode.ExtensionContext,
  sidebar: SidebarProvider
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Code Mark: No active editor.");
    return;
  }

  const selection = editor.selection;
  let snippet = "";
  let targetRange: vscode.Range;

  if (!selection.isEmpty) {
    // Standard behavior: use the user's explicit selection
    targetRange = new vscode.Range(selection.start, selection.end);
    snippet = editor.document.getText(targetRange);
  } else {
    // Fallback behavior: grab current line + up to 3 next lines
    const startLine = selection.active.line;
    const maxLine = Math.min(startLine + 3, editor.document.lineCount - 1);
    let endLine = startLine;

    // Find the furthest non-empty line within our 4-line window
    for (let i = startLine; i <= maxLine; i++) {
      if (!editor.document.lineAt(i).isEmptyOrWhitespace) {
        endLine = i;
      }
    }

    // Create a contiguous range from the start line to the end of the last valid line
    const startPos = new vscode.Position(startLine, 0);
    const endLineLength = editor.document.lineAt(endLine).text.length;
    const endPos = new vscode.Position(endLine, endLineLength);

    targetRange = new vscode.Range(startPos, endPos);
    snippet = editor.document.getText(targetRange);
  }

  // If the extracted snippet is entirely whitespace (e.g., user clicked on a block of empty lines)
  if (!snippet.trim()) {
    vscode.window.showWarningMessage("Code Mark: Selection and surrounding lines are empty.");
    return;
  }

  // Pick color
  const color = await pickColor();
  if (!color) { return; }

  // Pick tag (optional)
  const tag = await pickTag();

  const now = new Date().toISOString();
  const highlight: Highlight = {
    id: uuidv4(),
    filePath: getWorkspaceRelativePath(editor.document.uri),
    codeSnippet: snippet,
    codeSnippetDisplay: litedent(snippet),
    codeHash: hashText(snippet),
    tag: tag || "",
    color,
    createdAt: now,
    updatedAt: now,
    range: targetRange,
  };

  addHighlight(context, highlight);

  // Reapply all highlights to this editor
  const fileHighlights = getHighlightsForFile(context, highlight.filePath);
  applyHighlightsToEditor(editor, fileHighlights, getFuzzyThreshold());

  sidebar.refresh();
  vscode.window.setStatusBarMessage(`$(bookmark) Code Mark: Highlight added — [${tag || "No tag"}]`, 3000);
}

// ─── Command: Quick Highlight Code ──────────────────────────────────────────────────

export async function highlightCodeQuick(
  context: vscode.ExtensionContext,
  sidebar: SidebarProvider
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Code Mark: No active editor.");
    return;
  }

  const selection = editor.selection;
  let snippet = "";
  let targetRange: vscode.Range;

  if (!selection.isEmpty) {
    // Standard behavior: use the user's explicit selection
    targetRange = new vscode.Range(selection.start, selection.end);
    snippet = editor.document.getText(targetRange);
  } else {
    // Fallback behavior: grab current line + up to 3 next lines
    const startLine = selection.active.line;
    const maxLine = Math.min(startLine + 3, editor.document.lineCount - 1);
    let endLine = startLine;

    // Find the furthest non-empty line within our 4-line window
    for (let i = startLine; i <= maxLine; i++) {
      if (!editor.document.lineAt(i).isEmptyOrWhitespace) {
        endLine = i;
      }
    }

    // Create a contiguous range from the start line to the end of the last valid line
    const startPos = new vscode.Position(startLine, 0);
    const endLineLength = editor.document.lineAt(endLine).text.length;
    const endPos = new vscode.Position(endLine, endLineLength);

    targetRange = new vscode.Range(startPos, endPos);
    snippet = editor.document.getText(targetRange);
  }

  // If the extracted snippet is entirely whitespace (e.g., user clicked on a block of empty lines)
  if (!snippet.trim()) {
    vscode.window.showWarningMessage("Code Mark: Selection and surrounding lines are empty.");
    return;
  }

  const now = new Date().toISOString();
  const highlight: Highlight = {
    id: uuidv4(),
    filePath: getWorkspaceRelativePath(editor.document.uri),
    codeSnippet: snippet,
    codeSnippetDisplay: litedent(snippet),
    codeHash: hashText(snippet),
    tag: "",
    color: "#f7db00",
    createdAt: now,
    updatedAt: now,
    range: targetRange,
  };

  const fileHighlights = addHighlight2(context, highlight);
  const fileHighlightsToSave = updateHighlightRangesInEditor(editor, fileHighlights, getFuzzyThreshold());
  saveHighlights(context, fileHighlightsToSave);

  // addHighlight(context, highlight);
  //
  // // Reapply all highlights to this editor
  // const fileHighlights = getHighlightsForFile(context, highlight.filePath);
  // applyHighlightsToEditor(editor, fileHighlights, getFuzzyThreshold());

  sidebar.refresh();
  vscode.window.setStatusBarMessage(`$(bookmark) Code Mark: Highlight added`, 3000);
}

// ─── Command: Remove Highlight ────────────────────────────────────────────────

export async function removeHighlightCmd(
  context: vscode.ExtensionContext,
  sidebar: SidebarProvider
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const filePath = getWorkspaceRelativePath(editor.document.uri);
  const fileHighlights = getHighlightsForFile(context, filePath);
  const target = findHighlightAtCursor(editor, fileHighlights, getFuzzyThreshold());

  if (!target) {
    vscode.window.showInformationMessage("Code Mark: No highlight found at cursor.");
    return;
  }

  const confirm = await vscode.window.showQuickPick(["Yes, remove it", "Cancel"], {
    placeHolder: `Remove highlight: "${target.tag || target.codeSnippetDisplay.slice(0, 40)}..."?`,
    title: "Code Mark — Remove Highlight",
  });
  if (confirm !== "Yes, remove it") { return; }

  removeHighlight(context, target.id);

  const updated = getHighlightsForFile(context, filePath);
  applyHighlightsToEditor(editor, updated, getFuzzyThreshold());

  sidebar.refresh();
  vscode.window.setStatusBarMessage("$(trash) Code Mark: Highlight removed.", 3000);
}

// ─── Command: Edit Tag ────────────────────────────────────────────────────────

export async function editTagCmd(
  context: vscode.ExtensionContext,
  sidebar: SidebarProvider,
  highlightId?: string
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  let target: Highlight | undefined;

  if (highlightId) {
    target = loadHighlights(context).find((h) => h.id === highlightId);
  } else {
    const filePath = getWorkspaceRelativePath(editor.document.uri);
    const fileHighlights = getHighlightsForFile(context, filePath);
    target = findHighlightAtCursor(editor, fileHighlights, getFuzzyThreshold());
  }

  if (!target) {
    vscode.window.showInformationMessage("Code Mark: No highlight found at cursor.");
    return;
  }

  const newTag = await pickTag(target.tag);
  if (newTag === undefined) { return; }

  updateHighlight(context, target.id, { tag: newTag });

  const filePath = getWorkspaceRelativePath(editor.document.uri);
  applyHighlightsToEditor(editor, getHighlightsForFile(context, filePath), getFuzzyThreshold());
  sidebar.refresh();
  vscode.window.setStatusBarMessage(`$(tag) Code Mark: Tag updated to "${newTag}".`, 3000);
}

// ─── Command: Change Color ────────────────────────────────────────────────────

export async function changeColorCmd(
  context: vscode.ExtensionContext,
  sidebar: SidebarProvider,
  highlightId?: string
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  let target: Highlight | undefined;

  if (highlightId) {
    target = loadHighlights(context).find((h) => h.id === highlightId);
  } else {
    const filePath = getWorkspaceRelativePath(editor.document.uri);
    const fileHighlights = getHighlightsForFile(context, filePath);
    target = findHighlightAtCursor(editor, fileHighlights, getFuzzyThreshold());
  }

  if (!target) {
    vscode.window.showInformationMessage("Code Mark: No highlight found at cursor.");
    return;
  }

  const newColor = await pickColor(target.color);
  if (!newColor) { return; }

  updateHighlight(context, target.id, { color: newColor });

  const filePath = getWorkspaceRelativePath(editor.document.uri);
  applyHighlightsToEditor(editor, getHighlightsForFile(context, filePath), getFuzzyThreshold());
  sidebar.refresh();
  vscode.window.setStatusBarMessage("$(symbol-color) Code Mark: Color updated.", 3000);
}

// ─── Command: Clear All Highlights in File ────────────────────────────────────

export async function clearAllHighlightsCmd(
  context: vscode.ExtensionContext,
  sidebar: SidebarProvider
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  const filePath = getWorkspaceRelativePath(editor.document.uri);
  const fileHighlights = getHighlightsForFile(context, filePath);

  if (fileHighlights.length === 0) {
    vscode.window.showInformationMessage("Code Mark: No highlights in this file.");
    return;
  }

  const confirm = await vscode.window.showQuickPick(
    ["Yes, clear all", "Cancel"],
    {
      placeHolder: `Clear all ${fileHighlights.length} highlight(s) in this file?`,
      title: "Code Mark — Clear All",
    }
  );
  if (confirm !== "Yes, clear all") { return; }

  removeHighlightsForFile(context, filePath);
  applyHighlightsToEditor(editor, [], getFuzzyThreshold());
  sidebar.refresh();
  vscode.window.setStatusBarMessage("$(clear-all) Code Mark: All highlights cleared.", 3000);
}
