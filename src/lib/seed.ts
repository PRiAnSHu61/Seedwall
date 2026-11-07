import { applyTheme, getGenerator, resolveParams, type Params } from "@/generators";
import { createRng } from "@/generators/shared/rng";
import { getTheme } from "@/generators/shared/themes";

/**
 * Seed links: /s/48213 is one exact wallpaper, for everyone, forever.
 *
 * A seed picks a generator, a preset, maybe an editor theme and whether there's
 * text, then becomes the generator's own seed. The pools below are FROZEN
 * literals, not GENERATORS/THEMES: adding a generator, preset or theme must
 * never change what an existing link shows. To include new looks, add a
 * POOL_V2 used for seeds above some threshold — don't edit V1.
 */
export const SEED_MAX = 999_999;

const POOL_V1: readonly (readonly [string, readonly string[]])[] = [
  ["cutting-mat", ["blue-bold", "blue-light", "blue-dots", "black-bold", "black-light", "black-dots", "cream-bold", "cream-light", "cream-dots", "green-bold", "green-light", "green-dots", "orange-bold", "orange-light", "orange-dots", "silver-bold", "silver-light", "silver-dots", "shadow-grey"]],
  ["mesh-gradient", ["peach", "lagoon", "violet-dusk", "mint", "ember-quote"]],
  ["topographic", ["survey", "night-ridge", "moss", "blueprint-terrain", "sand"]],
  ["blueprint", ["classic", "midnight", "cyanotype", "whiteprint", "dense"]],
  ["terminal", ["github-dark", "dracula", "phosphor", "paper-light", "solarized"]],
  ["pixel-dither", ["synth-sunset", "gameboy", "ice", "duotone-radial", "amber-crt"]],
  ["geometric", ["bauhaus", "ocean-circles", "candy-triangles", "ember-hex", "forest-quote"]],
  ["aurora", ["borealis", "solar-wind", "glacier", "night-quote", "dawn"]],
  ["minimal-type", ["paper", "ink", "dusk-gradient", "electric", "sage"]],
  ["flow-field", ["ember", "ocean-current", "ink-on-paper", "neon-silk", "moss-quote"]],
  ["wave-lines", ["pulsar", "sunset-gradient", "terrain-slice", "signal", "calm-water"]],
  ["landscape", ["paper-dunes", "synthwave", "misty-blue", "desert", "lofi-night"]],
  ["truchet", ["mint-maze", "ten-print", "paper-arcs", "bold-triangles", "dusk-quote"]],
  ["git-graph", ["github-dark", "dracula", "paper-log", "dense-monorepo", "minimal-trunk"]],
  ["contributions", ["github-dark", "github-light", "skyline", "pumpkin", "dots-ocean", "paper"]],
  ["circuit", ["classic-pcb", "matte-black", "blue-silk", "dense", "purple-rgb"]],
  ["halftone", ["riso", "pop-radial", "noir-clouds", "ocean-waves", "newsprint-quote"]],
  ["spirograph", ["golden", "neon-rose", "blueprint-gear", "ink-lissajous", "aurora-spiro"]],
  ["code-city", ["github-night", "dracula-city", "tokyo", "amber-terminal", "sunset-skyline"]],
  ["marble", ["navy-gold", "ink-wash", "rose-quartz", "malachite", "nebula"]],
];

const THEMES_V1 = ["dracula", "nord", "tokyo-night", "gruvbox", "catppuccin", "one-dark", "rose-pine", "solarized", "github-light"] as const;

export interface SeedWallpaper {
  seed: number;
  gen: string;
  preset: string;
  /** Editor theme applied on top of the preset, if any. */
  theme: string | null;
  params: Params;
}

/** FNV-1a, 32-bit — stable string → int hash. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Parses "48213" → 48213; anything else (or out of range) → null. */
export function parseSeed(raw: string | undefined | null): number | null {
  if (!raw || !/^\d{1,6}$/.test(raw)) return null;
  const v = Number(raw);
  return v >= 1 && v <= SEED_MAX ? v : null;
}

export function wallpaperFromSeed(seed: number): SeedWallpaper {
  const s = Math.min(SEED_MAX, Math.max(1, Math.floor(seed)));
  const rng = createRng(hashString(`seedwall:v1:${s}`));
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rng() * items.length)]!;

  const [genId, presets] = pick(POOL_V1);
  const preset = pick(presets);
  const theme = rng() < 0.3 ? pick(THEMES_V1) : null;
  const textFree = rng() < 0.45;

  const gen = getGenerator(genId);
  if (!gen) throw new Error(`Seed pool references a missing generator: ${genId}`);
  let params = resolveParams(gen, preset, { seed: s, "text.none": textFree });
  if (theme && getTheme(theme)) params = applyTheme(gen, params, theme);
  return { seed: s, gen: genId, preset, theme, params };
}

/** Today's seed (UTC unless a YYYY-MM-DD date is given) — the same for everyone on that day. */
export function dailySeed(date: string = isoDate(new Date())): number {
  return 1 + (hashString(`seedwall:daily:${date}`) % SEED_MAX);
}

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const isIsoDate = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export const randomSeed = (): number => 1 + Math.floor(Math.random() * SEED_MAX);

export const seedPath = (seed: number): string => `/s/${seed}`;

/** Every generator/preset in the frozen pool — for tests. */
export const SEED_POOL_ENTRIES = POOL_V1.flatMap(([g, ps]) => ps.map((p) => [g, p] as const));
export const SEED_THEMES = THEMES_V1;
