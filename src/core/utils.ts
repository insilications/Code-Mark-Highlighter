export function hexToRgba(hex: string, alpha: number): string {
  const clean: string = hex.replace("#", "");
  const r: number = parseInt(clean.slice(0, 2), 16);
  const g: number = parseInt(clean.slice(2, 4), 16);
  const b: number = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
