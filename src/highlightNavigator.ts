// src/highlightNavigator.ts
// Jump to next/previous highlight in the current file

import * as vscode from "vscode";

import { findRangeInDocument } from "./highlightMatcher";

// interface ResolvedHighlight {
//   highlight: Highlight;
//   range: vscode.Range;
// }

// function resolveHighlightsInEditor(
//   editor: vscode.TextEditor,
//   highlights: Highlight[],
//   fuzzyThreshold: number,
// ): ResolvedHighlight[] {
//   const resolved: ResolvedHighlight[] = [];
//   for (const h of highlights) {
//     const range = findRangeInDocument(editor.document, h.codeSnippet, h.codeHash, fuzzyThreshold);
//     if (range) {
//       resolved.push({ highlight: h, range });
//     }
//   }
//   // Sort by start position
//   return resolved.sort(
//     (a, b) =>
//       a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character,
//   );
// }

// export function nextHighlight(context: vscode.ExtensionContext): void {
//   const editor = vscode.window.activeTextEditor;
//   if (!editor) {
//     return;
//   }

//   const filePath = getWorkspaceRelativePath(editor.document.uri);
//   const fileHighlights = getHighlightsForFile(context, filePath);

//   if (fileHighlights.length === 0) {
//     vscode.window.setStatusBarMessage("$(bookmark) Code Mark: No highlights in this file.", 2500);
//     return;
//   }

//   const resolved = resolveHighlightsInEditor(editor, fileHighlights, getFuzzyThreshold());
//   if (resolved.length === 0) {
//     return;
//   }

//   const cursor = editor.selection.active;

//   // Find first highlight after cursor
//   let target = resolved.find((r) => r.range.start.isAfter(cursor));

//   // Wrap around to beginning
//   if (!target) {
//     target = resolved[0];
//   }

//   revealHighlight(editor, target);

//   const tag = target.highlight.tag || "No tag";
//   vscode.window.setStatusBarMessage(`$(arrow-down) Code Mark: → [${tag}]`, 2500);
// }

// export async function prevHighlight(context: vscode.ExtensionContext): Promise<void> {
//   const editor = vscode.window.activeTextEditor;
//   if (!editor) {
//     return;
//   }

//   const filePath = getWorkspaceRelativePath(editor.document.uri);
//   const fileHighlights = getHighlightsForFile(context, filePath);

//   if (fileHighlights.length === 0) {
//     vscode.window.setStatusBarMessage("$(bookmark) Code Mark: No highlights in this file.", 2500);
//     return;
//   }

//   const resolved = resolveHighlightsInEditor(editor, fileHighlights, getFuzzyThreshold());
//   if (resolved.length === 0) {
//     return;
//   }

//   const cursor = editor.selection.active;

//   // Find last highlight before cursor (in reverse)
//   const beforeCursor = resolved.filter((r) => r.range.end.isBefore(cursor));
//   let target =
//     beforeCursor.length > 0 ? beforeCursor[beforeCursor.length - 1] : resolved[resolved.length - 1]; // wrap to end

//   revealHighlight(editor, target);

//   const tag = target.highlight.tag || "No tag";
//   vscode.window.setStatusBarMessage(`$(arrow-up) Code Mark: ← [${tag}]`, 2500);
// }

export async function jumpToHighlight(
  filePath: string,
  codeSnippet: string,
  codeHash: string,
  fuzzyThreshold: number = 0.75,
  jumpInSplitEditor: boolean = false,
): Promise<void> {
  // Open the file
  // const folders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
  // if (!folders) {
  //   return;
  // }

  const workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined =
    vscode.workspace.workspaceFolders;
  const workspaceRoot: vscode.Uri | undefined =
    workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0]?.uri : undefined;

  if (workspaceRoot === undefined) {
    return;
  }

  const absPath: vscode.Uri = vscode.Uri.joinPath(workspaceRoot, filePath);
  const doc: vscode.TextDocument = await vscode.workspace.openTextDocument(absPath);

  // Determine which column to open the document in based on the parameter
  const showOptions: vscode.TextDocumentShowOptions = {
    viewColumn: jumpInSplitEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
  };

  const editor: vscode.TextEditor = await vscode.window.showTextDocument(doc, showOptions);

  const range: vscode.Range | null = findRangeInDocument(
    doc,
    codeSnippet,
    codeHash,
    fuzzyThreshold,
  );
  if (!range) {
    vscode.window.showWarningMessage(
      "Code Mark: Could not locate highlight in file (code may have changed significantly).",
    );
    return;
  }

  // Select and reveal the range
  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

// function revealHighlight(editor: vscode.TextEditor, resolved: ResolvedHighlight): void {
//   editor.selection = new vscode.Selection(resolved.range.start, resolved.range.end);
//   editor.revealRange(resolved.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
// }
