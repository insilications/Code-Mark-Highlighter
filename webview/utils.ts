const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

// A single regex that matches any of the target characters for the `esc` function.
const escapeRegex = /[&<>"']/g;

export function esc(str: unknown): string {
  const s: string = String(str);
  // oxlint-disable-next-line typescript/no-non-null-assertion
  return s.replace(escapeRegex, (match) => escapeMap[match]!);
}
