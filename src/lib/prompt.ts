import { SITE } from "@/config/site";
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

export function buildClaudePrompt(s: StudioState, shareUrl: string): string {
  const gen = getGenerator(s.gen);
  return [
    `Render a wallpaper locally with Seedwall (${SITE.url}).`,
    ``,
    `- Generator: ${gen?.name ?? s.gen} (\`${s.gen}\`), preset \`${s.preset}\``,
    `- Size: ${s.w}×${s.h}${s.device !== "custom" ? ` (${s.device})` : ""}`,
    `- Share link (exact state): ${shareUrl}`,
    ``,
    `Steps:`,
    `1. In the seedwall project, run \`npm install\` if node_modules is missing.`,
    `2. Run:`,
    "```",
    buildCliCommand(s),
    "```",
    `3. Open the PNG written to out/ and tell me its path.`,
    `If I ask for tweaks (colours, text, no text, another device), change the flags — e.g. \`--no-text\`, \`--device iphone\`, or edit the --params JSON — and re-run.`,
  ].join("\n");
}
