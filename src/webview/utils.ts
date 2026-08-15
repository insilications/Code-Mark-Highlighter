const escapeMap: Record<string, string> = {
  "'": "&#x27;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

// A single regex that matches any of the target characters for the `esc` function.
const escapeRegex = /[&<>"']/g;

export function esc(str: unknown): string {
  const s: string = String(str);
  // oxlint-disable-next-line typescript/no-non-null-assertion
  return s.replace(escapeRegex, (match) => escapeMap[match]!);
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean: string = hex.replace("#", "");
  const r: number = Number.parseInt(clean.slice(0, 2), 16);
  const g: number = Number.parseInt(clean.slice(2, 4), 16);
  const b: number = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
