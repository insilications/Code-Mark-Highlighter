// src/sidebarProvider.ts
// Sidebar webview panel — shows all highlights with filter, navigation and CRUD actions.

import * as vscode from "vscode";
import { Highlight } from "./types";
import { loadHighlights, removeHighlight } from "./storage";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly VIEW_ID = "codemark.highlightsPanel";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    private readonly _onAction: (action: string, data: unknown) => void,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _ctx: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._buildHtml();
    this._setMessageListener(webviewView.webview);
    this.refresh();
  }

  public refresh(): void {
    if (!this._view) {
      return;
    }
    const highlights = loadHighlights(this._context);
    this._view.webview.postMessage({ type: "update", highlights });
  }

  public reveal(): void {
    this._view?.show?.(true);
  }

  private _setMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(
      async (msg: {
        command: string;
        id?: string;
        filePath?: string;
        snippet?: string;
        hash?: string;
        jumpInSplitEditor?: boolean;
      }) => {
        switch (msg.command) {
          case "jumpTo":
            this._onAction("jumpTo", {
              filePath: msg.filePath,
              snippet: msg.snippet,
              codeHash: msg.hash,
              jumpInSplitEditor: msg.jumpInSplitEditor,
            });
            break;
          case "delete":
            if (msg.id) {
              removeHighlight(this._context, msg.id);
              this.refresh();
              this._onAction("refresh", {});
            }
            break;
          case "editTag":
            this._onAction("editTag", { id: msg.id });
            break;
          case "changeColor":
            this._onAction("changeColor", { id: msg.id });
            break;
          case "ready":
            this.refresh();
            break;
        }
      },
      undefined,
      this._context.subscriptions,
    );
  }

  private _buildHtml(): string {
    const nonce = getNonce();
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Code Mark Highlighter</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --dm-bg: var(--vscode-sideBar-background, #1e1e2e);
      --dm-fg: var(--vscode-foreground, #cdd6f4);
      --dm-muted: var(--vscode-descriptionForeground, #7f849c);
      --dm-border: var(--vscode-panel-border, #313244);
      --dm-input-bg: var(--vscode-input-background, #181825);
      --dm-hover: var(--vscode-list-hoverBackground, #2a2a3c);
      --dm-accent: var(--vscode-focusBorder, #89b4fa);
      --dm-btn: var(--vscode-button-background, #89b4fa);
      --dm-btn-fg: var(--vscode-button-foreground, #1e1e2e);
      --dm-danger: #f38ba8;
      --dm-radius: 8px;
      --dm-font: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
      --dm-mono: var(--vscode-editor-font-family, 'Cascadia Code', 'Fira Code', monospace);
    }

    body {
      font-family: var(--dm-font);
      font-size: 13px;
      color: var(--dm-fg);
      background: var(--dm-bg);
      overflow-x: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 12px 8px;
      border-bottom: 1px solid var(--dm-border);
      flex-shrink: 0;
    }
    .header-logo {
      font-size: 16px;
    }
    .header-title {
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.5px;
      flex: 1;
    }
    .header-count {
      font-size: 11px;
      color: var(--dm-muted);
      background: var(--dm-input-bg);
      border-radius: 10px;
      padding: 2px 7px;
    }

    /* ── Filter Bar ── */
    .filter-bar {
      padding: 8px 12px;
      display: flex;
      gap: 6px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--dm-border);
    }
    .filter-bar input {
      flex: 1;
      background: var(--dm-input-bg);
      border: 1px solid var(--dm-border);
      border-radius: 6px;
      color: var(--dm-fg);
      font-family: var(--dm-font);
      font-size: 12px;
      padding: 5px 8px;
      outline: none;
      transition: border-color 0.15s;
    }
    .filter-bar input:focus {
      border-color: var(--dm-accent);
    }
    .filter-bar select {
      background: var(--dm-input-bg);
      border: 1px solid var(--dm-border);
      border-radius: 6px;
      color: var(--dm-fg);
      font-family: var(--dm-font);
      font-size: 12px;
      padding: 5px 6px;
      outline: none;
      cursor: pointer;
    }

    /* ── List ── */
    .list {
      flex: 1;
      overflow-y: auto;
      padding: 6px 0;
    }
    .list::-webkit-scrollbar { width: 4px; }
    .list::-webkit-scrollbar-track { background: transparent; }
    .list::-webkit-scrollbar-thumb { background: var(--dm-border); border-radius: 4px; }

    /* ── Highlight Card ── */
    .card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 3px 3px;
      padding: 8px 10px 8px 10px;
      background: var(--dm-input-bg);
      border: 1px solid var(--dm-border);
      border-radius: var(--dm-radius);
      cursor: pointer;
      transition: background 0.12s, transform 0.1s;
      position: relative;
      animation: fadeIn 0.2s ease;
    }
    .card:hover {
      background: var(--dm-hover);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .card-top {
      display: flex;
      align-items: center;
      gap: 2px;
      justify-content: center;
      align-content: center;
      flex-wrap: nowrap;
    }
    .card-tag {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      padding: 1px 6px;
      border-radius: 4px;
      opacity: 0.9;
      flex-shrink: 0;
    }
    .card-file {
      font-size: 10px;
      color: var(--dm-muted);
      margin-left: auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 120px;
    }

    .card-snippet {
      font-family: var(--dm-mono);
      font-size: 10.5px;
      color: var(--dm-muted);
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: preserve nowrap;
      background: var(--dm-bg);
      padding: 6px 3px;
      border-radius: 4px;
      border: 1px solid var(--dm-border);
    }

    .card-actions {
      display: flex;
      gap: 1px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .card:hover .card-actions { opacity: 1; }

    .btn {
      font-size: 10px;
      font-family: var(--dm-font);
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid var(--dm-border);
      background: var(--dm-hover);
      color: var(--dm-fg);
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s;
    }
    .btn:hover { background: var(--dm-accent); color: var(--dm-btn-fg); border-color: var(--dm-accent); }
    .btn-danger:hover { background: var(--dm-danger); color: #fff; border-color: var(--dm-danger); }
    .btn-jump { font-weight: 600; }

    /* ── Empty State ── */
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 40px 20px;
      color: var(--dm-muted);
      text-align: center;
    }
    .empty-icon { font-size: 40px; opacity: 0.5; }
    .empty-title { font-size: 13px; font-weight: 600; }
    .empty-sub { font-size: 11px; line-height: 1.5; }

    /* ── Stats Bar ── */
    .stats-bar {
      display: flex;
      padding: 6px 12px;
      gap: 8px;
      font-size: 10px;
      color: var(--dm-muted);
      border-top: 1px solid var(--dm-border);
      flex-shrink: 0;
    }
    .stats-bar span { display: flex; align-items: center; gap: 3px; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <span class="header-logo">🔖</span>
    <span class="header-title">Code Mark</span>
    <span class="header-count" id="count">0</span>
  </div>

  <!-- Filter Bar -->
  <div class="filter-bar">
    <input id="search" type="text" placeholder="Search tags, code…" />
    <select id="filter-tag">
      <option value="">All tags</option>
    </select>
  </div>

  <!-- Highlight List -->
  <div class="list" id="list">
    <div class="empty">
      <div class="empty-icon">✨</div>
      <div class="empty-title">No highlights yet</div>
      <div class="empty-sub">Select code → right-click<br>→ <strong>Code Mark: Highlight Code</strong></div>
    </div>
  </div>

  <!-- Stats Bar -->
  <div class="stats-bar" id="stats-bar" style="display:none">
    <span id="stat-total">0 highlights</span>
    <span>·</span>
    <span id="stat-files">0 files</span>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let allHighlights = [];
    let searchQuery = '';
    let filterTag = '';

    const listEl = document.getElementById('list');
    const countEl = document.getElementById('count');
    const statsBar = document.getElementById('stats-bar');
    const statTotal = document.getElementById('stat-total');
    const statFiles = document.getElementById('stat-files');
    const filterTagEl = document.getElementById('filter-tag');
    const searchEl = document.getElementById('search');

    // Receive updates from extension
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'update') {
        allHighlights = msg.highlights || [];
        rebuildTagFilter();
        render();
      }
    });

    // Search / filter
    searchEl.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      render();
    });
    filterTagEl.addEventListener('change', (e) => {
      filterTag = e.target.value;
      render();
    });

    function rebuildTagFilter() {
      const tags = [...new Set(allHighlights.map(h => h.tag).filter(Boolean))].sort();
      const current = filterTagEl.value;
      filterTagEl.innerHTML = '<option value="">All tags</option>' +
        tags.map(t => \`<option value="\${esc(t)}" \${t === current ? 'selected' : ''}>\${esc(t)}</option>\`).join('');
    }

    function filteredHighlights() {
      return allHighlights.filter(h => {
        if (filterTag && h.tag !== filterTag) return false;
        if (searchQuery) {
          const haystack = ((h.tag || '') + ' ' + (h.codeSnippet || '') + ' ' + (h.filePath || '')).toLowerCase();
          if (!haystack.includes(searchQuery)) return false;
        }
        return true;
      });
    }

    function render() {
      const items = filteredHighlights();
      countEl.textContent = items.length;

      if (items.length === 0) {
        if (allHighlights.length === 0) {
          listEl.innerHTML = \`<div class="empty">
            <div class="empty-icon">✨</div>
            <div class="empty-title">No highlights yet</div>
            <div class="empty-sub">Select code → right-click<br>→ <strong>Code Mark: Highlight Code</strong></div>
          </div>\`;
        } else {
          listEl.innerHTML = \`<div class="empty">
            <div class="empty-icon">🔍</div>
            <div class="empty-title">No results</div>
            <div class="empty-sub">Try a different search or filter.</div>
          </div>\`;
        }
        statsBar.style.display = 'none';
        return;
      }

      // Sort: by file then by tag
      const sorted = [...items].sort((a, b) =>
        a.filePath.localeCompare(b.filePath) || (a.tag || '').localeCompare(b.tag || '')
      );

      listEl.innerHTML = sorted.map(h => renderCard(h)).join('');

      // Stats
      const uniqueFiles = new Set(items.map(h => h.filePath)).size;
      statTotal.textContent = items.length + ' highlight' + (items.length !== 1 ? 's' : '');
      statFiles.textContent = uniqueFiles + ' file' + (uniqueFiles !== 1 ? 's' : '');
      statsBar.style.display = 'flex';

      // Bind card events
      listEl.querySelectorAll('.card').forEach(card => {
        const id = card.dataset.id;
        const h = allHighlights.find(x => x.id === id);
        if (!h) return;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.card-actions')) return;
          if (e.altKey) {
            vscode.postMessage({ command: 'jumpTo', filePath: h.filePath, snippet: h.codeSnippet, hash: h.codeHash, jumpInSplitEditor: true });
          } else {
            vscode.postMessage({ command: 'jumpTo', filePath: h.filePath, snippet: h.codeSnippet, hash: h.codeHash, jumpInSplitEditor: false });
          }
        });

        card.querySelector('.btn-jump')?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (e.altKey) {
            vscode.postMessage({ command: 'jumpTo', filePath: h.filePath, snippet: h.codeSnippet, hash: h.codeHash, jumpInSplitEditor: true });
          } else {
            vscode.postMessage({ command: 'jumpTo', filePath: h.filePath, snippet: h.codeSnippet, hash: h.codeHash, jumpInSplitEditor: false });
          }
        });
        card.querySelector('.btn-tag')?.addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'editTag', id: h.id });
        });
        card.querySelector('.btn-color')?.addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'changeColor', id: h.id });
        });
        card.querySelector('.btn-delete')?.addEventListener('click', (e) => {
          e.stopPropagation();
          vscode.postMessage({ command: 'delete', id: h.id });
        });
      });
    }

    function renderCard(h) {
      const snippet = esc(h.codeSnippetDisplay.split('\\n').slice(0, 12).join('\\n'));
      const fileName = esc(h.filePath);
      const tagColor = esc(h.color);
      const tagBg = hexToRgba(h.color, 0.18);

      return \`<div class="card" data-id="\${esc(h.id)}" style="border: 1px solid \${tagColor};">
        <div class="card-top">
          \${h.tag ? \`<span class="card-tag" style="background:\${tagBg};color:\${tagColor}">\${esc(h.tag)}</span>\` : ''}
          <div class="card-actions">
            <button class="btn btn-jump">↗ Jump</button>
            <button class="btn btn-tag">🏷 Tag</button>
            <button class="btn btn-color">🎨 Color</button>
            <button class="btn btn-danger btn-delete">🗑</button>
          </div>
          <span class="card-file" title="\${fileName}">\${fileName}</span>
        </div>
        <div class="card-snippet">\${snippet}</div>
      </div>\`;
    }

    function esc(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function hexToRgba(hex, alpha) {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return \`rgba(\${r},\${g},\${b},\${alpha})\`;
    }

    // Notify extension we're ready
    vscode.postMessage({ command: 'ready' });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
