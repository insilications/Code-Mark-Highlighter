import fs from "node:fs";
import path from "node:path";

import { HIGHLIGHT_STORE_VERSION } from "@core/constants";
import { serializeHighlightStore } from "@core/serialization";
import type { FileHighlights, HighlightStore } from "@core/types";
import * as vscode from "vscode";

export function getWorkspaceRelativePath(uri: vscode.Uri): string {
  const workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined =
    vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return vscode.workspace.asRelativePath(uri, false);
  }

  return uri.fsPath;
}

function getStorageFilePath(): string | null {
  const workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined =
    vscode.workspace.workspaceFolders;
  const workspaceRoot: string | undefined =
    workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0]?.uri.fsPath : undefined;

  if (workspaceRoot === undefined) {
    return null;
  }

  const cfg: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("codemark");
  const storageFileRelative: string = cfg.get<string>("storageFile", ".vscode/codemark.json");
  return path.join(workspaceRoot, storageFileRelative);
}

export function loadHighlights(): HighlightStore {
  const filePath: string | null = getStorageFilePath();
  if (filePath !== null && fs.existsSync(filePath)) {
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as HighlightStore;
    } catch {
      // Fall through
    }
  }
  return { version: HIGHLIGHT_STORE_VERSION, fileHighlights: {} };
}

export function saveHighlights(filePathsHighlights: Readonly<FileHighlights>): void {
  const highlightStore: HighlightStore = serializeHighlightStore(filePathsHighlights);

  // Write JSON file
  const filePath: string | null = getStorageFilePath();
  if (filePath === null) {
    return;
  }

  const dir: string = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(filePath, JSON.stringify(highlightStore, null, 2), "utf-8");
  } catch (err) {
    vscode.window.showErrorMessage(
      `[Code Mark Highlighter] Failed to save highlights. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
