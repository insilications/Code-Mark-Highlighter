const files = [
  {
    filePath: "src/utils/math.ts",
    filePathSearch: "src/utils/math.ts",
    highlights: [
      {
        id: "hl-101",
        codeSnippetDisplay: "function add(a: number, b: number): number {",
        codeSnippetDisplaySearch: "function add(a: number, b: number): number {",
        tag: "TODO",
        tagSearch: "todo",
        color: "#FF5733",
        range: [
          {
            line: 4,
            character: 0,
          },
          {
            line: 4,
            character: 42,
          },
        ],
      },
      {
        id: "hl-102",
        codeSnippetDisplay: "onClick={handleClick}",
        codeSnippetDisplaySearch: "onclick={handleclick}",
        tag: "Review",
        tagSearch: "review",
        color: "#33FF57",
        range: [
          {
            line: 5,
            character: 2,
          },
          {
            line: 5,
            character: 15,
          },
        ],
      },
    ],
  },
  {
    filePath: "src/components/Button.tsx",
    filePathSearch: "src/components/button.tsx",
    highlights: [
      {
        id: "hl-201",
        codeSnippetDisplay: "onClick={handleClick}",
        codeSnippetDisplaySearch: "onclick={handleclick}",
        tag: "Bug",
        tagSearch: "bug",
        color: "#FFC300",
        range: [
          {
            line: 12,
            character: 8,
          },
          {
            line: 12,
            character: 29,
          },
        ],
      },
      {
        id: "hl-201",
        codeSnippetDisplay: "onClick={handleChange}",
        codeSnippetDisplaySearch: "onclick={handlechange}",
        tag: "Bug",
        tagSearch: "bug",
        color: "#FFC300",
        range: [
          {
            line: 12,
            character: 8,
          },
          {
            line: 12,
            character: 29,
          },
        ],
      },
    ],
  },
  {
    filePath: "src/components/Option.tsx",
    filePathSearch: "src/components/option.tsx",
    highlights: [
      {
        id: "hl-201",
        codeSnippetDisplay: "aasd",
        codeSnippetDisplaySearch: "asd",
        tag: "Bug",
        tagSearch: "bug",
        color: "#FFC300",
        range: [
          {
            line: 12,
            character: 8,
          },
          {
            line: 12,
            character: 29,
          },
        ],
      },
      {
        id: "hl-201",
        codeSnippetDisplay: "qwe",
        codeSnippetDisplaySearch: "qwe",
        tag: "TEST",
        tagSearch: "test",
        color: "#FFC300",
        range: [
          {
            line: 12,
            character: 8,
          },
          {
            line: 12,
            character: 29,
          },
        ],
      },
    ],
  },
];


export function filterFileHighlights(
  files: FileHighlightsViewModel[],
  tagQuery: string,
  searchQuery: string,
): FileHighlightsViewModel[] {
  const tagNeedle = tagQuery.toLowerCase();
  const searchNeedle = searchQuery.toLowerCase();

  // Nothing to filter.
  if (!tagNeedle && !searchNeedle) {
    return files;
  }

  const result: FileHighlightsViewModel[] = [];

  // Tag-only filtering.
  if (tagNeedle && !searchNeedle) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const highlights = file.highlights;
      const matches: HighlightViewModel[] = [];

      for (let j = 0; j < highlights.length; j++) {
        const highlight = highlights[j]!;

        if (highlight.tagSearch.includes(tagNeedle)) {
          matches.push(highlight);
        }
      }

      if (matches.length !== 0) {
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
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;

      // A matching path means every highlight in the file matches.
      if (file.filePathSearch.includes(searchNeedle)) {
        result.push(file);
        continue;
      }

      const highlights = file.highlights;
      const matches: HighlightViewModel[] = [];

      for (let j = 0; j < highlights.length; j++) {
        const highlight = highlights[j]!;

        if (highlight.codeSnippetDisplaySearch.includes(searchNeedle)) {
          matches.push(highlight);
        }
      }

      if (matches.length !== 0) {
        result.push({
          ...file,
          highlights: matches,
        });
      }
    }

    return result;
  }

  // Both tag and search filtering.
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const fileMatches = file.filePathSearch.includes(searchNeedle);
    const highlights = file.highlights;
    const matches: HighlightViewModel[] = [];

    for (let j = 0; j < highlights.length; j++) {
      const highlight = highlights[j]!;

      // Tag filtering happens first, as required.
      if (!highlight.tagSearch.includes(tagNeedle)) {
        continue;
      }

      if (
        fileMatches ||
        highlight.codeSnippetDisplaySearch.includes(searchNeedle)
      ) {
        matches.push(highlight);
      }
    }

    if (matches.length !== 0) {
      result.push({
        ...file,
        highlights: matches,
      });
    }
  }

  return result;
}


// const result = filterFileHighlights(files, "Bug", "");
// const result = filterFileHighlights(files, "Bug", "onclick");
// const result = filterFileHighlights(files, "", "onclick");
const result = filterFileHighlights(files, "", "");
console.log("result: ", result);


