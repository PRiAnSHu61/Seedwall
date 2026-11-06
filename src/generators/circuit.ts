import type { Generator, ParamSchema, Preset } from "./types";
import { darken } from "./shared/color";
import { pick, range } from "./shared/rng";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  trace: string;
  chip: string;
  grid: number;
  traces: number;
  chips: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Board", default: "#0b2e1f", group: "Colours", role: "bg" },
  trace: { kind: "color", label: "Copper", default: "#d9a441", group: "Colours", role: "accent" },
  chip: { kind: "color", label: "Chips", default: "#111816", group: "Colours", role: "bg" },
  grid: { kind: "range", label: "Pitch", min: 1, max: 5, step: 0.1, default: 2, group: "Board" },
  traces: { kind: "range", label: "Traces", min: 20, max: 400, step: 5, default: 160, group: "Board" },
  chips: { kind: "range", label: "Chips", min: 0, max: 8, step: 1, default: 3, group: "Board" },
  seed: { kind: "seed", label: "Seed", default: 8 },
  ...textParams({ "text.line1": "Hello, *world*.", "text.line2": "", "text.font": "mono", "text.size": 5, "text.color": "#f3d8a1" }),
};

const presets: Preset<P>[] = [
  { id: "classic-pcb", title: "Classic PCB", params: {} },
  { id: "matte-black", title: "Matte black + gold", params: { bg: "#0c0c0d", trace: "#c9a227", chip: "#1c1c1f", seed: 4, "text.color": "#e8d18a" } },
  { id: "blue-silk", title: "Blue silkscreen", params: { bg: "#0b2447", trace: "#a5d7e8", chip: "#19376d", traces: 220, grid: 1.6, seed: 13, "text.none": true } },
  { id: "dense", title: "Dense (no text)", params: { traces: 380, grid: 1.2, chips: 6, seed: 27, "text.none": true } },
  { id: "purple-rgb", title: "Gamer purple", params: { bg: "#120824", trace: "#c77dff", chip: "#240046", seed: 2, "text.line1": "rm -rf", "text.line2": "*doubt*", "text.color": "#e0aaff" } },
];

const DIRS: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

export const circuit: Generator<P> = {
  id: "circuit",
  name: "Circuit Board",
  description: "Copper traces routed at 45° between pads, vias and chips — and around your quote, never through it.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const g = p.grid * u;
    const cols = Math.floor(size.w / g);
    const rows = Math.floor(size.h / g);
    const ox = (size.w - cols * g) / 2;
    const oy = (size.h - rows * g) / 2;
    const used = new Uint8Array((cols + 1) * (rows + 1));
    const idx = (i: number, j: number): number => j * (cols + 1) + i;
    const inside = (i: number, j: number): boolean => i >= 1 && j >= 1 && i < cols && j < rows;
    const block = (x0: number, y0: number, x1: number, y1: number) => {
      for (let j = Math.max(0, Math.floor((y0 - oy) / g)); j <= Math.min(rows, Math.ceil((y1 - oy) / g)); j++)
        for (let i = Math.max(0, Math.floor((x0 - ox) / g)); i <= Math.min(cols, Math.ceil((x1 - ox) / g)); i++) used[idx(i, j)] = 1;
    };
    const X = (i: number): number => ox + i * g;
    const Y = (j: number): number => oy + j * g;

    // Traces route around the text: its zones are blocked cells.
    const text = layoutText(p, size, { padding: 0.9 });
    for (const z of text.zones) block(z.x, z.y, z.x + z.w, z.y + z.h);

    const out: string[] = [];
    const pads: string[] = [];
    for (let c = 0; c < Math.round(p.chips); c++) {
      const w = Math.round(range(rng, 6, 14)) * g;
      const h = Math.round(range(rng, 4, 9)) * g;
      const x = X(Math.floor(range(rng, 2, cols - 2 - w / g)));
      const y = Y(Math.floor(range(rng, 2, rows - 2 - h / g)));
      out.push(rect(x, y, w, h, `rx="${n(0.4 * u)}" fill="${darken(p.chip, 0.3)}" stroke="${esc(p.trace)}" stroke-opacity="0.35" stroke-width="${n(0.1 * u)}"`));
      const pins: string[] = [];
      for (let k = g; k < w; k += g) pins.push(`M${n(x + k)} ${n(y)}v${n(-0.8 * g)}M${n(x + k)} ${n(y + h)}v${n(0.8 * g)}`);
      out.push(`<path d="${pins.join("")}" stroke="${esc(p.trace)}" stroke-width="${n(0.3 * g)}"/>`);
      block(x - g, y - g, x + w + g, y + h + g);
    }

    const traces: string[] = [];
    for (let t = 0; t < Math.round(p.traces); t++) {
      let i = 1 + Math.floor(rng() * (cols - 1));
      let j = 1 + Math.floor(rng() * (rows - 1));
      if (used[idx(i, j)]) continue;
      let dir = Math.floor(rng() * 8);
      const pts: [number, number][] = [[i, j]];
      used[idx(i, j)] = 1;
      const max = Math.floor(range(rng, 6, 40));
      for (let s = 0; s < max; s++) {
        if (rng() < 0.18) dir = (dir + pick(rng, [1, 7])) % 8;
        const [dx, dy] = DIRS[dir]!;
        const ni = i + dx;
        const nj = j + dy;
        if (!inside(ni, nj) || used[idx(ni, nj)]) break;
        i = ni;
        j = nj;
        used[idx(i, j)] = 1;
        const last = pts[pts.length - 1]!;
        const prev = pts[pts.length - 2];
        if (prev && Math.sign(last[0] - prev[0]) === dx && Math.sign(last[1] - prev[1]) === dy) last.splice(0, 2, i, j);
        else pts.push([i, j]);
      }
      if (pts.length < 2) continue;
      traces.push(`M${pts.map(([a, b]) => `${n(X(a))} ${n(Y(b))}`).join("L")}`);
      const [si, sj] = pts[0]!;
      const [ei, ej] = pts[pts.length - 1]!;
      pads.push(`<circle cx="${n(X(si))}" cy="${n(Y(sj))}" r="${n(0.42 * g)}"/>`);
      pads.push(rng() < 0.5 ? `<circle cx="${n(X(ei))}" cy="${n(Y(ej))}" r="${n(0.38 * g)}" fill="${esc(p.bg)}" stroke="${esc(p.trace)}" stroke-width="${n(0.18 * g)}"/>` : rect(X(ei) - 0.4 * g, Y(ej) - 0.4 * g, 0.8 * g, 0.8 * g, ""));
    }

    return svgDoc(
      size,
      "",
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        `<path d="${traces.join("")}" fill="none" stroke="${esc(p.trace)}" stroke-width="${n(0.22 * g)}" stroke-linejoin="round" stroke-linecap="round" stroke-opacity="0.9"/>` +
        out.join("") +
        `<g fill="${esc(p.trace)}">${pads.join("")}</g>` +
        text.svg,
    );
  },
};
