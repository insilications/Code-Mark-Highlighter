import type { ColorOption } from "./types";

/**
 * Current persistence-format version.
 *
 * Increment this whenever the on-disk representation changes in a way that requires migration.
 * Runtime-only changes do not necessarily require a new storage version.
 */
export const HIGHLIGHT_STORE_VERSION = 1;

export const WS_STATE_KEY = "codemark.highlights";
export const EXTENSION_KEY = "codemark";
export const ACTIVATED_CONTEXT = `${EXTENSION_KEY}.isActivated`;

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

export const DEFAULT_TAGS: string[] = [
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
