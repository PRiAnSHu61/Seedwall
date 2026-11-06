/** Named palettes shared by generators that take a "palette" select. */
export const PALETTES = {
  sunset: ["#ff6b6b", "#feca57", "#ff9ff3", "#5f27cd", "#1dd1a1"],
  ocean: ["#0b132b", "#1c2541", "#3a506b", "#5bc0be", "#e0fbfc"],
  bauhaus: ["#f1ede4", "#d7263d", "#1b998b", "#f4b400", "#1d3557"],
  forest: ["#1b3a2b", "#2d6a4f", "#52b788", "#b7e4c7", "#f2e8cf"],
  mono: ["#111111", "#3a3a3a", "#8a8a8a", "#d4d4d4", "#f5f5f5"],
  candy: ["#ffd6e0", "#ffef9f", "#c1fba4", "#7bf1a8", "#90f1ef"],
  ember: ["#1a0b0b", "#5c1a1b", "#b23a2b", "#f08a4b", "#f6d8ae"],
  electric: ["#05060f", "#1f4bff", "#7a5cff", "#00d4ff", "#e8ecff"],
} as const satisfies Record<string, readonly string[]>;

export type PaletteName = keyof typeof PALETTES;

export const PALETTE_OPTIONS = (Object.keys(PALETTES) as PaletteName[]).map((k) => ({
  value: k,
  label: k[0]!.toUpperCase() + k.slice(1),
}));

export function palette(name: string): readonly string[] {
  return (PALETTES as Record<string, readonly string[]>)[name] ?? PALETTES.mono;
}
