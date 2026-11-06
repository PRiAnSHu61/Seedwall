import type { Generator, ParamSchema, Preset, Size } from "./types";
import { range } from "./shared/rng";
import { esc, n, svgDoc, unit } from "./shared/svg";
import { layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  colors: string;
  direction: string;
  pixel: number;
  seed: number;
};

const params: ParamSchema<P> = {
  c1: { kind: "color", label: "Colour 1", default: "#1b1033", group: "Colours" },
  c2: { kind: "color", label: "Colour 2", default: "#6a2c91", group: "Colours" },
  c3: { kind: "color", label: "Colour 3", default: "#f25f5c", group: "Colours" },
  c4: { kind: "color", label: "Colour 4", default: "#ffe066", group: "Colours" },
  colors: { kind: "select", label: "Colours used", default: "4", group: "Colours", options: [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }] },
  direction: {
    kind: "select",
    label: "Direction",
    default: "vertical",
    group: "Dither",
    options: [
      { value: "vertical", label: "Top → bottom" },
      { value: "horizontal", label: "Left → right" },
      { value: "diagonal", label: "Diagonal" },
      { value: "radial", label: "Radial" },
    ],
  },
  pixel: { kind: "range", label: "Pixel size", min: 0.3, max: 3, step: 0.05, default: 0.8, group: "Dither" },
  seed: { kind: "seed", label: "Seed", default: 2 },
  ...textParams({ "text.line1": "PRESS START", "text.line2": "", "text.font": "mono", "text.size": 5, "text.color": "#ffffff", "text.none": true }),
};

const presets: Preset<P>[] = [
  { id: "synth-sunset", title: "Synth sunset", params: {} },
  { id: "gameboy", title: "Handheld green", params: { c1: "#0f380f", c2: "#306230", c3: "#8bac0f", c4: "#9bbc0f", pixel: 1.2, "text.none": false, "text.color": "#9bbc0f" } },
  { id: "ice", title: "Ice (3 colours)", params: { c1: "#0b1d3a", c2: "#3e7cb1", c3: "#e6f4ff", colors: "3", direction: "diagonal", pixel: 0.6 } },
  { id: "duotone-radial", title: "Duotone radial", params: { c1: "#ff3864", c2: "#261447", colors: "2", direction: "radial", pixel: 1, seed: 9 } },
  { id: "amber-crt", title: "Amber CRT", params: { c1: "#120800", c2: "#5a2a00", c3: "#ff9d00", colors: "3", direction: "horizontal", pixel: 0.5, "text.none": false, "text.line1": "> READY.", "text.color": "#ffb000" } },
];

/** 4×4 Bayer matrix thresholds 0..15. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const LEVELS = 16;

/** Band shape covering projection range [t0, t1] (0..1) along the gradient. */
function bandShape(size: Size, dir: string, t0: number, t1: number, cx: number, cy: number): string {
  if (dir === "radial") {
    const R = Math.hypot(Math.max(cx, size.w - cx), Math.max(cy, size.h - cy));
    const r0 = t0 * R;
    const r1 = t1 * R;
    const circ = (r: number): string => `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
    return `d="${circ(r1)}${r0 > 0 ? circ(r0) : ""}" fill-rule="evenodd"`;
  }
  const ang = dir === "horizontal" ? 0 : dir === "diagonal" ? Math.PI / 4 : Math.PI / 2;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const proj = [0, size.w * dx, size.h * dy, size.w * dx + size.h * dy];
  const lo = Math.min(...proj), hi = Math.max(...proj);
  const d0 = lo + (hi - lo) * t0, d1 = lo + (hi - lo) * t1;
  const L = size.w + size.h;
  const pt = (d: number, s: number): string => `${n(d * dx - s * dy)} ${n(d * dy + s * dx)}`;
  return `d="M${pt(d0, -L)}L${pt(d0, L)}L${pt(d1, L)}L${pt(d1, -L)}Z"`;
}

export const pixelDither: Generator<P> = {
  id: "pixel-dither",
  name: "Pixel Dither",
  description: "Retro ordered (Bayer) dithering between 2–4 colours, as a linear or radial gradient with chunky pixels.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const px = Math.max(1, Math.round(p.pixel * u));
    const cols = [p.c1, p.c2, p.c3, p.c4].slice(0, Number(p.colors) || 2);
    const segs = cols.length - 1;
    const cx = size.w * range(rng, 0.35, 0.65);
    const cy = size.h * range(rng, 0.35, 0.65);

    const defs: string[] = [];
    const body: string[] = [];
    // segs × 16 dither levels, plus one final solid band of the last colour.
    const total = segs * LEVELS + 1;
    for (let k = 0; k < total; k++) {
      const last = k === total - 1;
      const s = last ? segs - 1 : Math.floor(k / LEVELS);
      const m = last ? LEVELS : k % LEVELS;
      const a = cols[s]!;
      const b = cols[s + 1]!;
      const shape = bandShape(size, p.direction, k / total, (k + 1) / total + 0.0005, cx, cy);
      if (m === 0 || m === LEVELS) {
        body.push(`<path ${shape} fill="${esc(m === 0 ? a : b)}"/>`);
        continue;
      }
      const id = `pd-${s}-${m}`;
      const cells = BAYER.map((v, i) => (v < m ? `<rect x="${(i % 4) * px}" y="${Math.floor(i / 4) * px}" width="${px}" height="${px}"/>` : "")).join("");
      defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="${px * 4}" height="${px * 4}"><rect width="${px * 4}" height="${px * 4}" fill="${esc(a)}"/><g fill="${esc(b)}">${cells}</g></pattern>`);
      body.push(`<path ${shape} fill="url(#${id})"/>`);
    }
    const text = layoutText(p, size);
    return svgDoc(size, defs.join(""), `<rect width="${size.w}" height="${size.h}" fill="${esc(cols[0] ?? "#000")}"/>${body.join("")}${text.svg}`);
  },
};
