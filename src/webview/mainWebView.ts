// oxlint-disable legibility/no-quadratic-patterns max-depth legibility/max-control-flow-depth

import { HOST_EXTENSION } from "vscode-messenger-common";
import type { VsCodeApi } from "vscode-messenger-webview";
import { Messenger } from "vscode-messenger-webview";

import {
  jumpToHighlightNotificationType,
  updateWebViewNotificationType,
  webViewReadyNotificationType,
} from "@/core/messenger-types";
import type { FileHighlightsViewModel, HighlightViewModel } from "@/core/types";

import "./mainWebView.css";
import { esc, hexToRgba } from "./utils";

declare function acquireVsCodeApi(): VsCodeApi;

const ALL_TAGS: string = "All Tags";

// const CARD_LIST_NO_HIGHLIGHTS_HTML: string = `<div class="empty">
//           <div class="empty-icon">✨</div>
//           <div class="empty-title">No highlights yet</div>
//           <div class="empty-sub">Select code → right-click<br>→ <strong>Code Mark: Highlight Code</strong></div>
//         </div>`;
// const CARD_LIST_NO_RESULTS_HTML: string = `<div class="empty">
//           <div class="empty-icon">🔍</div>
//           <div class="empty-title">No results</div>
//           <div class="empty-sub">Try a different search or filter.</div>
//         </div>`;

// This will be run within the WebView itself and cannot access the main VS Code APIs directly.
((): void => {
  let fileHighlightsViewModel: FileHighlightsViewModel[] = [];
  const vscode: VsCodeApi = acquireVsCodeApi();
  const messenger = new Messenger(vscode);

  let searchNeedle: string = "";
  let tagNeedle: string = "";

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const cardsTemplate: HTMLTemplateElement = document.getElementById(
    "cards",
  ) as HTMLTemplateElement;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const cardListElement: HTMLDivElement = document.getElementById("list") as HTMLDivElement;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const cardListEmptyHighlightsElement: HTMLDivElement = document.getElementById(
    "empty-highlights",
  ) as HTMLDivElement;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const cardListEmptyResultsElement: HTMLDivElement = document.getElementById(
    "empty-results",
  ) as HTMLDivElement;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const cardCountElement: HTMLSpanElement = document.getElementById("count") as HTMLSpanElement;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const statsBarElement: HTMLDivElement = document.getElementById("stats-bar") as HTMLDivElement;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const statsTotalElement: HTMLSpanElement = document.getElementById(
    "stat-total",
  ) as HTMLSpanElement;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const statsFilesElement: HTMLSpanElement = document.getElementById(
    "stat-files",
  ) as HTMLSpanElement;
  // oxlint-disable-next-line typescript/no-non-null-assertion typescript/no-unsafe-type-assertion
  const filterTagElement: HTMLSelectElement = document.getElementById(
    "filter-tag",
  )! as HTMLSelectElement;

  // oxlint-disable-next-line typescript/no-non-null-assertion typescript/no-unsafe-type-assertion
  const searchEl: HTMLInputElement = document.getElementById("search")! as HTMLInputElement;

  function rebuildTagFilter(): void {
    const uniqueTags = new Set<string>();

    for (const file of fileHighlightsViewModel) {
      for (const highlight of file.highlights) {
        uniqueTags.add(esc(highlight.tag));
      }
    }
    // const tags: string[] = Array.from(uniqueTags).sort();
    const tags: string[] = Array.from(uniqueTags);
    tags.sort();

    filterTagElement.innerHTML = tags
      .map((t: string): string => {
        const label: string = t === "" ? ALL_TAGS : t;
        return `<option value="${t}" ${t === filterTagElement.value ? "selected" : ""}>${label}</option>`;
      })
      .join("");
  }

  /**
   * Filters file highlights by an optional tag query and/or text search query.
   *
   * Matching is case-insensitive and substring-based. The function expects the pre-normalized
   * lowercase `filePathSearch`, `tagSearch`, and `codeSnippetDisplaySearch` properties to be kept
   * in sync with their corresponding display values.
   *
   * A highlight is included when both of the following conditions are satisfied:
   *
   * 1. If `tagQuery` is non-empty, the highlight's `tagSearch` must contain the normalized tag query.
   *    If `tagQuery` is empty, no tag filtering is applied.
   * 2. If `searchQuery` is non-empty, either the containing file's `filePathSearch` or the highlight's
   *    `codeSnippetDisplaySearch` must contain the normalized search query. If `searchQuery` is
   *    empty, no text filtering is applied.
   *
   * Consequently, when both queries are provided, they are combined using AND semantics: a
   * highlight must satisfy the tag filter and must also satisfy either the file-path or
   * code-snippet search.
   *
   * Files for which no highlights satisfy the active filters are omitted from the returned array.
   *
   * If neither query is provided, the original `fileHighlightsViewModel` array is returned
   * unchanged. The implementation may also reuse original file and highlight objects where
   * filtering does not require constructing a reduced highlights array; callers therefore should
   * not assume that the returned data is a deep copy.
   *
   * The function does not mutate `fileHighlightsViewModel` or any contained view model.
   *
   * @returns {FileHighlightsViewModel[]} The files containing highlights that satisfy the active
   *   filters, with each file's `highlights` array containing only matching highlights. Returns the
   *   original `fileHighlightsViewModel` array when both queries are empty.
   */
  function filterFileHighlights(): FileHighlightsViewModel[] {
    // Nothing to filter.
    if (!(tagNeedle || searchNeedle)) {
      return fileHighlightsViewModel;
    }

    const fileHighlightsViewModelLength: number = fileHighlightsViewModel.length;
    const result: FileHighlightsViewModel[] = [];

    // Tag-only filtering.
    if (tagNeedle && !searchNeedle) {
      for (let i: number = 0; i < fileHighlightsViewModelLength; i++) {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        const file: FileHighlightsViewModel = fileHighlightsViewModel[i]!;
        const highlights: HighlightViewModel[] = file.highlights;
        const matches: HighlightViewModel[] = [];

        for (let j: number = 0; j < highlights.length; j++) {
          // oxlint-disable-next-line typescript/no-non-null-assertion
          const highlight: HighlightViewModel = highlights[j]!;

          if (highlight.tagSearch.includes(tagNeedle)) {
            matches.push(highlight);
          }
        }

        if (matches.length > 0) {
          result.push({
            ...file,
            highlights: matches,
          });
        }
      }

      return result;
    }

    // Search-only filtering.
    if (!tagNeedle) {
      for (let i: number = 0; i < fileHighlightsViewModelLength; i++) {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        const file: FileHighlightsViewModel = fileHighlightsViewModel[i]!;

        // A matching path means every highlight in the file matches.
        if (file.filePathSearch.includes(searchNeedle)) {
          result.push(file);
          continue;
        }

        const highlights: HighlightViewModel[] = file.highlights;
        const matches: HighlightViewModel[] = [];

        for (let j: number = 0; j < highlights.length; j++) {
          // oxlint-disable-next-line typescript/no-non-null-assertion
          const highlight: HighlightViewModel = highlights[j]!;

          if (highlight.codeSnippetDisplaySearch.includes(searchNeedle)) {
            matches.push(highlight);
          }
        }

        if (matches.length > 0) {
          result.push({
            ...file,
            highlights: matches,
          });
        }
      }

      return result;
    }

    // Both tag and search filtering.
    for (let i: number = 0; i < fileHighlightsViewModelLength; i++) {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      const file: FileHighlightsViewModel = fileHighlightsViewModel[i]!;
      // oxlint-disable-next-line legibility/no-repeated-collection-search
      const fileMatches: boolean = file.filePathSearch.includes(searchNeedle);
      const highlights: HighlightViewModel[] = file.highlights;
      const matches: HighlightViewModel[] = [];

      for (let j: number = 0; j < highlights.length; j++) {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        const highlight: HighlightViewModel = highlights[j]!;

        // Tag filtering happens first, as required.
        // oxlint-disable-next-line legibility/no-repeated-collection-search
        if (!highlight.tagSearch.includes(tagNeedle)) {
          continue;
        }

        // oxlint-disable-next-line legibility/no-repeated-collection-search
        if (fileMatches || highlight.codeSnippetDisplaySearch.includes(searchNeedle)) {
          matches.push(highlight);
        }
      }

      if (matches.length > 0) {
        result.push({
          ...file,
          highlights: matches,
        });
      }
    }

    return result;
  }

  //   function renderCard(filePath: string, highlight: HighlightViewModel): string {
  //   const snippet = esc(highlight.codeSnippetDisplay.split("\\n").slice(0, 12).join("\\n"));
  //   const fileName = esc(filePath);
  //   const tagColor = esc(highlight.color);
  //   const tagBg = hexToRgba(highlight.color, 0.18);

  //   return `<div class="card" data-id="${esc(highlight.id)}" style="border: 1px solid ${tagColor};">
  //     <div class="card-top">
  //       ${highlight.tag ? `<span class="card-tag" style="background:${tagBg};color:${tagColor}">${esc(highlight.tag)}</span>` : ""}
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

  function renderCard(filePath: string, highlight: HighlightViewModel): HTMLDivElement {
    // const snippet = esc(highlight.codeSnippetDisplay.split("\\n").slice(0, 12).join("\\n"));
    const snippet: string = highlight.codeSnippetDisplay.split("\\n").slice(0, 12).join("\\n");
    const id: string = esc(highlight.id);
    // const tagName: string = esc(highlight.tag);
    // const fileName: string = esc(filePath);
    // const tagColor: string = esc(highlight.color);
    // oxlint-disable-next-line legibility/no-single-use-renaming-alias
    const tagColor: string = highlight.color;
    // const tagBg: string = hexToRgba(highlight.color, 0.18);
    // cardsTemplate
    // const newDiv = document.createElement("div");
    const cardsTemplateClone: Node = cardsTemplate.content.cloneNode(true);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const cardElement: HTMLDivElement = (cardsTemplateClone as DocumentFragment).querySelector(
      ".card",
    ) as HTMLDivElement;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const cardFileElement: HTMLSpanElement = cardElement.querySelector(
      ".card-file",
    ) as HTMLSpanElement;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const cardSnippetElement: HTMLDivElement = cardElement.querySelector(
      ".card-snippet",
    ) as HTMLDivElement;

    cardElement.dataset.id = id;
    cardElement.style.borderColor = tagColor;
    cardFileElement.title = filePath;
    cardFileElement.textContent = filePath;
    cardSnippetElement.textContent = snippet;

    return cardElement;

    // return `<div class="card" data-id="${esc(highlight.id)}">
    //   <div class="card-top">
    //     ${tagName ? `<span class="card-tag">${tagName}</span>` : ""}
    //     <div class="card-actions">
    //       <button class="btn btn-jump">↗ Jump</button>
    //       <button class="btn btn-tag">🏷 Tag</button>
    //       <button class="btn btn-color">🎨 Color</button>
    //       <button class="btn btn-danger btn-delete">🗑</button>
    //     </div>
    //     <span class="card-file" title="${fileName}">${fileName}</span>
    //   </div>
    //   <div class="card-snippet">${snippet}</div>
    // </div>`;
  }

  function render(): void {
    const filteredFileHighlights: FileHighlightsViewModel[] = filterFileHighlights();
    // oxlint-disable-next-line prefer-template
    cardCountElement.textContent = "" + filteredFileHighlights.length;

    if (filteredFileHighlights.length === 0) {
      if (fileHighlightsViewModel.length === 0) {
        // cardListElement.innerHTML = CARD_LIST_NO_HIGHLIGHTS_HTML;
        cardListEmptyResultsElement.style.display = "none";
        cardListEmptyHighlightsElement.style.display = "flex";
      } else {
        // cardListElement.innerHTML = CARD_LIST_NO_RESULTS_HTML;
        cardListEmptyHighlightsElement.style.display = "none";
        cardListEmptyResultsElement.style.display = "flex";
      }
      statsBarElement.style.display = "none";
      return;
    }

    // const renderedCardsFragment: DocumentFragment = document.createDocumentFragment();
    const renderedCards: HTMLDivElement[] = [];
    for (const filehighlight of filteredFileHighlights) {
      // oxlint-disable-next-line legibility/no-single-use-renaming-alias
      const filePath: string = filehighlight.filePath;
      for (const highlight of filehighlight.highlights) {
        renderedCards.push(renderCard(filePath, highlight));
      }
    }

    // cardListElement.innerHTML = renderedCards.join("");
    cardListElement.append(...renderedCards);

    // Stats
    const uniqueFiles: number = new Set(
      filteredFileHighlights.map((h: FileHighlightsViewModel) => h.filePath),
    ).size;
    const totalHighlights: number = filteredFileHighlights.reduce(
      (acc: number, fh: FileHighlightsViewModel) => acc + fh.highlights.length,
      0,
    );
    statsTotalElement.textContent = `${totalHighlights} highlight${totalHighlights === 1 ? "" : "s"}`;
    statsFilesElement.textContent = `${uniqueFiles} file${uniqueFiles === 1 ? "" : "s"}`;
    statsBarElement.style.display = "flex";

    // Bind card events
    const renderedCardsList: NodeListOf<HTMLDivElement> = cardListElement.querySelectorAll(".card");
    for (let i: number = 0; i < renderedCardsList.length; i++) {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      const renderedCard: HTMLDivElement = renderedCardsList[i]!;
      // oxlint-disable-next-line legibility/no-single-use-renaming-alias
      const renderedCardId: string | undefined = renderedCard.dataset.id;
      for (let j: number = 0; j < filteredFileHighlights.length; j++) {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        const fileHighlight: FileHighlightsViewModel = filteredFileHighlights[j]!;
        const fileHighlightHighlights: HighlightViewModel[] = fileHighlight.highlights;
        for (let k: number = 0; k < fileHighlightHighlights.length; k++) {
          // oxlint-disable-next-line typescript/no-non-null-assertion
          const highlight: HighlightViewModel = fileHighlightHighlights[k]!;
          if (highlight.id === renderedCardId) {
            const card: HTMLDivElement | undefined = renderedCardsList[i];
            if (card) {
              card.addEventListener("click", (e: PointerEvent) => {
                // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                if ((e.target as HTMLDivElement | null)?.closest(".card-actions")) {
                  return;
                }
                if (e.altKey) {
                  messenger.sendNotification(jumpToHighlightNotificationType, HOST_EXTENSION, {
                    filePath: fileHighlight.filePath,
                    codeSnippet: highlight.codeSnippet,
                    codeHash: highlight.codeHash,
                    fuzzyThreshold: 0.75,
                    jumpInSplitEditor: true,
                  });
                } else {
                  messenger.sendNotification(jumpToHighlightNotificationType, HOST_EXTENSION, {
                    filePath: fileHighlight.filePath,
                    codeSnippet: highlight.codeSnippet,
                    codeHash: highlight.codeHash,
                    fuzzyThreshold: 0.75,
                    jumpInSplitEditor: false,
                  });
                }
              });
              const jumpButton: HTMLButtonElement | null = card.querySelector(".btn-jump");
              jumpButton?.addEventListener("click", (e: PointerEvent) => {
                e.stopPropagation();
                if (e.altKey) {
                  messenger.sendNotification(jumpToHighlightNotificationType, HOST_EXTENSION, {
                    filePath: fileHighlight.filePath,
                    codeSnippet: highlight.codeSnippet,
                    codeHash: highlight.codeHash,
                    fuzzyThreshold: 0.75,
                    jumpInSplitEditor: true,
                  });
                } else {
                  messenger.sendNotification(jumpToHighlightNotificationType, HOST_EXTENSION, {
                    filePath: fileHighlight.filePath,
                    codeSnippet: highlight.codeSnippet,
                    codeHash: highlight.codeHash,
                    fuzzyThreshold: 0.75,
                    jumpInSplitEditor: false,
                  });
                }
              });
              const tagButton: HTMLButtonElement | null = card.querySelector(".btn-tag");
              tagButton?.addEventListener("click", (e) => {
                e.stopPropagation();
                console.log("Tag button clicked for highlight id:", highlight.id);
                //   vscode.postMessage({ command: "editTag", id: h.id });
              });
              const colorButton: HTMLButtonElement | null = card.querySelector(".btn-color");
              colorButton?.addEventListener("click", (e) => {
                e.stopPropagation();
                console.log("Color button clicked for highlight id:", highlight.id);
                //   vscode.postMessage({ command: "changeColor", id: h.id });
              });
              const deleteButton: HTMLButtonElement | null = card.querySelector(".btn-delete");
              deleteButton?.addEventListener("click", (e) => {
                e.stopPropagation();
                console.log("Delete button clicked for highlight id:", highlight.id);
                //   vscode.postMessage({ command: "delete", id: h.id });
              });
            }
          }
        }
      }
    }
  }

  // // Search / filter
  searchEl.addEventListener("input", (e: Event): void => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    searchNeedle = (e.target as HTMLInputElement).value.trim().toLowerCase();
    render();
  });
  filterTagElement.addEventListener("change", (e: Event): void => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    tagNeedle = (e.target as HTMLInputElement).value.trim().toLowerCase();
    render();
  });

  messenger.onNotification(
    updateWebViewNotificationType,
    (params: FileHighlightsViewModel[]): void => {
      console.log(
        "[Code Mark Highlighter] updateWebViewNotificationType - Received from extension: ",
        params,
      );
      fileHighlightsViewModel = params;
      console.log("fileHighlightsViewModel: ", fileHighlightsViewModel);
      rebuildTagFilter();
      render();
    },
  );
  messenger.start();

  //Notify extension we're ready
  messenger.sendNotification(webViewReadyNotificationType, HOST_EXTENSION);
})();
