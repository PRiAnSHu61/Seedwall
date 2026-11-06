import type { Generator, ParamSchema, Preset } from "./types";
import { range } from "./shared/rng";
import { blurFilter, esc, n, rect, svgDoc, unit } from "./shared/svg";
import { layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  c1: string;
  c2: string;
  curve: string;
  a: number;
  b: number;
  d: number;
  layers: number;
  scale: number;
  weight: number;
  glow: boolean;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#07070d", group: "Colours", role: "bg" },
  c1: { kind: "color", label: "Line (start)", default: "#ffd166", group: "Colours", role: "accent" },
  c2: { kind: "color", label: "Line (end)", default: "#ef476f", group: "Colours", role: "accent" },
  curve: {
    kind: "select",
    label: "Curve",
    default: "hypotrochoid",
    group: "Curve",
    options: [
      { value: "hypotrochoid", label: "Spirograph (inside)" },
      { value: "epitrochoid", label: "Spirograph (outside)" },
      { value: "rose", label: "Rose (rhodonea)" },
      { value: "lissajous", label: "Lissajous" },
    ],
  },
  a: { kind: "range", label: "Ring teeth / a", min: 2, max: 24, step: 1, default: 13, group: "Curve" },
  b: { kind: "range", label: "Wheel teeth / b", min: 1, max: 23, step: 1, default: 5, group: "Curve" },
  d: { kind: "range", label: "Pen offset / phase", min: 0.1, max: 3, step: 0.05, default: 1.6, group: "Curve" },
  layers: { kind: "range", label: "Layers", min: 1, max: 6, step: 1, default: 3, group: "Curve" },
  scale: { kind: "range", label: "Size", min: 0.3, max: 1.2, step: 0.01, default: 0.82, group: "Curve" },
  weight: { kind: "range", label: "Line weight", min: 0.03, max: 0.4, step: 0.01, default: 0.09, group: "Curve" },
  glow: { kind: "toggle", label: "Glow", default: true, group: "Curve" },
  seed: { kind: "seed", label: "Seed", default: 3 },
  ...textParams({ "text.none": true, "text.line1": "One equation.", "text.line2": "", "text.font": "display", "text.size": 4, "text.position": "bottom-left" }),
};

const presets: Preset<P>[] = [
  { id: "golden", title: "Golden spiro", params: {} },
  { id: "neon-rose", title: "Neon rose", params: { curve: "rose", a: 7, b: 4, c1: "#00f5d4", c2: "#9b5de5", bg: "#0b0221", layers: 2, seed: 9 } },
  { id: "blueprint-gear", title: "Blueprint gear", params: { curve: "epitrochoid", a: 9, b: 4, d: 1.2, bg: "#0f3460", c1: "#e0f2ff", c2: "#9ad0ff", glow: false, layers: 1, weight: 0.07 } },
  { id: "ink-lissajous", title: "Ink lissajous", params: { curve: "lissajous", a: 5, b: 6, d: 0.6, bg: "#f4f0e8", c1: "#1d1d1f", c2: "#b23a48", glow: false, layers: 4, weight: 0.05, seed: 13, "text.color": "#1d1d1f" } },
  { id: "aurora-spiro", title: "Aurora + quote", params: { a: 17, b: 7, d: 2.2, c1: "#7cffcb", c2: "#3a86ff", bg: "#050816", layers: 4, seed: 21, "text.none": false } },
];

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);

function curvePoints(p: P, layerShift: number): [number, number][] {
  const A = Math.round(p.a);
  const B = Math.max(1, Math.round(p.b));
  const pts: [number, number][] = [];
  const push = (x: number, y: number) => pts.push([x, y]);
  if (p.curve === "rose") {
    const k = A / B;
    const turns = B * (A * B % 2 === 0 ? 2 : 1) / gcd(A, B);
    const steps = Math.min(4000, 300 * turns);
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * turns;
      const r = Math.cos(k * t) * (1 - layerShift * 0.12);
      push(r * Math.cos(t + layerShift), r * Math.sin(t + layerShift));
    }
  } else if (p.curve === "lissajous") {
    const steps = 3000;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      push(Math.sin(A * t + p.d + layerShift), Math.sin(B * t));
    }
  } else {
    const R = A, r = Math.min(B, A - 1 || 1), d = p.d * r * (1 + layerShift * 0.15);
    const outside = p.curve === "epitrochoid";
    const turns = r / gcd(R, r);
    const steps = Math.min(5000, 400 * turns);
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2 * turns;
      const k = outside ? (R + r) / r : (R - r) / r;
      const x = outside ? (R + r) * Math.cos(t) - d * Math.cos(k * t) : (R - r) * Math.cos(t) + d * Math.cos(k * t);
      const y = outside ? (R + r) * Math.sin(t) - d * Math.sin(k * t) : (R - r) * Math.sin(t) - d * Math.sin(k * t);
      push(x, y);
    }
  }
  // Normalise to the unit circle.
  const m = Math.max(1e-9, ...pts.map(([x, y]) => Math.hypot(x, y)));
  return pts.map(([x, y]) => [x / m, y / m]);
}

export const spirograph: Generator<P> = {
  id: "spirograph",
  name: "Spirograph",
  description: "Spirograph, rose and Lissajous curves drawn as thin glowing lines — intricate, from a single equation.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const R = (Math.min(size.w, size.h) / 2) * p.scale;
    const cx = size.w / 2, cy = size.h / 2;
    const paths: string[] = [];
    for (let l = 0; l < Math.round(p.layers); l++) {
      const shift = l === 0 ? 0 : range(rng, 0.05, 0.6) * l;
      const pts = curvePoints(p, shift);
      const f = (v: number): string => String(Math.round(v * 10) / 10);
      const d = `M${pts.map(([x, y]) => `${f(cx + x * R)} ${f(cy + y * R)}`).join("L")}`;
      paths.push(`<path d="${d}" stroke-opacity="${n(1 - l * 0.12)}"/>`);
    }
    const lines = paths.join("");
    const stroke = `fill="none" stroke="url(#sp-grad)" stroke-width="${n(p.weight * u)}" stroke-linejoin="round"`;
    const defs =
      `<linearGradient id="sp-grad" gradientUnits="userSpaceOnUse" x1="${n(cx - R)}" y1="${n(cy - R)}" x2="${n(cx + R)}" y2="${n(cy + R)}"><stop offset="0" stop-color="${esc(p.c1)}"/><stop offset="1" stop-color="${esc(p.c2)}"/></linearGradient>` +
      (p.glow ? blurFilter("sp-glow", 0.9 * u, size) : "");
    return svgDoc(
      size,
      defs,
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        (p.glow ? `<g ${stroke.replace(/stroke-width="[^"]+"/, `stroke-width="${n(p.weight * u * 4)}"`)} filter="url(#sp-glow)" opacity="0.6">${lines}</g>` : "") +
        `<g ${stroke}>${lines}</g>` +
        layoutText(p, size).svg,
    );
  },
};
