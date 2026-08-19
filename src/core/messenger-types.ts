import type { NotificationType } from "vscode-messenger-common";

import type { JumpToHighlightParams, WebviewViewModel } from "./types";

// =====================================================================
// WebView message types — declare once, import on both sides
// =====================================================================
export const jumpToHighlightNotificationType: NotificationType<JumpToHighlightParams> = {
  method: "jumpToHighlight",
};
export const webViewReadyNotificationType: NotificationType<void> = {
  method: "webViewReady",
};
export const refreshActiveEditorNotificationType: NotificationType<void> = {
  method: "refreshActiveEditor",
};
export const updateWebViewNotificationType: NotificationType<WebviewViewModel> = {
  method: "updateWebView",
};
