// src/types.ts
// Shared type definitions for Code Mark Highlighter extension

import * as vscode from "vscode";

// export interface HighlightData {
//   id: string;
//   codeSnippet: string;
//   codeSnippetDisplay: string;
//   codeHash: string;
//   tag: string;
//   color: string;
//   createdAt: string;
//   updatedAt: string;
//   range: vscode.Range;
// }

// export interface Highlight extends HighlightData {
//   filePath: string;
// }

// export type HighlightStore = Map<string, HighlightData[]>;

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

// Each key is a file path containing an array of their respective highlights
export type FilePathsHighlights = Record<string, Highlight[]>;
// export type FilePathsHighlights = Map<string, Highlight[]>;

export interface PositionSerialized {
  line: number;
  character: number;
}

export type RangeSerialized = [PositionSerialized, PositionSerialized];

export interface HighlightSerialized extends Omit<Highlight, "range"> {
  range: RangeSerialized;
}

// The serialized version of `FilePathsHighlights`.
export type FilePathsHighlightsSerialized = Record<string, HighlightSerialized[]>;

// The Storage Model (What actually goes to `.vscode/codemark.json` and workspaceState).
export interface HighlightStore {
  version: number;
  highlights: FilePathsHighlightsSerialized;
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
