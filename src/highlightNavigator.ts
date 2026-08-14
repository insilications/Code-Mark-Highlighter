import * as vscode from "vscode";

import { findRangeInDocument } from "./highlightMatcher";

export async function jumpToHighlight(
  filePath: string,
  codeSnippet: string,
  codeHash: string,
  fuzzyThreshold: number = 0.75,
  jumpInSplitEditor: boolean = false,
): Promise<void> {
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
