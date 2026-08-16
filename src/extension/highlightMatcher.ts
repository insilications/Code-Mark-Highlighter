import * as vscode from "vscode";

import { hashText } from "@/core/utils";

function getTrigrams(str: string): Set<string> {
  const s = str.toLowerCase().replace(/\s+/g, " ");
  const trigrams = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) {
    trigrams.add(s.slice(i, i + 3));
  }
  return trigrams;
}

/**
 * Similarity ratio between two strings using a simple character n-gram approach. Returns a value
 * between 0 (completely different) and 1 (identical).
 */
function similarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  // Use trigram similarity for efficiency
  const trigramsA = getTrigrams(a);
  const trigramsB = getTrigrams(b);

  if (trigramsA.size === 0 && trigramsB.size === 0) {
    return 1;
  }
  if (trigramsA.size === 0 || trigramsB.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const t of trigramsA) {
    if (trigramsB.has(t)) {
      intersection++;
    }
  }

  return (2 * intersection) / (trigramsA.size + trigramsB.size);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");
}

function mapNormalizedToOriginal(original: string, normalizedIdx: number): number {
  // Walk through original counting normalized characters
  let normalCount: number = 0;
  let i: number = 0;
  while (i < original.length && normalCount < normalizedIdx) {
    const ch: string | undefined = original[i];
    if (ch === "\r" && original[i + 1] === "\n") {
      i += 2;
    } else if (ch === " " || ch === "\t") {
      // Skip consecutive spaces/tabs (they become one space in normalized)
      // oxlint-disable-next-line legibility/no-quadratic-patterns
      while (i < original.length && (original[i] === " " || original[i] === "\t")) {
        i++;
      }
    } else {
      i++;
    }
    normalCount++;
  }
  return i < original.length ? i : -1;
}

/**
 * Attempt to find the range in `document` where `snippet` lives. Strategy: 1. Exact text search
 * (fast, handles whitespace normalization) 2. Fuzzy search using sliding window similarity (handles
 * minor edits)
 *
 * Returns null if no sufficiently similar region is found.
 */
export function findRangeInDocument(
  document: vscode.TextDocument,
  snippet: string,
  storedHash: string,
  fuzzyThreshold: number = 0.75,
): vscode.Range | null {
  const docText: string = document.getText();

  // --- 1. Exact match (fastest) ---
  const exactIdx: number = docText.indexOf(snippet);
  if (exactIdx !== -1) {
    const start: vscode.Position = document.positionAt(exactIdx);
    const end: vscode.Position = document.positionAt(exactIdx + snippet.length);
    return new vscode.Range(start, end);
  }

  // --- 2. Normalized whitespace match ---
  const normalSnippet: string = normalizeWhitespace(snippet);
  const normalDoc: string = normalizeWhitespace(docText);
  const normalIdx: number = normalDoc.indexOf(normalSnippet);
  if (normalIdx !== -1) {
    // Map normalized index back to original document position
    const origIdx: number = mapNormalizedToOriginal(docText, normalIdx);
    if (origIdx !== -1) {
      const start: vscode.Position = document.positionAt(origIdx);
      const end: vscode.Position = document.positionAt(origIdx + snippet.length);
      return new vscode.Range(start, end);
    }
  }

  // --- 3. Fuzzy sliding-window search ---
  // Only do this for reasonably sized snippets (avoid O(n^2) on huge files)
  const snippetLen: number = snippet.length;
  // const docLen: number = docText.length;

  if (snippetLen < 10 || snippetLen > 5000) {
    return null;
  }

  // Search in blocks: use line-granularity to find candidate regions
  const snippetLines: string[] = snippet.split("\n");
  // oxlint-disable-next-line typescript/no-non-null-assertion
  const firstLine: string = snippetLines[0]!.trim();
  // const lastLine: string = snippetLines[snippetLines.length - 1].trim();

  if (!firstLine) {
    return null;
  }

  // Find candidate starting lines
  let bestRange: vscode.Range | null = null;
  let bestScore: number = 0;

  for (let lineIdx: number = 0; lineIdx < document.lineCount; lineIdx++) {
    const lineText: string = document.lineAt(lineIdx).text.trim();

    // Quick filter: first line must be at least 60% similar
    if (firstLine.length > 3 && similarity(lineText, firstLine) < 0.6) {
      continue;
    }

    // Found a candidate start — extract the same number of lines
    const endLineIdx: number = Math.min(lineIdx + snippetLines.length - 1, document.lineCount - 1);
    const candidateStart: vscode.Position = document.lineAt(lineIdx).range.start;
    const candidateEnd: vscode.Position = document.lineAt(endLineIdx).range.end;
    const candidate: string = document.getText(new vscode.Range(candidateStart, candidateEnd));

    const score: number = similarity(candidate, snippet);
    if (score > bestScore && score >= fuzzyThreshold) {
      bestScore = score;

      // Narrow the range to just the matching content (trim leading/trailing whitespace diff)
      const trimmedCandidate: string = candidate.trimStart();
      const leadingWhitespace: number = candidate.length - trimmedCandidate.length;
      const adjustedStart: vscode.Position = document.positionAt(
        document.offsetAt(candidateStart) + leadingWhitespace,
      );
      bestRange = new vscode.Range(adjustedStart, candidateEnd);
    }
  }

  if (bestRange) {
    return bestRange;
  }

  // --- 4. Hash match on lines (handles reformatting) ---
  // Try hashing each line-group of the same size as the snippet lines
  const snippetLineCount: number = snippetLines.length;
  for (let i: number = 0; i <= document.lineCount - snippetLineCount; i++) {
    const start: vscode.Position = document.lineAt(i).range.start;
    const end: vscode.Position = document.lineAt(i + snippetLineCount - 1).range.end;
    const block: string = document.getText(new vscode.Range(start, end));
    if (hashText(block) === storedHash) {
      return new vscode.Range(start, end);
    }
  }

  return null;
}
