import type { Generator, ParamSchema, Preset } from "./types";
import { contourPaths } from "./shared/contours";
import { createNoise2D, fbm } from "./shared/noise";
import { esc, grainFilter, grainRect, n, svgDoc, unit } from "./shared/svg";
import { layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  c1: string;
  c2: string;
  c3: string;
  vein: string;
  bands: number;
  swirl: number;
  detail: number;
  angle: number;
  veins: boolean;
  grain: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Base", default: "#f4f1ec", group: "Colours", role: "bg" },
  c1: { kind: "color", label: "Ink 1", default: "#1b263b", group: "Colours", role: "accent" },
  c2: { kind: "color", label: "Ink 2", default: "#415a77", group: "Colours", role: "accent" },
  c3: { kind: "color", label: "Ink 3", default: "#e0e1dd", group: "Colours", role: "accent" },
  vein: { kind: "color", label: "Vein", default: "#c9a227", group: "Colours", role: "fg" },
  bands: { kind: "range", label: "Bands", min: 4, max: 40, step: 1, default: 16, group: "Marble" },
  swirl: { kind: "range", label: "Swirl", min: 0, max: 10, step: 0.1, default: 4, group: "Marble" },
  detail: { kind: "range", label: "Turbulence", min: 0.3, max: 4, step: 0.1, default: 1.4, group: "Marble" },
  angle: { kind: "range", label: "Flow angle", min: 0, max: 180, step: 1, default: 35, group: "Marble" },
  veins: { kind: "toggle", label: "Veins", default: true, group: "Marble" },
  grain: { kind: "range", label: "Film grain", min: 0, max: 0.3, step: 0.01, default: 0.05, group: "Marble" },
  seed: { kind: "seed", label: "Seed", default: 5 },
  ...textParams({ "text.none": true, "text.line1": "Let it *flow*.", "text.line2": "", "text.font": "display", "text.size": 8, "text.color": "#1b263b" }),
};

const presets: Preset<P>[] = [
  { id: "navy-gold", title: "Navy + gold", params: {} },
  { id: "ink-wash", title: "Ink wash", params: { bg: "#f7f7f2", c1: "#111111", c2: "#5c5c5c", c3: "#f7f7f2", veins: false, bands: 9, swirl: 6, seed: 12 } },
  { id: "rose-quartz", title: "Rose quartz", params: { bg: "#fde2e4", c1: "#f4acb7", c2: "#9d8189", c3: "#ffe5d9", vein: "#ffffff", bands: 14, swirl: 3, seed: 3 } },
  { id: "malachite", title: "Malachite", params: { bg: "#0b3d2e", c1: "#13795b", c2: "#1fab89", c3: "#062a20", vein: "#9be7c4", bands: 30, swirl: 2.5, detail: 2, seed: 8 } },
  { id: "nebula", title: "Nebula (quote)", params: { bg: "#0b0221", c1: "#7b2cbf", c2: "#ff4d6d", c3: "#3a0ca3", vein: "#ffd6ff", swirl: 7, detail: 0.9, seed: 27, "text.none": false, "text.color": "#ffffff" } },
];

export const marble: Generator<P> = {
  id: "marble",
  name: "Liquid Marble",
  description: "Domain-warped stripes filled as smooth iso-bands — swirling marble and ink, with optional fine veins.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const noise = createNoise2D(rng);
    const short = Math.min(size.w, size.h);
    const a = (p.angle * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a);

    // f(x,y) = stripe coordinate + swirl × domain-warped fBm, in "band" units.
    const cell = 1.4 * u;
    const cols = Math.ceil(size.w / cell) + 2;
    const rows = Math.ceil(size.h / cell) + 2;
    const ox = -cell, oy = -cell;
    const field = new Float32Array((cols + 1) * (rows + 1));
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const x = (ox + i * cell) / short, y = (oy + j * cell) / short;
        const qx = fbm(noise, x * p.detail, y * p.detail, 3);
        const qy = fbm(noise, x * p.detail + 5.2, y * p.detail + 1.3, 3);
        const warp = fbm(noise, x * p.detail + 3 * qx, y * p.detail + 3 * qy, 3);
        const v = (x * dx + y * dy) * p.bands + warp * p.swirl * 3;
        // A very low border closes every contour, so each level is a fillable region.
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        field[j * (cols + 1) + i] = edge ? -1e6 : v;
        if (!edge) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      }

    // Painter's order: region f > k is nested inside f > k-1, so fill low → high.
    const palette = [p.c1, p.c2, p.c3, p.bg];
    const layers: string[] = [];
    const veins: string[] = [];
    for (let k = Math.floor(lo) + 1; k <= Math.ceil(hi); k++) {
      const d = contourPaths(field, cols, rows, cell, k, { closed: true, ox, oy });
      if (!d) continue;
      const c = palette[Math.floor(rng() * palette.length)] ?? p.c1;
      layers.push(`<path d="${d}" fill="${esc(c)}"/>`);
      if (p.veins && rng() < 0.3) veins.push(d);
    }

    const text = layoutText(p, size);
    const defs = p.grain > 0 ? grainFilter("mb-grain", p.grain) : "";
    return svgDoc(
      size,
      defs,
      `<rect width="${size.w}" height="${size.h}" fill="${esc(p.c2)}"/>` +
        `<g fill-rule="evenodd" stroke="none">${layers.join("")}</g>` +
        (veins.length ? `<path d="${veins.join("")}" fill="none" stroke="${esc(p.vein)}" stroke-width="${n(0.16 * u)}" stroke-opacity="0.85"/>` : "") +
        (p.grain > 0 ? grainRect(size, "mb-grain") : "") +
        text.svg,
    );
  },
};
