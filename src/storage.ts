// src/storage.ts
// Handles reading/writing highlights to .vscode/codemark.json and workspaceState

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Highlight, HighlightStore, SerializedHighlight } from "./types";

const STORE_VERSION = 1;
const WS_STATE_KEY = "codemark.highlights";

function toSerialized(v: Highlight[], k: string): FilePathsHighlightsSerialized {
  return {
    ...h,
    range: [
      {
        line: h.range.start.line,
        character: h.range.start.character,
      },
      {
        line: h.range.end.line,
        character: h.range.end.character,
      },
    ],
  };
}

// function toSerialized(h: Highlight): SerializedHighlight {
//   return {
//     ...h,
//     range: [
//       {
//         line: h.range.start.line,
//         character: h.range.start.character,
//       },
//       {
//         line: h.range.end.line,
//         character: h.range.end.character,
//       },
//     ],
//   };
// }

function fromSerialized(s: SerializedHighlight): Highlight {
  return {
    ...s,
    range: new vscode.Range(s.range[0].line, s.range[0].character, s.range[1].line, s.range[1].character),
  };
}

function getStorageFilePath(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }
  const cfg = vscode.workspace.getConfiguration("codemark");
  const rel = cfg.get<string>("storageFile", ".vscode/codemark.json");
  return path.join(folders[0].uri.fsPath, rel);
}

export function loadHighlights(context: vscode.ExtensionContext): Highlight[] {
  const filePath = getStorageFilePath();
  if (filePath && fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const store: HighlightStore = JSON.parse(raw);
      if (Array.isArray(store.highlights)) {
        // Mirror to workspaceState for fast access
        context.workspaceState.update(WS_STATE_KEY, store.highlights);
        // Rehydrate back to runtime instances
        return store.highlights.map(fromSerialized);
      }
    } catch {
      // Fall through to workspace state
    }
  }

  // Fallback: workspaceState
  const state =
    context.workspaceState.get<SerializedHighlight[]>(WS_STATE_KEY) ?? [];
  return state.map(fromSerialized);
}

export function saveHighlights(
  context: vscode.ExtensionContext,
  filePathsHighlights: FilePathsHighlights,
): void {
  // Serialize before saving to state to prevent prototype stripping issues
  const serialized = filePathsHighlights.forEach(toSerialized);
  const serialized: FilePathsHighlightsSerialized = {};
  for (const [key, value] of myMap) {
    myRecord[key] = value;
  }

  // Update in-memory state immediately
  context.workspaceState.update(WS_STATE_KEY, serialized);

  // Write JSON file
  const filePath = getStorageFilePath();
  if (!filePath) {
    return;
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const store: HighlightStore = {
    version: STORE_VERSION,
    highlights: serialized,
  };
  try {
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    vscode.window.showErrorMessage(
      `Code Mark: Failed to save highlights — ${err}`,
    );
  }
}

// export function saveHighlights(
//   context: vscode.ExtensionContext,
//   highlights: Highlight[],
// ): void {
//   // Serialize before saving to state to prevent prototype stripping issues
//   const serialized = highlights.map(toSerialized);
//
//   // Update in-memory state immediately
//   context.workspaceState.update(WS_STATE_KEY, serialized);
//
//   // Write JSON file
//   const filePath = getStorageFilePath();
//   if (!filePath) {
//     return;
//   }
//
//   const dir = path.dirname(filePath);
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
//
//   const store: HighlightStore = {
//     version: STORE_VERSION,
//     highlights: serialized,
//   };
//   try {
//     fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
//   } catch (err) {
//     vscode.window.showErrorMessage(
//       `Code Mark: Failed to save highlights — ${err}`,
//     );
//   }
// }

export function getHighlightsForFile(
  context: vscode.ExtensionContext,
  filePath: string,
): Highlight[] {
  const all = loadHighlights(context);
  return all.filter((h) => h.filePath === filePath);
}

export function addHighlight(
  context: vscode.ExtensionContext,
  highlight: Highlight,
): void {
  const all = loadHighlights(context);
  all.push(highlight);
  saveHighlights(context, all);
}

// Load highlights temporarily and
export function addHighlight2(
  context: vscode.ExtensionContext,
  highlight: Highlight,
): Highlight[] {
  const fileHighlights = loadHighlights(context).filter((h) => h.filePath === highlight.filePath);
  fileHighlights.push(highlight);
  return fileHighlights;
}

export function removeHighlight(
  context: vscode.ExtensionContext,
  id: string,
): void {
  const all = loadHighlights(context);
  saveHighlights(
    context,
    all.filter((h) => h.id !== id),
  );
}

export function updateHighlight(
  context: vscode.ExtensionContext,
  id: string,
  patch: Partial<Highlight>,
): void {
  const all = loadHighlights(context);
  const idx = all.findIndex((h) => h.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    saveHighlights(context, all);
  }
}

export function removeHighlightsForFile(
  context: vscode.ExtensionContext,
  filePath: string,
): void {
  const all = loadHighlights(context);
  saveHighlights(
    context,
    all.filter((h) => h.filePath !== filePath),
  );
}
