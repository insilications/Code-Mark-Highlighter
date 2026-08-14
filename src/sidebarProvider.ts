// src/sidebarProvider.ts
// Sidebar webview panel — shows all highlights with filter, navigation and CRUD actions.

import * as fs from "node:fs";

import * as vscode from "vscode";
import { type Messenger } from "vscode-messenger";
import { type WebviewIdMessageParticipant } from "vscode-messenger-common";

import {
  jumpToHighlightNotificationType,
  refreshActiveEditorNotificationType,
  updateWebViewNotificationType,
  webViewReadyNotificationType,
} from "./core/messenger-types";
import { applyHighlightsToEditor } from "./decorationManager";
import { getFuzzyThreshold } from "./extension/utils";
import { jumpToHighlight } from "./highlightNavigator";
import type { HighlightRepository } from "./highlightRepository";
import { getWorkspaceRelativePath } from "./storage";
import type { FileHighlightsViewModel, Highlight, IJumpToHighlightParams } from "./types";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly VIEW_ID = "codemark.highlightsPanel";
  private readonly extensionUri: vscode.Uri;
  private view?: vscode.WebviewView;
  private webviewIdMessageParticipant?: WebviewIdMessageParticipant;
  // private mainWebViewScriptUri: vscode.Uri;
  private mainWebViewHtmlUri: vscode.Uri;

  constructor(
    private readonly extensionContext: vscode.ExtensionContext,
    private readonly messenger: Messenger,
    public readonly highlightRepository: HighlightRepository,
  ) {
    this.extensionUri = extensionContext.extensionUri;
    // this.mainWebViewScriptUri = vscode.Uri.joinPath(this.extensionUri, "out", "mainWebView.js");
    this.mainWebViewHtmlUri = vscode.Uri.joinPath(this.extensionUri, "out", "mainWebView.html");
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.buildHtmlForWebView();

    // Register the WebView with the messenger for communication
    this.webviewIdMessageParticipant = this.messenger.registerWebviewView(webviewView);

    // =====================================================================
    // WebView Messaging Listeners
    // =====================================================================
    const disposables: vscode.Disposable[] = [
      this.messenger.onNotification(
        jumpToHighlightNotificationType,
        async (data: IJumpToHighlightParams): Promise<void> => {
          console.log(
            "[Code Mark Highlighter] jumpToHighlightNotificationType - Received request to jump to highlight from WebView: ",
            data,
          );
          await jumpToHighlight(
            data.filePath,
            data.codeSnippet,
            data.codeHash,
            getFuzzyThreshold(),
            data.jumpInSplitEditor,
          );
        },
      ),
      this.messenger.onNotification(webViewReadyNotificationType, (): void => {
        console.log(
          "[Code Mark Highlighter] webViewReadyNotificationType - WebView is ready. Sending initial highlights data to WebView.",
        );
        this.refreshSidebar();
      }),
      this.messenger.onNotification(refreshActiveEditorNotificationType, (): void => {
        console.log(
          "[Code Mark Highlighter] refreshActiveEditorNotificationType - Received request to refresh active editor from WebView.",
        );
        this.refreshActiveEditor(this.extensionContext);
      }),
    ];
    webviewView.onDidDispose(() => {
      for (const disposable of disposables) {
        disposable.dispose();
      }
    });

    // this.refreshSidebar();
  }

  public refreshSidebar(): void {
    console.log(
      "[Code Mark Highlighter] refreshSidebar - Refreshing sidebar with latest highlights data.",
    );
    // Is this necessary? The webview should be ready when this is called, but just in case.
    if (!this.view || !this.webviewIdMessageParticipant) {
      return;
    }

    const fileHighlightsViewModel: FileHighlightsViewModel[] =
      this.highlightRepository.createWebviewModel();
    this.messenger.sendNotification(
      updateWebViewNotificationType,
      this.webviewIdMessageParticipant,
      fileHighlightsViewModel,
    );
  }

  public reveal(): void {
    this.view?.show(true);
  }

  public applyForEditor(
    editor: vscode.TextEditor,
    _extensionContext: vscode.ExtensionContext,
  ): void {
    console.log(
      `[Code Mark Highlighter] applyForEditor - Applying highlights for editor: ${editor.document.uri.fsPath}`,
    );
    const filePath: string = getWorkspaceRelativePath(editor.document.uri);
    const highlights: readonly Highlight[] | undefined =
      this.highlightRepository.getHighlights(filePath);
    if (highlights && highlights.length > 0) {
      applyHighlightsToEditor(editor, highlights);
    }
  }

  public refreshActiveEditor(extensionContext: vscode.ExtensionContext): void {
    console.log(
      "[Code Mark Highlighter] refreshActiveEditor - Refreshing active editor with latest highlights data.",
    );
    const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
    if (editor) {
      this.applyForEditor(editor, extensionContext);
    }
  }

  private buildHtmlForWebView(): string {
    console.log("[Code Mark Highlighter] buildHtmlForWebView - Building HTML for WebView.");
    const htmlContent: string = fs.readFileSync(this.mainWebViewHtmlUri.fsPath, "utf-8");
    return htmlContent.replaceAll("#NNNN#", getNonce());
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
