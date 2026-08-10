import { Messenger } from "vscode-messenger-webview";

import type { FileHighlightsViewModel } from "../types";
import { updateWebViewNotificationType } from "./sidebarProvider";
// import { HOST_EXTENSION } from 'vscode-messenger-common';

// This will be run within the WebView itself and cannot access the main VS Code APIs directly.
(function (): void {
  let fileHighlightsViewModel: FileHighlightsViewModel[] = [];
  // acquireVsCodeApi() is called automatically
  const messenger = new Messenger();

  messenger.onNotification(updateWebViewNotificationType, (params): void => {
    fileHighlightsViewModel = params;
    console.log("fileHighlightsViewModel: ", fileHighlightsViewModel);
    rebuildTagFilter();
    render();
  });
  messenger.start();

  let searchQuery: string = "";
  let filterTag: string = "";

  // const listEl = document.getElementById("list");
  // const countEl = document.getElementById("count");
  // const statsBar = document.getElementById("stats-bar");
  // const statTotal = document.getElementById("stat-total");
  // const statFiles = document.getElementById("stat-files");

  // oxlint-disable-next-line typescript/no-non-null-assertion
  const filterTagEl: HTMLSelectElement = document.getElementById(
    "filter-tag",
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  )! as HTMLSelectElement;

  // oxlint-disable-next-line typescript/no-non-null-assertion typescript/no-unsafe-type-assertion
  const searchEl: HTMLInputElement = document.getElementById("search")! as HTMLInputElement;

  // // Receive updates from extension
  // window.addEventListener('message', (event) => {
  //   const msg = event.data;
  //   if (msg.type === 'update') {
  //     fileHighlightsViewModel = msg.fileHighlightsViewModel ?? {};
  //     console.log('fileHighlightsViewModel: ', fileHighlightsViewModel);
  //     rebuildTagFilter();
  //     render();
  //   }
  // });

  // // Search / filter
  searchEl.addEventListener("input", (e: Event): void => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
    // render();
  });
  filterTagEl.addEventListener("change", (e: Event): void => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    filterTag = (e.target as HTMLInputElement).value;
    // render();
  });

  function rebuildTagFilter(): void {
    const uniqueTags = new Set<string>();

    for (const file of fileHighlightsViewModel) {
      for (const highlight of file.highlights) {
        uniqueTags.add(esc(highlight.tag));
      }
    }
    const tags: string[] = Array.from(uniqueTags);
    tags.sort();

    filterTagEl.innerHTML = `<option value="">All tags</option>${tags
      .map(
        (t: string): string =>
          `<option value="${t}" ${t === filterTagEl.value ? "selected" : ""}>${t}</option>`,
      )
      .join("")}`;

    // filterTagEl.innerHTML =
    //   '<option value="">All tags</option>' +
    //   tags
    //     .map(
    //       (t) =>
    //         `<option value="${esc(t)}" ${t === filterTagEl.value ? "selected" : ""}>${esc(t)}</option>`,
    //     )
    //     .join("");
  }

  // function filteredHighlights() {
  //   return allHighlights.filter(h => {
  //     if (filterTag && h.tag !== filterTag) return false;
  //     if (searchQuery) {
  //       const haystack = ((h.tag || '') + ' ' + (h.codeSnippet || '') + ' ' + (h.filePath || '')).toLowerCase();
  //       if (!haystack.includes(searchQuery)) return false;
  //     }
  //     return true;
  //   });
  // }

  // function render() {
  //   const items = filteredHighlights();
  //   countEl.textContent = items.length;

  //   if (items.length === 0) {
  //     if (allHighlights.length === 0) {
  //       listEl.innerHTML = `<div class="empty">
  //         <div class="empty-icon">✨</div>
  //         <div class="empty-title">No highlights yet</div>
  //         <div class="empty-sub">Select code → right-click<br>→ <strong>Code Mark: Highlight Code</strong></div>
  //       </div>`;
  //     } else {
  //       listEl.innerHTML = `<div class="empty">
  //         <div class="empty-icon">🔍</div>
  //         <div class="empty-title">No results</div>
  //         <div class="empty-sub">Try a different search or filter.</div>
  //       </div>`;
  //     }
  //     statsBar.style.display = 'none';
  //     return;
  //   }

  //   // Sort: by file then by range
  //   // const sorted = [...items].sort((a, b) => {
  //   //   // 1. Sort by file path alphabetically
  //   //   const fileComparison = a.filePath.localeCompare(b.filePath);
  //   //   if (fileComparison !== 0) {
  //   //     return fileComparison;
  //   //   }

  //   //   // 2. Sort by range (if file paths are identical)
  //   //   // Compare the starting line first
  //   //   if (a.range[0].line !== b.range[0].line) {
  //   //     return a.range[0].line - b.range[0].line;
  //   //   }

  //   //   // If they are on the exact same line, compare the starting character
  //   //   return a.range[0].character - b.range[0].character;
  //   // });

  //   const sortedFilePaths = Object.keys(items).sort((a, b) => {
  //     // 1. Sort by file path alphabetically
  //     const fileComparison = a.filePath.localeCompare(b.filePath);
  //     if (fileComparison !== 0) {
  //       return fileComparison;
  //     }
  //   });

  //   const renderedCards = [];
  //   for (const filePath of sortedFilePaths) {
  //     const filePathsHighlights = items[filePath];
  //     renderedCards.push(...filePathsHighlights.map(h => renderCard(h)));
  //   }

  //   listEl.innerHTML = renderedCards.join('');

  //   // Stats
  //   const uniqueFiles = new Set(items.map(h => h.filePath)).size;
  //   statTotal.textContent = items.length + ' highlight' + (items.length !== 1 ? 's' : '');
  //   statFiles.textContent = uniqueFiles + ' file' + (uniqueFiles !== 1 ? 's' : '');
  //   statsBar.style.display = 'flex';

  //   // Bind card events
  //   listEl.querySelectorAll('.card').forEach(card => {
  //     const id = card.dataset.id;
  //     const h = allHighlights.find(x => x.id === id);
  //     if (!h) return;

  //     card.addEventListener('click', (e) => {
  //       if (e.target.closest('.card-actions')) return;
  //       if (e.altKey) {
  //         vscode.postMessage({ command: 'jumpTo', filePath: h.filePath, snippet: h.codeSnippet, hash: h.codeHash, jumpInSplitEditor: true });
  //       } else {
  //         vscode.postMessage({ command: 'jumpTo', filePath: h.filePath, snippet: h.codeSnippet, hash: h.codeHash, jumpInSplitEditor: false });
  //       }
  //     });

  //     card.querySelector('.btn-jump')?.addEventListener('click', (e) => {
  //       e.stopPropagation();
  //       if (e.altKey) {
  //         vscode.postMessage({ command: 'jumpTo', filePath: h.filePath, snippet: h.codeSnippet, hash: h.codeHash, jumpInSplitEditor: true });
  //       } else {
  //         vscode.postMessage({ command: 'jumpTo', filePath: h.filePath, snippet: h.codeSnippet, hash: h.codeHash, jumpInSplitEditor: false });
  //       }
  //     });
  //     card.querySelector('.btn-tag')?.addEventListener('click', (e) => {
  //       e.stopPropagation();
  //       vscode.postMessage({ command: 'editTag', id: h.id });
  //     });
  //     card.querySelector('.btn-color')?.addEventListener('click', (e) => {
  //       e.stopPropagation();
  //       vscode.postMessage({ command: 'changeColor', id: h.id });
  //     });
  //     card.querySelector('.btn-delete')?.addEventListener('click', (e) => {
  //       e.stopPropagation();
  //       vscode.postMessage({ command: 'delete', id: h.id });
  //     });
  //   });
  // }

  // function renderCard(h) {
  //   const snippet = esc(h.codeSnippetDisplay.split('\\n').slice(0, 12).join('\\n'));
  //   const fileName = esc(h.filePath);
  //   const tagColor = esc(h.color);
  //   const tagBg = hexToRgba(h.color, 0.18);

  //   return `<div class="card" data-id="${esc(h.id)}" style="border: 1px solid ${tagColor};">
  //     <div class="card-top">
  //       ${h.tag ? `<span class="card-tag" style="background:${tagBg};color:${tagColor}">${esc(h.tag)}</span>` : ''}
  //       <div class="card-actions">
  //         <button class="btn btn-jump">↗ Jump</button>
  //         <button class="btn btn-tag">🏷 Tag</button>
  //         <button class="btn btn-color">🎨 Color</button>
  //         <button class="btn btn-danger btn-delete">🗑</button>
  //       </div>
  //       <span class="card-file" title="${fileName}">${fileName}</span>
  //     </div>
  //     <div class="card-snippet">${snippet}</div>
  //   </div>`;
  // }

  function esc(str: unknown): string {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // function hexToRgba(hex: string, alpha: number): string {
  //   const clean = hex.replace('#', '');
  //   const r = parseInt(clean.substring(0, 2), 16);
  //   const g = parseInt(clean.substring(2, 4), 16);
  //   const b = parseInt(clean.substring(4, 6), 16);
  //   return `rgba(${r},${g},${b},${alpha})`;
  // }

  // // Notify extension we're ready
  // vscode.postMessage({ command: 'ready' });
})();
