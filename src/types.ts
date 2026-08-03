// src/types.ts
// Shared type definitions for Code Mark Highlighter extension

import * as vscode from "vscode";

export interface Highlight {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Workspace-relative file path */
  filePath: string;
  /** The exact text that was highlighted */
  codeSnippet: string;
  /** The text that was highlighted, escaped and dedented for displaying */
  codeSnippetDisplay: string;
  /** SHA-256 hash of codeSnippet for fast exact matching */
  codeHash: string;
  /** User-assigned tag e.g. "TODO", "Bug", "Important" */
  tag: string;
  /** Hex color string e.g. "#FFD700" */
  color: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
  range: vscode.Range;
}

// The Storage Model (What actually goes to JSON and workspaceState)
export interface SerializedHighlight extends Omit<Highlight, "range"> {
  // [startLine, startChar, endLine, endChar] - tightly packed for JSON
  range: [number, number, number, number];
}

export interface HighlightStore {
  version: number;
  highlights: SerializedHighlight[];
}

export interface ColorOption {
  label: string;
  emoji: string;
  hex: string;
}

export const PRESET_COLORS: ColorOption[] = [
  { label: "Golden Yellow", emoji: "🟡", hex: "#FFD700" },
  { label: "Lime Green", emoji: "🟢", hex: "#50FA7B" },
  { label: "Hot Pink", emoji: "🩷", hex: "#FF6EB4" },
  { label: "Sky Blue", emoji: "🔵", hex: "#87CEEB" },
  { label: "Coral Red", emoji: "🔴", hex: "#FF6B6B" },
  { label: "Lavender", emoji: "🟣", hex: "#C9B8E8" },
  { label: "Orange", emoji: "🟠", hex: "#FF9F43" },
  { label: "Cyan", emoji: "🩵", hex: "#62D6E8" },
];

export const DEFAULT_TAGS = [
  "TODO",
  "Important",
  "Refactor",
  "Bug",
  "Logic",
  "Interview",
  "Optimization",
  "Review",
  "Question",
  "Note",
];
