import crypto from "node:crypto";

import { litedent } from "litedent";
import * as vscode from "vscode";

import type { HighlightRepository } from "@/core/highlightRepository";
import { hashText } from "@/core/utils";

import { applyHighlightsToEditor } from "./decorationManager";
import type { SidebarProvider } from "./sidebarProvider";

/** Command: Quick Highlight Code */
export function highlightCodeQuick(sidebar: SidebarProvider): void {
  const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Code Mark: No active editor.");
    return;
  }

  const selection: vscode.Selection = editor.selection;
  let targetRange: vscode.Range;

  if (!selection.isEmpty) {
    // Standard behavior: use the user's explicit selection
    targetRange = new vscode.Range(selection.start, selection.end);
  } else {
    // Fallback behavior: grab current line + up to 3 next lines
    const startLine: number = selection.active.line;
    const maxLine: number = Math.min(startLine + 3, editor.document.lineCount - 1);
    let endLine: number = startLine;

    // Find the furthest non-empty line within our 4-line window
    for (let i: number = startLine; i <= maxLine; i++) {
      if (!editor.document.lineAt(i).isEmptyOrWhitespace) {
        endLine = i;
      }
    }

    // Create a contiguous range from the start line to the end of the last valid line
    const startPos = new vscode.Position(startLine, 0);
    const endLineLength = editor.document.lineAt(endLine).text.length;
    const endPos = new vscode.Position(endLine, endLineLength);

    targetRange = new vscode.Range(startPos, endPos);
  }

  const codeSnippet: string = editor.document.getText(targetRange);

  // If the extracted snippet is entirely whitespace (e.g., user clicked on a block of empty lines)
  if (!codeSnippet.trim()) {
    vscode.window.showWarningMessage("Code Mark: Selection and surrounding lines are empty.");
    return;
  }

  const now: string = new Date().toISOString();
  const filePath: string = vscode.workspace.asRelativePath(editor.document.uri);
  const highlightRepository: HighlightRepository = sidebar.highlightRepository;
  highlightRepository.addHighlight(filePath, {
    id: crypto.randomUUID(),
    codeSnippet,
    codeSnippetDisplay: litedent(codeSnippet),
    codeHash: hashText(codeSnippet),
    tag: "",
    color: "#f7db00",
    createdAt: now,
    updatedAt: now,
    range: targetRange,
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  applyHighlightsToEditor(editor, highlightRepository.getHighlights(filePath)!);

  sidebar.refreshSidebar();
  vscode.window.setStatusBarMessage("Code Mark Highlight: Highlight added", 3000);
}
