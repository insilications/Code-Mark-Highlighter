// src/storage.ts
// Handles reading/writing highlights to .vscode/codemark.json and workspaceState

import * as fs from "node:fs";
import * as path from "node:path";

import * as vscode from "vscode";

import { HIGHLIGHT_STORE_VERSION } from "./constants";
import type { Highlight, HighlightSerialized, HighlightStore } from "./types";

const WS_STATE_KEY = "codemark.highlights";

// function fromSerialized(s: HighlightSerialized): Highlight {
//   return {
//     ...s,
//     range: new vscode.Range(
//       s.range[0].line,
//       s.range[0].character,
//       s.range[1].line,
//       s.range[1].character,
//     ),
//   };
// }

// export function serializeFilePathsHighlights(
//   filePathsHighlights: FilePathsHighlights,
// ): Record<string, HighlightSerialized[]> {
//   const result = Object.create(null) as Record<string, HighlightSerialized[]>;

//   for (const filePath of Object.keys(filePathsHighlights)) {
//     const highlights: Highlight[] = filePathsHighlights[filePath] ?? [];
//     const serializedHighlights = new Array<HighlightSerialized>(highlights.length);

//     const highlightsLen = highlights.length;
//     for (let i = 0; i < highlightsLen; i++) {
//       const highlight: Highlight = highlights[i]!;
//       const { start, end } = highlight.range;

//       serializedHighlights[i] = {
//         ...highlight,
//         range: [
//           {
//             line: start.line,
//             character: start.character,
//           },
//           {
//             line: end.line,
//             character: end.character,
//           },
//         ],
//       };
//     }

//     result[filePath] = serializedHighlights;
//   }

//   return result;
// }

// export function deserializeFilePathsHighlights(
//   serialized: Record<string, HighlightSerialized[]>,
// ): FilePathsHighlights {
//   const result = Object.create(null) as FilePathsHighlights;

//   for (const filePath of Object.keys(serialized)) {
//     const serializedHighlights: HighlightSerialized[] = serialized[filePath]!;
//     const highlights = new Array<Highlight>(serializedHighlights.length);

//     for (let i = 0; i < serializedHighlights.length; i++) {
//       const serializedHighlight: HighlightSerialized = serializedHighlights[i]!;
//       const [start, end] = serializedHighlight.range;

//       highlights[i] = {
//         ...serializedHighlight,
//         range: new vscode.Range(start.line, start.character, end.line, end.character),
//       };
//     }

//     result[filePath] = highlights;
//   }

//   return result;
// }

// export function getWorkspaceRelativePath(uri: vscode.Uri): string | null {
//   const workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined =
//     vscode.workspace.workspaceFolders;

//   const workspaceRoot: string | undefined =
//     workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0]?.uri.fsPath : undefined;

//   if (workspaceRoot !== undefined) {
//     const rel = vscode.workspace.asRelativePath(uri, false);
//     return rel;
//   }

//   return uri.fsPath;

//   // const folders = vscode.workspace.workspaceFolders;
//   // if (folders && folders.length > 0) {
//   // const rel = vscode.workspace.asRelativePath(uri, false);
//   // return rel;
//   // }
//   // return uri.fsPath;
// }

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

export function loadHighlights(context: vscode.ExtensionContext): HighlightStore {
  const filePath: string | null = getStorageFilePath();
  if (filePath !== null && fs.existsSync(filePath)) {
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as HighlightStore;
    } catch {
      // Fall through to workspace state
    }
  }
  return { version: HIGHLIGHT_STORE_VERSION, fileHighlights: {} };
  // Fallback: workspaceState
  // const state: Record<string, HighlightSerialized[]> = {};
  // const state: FilePathsHighlightsSerialized =
  //   context.workspaceState.get<FilePathsHighlightsSerialized>(WS_STATE_KEY) ?? {};
  // return deserializeFilePathsHighlights(state);
}

export function saveHighlights(
  context: vscode.ExtensionContext,
  filePathsHighlights: FilePathsHighlights,
): void {
  const filePathsHighlightsSerialized: Record<string, HighlightSerialized[]> =
    serializeFilePathsHighlights(filePathsHighlights);

  // Update in-memory state immediately
  // context.workspaceState.update(WS_STATE_KEY, filePathsHighlightsSerialized);

  // Write JSON file
  const filePath: string | null = getStorageFilePath();
  if (!filePath) {
    return;
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const store: HighlightStore = {
    version: HIGHLIGHT_STORE_VERSION,
    highlights: filePathsHighlightsSerialized,
  };
  try {
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    vscode.window.showErrorMessage(`Code Mark: Failed to save highlights — ${err}`);
  }
}

export function getHighlightsForFile(
  context: vscode.ExtensionContext,
  filePath: string,
): Highlight[] {
  const filePathsHighlights: FilePathsHighlights = loadHighlights(context);
  return filePathsHighlights[filePath] ?? [];
}

export function addHighlight(context: vscode.ExtensionContext, highlight: Highlight): void {
  const filePathsHighlights: FilePathsHighlights = loadHighlights(context);
  const fileHighlights = filePathsHighlights[highlight.filePath] ?? [];
  fileHighlights.push(highlight);
  filePathsHighlights[highlight.filePath] = fileHighlights;
  saveHighlights(context, filePathsHighlights);
}

export function saveSortedHighlights(
  context: vscode.ExtensionContext,
  highlight: Highlight,
): Highlight[] {
  const filePathsHighlights: FilePathsHighlights = loadHighlights(context);
  const fileHighlights = filePathsHighlights[highlight.filePath] ?? [];
  fileHighlights.push(highlight);
  fileHighlights.sort((a, b) => {
    // 1. Sort by file path alphabetically
    const fileComparison = a.filePath.localeCompare(b.filePath);
    if (fileComparison !== 0) {
      return fileComparison;
    }

    // 2. Sort by range start position
    const startComparison = a.range.start.compareTo(b.range.start);
    if (startComparison !== 0) {
      return startComparison;
    }

    // 3. Fallback: If highlights start at the exact same character,
    // sort by whichever one ends first.
    return a.range.end.compareTo(b.range.end);
  });

  filePathsHighlights[highlight.filePath] = fileHighlights;
  saveHighlights(context, filePathsHighlights);
  return fileHighlights;
}

export function removeHighlight(context: vscode.ExtensionContext, id: string): void {
  const filePathsHighlights: FilePathsHighlights = loadHighlights(context);
  saveHighlights(
    context,
    Object.fromEntries(
      Object.entries(filePathsHighlights).map(([filePath, highlights]) => [
        filePath,
        highlights.filter((h) => h.id !== id),
      ]),
    ),
  );
}

// export function updateHighlight(
//   context: vscode.ExtensionContext,
//   id: string,
//   patch: Partial<Highlight>,
// ): void {
//   const filePathsHighlights: FilePathsHighlights = loadHighlights(context);
//   for (const [filePath, highlights] of Object.entries(filePathsHighlights)) {
//     const idx = highlights.findIndex((h) => h.id === id);
//     if (idx !== -1) {
//       highlights[idx] = { ...highlights[idx], ...patch, updatedAt: new Date().toISOString() };
//       filePathsHighlights[filePath] = highlights;
//       saveHighlights(context, filePathsHighlights);
//       break;
//     }
//   }
// }

export function removeHighlightsForFile(context: vscode.ExtensionContext, filePath: string): void {
  const all = loadHighlights(context);
  saveHighlights(
    context,
    Object.fromEntries(Object.entries(all).filter(([fp, _]) => fp !== filePath)),
  );
}
