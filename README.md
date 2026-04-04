# Code Mark Highlighter

> Highlight code blocks with custom colors and tags. Highlights track **code content**, not line numbers — they survive edits, restarts, and file reorganizations.

---

## Features

### 🎨 Color Highlights
Select any code block → right-click → **Code Mark: Highlight Code** → choose a color and optional tag.  
Highlights appear with a colored background and a matching marker on the **overview ruler** (scrollbar).

### 📌 Content-Based Persistence
Highlights are stored by **code content** (SHA-256 hash + fuzzy text matching), not by line number.  
If you insert/delete lines above a highlighted block, the highlight follows the code automatically.

### 🏷️ Tagging System
Assign tags like `TODO`, `Bug`, `Important`, `Interview`, `Optimization`, or any custom label.  
Tags are filterable in the sidebar panel.

### 🔖 Sidebar Navigator Panel
Open the **DevMarks** panel in the Activity Bar to see all highlights across your workspace:
- Click any card to **jump** directly to the highlighted code
- **Filter** by tag or search by code content
- **Edit tag**, **change color**, or **delete** from the panel
- Color-coded cards with file name and code preview

### ⌨️ Keyboard Navigation
| Shortcut | Action |
|---|---|
| `Ctrl+Alt+H` | Highlight selected code |
| `Ctrl+Alt+N` | Jump to next highlight in file |
| `Ctrl+Alt+P` | Jump to previous highlight in file |

---

## Commands

| Command | Description |
|---|---|
| `Code Mark: Highlight Code` | Highlight the selected code (color + tag) |
| `Code Mark: Remove Highlight` | Remove the highlight at cursor |
| `Code Mark: Edit Highlight Tag` | Edit the tag of the highlight at cursor |
| `Code Mark: Change Highlight Color` | Change the color of the highlight at cursor |
| `Code Mark: Show Highlights Panel` | Open the sidebar navigator |
| `Code Mark: Next Highlight` | Jump to the next highlight in the current file |
| `Code Mark: Previous Highlight` | Jump to the previous highlight in the current file |
| `Code Mark: Clear All Highlights in File` | Remove all highlights from the current file |

---

## Storage

Highlights are stored in **`.vscode/codemark.json`** in your workspace root.

This file is portable — you can commit it to Git to share highlights with your team.

Each entry:
```json
{
  "id": "uuid-v4",
  "filePath": "src/app.ts",
  "codeSnippet": "function calculateTotal(...)",
  "codeHash": "sha256-hex",
  "tag": "Important",
  "color": "#FFD700",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `devmarks.storageFile` | `.vscode/codemark.json` | Path (relative to workspace root) for the storage file |
| `devmarks.fuzzyMatchThreshold` | `0.75` | Similarity threshold (0.5–1.0) for fuzzy content matching |

---

## How Content Matching Works

1. **Exact match** — finds the snippet verbatim in the document
2. **Normalized match** — handles whitespace/newline differences
3. **Fuzzy trigram match** — finds the closest region using character n-gram similarity
4. **Hash block match** — compares SHA-256 hashes of same-sized blocks

If no match is found above the threshold, the highlight is shown as missing in the panel (but not deleted).

---

## Preset Colors

🟡 Golden Yellow · 🟢 Lime Green · 🩷 Hot Pink · 🔵 Sky Blue  
🔴 Coral Red · 🟣 Lavender · 🟠 Orange · 🩵 Cyan · ✏️ Custom hex

---

## License

MIT
