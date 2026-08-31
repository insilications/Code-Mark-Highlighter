// Sidebar Webview panel. Shows all highlights with filter, navigation and CRUD actions.

import fs from "node:fs";

import * as vscode from "vscode";
import type { Messenger } from "vscode-messenger";
import type { WebviewIdMessageParticipant } from "vscode-messenger-common";

import type { HighlightRepository } from "@/core/highlightRepository";
import {
  jumpToHighlightNotificationType,
  refreshActiveEditorNotificationType,
  updateWebViewNotificationType,
  webViewReadyNotificationType,
} from "@/core/messenger-types";
import type { Highlight, JumpToHighlightParams, WebviewViewModel } from "@/core/types";
import { getNonce } from "@/core/utils";

import { applyHighlightsToEditor } from "./decorationManager";
import { jumpToHighlight } from "./highlightNavigator";
import { getWorkspaceRelativePath } from "./storage";
import { getFuzzyThreshold } from "./utils";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly VIEW_ID = "codemark.highlightsPanel";
  private readonly extensionUri: vscode.Uri;
  private view?: vscode.WebviewView;
  private webviewIdMessageParticipant?: WebviewIdMessageParticipant;
  // private mainWebViewScriptUri: vscode.Uri;
  private readonly mainWebViewHtmlUri: vscode.Uri;

  public constructor(
    private readonly extensionContext: vscode.ExtensionContext,
    private readonly messenger: Messenger,
    public readonly highlightRepository: HighlightRepository,
  ) {
    this.extensionUri = extensionContext.extensionUri;
    // this.mainWebViewScriptUri = vscode.Uri.joinPath(this.extensionUri, "out", "mainWebView.js");
    this.mainWebViewHtmlUri = vscode.Uri.joinPath(this.extensionUri, "out", "mainWebView.html");
  }

  public resolveWebviewView(
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
        async (data: JumpToHighlightParams): Promise<void> => {
          console.log(
            "[Code Mark Highlighter] jumpToHighlightNotificationType - Received request to jump to highlight from WebView: ",
            data,
          );
          const highlight: Highlight | undefined = this.highlightRepository.findHighlightById(
            data.filePath,
            data.id,
          );
          if (highlight) {
            console.log(
              `[Code Mark Highlighter] jumpToHighlightNotificationType - Found highlight with ID: ${data.id} in file: ${data.filePath}`,
            );
            await jumpToHighlight(
              data.filePath,
              highlight.codeSnippet,
              highlight.codeHash,
              getFuzzyThreshold(),
              data.jumpInSplitEditor,
            );
          } else {
            console.warn(
              `[Code Mark Highlighter] jumpToHighlightNotificationType - Could not find highlight with ID: ${data.id} in file: ${data.filePath}`,
            );
          }
          // await jumpToHighlight(
          //   data.filePath,
          //   data.codeSnippet,
          //   data.codeHash,
          //   getFuzzyThreshold(),
          //   data.jumpInSplitEditor,
          // );
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
    if (!(this.view && this.webviewIdMessageParticipant)) {
      return;
    }

    const webviewViewModel: WebviewViewModel = this.highlightRepository.createWebviewModel();
    this.messenger.sendNotification(
      updateWebViewNotificationType,
      this.webviewIdMessageParticipant,
      webviewViewModel,
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
    return fs
      .readFileSync(this.mainWebViewHtmlUri.fsPath, "utf-8")
      .replaceAll("#NNNN#", getNonce());
  }
}
