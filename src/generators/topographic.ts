import type { Generator, ParamSchema, Preset, Size } from "./types";
import { createNoise2D, fbm } from "./shared/noise";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  line: string;
  line2: string;
  twoTone: boolean;
  levels: number;
  scale: number;
  weight: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#f1ece2", group: "Colours", role: "bg" },
  line: { kind: "color", label: "Line colour", default: "#2b2b2b", group: "Colours", role: "fg" },
  line2: { kind: "color", label: "Index line colour", default: "#d1495b", group: "Colours", role: "accent" },
  twoTone: { kind: "toggle", label: "Two-tone index lines", default: true, group: "Colours" },
  levels: { kind: "range", label: "Contour levels", min: 6, max: 40, step: 1, default: 22, group: "Terrain" },
  scale: { kind: "range", label: "Terrain scale", min: 0.6, max: 5, step: 0.1, default: 2, group: "Terrain" },
  weight: { kind: "range", label: "Line weight", min: 0.04, max: 0.4, step: 0.01, default: 0.12, group: "Terrain" },
  seed: { kind: "seed", label: "Seed", default: 5 },
  ...textParams({ "text.line1": "Find your", "text.line2": "*elevation*.", "text.color": "#2b2b2b", "text.size": 5 }),
};

const presets: Preset<P>[] = [
  { id: "survey", title: "Survey map", params: {} },
  { id: "night-ridge", title: "Night ridge", params: { bg: "#0f1419", line: "#5c6b7a", line2: "#ffb454", seed: 12, "text.color": "#e6e1cf", "text.none": true } },
  { id: "moss", title: "Moss", params: { bg: "#23362b", line: "#9cc5a1", line2: "#e9f5db", twoTone: false, levels: 30, scale: 3, seed: 9, "text.color": "#e9f5db", "text.font": "grotesk" } },
  { id: "blueprint-terrain", title: "Cyan terrain", params: { bg: "#0b1f3a", line: "#4cc9f0", line2: "#ffffff", levels: 16, scale: 1.4, seed: 2, "text.color": "#ffffff", "text.none": true } },
  { id: "sand", title: "Sand", params: { bg: "#e9d8b4", line: "#8a6a3b", line2: "#5a3e1b", levels: 34, scale: 1.1, weight: 0.08, seed: 27, "text.color": "#3b2a12", "text.font": "display", "text.size": 7 } },
];

/** Marching squares → line segments for one threshold, then chained into polylines. */
function contourPaths(field: Float32Array, cols: number, rows: number, cell: number, t: number): string {
  const segs: [number, number, number, number][] = [];
  const at = (i: number, j: number): number => field[j * (cols + 1) + i] ?? 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const idx = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = i * cell, y = j * cell;
      const lerp = (v1: number, v2: number): number => (t - v1) / (v2 - v1 || 1e-9);
      const top: [number, number] = [x + lerp(a, b) * cell, y];
      const right: [number, number] = [x + cell, y + lerp(b, c) * cell];
      const bottom: [number, number] = [x + lerp(d, c) * cell, y + cell];
      const left: [number, number] = [x, y + lerp(a, d) * cell];
      const add = (p: [number, number], q: [number, number]) => segs.push([p[0], p[1], q[0], q[1]]);
      switch (idx) {
        case 1: case 14: add(left, bottom); break;
        case 2: case 13: add(bottom, right); break;
        case 3: case 12: add(left, right); break;
        case 4: case 11: add(top, right); break;
        case 6: case 9: add(top, bottom); break;
        case 7: case 8: add(left, top); break;
        case 5: add(left, top); add(bottom, right); break;
        case 10: add(top, right); add(left, bottom); break;
      }
    }

  // Chain segments sharing endpoints into polylines (much smaller SVG).
  const key = (x: number, y: number): string => `${Math.round(x * 4)},${Math.round(y * 4)}`;
  const ends = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const k of [key(s[0], s[1]), key(s[2], s[3])]) ends.set(k, [...(ends.get(k) ?? []), i]);
  });
  const used = new Uint8Array(segs.length);
  const f = (v: number): string => String(Math.round(v * 10) / 10);
  const out: string[] = [];
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const first = segs[s0]!;
    const pts: number[] = [first[0], first[1], first[2], first[3]];
    for (;;) {
      const lx = pts[pts.length - 2]!, ly = pts[pts.length - 1]!;
      const next = (ends.get(key(lx, ly)) ?? []).find((i) => !used[i]);
      if (next === undefined) break;
      used[next] = 1;
      const s = segs[next]!;
      if (key(s[0], s[1]) === key(lx, ly)) pts.push(s[2], s[3]);
      else pts.push(s[0], s[1]);
    }
    let d = `M${f(pts[0]!)} ${f(pts[1]!)}`;
    for (let k = 2; k < pts.length; k += 2) d += `L${f(pts[k]!)} ${f(pts[k + 1]!)}`;
    out.push(d);
  }
  return out.join("");
}

function field(size: Size, cell: number, scale: number, rng: () => number): { data: Float32Array; cols: number; rows: number } {
  const noise = createNoise2D(rng);
  const cols = Math.ceil(size.w / cell);
  const rows = Math.ceil(size.h / cell);
  const data = new Float32Array((cols + 1) * (rows + 1));
  const short = Math.min(size.w, size.h);
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) data[j * (cols + 1) + i] = fbm(noise, ((i * cell) / short) * scale, ((j * cell) / short) * scale, 4);
  return { data, cols, rows };
}

export const topographic: Generator<P> = {
  id: "topographic",
  name: "Topographic",
  description: "Contour lines traced from a seeded noise field, with optional two-tone index contours.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const cell = 1.8 * u;
    const { data, cols, rows } = field(size, cell, p.scale, rng);
    const levels = Math.round(p.levels);
    const lines: string[] = [];
    for (let k = 1; k < levels; k++) {
      const t = -0.62 + (1.24 * k) / levels;
      const d = contourPaths(data, cols, rows, cell, t);
      if (!d) continue;
      const index = k % 5 === 0;
      const color = index && p.twoTone ? p.line2 : p.line;
      lines.push(`<path d="${d}" stroke="${esc(color)}" stroke-width="${n(p.weight * u * (index ? 2 : 1))}" stroke-opacity="${index ? 0.95 : 0.7}"/>`);
    }
    const text = layoutText(p, size, { padding: 0.8 });
    return svgDoc(
      size,
      clearZonesMask("tp-zones", size, text.zones),
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        `<g fill="none" stroke-linejoin="round" stroke-linecap="round" mask="url(#tp-zones)">${lines.join("")}</g>` +
        text.svg,
    );
  },
};
