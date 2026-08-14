import type { NotificationType } from "vscode-messenger-common";

import type { FileHighlightsViewModel, IJumpToHighlightParams } from "./types";

// =====================================================================
// WebView message types — declare once, import on both sides
// =====================================================================
export const jumpToHighlightNotificationType: NotificationType<IJumpToHighlightParams> = {
  method: "jumpToHighlight",
};
export const webViewReadyNotificationType: NotificationType<void> = {
  method: "webViewReady",
};
export const refreshActiveEditorNotificationType: NotificationType<void> = {
  method: "refreshActiveEditor",
};
export const updateWebViewNotificationType: NotificationType<FileHighlightsViewModel[]> = {
  method: "updateWebView",
};
