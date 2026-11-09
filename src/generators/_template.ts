/**
 * Starting point for a new generator. It is type-checked but NOT registered,
 * so it never appears on the site.
 *
 *   1. Copy this file to src/generators/<your-id>.ts and rename `template` / `tp-` ids.
 *   2. Add one line to GENERATORS in src/generators/index.ts.
 *   3. Add your id to the "seed sensitivity" list in tests/generators.test.ts.
 *   4. npm run og && npm run samples, then npm test.
 *
 * See CONTRIBUTING.md for the full checklist.
 */
import type { Generator, ParamSchema, Preset } from "./types";
import { range } from "./shared/rng";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

// Every param is a flat string | number | boolean. Text params come from textParams().
type P = TextParams & {
  bg: string;
  ink: string;
  accent: string;
  count: number;
  seed: number;
};

const params: ParamSchema<P> = {
  // `role` lets editor themes (Dracula, Nord…) recolour your look. At least one "bg" is required.
  bg: { kind: "color", label: "Background", default: "#101418", group: "Colours", role: "bg" },
  ink: { kind: "color", label: "Ink", default: "#e8e6e3", group: "Colours", role: "fg" },
  accent: { kind: "color", label: "Accent", default: "#ff7a59", group: "Colours", role: "accent" },
  count: { kind: "range", label: "Circles", min: 5, max: 80, step: 1, default: 30, group: "Shape" },
  seed: { kind: "seed", label: "Seed", default: 1 },
  ...textParams({ "text.line1": "Start *somewhere*.", "text.line2": "", "text.color": "#e8e6e3" }),
};

// At least 4 presets with unique ids. The first one is the default.
const presets: Preset<P>[] = [
  { id: "night", title: "Night", params: {} },
  { id: "paper", title: "Paper", params: { bg: "#f4efe6", ink: "#1f1a14", accent: "#c8553d", "text.color": "#1f1a14" } },
  { id: "dense", title: "Dense", params: { count: 70, seed: 7 } },
  { id: "quiet", title: "Quiet", params: { count: 8, "text.none": true } },
];

export const template: Generator<P> = {
  id: "template",
  name: "Template",
  description: "A starter look: random circles that keep clear of the quote.",
  params,
  presets,
  // Pure and deterministic: use only `p`, `size` and `rng`. No Math.random(), Date or I/O.
  render(p, size, rng) {
    const u = unit(size); // 1u = 1% of the shorter side, so portrait and landscape both work
    const text = layoutText(p, size);

    const circles = Array.from({ length: Math.round(p.count) }, () => {
      const cx = rng() * size.w;
      const cy = rng() * size.h;
      const r = range(rng, 1, 8) * u;
      const fill = rng() < 0.2 ? p.accent : p.ink;
      return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${esc(fill)}" opacity="0.8"/>`;
    }).join("");

    // Mask the shapes out of the text's clear zones so nothing runs through the quote.
    const defs = clearZonesMask("tp-clear", size, text.zones);
    return svgDoc(size, defs, rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) + `<g mask="url(#tp-clear)">${circles}</g>` + text.svg);
  },
};
