export interface Rgb { r: number; g: number; b: number }

export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const v = Number.parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(v)) return { r: 0, g: 0, b: 0 };
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

const hex2 = (v: number): string => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
export const rgbToHex = ({ r, g, b }: Rgb): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

/** Linear mix of two hex colours, t in [0,1]. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

/** Relative luminance 0..1 (sRGB, WCAG). */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const ch = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export const isDark = (hex: string): boolean => luminance(hex) < 0.36;

/** Ink that reads on a given background. */
export const autoInk = (bg: string): string => (isDark(bg) ? "#ffffff" : "#1b1b1b");

export const lighten = (hex: string, t: number): string => mix(hex, "#ffffff", t);
export const darken = (hex: string, t: number): string => mix(hex, "#000000", t);
