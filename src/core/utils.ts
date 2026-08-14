import crypto from "node:crypto";

export function hashText(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean: string = hex.replace("#", "");
  const r: number = Number.parseInt(clean.slice(0, 2), 16);
  const g: number = Number.parseInt(clean.slice(2, 4), 16);
  const b: number = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
