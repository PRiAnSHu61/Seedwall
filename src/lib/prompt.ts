import { diffFromPreset, getGenerator } from "@/generators";
import type { StudioState } from "./studioState";

/** POSIX single-quote a shell argument. */
export const shq = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

/** The exact CLI call that reproduces a studio state (same generator code as the site). */
export function buildCliCommand(s: StudioState, format: "png" | "svg" = "png"): string {
  const gen = getGenerator(s.gen);
  const parts = ["npx tsx scripts/render.ts", `--gen ${s.gen}`, `--preset ${s.preset}`];
  parts.push(s.device === "custom" ? `--size ${s.w}x${s.h}` : `--device ${s.device}`);
  if (typeof s.params.seed === "number") parts.push(`--seed ${s.params.seed}`);
  if (gen) {
    const { seed: _seed, ...diff } = diffFromPreset(gen, s.preset, s.params);
    if (Object.keys(diff).length) parts.push(`--params ${shq(JSON.stringify(diff))}`);
  }
  parts.push(`--format ${format}`, "--out out/");
  return parts.join(" ");
}
