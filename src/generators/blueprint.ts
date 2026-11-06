import type { Generator, ParamSchema, Preset } from "./types";
import { pick, range } from "./shared/rng";
import { esc, line, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, fontStack, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  ink: string;
  grid: number;
  parts: number;
  dims: number;
  callouts: number;
  titleBlock: boolean;
  title: string;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Paper", default: "#123a73", group: "Colours", role: "bg" },
  ink: { kind: "color", label: "Ink", default: "#d8e7ff", group: "Colours", role: "fg" },
  grid: { kind: "range", label: "Grid size", min: 2, max: 10, step: 0.5, default: 5, group: "Drawing" },
  parts: { kind: "range", label: "Parts", min: 0, max: 8, step: 1, default: 3, group: "Drawing" },
  dims: { kind: "range", label: "Dimension lines", min: 0, max: 14, step: 1, default: 6, group: "Drawing" },
  callouts: { kind: "range", label: "Callouts", min: 0, max: 10, step: 1, default: 4, group: "Drawing" },
  titleBlock: { kind: "toggle", label: "Title block", default: true, group: "Drawing" },
  title: { kind: "text", label: "Drawing title", default: "WORKSTATION / REV B", group: "Drawing", maxLength: 40 },
  seed: { kind: "seed", label: "Seed", default: 3 },
  ...textParams({ "text.line1": "Design is how", "text.line2": "it *works*.", "text.font": "mono", "text.size": 4, "text.color": "#ffffff" }),
};

const presets: Preset<P>[] = [
  { id: "classic", title: "Classic blueprint", params: {} },
  { id: "midnight", title: "Midnight", params: { bg: "#0a1426", ink: "#7fb2ff", seed: 14, "text.color": "#cfe0ff" } },
  { id: "cyanotype", title: "Cyanotype", params: { bg: "#1d4e89", ink: "#f2f7ff", grid: 7, parts: 5, seed: 22, "text.none": true } },
  { id: "whiteprint", title: "Whiteprint", params: { bg: "#f4f6f8", ink: "#1d4e89", seed: 9, "text.color": "#0f2f57", title: "ASSEMBLY / SHEET 2" } },
  { id: "dense", title: "Dense spec sheet", params: { grid: 3, parts: 6, dims: 12, callouts: 8, seed: 41, "text.none": true } },
];

export const blueprint: Generator<P> = {
  id: "blueprint",
  name: "Blueprint",
  description: "Engineering paper in deep blue: fine grid, part outlines with centre lines, dimension lines and numbered callouts.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const g = p.grid * u;
    const fine: string[] = [];
    const major: string[] = [];
    for (let x = 0, i = 0; x <= size.w; x += g / 5, i++) (i % 5 === 0 ? major : fine).push(line(x, 0, x, size.h));
    for (let y = 0, j = 0; y <= size.h; y += g / 5, j++) (j % 5 === 0 ? major : fine).push(line(0, y, size.w, y));

    const m = 6 * u;
    const snap = (v: number): number => Math.round(v / g) * g;
    const fs = 1.1 * u;
    const parts: string[] = [];
    const ann: string[] = [];

    for (let i = 0; i < p.parts; i++) {
      const w = snap(range(rng, 10, 30) * u) || g;
      const h = snap(range(rng, 8, 22) * u) || g;
      const x = snap(range(rng, m, size.w - m - w));
      const y = snap(range(rng, m, size.h - m - h));
      const cx = x + w / 2, cy = y + h / 2;
      parts.push(rect(x, y, w, h, `stroke-width="${n(0.14 * u)}"`));
      if (rng() > 0.4) {
        const r = Math.min(w, h) * range(rng, 0.15, 0.3);
        parts.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" stroke-width="${n(0.12 * u)}"/>`);
      }
      parts.push(`<path d="${line(x - 2 * u, cy, x + w + 2 * u, cy)}${line(cx, y - 2 * u, cx, y + h + 2 * u)}" stroke-width="${n(0.06 * u)}" stroke-dasharray="${n(1.6 * u)} ${n(0.5 * u)} ${n(0.3 * u)} ${n(0.5 * u)}"/>`);
    }

    const arrow = (x: number, y: number, ang: number): string => {
      const a = 0.9 * u, s = 0.32 * u;
      const c = Math.cos(ang), sn = Math.sin(ang);
      return `M${n(x)} ${n(y)}L${n(x - a * c + s * sn)} ${n(y - a * sn - s * c)}L${n(x - a * c - s * sn)} ${n(y - a * sn + s * c)}Z`;
    };
    for (let i = 0; i < p.dims; i++) {
      const horiz = rng() > 0.45;
      const len = snap(range(rng, 8, 34) * u) || g;
      const x = snap(range(rng, m, size.w - m - (horiz ? len : 0)));
      const y = snap(range(rng, m, size.h - m - (horiz ? 0 : len)));
      const label = (len / u / 2).toFixed(1);
      if (horiz) {
        ann.push(`<path d="${line(x, y, x + len, y)}${line(x, y - 1.4 * u, x, y + 1.4 * u)}${line(x + len, y - 1.4 * u, x + len, y + 1.4 * u)}" stroke-width="${n(0.08 * u)}"/>`);
        ann.push(`<path d="${arrow(x + len, y, 0)}${arrow(x, y, Math.PI)}" fill="currentColor" stroke="none"/>`);
        ann.push(`<text x="${n(x + len / 2)}" y="${n(y - 0.7 * u)}" text-anchor="middle">${label}</text>`);
      } else {
        ann.push(`<path d="${line(x, y, x, y + len)}${line(x - 1.4 * u, y, x + 1.4 * u, y)}${line(x - 1.4 * u, y + len, x + 1.4 * u, y + len)}" stroke-width="${n(0.08 * u)}"/>`);
        ann.push(`<path d="${arrow(x, y + len, Math.PI / 2)}${arrow(x, y, -Math.PI / 2)}" fill="currentColor" stroke="none"/>`);
        ann.push(`<text transform="translate(${n(x - 0.7 * u)} ${n(y + len / 2)}) rotate(-90)" text-anchor="middle">${label}</text>`);
      }
    }

    for (let i = 0; i < p.callouts; i++) {
      const x = range(rng, m + 6 * u, size.w - m - 6 * u);
      const y = range(rng, m + 6 * u, size.h - m - 6 * u);
      const dx = pick(rng, [-1, 1]) * range(rng, 5, 10) * u;
      const dy = pick(rng, [-1, 1]) * range(rng, 4, 8) * u;
      const r = 1.3 * u;
      ann.push(`<path d="${line(x, y, x + dx, y + dy)}" stroke-width="${n(0.07 * u)}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(0.3 * u)}" fill="currentColor" stroke="none"/>`);
      ann.push(`<circle cx="${n(x + dx)}" cy="${n(y + dy)}" r="${n(r)}" stroke-width="${n(0.1 * u)}"/><text x="${n(x + dx)}" y="${n(y + dy + fs * 0.36)}" text-anchor="middle">${i + 1}</text>`);
    }

    if (p.titleBlock) {
      const bw = 34 * u, bh = 10 * u;
      const x = size.w - m - bw, y = size.h - m - bh;
      ann.push(rect(x, y, bw, bh, `stroke-width="${n(0.14 * u)}"`));
      ann.push(`<path d="${line(x, y + bh / 2, x + bw, y + bh / 2)}${line(x + bw * 0.62, y + bh / 2, x + bw * 0.62, y + bh)}" stroke-width="${n(0.08 * u)}"/>`);
      ann.push(`<text x="${n(x + 1.2 * u)}" y="${n(y + bh / 2 - 1.6 * u)}" font-size="${n(1.6 * u)}">${esc(p.title.toUpperCase())}</text>`);
      ann.push(`<text x="${n(x + 1.2 * u)}" y="${n(y + bh - 1.6 * u)}">SCALE 1:1 · UNITS MM</text><text x="${n(x + bw * 0.62 + 1.2 * u)}" y="${n(y + bh - 1.6 * u)}">SHEET 01</text>`);
    }

    const text = layoutText(p, size);
    return svgDoc(
      size,
      clearZonesMask("bp-zones", size, text.zones),
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        `<g stroke="${esc(p.ink)}" fill="none">` +
        `<path d="${fine.join("")}" stroke-width="${n(0.04 * u)}" stroke-opacity="0.16"/>` +
        `<path d="${major.join("")}" stroke-width="${n(0.07 * u)}" stroke-opacity="0.32"/>` +
        `<g mask="url(#bp-zones)" color="${esc(p.ink)}" stroke-opacity="0.85">${parts.join("")}` +
        `<g font-family="${esc(fontStack("mono"))}" font-size="${n(fs)}">${ann.join("").replace(/<text /g, `<text stroke="none" fill="${esc(p.ink)}" `)}</g></g></g>` +
        text.svg,
    );
  },
};
