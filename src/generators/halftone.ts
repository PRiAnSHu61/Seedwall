import type { Generator, ParamSchema, Preset } from "./types";
import { createNoise2D, fbm } from "./shared/noise";
import { range } from "./shared/rng";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  ink: string;
  ink2: string;
  mode: string;
  shape: string;
  cell: number;
  size: number;
  angle: number;
  invert: boolean;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Paper", default: "#f3eee4", group: "Colours", role: "bg" },
  ink: { kind: "color", label: "Ink (start)", default: "#e63946", group: "Colours", role: "accent" },
  ink2: { kind: "color", label: "Ink (end)", default: "#1d3557", group: "Colours", role: "accent" },
  mode: {
    kind: "select",
    label: "Gradient",
    default: "linear",
    group: "Dots",
    options: [
      { value: "linear", label: "Linear" },
      { value: "radial", label: "Radial" },
      { value: "noise", label: "Noise clouds" },
      { value: "wave", label: "Waves" },
    ],
  },
  shape: {
    kind: "select",
    label: "Dot shape",
    default: "circle",
    group: "Dots",
    options: [
      { value: "circle", label: "Circles" },
      { value: "square", label: "Squares" },
      { value: "diamond", label: "Diamonds" },
    ],
  },
  cell: { kind: "range", label: "Grid size", min: 0.8, max: 6, step: 0.1, default: 1.8, group: "Dots" },
  size: { kind: "range", label: "Max dot size", min: 0.3, max: 1.2, step: 0.01, default: 0.95, group: "Dots" },
  angle: { kind: "range", label: "Angle", min: 0, max: 360, step: 1, default: 120, group: "Dots" },
  invert: { kind: "toggle", label: "Invert", default: false, group: "Dots" },
  seed: { kind: "seed", label: "Seed", default: 6 },
  ...textParams({ "text.none": true, "text.line1": "Print is", "text.line2": "not *dead*.", "text.font": "grotesk", "text.size": 6, "text.color": "#1d3557" }),
};

const presets: Preset<P>[] = [
  { id: "riso", title: "Riso print", params: {} },
  { id: "pop-radial", title: "Pop radial", params: { bg: "#ffde59", ink: "#ff3131", ink2: "#ff3131", mode: "radial", cell: 2.4, seed: 2 } },
  { id: "noir-clouds", title: "Noir clouds", params: { bg: "#0d0d0d", ink: "#f5f5f5", ink2: "#7a7a7a", mode: "noise", cell: 1.3, seed: 18 } },
  { id: "ocean-waves", title: "Ocean waves", params: { bg: "#03256c", ink: "#06bee1", ink2: "#ffffff", mode: "wave", shape: "diamond", cell: 1.6, seed: 4 } },
  { id: "newsprint-quote", title: "Newsprint + quote", params: { bg: "#ece6da", ink: "#1a1a1a", ink2: "#1a1a1a", shape: "square", angle: 90, cell: 1.4, seed: 11, "text.none": false, "text.color": "#1a1a1a" } },
];

export const halftone: Generator<P> = {
  id: "halftone",
  name: "Halftone",
  description: "Print-style halftone: a grid of dots that grow from tiny to huge across a linear, radial, noise or wave gradient.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const c = p.cell * u;
    const cols = Math.ceil(size.w / c) + 1;
    const rows = Math.ceil(size.h / c) + 1;
    const noise = createNoise2D(rng);
    const a = (p.angle * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    const proj = [0, size.w * dx, size.h * dy, size.w * dx + size.h * dy];
    const lo = Math.min(...proj), hi = Math.max(...proj);
    const cx = size.w * range(rng, 0.3, 0.7), cy = size.h * range(rng, 0.3, 0.7);
    const R = Math.hypot(Math.max(cx, size.w - cx), Math.max(cy, size.h - cy));
    const short = Math.min(size.w, size.h);
    const phase = range(rng, 0, Math.PI * 2);

    const value = (x: number, y: number): number => {
      switch (p.mode) {
        case "radial": return 1 - Math.hypot(x - cx, y - cy) / R;
        case "noise": return Math.min(1, Math.max(0, 0.5 + fbm(noise, (x / short) * 2.2, (y / short) * 2.2, 4) * 1.3));
        case "wave": return 0.5 + 0.5 * Math.sin(((x * dx + y * dy) / short) * 9 + phase + Math.sin((x * -dy + y * dx) / short * 4) * 1.2);
        default: return ((x * dx + y * dy) - lo) / (hi - lo || 1);
      }
    };

    const d: string[] = [];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = i * c + (j % 2 ? c / 2 : 0);
        const y = j * c * 0.866 * 1.155;
        let v = Math.min(1, Math.max(0, value(x, y)));
        if (p.invert) v = 1 - v;
        // ±6% seeded jitter — real print never has perfectly even dots.
        const r = (c / 2) * p.size * Math.sqrt(v) * 1.25 * (0.94 + rng() * 0.12);
        if (r < c * 0.04) continue;
        if (p.shape === "square") d.push(`M${n(x - r * 0.88)} ${n(y - r * 0.88)}h${n(r * 1.76)}v${n(r * 1.76)}h${n(-r * 1.76)}Z`);
        else if (p.shape === "diamond") d.push(`M${n(x)} ${n(y - r * 1.2)}l${n(r * 1.2)} ${n(r * 1.2)}l${n(-r * 1.2)} ${n(r * 1.2)}l${n(-r * 1.2)} ${n(-r * 1.2)}Z`);
        else d.push(`M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`);
      }

    const text = layoutText(p, size);
    const defs =
      `<linearGradient id="ht-ink" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${size.w}" y2="${size.h}"><stop offset="0" stop-color="${esc(p.ink)}"/><stop offset="1" stop-color="${esc(p.ink2)}"/></linearGradient>` +
      clearZonesMask("ht-zones", size, text.zones);
    return svgDoc(size, defs, rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) + `<path d="${d.join("")}" fill="url(#ht-ink)" mask="url(#ht-zones)"/>` + text.svg);
  },
};
