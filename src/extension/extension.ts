import * as vscode from "vscode";
import { Messenger, type MessengerDiagnostic } from "vscode-messenger";

import { ACTIVATED_CONTEXT } from "@/core/constants";
import { HighlightRepository } from "@/core/highlightRepository";
import type { HighlightStore } from "@/core/types";

import { highlightCodeQuick } from "./commands";
import { disposeAllDecorations } from "./decorationManager";
import { SidebarProvider } from "./sidebarProvider";
import { loadHighlights } from "./storage";

let sidebar: SidebarProvider;
let highlightRepository: HighlightRepository;
const messenger = new Messenger();

export function activate(context: vscode.ExtensionContext): MessengerDiagnostic {
  try {
    highlightRepository = HighlightRepository.fromStore(loadHighlights());

    // =====================================================================
    // Sidebar Provider
    // =====================================================================
    sidebar = new SidebarProvider(context, messenger, highlightRepository);

    // Debounce timer for reapplying highlights during `vscode.workspace.onDidChangeTextDocument`
    // let debounceTimer: NodeJS.Timeout | undefined;

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(SidebarProvider.VIEW_ID, sidebar, {
        webviewOptions: { retainContextWhenHidden: true },
      }),

      // =====================================================================
      // Commands
      // =====================================================================
      vscode.commands.registerCommand("codemark.highlightCodeQuick", (): void => {
        highlightCodeQuick(sidebar);
      }),
      // vscode.commands.registerCommand("codemark.removeHighlight", () =>
      //   removeHighlightCmd(context, sidebar),
      // ),
      vscode.commands.registerCommand("codemark.showPanel", (): void => {
        sidebar.reveal();
        vscode.commands.executeCommand("codemark.highlightsPanel.focus");
      }),
      // vscode.commands.registerCommand("codemark.clearAllHighlights", () =>
      //   clearAllHighlightsCmd(context, sidebar),
      // ),

      // =====================================================================
      // Editor event listeners
      // =====================================================================
      // Reapply when a document is opened
      vscode.workspace.onDidOpenTextDocument((doc: vscode.TextDocument): void => {
        console.log(`[Code Mark Highlighter] Document opened: ${doc.fileName}`);
        const editor: vscode.TextEditor | undefined = vscode.window.visibleTextEditors.find(
          (e: vscode.TextEditor): boolean => e.document === doc,
        );
        if (editor) {
          console.log(
            `[Code Mark Highlighter] Document opened: ${doc.fileName}. Reapplying highlights.`,
          );
          sidebar.applyForEditor(editor, context);
        }
      }),

      // Debounced reapplying highlights on text changes (handles edits above highlights)
      // vscode.workspace.onDidChangeTextDocument(
      //   (event: Readonly<vscode.TextDocumentChangeEvent>) => {
      //     const editor = vscode.window.visibleTextEditors.find(
      //       (e) => e.document === event.document,
      //     );
      //     if (!editor) {
      //       return;
      //     }

      //     if (debounceTimer) {
      //       clearTimeout(debounceTimer);
      //     }
      //     debounceTimer = setTimeout(() => {
      //       sidebar.applyForEditor(editor, context);
      //     }, 500);
      //   },
      // ),

      // Reapply decorations and refresh the `SidebarProvider` on save (positions may have shifted)
      vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument): void => {
        console.log(`[Code Mark Highlighter] Document saved: ${doc.fileName}`);
        const editor: vscode.TextEditor | undefined = vscode.window.visibleTextEditors.find(
          (e: vscode.TextEditor): boolean => e.document === doc,
        );
        if (editor) {
          console.log(
            `[Code Mark Highlighter] Document saved: ${doc.fileName}. Reapplying highlights.`,
          );
          sidebar.applyForEditor(editor, context);
          sidebar.refreshSidebar();
        }
      }),

      // Reapply when switching editors
      vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined): void => {
        console.log("[Code Mark Highlighter] Active editor changed: ", editor?.document.fileName);
        if (editor) {
          console.log(
            "[Code Mark Highlighter] Active editor changed, trying to reapply highlights for: ",
            editor.document.fileName,
          );
          sidebar.applyForEditor(editor, context);
        }
      }),
    );

    // Success: Enable the commands and UI elements
    vscode.commands.executeCommand("setContext", ACTIVATED_CONTEXT, true);
    console.log("[Code Mark Highlighter] Activated ✓");

    // Apply highlights to all currently visible editors on startup
    for (const editor of vscode.window.visibleTextEditors) {
      sidebar.applyForEditor(editor, context);
    }
    return messenger.diagnosticApi({ withParameterData: true, withResponseData: true });
  } catch (err) {
    vscode.commands.executeCommand("setContext", ACTIVATED_CONTEXT, false);

    console.error("[Code Mark Highlighter] Failed to start extension. ", err);
    vscode.window.showErrorMessage(
      `[Code Mark Highlighter] Failed to start. ${err instanceof Error ? err.message : String(err)}`,
    );
    throw new Error("[Code Mark Highlighter] Failed to start.", { cause: err });
  }
}

export function deactivate(): void {
  disposeAllDecorations();
  vscode.commands.executeCommand("setContext", ACTIVATED_CONTEXT, false);
}
