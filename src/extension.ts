import * as vscode from "vscode";
import { Messenger } from "vscode-messenger";

import { highlightCodeQuick } from "./commands";
import { ACTIVATED_CONTEXT } from "./constants";
import { disposeAllDecorations } from "./decorationManager";
import { HighlightRepository } from "./highlightRepository";
import { loadHighlights } from "./storage";
import type { HighlightStore } from "./types";
import { SidebarProvider } from "./webView/sidebarProvider";

let sidebar: SidebarProvider;
let highlightRepository: HighlightRepository;
const messenger = new Messenger();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    const highlightStore: HighlightStore = loadHighlights(context);

    highlightRepository = HighlightRepository.fromStore(highlightStore);

    // =====================================================================
    // Sidebar Provider
    // =====================================================================
    sidebar = new SidebarProvider(
      context,
      messenger,
      highlightRepository,
      // async (action: string, data: unknown): Promise<void> => {
      // async (data: onActionData): Promise<void> => {
      //   switch (data.id) {
      //     case "jumpTo":
      //       await jumpToHighlight(
      //         data.filePath,
      //         data.snippet,
      //         data.codeHash,
      //         getFuzzyThreshold(),
      //         data.jumpInSplitEditor,
      //       );
      //       break;
      //     // case "editTag":
      //     //   // await editTagCmd(context, sidebar, d.id);
      //     //   break;
      //     // case "changeColor":
      //     //   // await changeColorCmd(context, sidebar, d.id);
      //     //   break;
      //     case "refresh":
      //       refreshActiveEditor(context);
      //       break;
      //   }
      // },
    );

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
      vscode.workspace.onDidOpenTextDocument((doc: vscode.TextDocument) => {
        const editor = vscode.window.visibleTextEditors.find((e) => e.document === doc);
        if (editor) {
          sidebar.applyForEditor(editor, context);
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
            sidebar.applyForEditor(editor, context);
          }, 500);
        },
      ),

      // Refresh decorations on save (positions may have shifted)
      vscode.workspace.onDidSaveTextDocument((doc) => {
        const editor = vscode.window.visibleTextEditors.find((e) => e.document === doc);
        if (editor) {
          sidebar.applyForEditor(editor, context);
          sidebar.refreshSidebar();
        }
      }),

      // Reapply when switching editors
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          sidebar.applyForEditor(editor, context);
        }
      }),
    );

    // Apply highlights to all currently visible editors on startup
    for (const editor of vscode.window.visibleTextEditors) {
      sidebar.applyForEditor(editor, context);
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

export function deactivate(): void {
  disposeAllDecorations();
}
