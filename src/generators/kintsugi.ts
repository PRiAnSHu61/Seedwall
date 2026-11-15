import type { Generator, ParamSchema, Preset } from "./types";
import { lighten } from "./shared/color";
import { range } from "./shared/rng";
import { esc, grainFilter, grainRect, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  gold: string;
  cracks: number;
  branch: number;
  wander: number;
  weight: number;
  impact: string;
  grain: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Glaze", default: "#15171a", group: "Colours", role: "bg" },
  gold: { kind: "color", label: "Gold", default: "#d4a64a", group: "Colours", role: "accent" },
  cracks: { kind: "range", label: "Cracks", min: 2, max: 14, step: 1, default: 6, group: "Break" },
  branch: { kind: "range", label: "Branching", min: 0, max: 1, step: 0.05, default: 0.4, group: "Break" },
  wander: { kind: "range", label: "Wander", min: 0, max: 1, step: 0.05, default: 0.45, group: "Break" },
  weight: { kind: "range", label: "Seam weight", min: 0.2, max: 2, step: 0.05, default: 0.8, group: "Break" },
  impact: { kind: "select", label: "Where it broke", options: [{ value: "off", label: "Off centre" }, { value: "edge", label: "From an edge" }, { value: "two", label: "Twice" }], default: "off", group: "Break" },
  grain: { kind: "range", label: "Grain", min: 0, max: 0.3, step: 0.01, default: 0.1, group: "Break" },
  seed: { kind: "seed", label: "Seed", default: 12 },
  ...textParams({ "text.none": true, "text.line1": "Broken, then *golden*.", "text.line2": "", "text.color": "#e9dcc0", "text.position": "bottom-left", "text.font": "display", "text.size": 4.2 }),
};

const presets: Preset<P>[] = [
  { id: "raku", title: "Raku", params: {} },
  { id: "celadon", title: "Celadon", params: { bg: "#9fb8a6", gold: "#b98a2e", cracks: 5, branch: 0.55, wander: 0.35, impact: "edge", seed: 4, "text.color": "#2c3a30" } },
  { id: "porcelain", title: "Porcelain", params: { bg: "#efede8", gold: "#c39236", cracks: 4, branch: 0.3, weight: 0.6, grain: 0.05, impact: "two", seed: 8, "text.color": "#3a342b" } },
  { id: "indigo", title: "Indigo", params: { bg: "#1c2440", gold: "#e0b65a", cracks: 9, branch: 0.6, wander: 0.6, weight: 0.7, seed: 21 } },
  { id: "hairline", title: "Hairline", params: { bg: "#0b0b0b", gold: "#c9a24f", cracks: 3, branch: 0.1, wander: 0.2, weight: 0.3, grain: 0, seed: 2 } },
];

interface Seam { pts: [number, number][]; w: number }

export const kintsugi: Generator<P> = {
  id: "kintsugi",
  name: "Kintsugi",
  description: "A glazed surface that broke and was mended with gold, so the cracks are the most beautiful part. Every seed breaks it a different way.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const step = 1.4 * u;
    const out = 4 * u;
    const inside = (x: number, y: number) => x > -out && y > -out && x < size.w + out && y < size.h + out;

    const origins: [number, number][] = [];
    if (p.impact === "edge") {
      const side = Math.floor(rng() * 4);
      const t = range(rng, 0.25, 0.75);
      origins.push(side === 0 ? [t * size.w, 0] : side === 1 ? [size.w, t * size.h] : side === 2 ? [t * size.w, size.h] : [0, t * size.h]);
    } else {
      origins.push([size.w * range(rng, 0.3, 0.7), size.h * range(rng, 0.3, 0.7)]);
      if (p.impact === "two") origins.push([size.w * range(rng, 0.15, 0.85), size.h * range(rng, 0.15, 0.85)]);
    }

    const seams: Seam[] = [];
    const maxSeams = 60;
    const grow = (x: number, y: number, a: number, w: number, depth: number) => {
      const pts: [number, number][] = [[x, y]];
      let len = 0;
      const maxLen = depth === 0 ? 400 : range(rng, 8, 40) * (1 - depth * 0.2);
      for (let i = 0; i < 400 && len < maxLen; i++) {
        // Cracks run mostly straight, with sharp little kinks rather than smooth curves.
        a += (rng() < 0.25 ? range(rng, -0.9, 0.9) : range(rng, -0.12, 0.12)) * p.wander;
        x += Math.cos(a) * step;
        y += Math.sin(a) * step;
        len += 1;
        pts.push([x, y]);
        if (!inside(x, y)) break;
        if (depth < 3 && seams.length < maxSeams && rng() < 0.035 * p.branch) {
          const side = rng() < 0.5 ? -1 : 1;
          grow(x, y, a + side * range(rng, 0.4, 1.1), w * 0.6, depth + 1);
        }
      }
      if (pts.length > 1) seams.push({ pts, w });
    };

    for (const [ox, oy] of origins) {
      const count = Math.round(p.cracks);
      const a0 = rng() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const a = a0 + (i / count) * Math.PI * 2 + range(rng, -0.3, 0.3);
        grow(ox, oy, a, p.weight * u * range(rng, 0.7, 1.2), 0);
      }
    }

    // Draw each seam thicker where it started, thinning toward its end, with a pale glint on top.
    const gold: string[] = [];
    const glint: string[] = [];
    for (const s of seams) {
      const chunk = 6;
      for (let i = 0; i < s.pts.length - 1; i += chunk) {
        const seg = s.pts.slice(i, i + chunk + 1);
        const t = i / s.pts.length;
        const w = Math.max(0.5, s.w * (1 - t * 0.7));
        const d = seg.map(([x, y], k) => `${k ? "L" : "M"}${n(x)} ${n(y)}`).join("");
        gold.push(`<path d="${d}" stroke-width="${n(w)}"/>`);
        if (w > 1.2) glint.push(`<path d="${d}" stroke-width="${n(w * 0.25)}"/>`);
      }
    }
    // Small gold patches where the pieces met at the impact.
    const patches = origins.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(p.weight * 1.4 * u)}"/>`).join("");

    const text = layoutText(p, size, { padding: 0.8 });
    const defs = clearZonesMask("ki-zones", size, text.zones) + (p.grain > 0 ? grainFilter("ki-grain", p.grain) : "");
    const body =
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
      `<g mask="url(#ki-zones)">` +
      `<g fill="none" stroke="${esc(p.gold)}" stroke-linecap="round" stroke-linejoin="round">${gold.join("")}</g>` +
      `<g fill="none" stroke="${esc(lighten(p.gold, 0.55))}" stroke-opacity="0.7" stroke-linecap="round" stroke-linejoin="round">${glint.join("")}</g>` +
      `<g fill="${esc(p.gold)}">${patches}</g>` +
      `</g>` +
      (p.grain > 0 ? grainRect(size, "ki-grain") : "") +
      text.svg;
    return svgDoc(size, defs, body);
  },
};
