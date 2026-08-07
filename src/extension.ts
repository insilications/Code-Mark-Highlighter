import * as vscode from "vscode";
import { Messenger } from "vscode-messenger";

import { highlightCodeQuick } from "./commands";
import { ACTIVATED_CONTEXT } from "./constants";
import { applyHighlightsToEditor, disposeAllDecorations } from "./decorationManager";
import { jumpToHighlight } from "./highlightNavigator";
import { HighlightRepository } from "./highlightRepository";
import { getHighlightsForFile, loadHighlights } from "./storage";
import type { HighlightStore } from "./types";
import { getFuzzyThreshold } from "./utils";
import {
  jumpToHighlightNotificationType,
  refreshNotificationType,
  SidebarProvider,
} from "./webView/sidebarProvider";
import type { IJumpToHighlightParams, onActionData } from "./webView/types";

let sidebar: SidebarProvider;
let highlightRepository: HighlightRepository;
const messenger = new Messenger();

function getWorkspaceRelativePath(uri: vscode.Uri): string {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return vscode.workspace.asRelativePath(uri, false);
  }

  return uri.fsPath;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    const highlightStore: HighlightStore = loadHighlights(context);

    highlightRepository = HighlightRepository.fromStore(highlightStore);

    // Sidebar Provider
    sidebar = new SidebarProvider(
      context,
      highlightRepository,
      // async (action: string, data: unknown): Promise<void> => {
      async (data: onActionData): Promise<void> => {
        switch (data.id) {
          case "jumpTo":
            await jumpToHighlight(
              data.filePath,
              data.snippet,
              data.codeHash,
              getFuzzyThreshold(),
              data.jumpInSplitEditor,
            );
            break;
          // case "editTag":
          //   // await editTagCmd(context, sidebar, d.id);
          //   break;
          // case "changeColor":
          //   // await changeColorCmd(context, sidebar, d.id);
          //   break;
          case "refresh":
            refreshActiveEditor(context);
            break;
        }
      },
    );

    // =====================================================================
    // WebView Messaging Listeners
    // =====================================================================
    const webView: vscode.WebviewView | undefined = sidebar.webview;
    if (!webView) {
      throw new Error("Sidebar webview is not initialized.");
    }
    // Register the WebView with the messenger for communication
    messenger.registerWebviewView(webView);
    messenger.onNotification(
      jumpToHighlightNotificationType,
      async (data: IJumpToHighlightParams): Promise<void> => {
        await jumpToHighlight(
          data.filePath,
          data.snippet,
          data.codeHash,
          getFuzzyThreshold(),
          data.jumpInSplitEditor,
        );
      },
    );
    messenger.onNotification(refreshNotificationType, (): void => {
      refreshActiveEditor(context);
    });

    // Debounce timer for reapplying highlights during `vscode.workspace.onDidChangeTextDocument`
    let debounceTimer: NodeJS.Timeout | undefined;

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(SidebarProvider.VIEW_ID, sidebar, {
        webviewOptions: { retainContextWhenHidden: true },
      }),

      // =====================================================================
      // Commands
      // =====================================================================

      // vscode.commands.registerCommand("codemark.highlightCode", () =>
      //   highlightCode(context, sidebar),
      // ),
      vscode.commands.registerCommand("codemark.highlightCodeQuick", () => {
        highlightCodeQuick(context, sidebar);
      }),
      // vscode.commands.registerCommand("codemark.removeHighlight", () =>
      //   removeHighlightCmd(context, sidebar),
      // ),
      // vscode.commands.registerCommand("codemark.editTag", () => editTagCmd(context, sidebar)),
      // vscode.commands.registerCommand("codemark.changeColor", () => changeColorCmd(context, sidebar)),
      vscode.commands.registerCommand("codemark.showPanel", () => {
        sidebar.reveal();
        vscode.commands.executeCommand("codemark.highlightsPanel.focus");
      }),
      // vscode.commands.registerCommand("codemark.nextHighlight", () => nextHighlight(context)),
      // vscode.commands.registerCommand("codemark.prevHighlight", () => prevHighlight(context)),
      // vscode.commands.registerCommand("codemark.clearAllHighlights", () =>
      //   clearAllHighlightsCmd(context, sidebar),
      // ),

      // =====================================================================
      // Editor event listeners
      // =====================================================================

      // Reapply when a document is opened
      vscode.workspace.onDidOpenTextDocument((doc) => {
        const editor = vscode.window.visibleTextEditors.find((e) => e.document === doc);
        if (editor) {
          applyForEditor(editor, context);
        }
      }),

      // Debounced reapplying highlights on text changes (handles edits above highlights)
      vscode.workspace.onDidChangeTextDocument(
        (event: Readonly<vscode.TextDocumentChangeEvent>) => {
          const editor = vscode.window.visibleTextEditors.find(
            (e) => e.document === event.document,
          );
          if (!editor) {
            return;
          }

          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(() => {
            applyForEditor(editor, context);
          }, 500);
        },
      ),

      // Refresh decorations on save (positions may have shifted)
      vscode.workspace.onDidSaveTextDocument((doc) => {
        const editor = vscode.window.visibleTextEditors.find((e) => e.document === doc);
        if (editor) {
          applyForEditor(editor, context);
          sidebar.refresh();
        }
      }),

      // Reapply when switching editors
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          applyForEditor(editor, context);
        }
      }),
    );

    // Apply highlights to all currently visible editors on startup
    for (const editor of vscode.window.visibleTextEditors) {
      applyForEditor(editor, context);
    }

    // Success: Enable the UI elements
    await vscode.commands.executeCommand("setContext", ACTIVATED_CONTEXT, true);
    console.log("Code Mark Highlighter extension activated ✓");
  } catch (error) {
    vscode.commands.executeCommand("setContext", ACTIVATED_CONTEXT, false);

    console.error("[Code Mark Highlighter] Failed to start extension. ", error);
    vscode.window.showErrorMessage(
      `[Code Mark Highlighter] Failed to start. ${error instanceof Error ? error.message : String(error)}`,
    );
    throw new Error("[Code Mark Highlighter] Failed to start.", { cause: error });
  }
}

function applyForEditor(editor: vscode.TextEditor, context: vscode.ExtensionContext): void {
  const filePath = getWorkspaceRelativePath(editor.document.uri);
  const highlights = getHighlightsForFile(context, filePath);
  applyHighlightsToEditor(editor, highlights, getFuzzyThreshold());
}

function refreshActiveEditor(context: vscode.ExtensionContext): void {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    applyForEditor(editor, context);
  }
}

export function deactivate(): void {
  disposeAllDecorations();
}
