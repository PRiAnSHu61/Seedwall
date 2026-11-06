import type { Generator, ParamSchema, Preset } from "./types";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  c1: string;
  c2: string;
  style: string;
  tile: number;
  weight: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#101418", group: "Colours", role: "bg" },
  c1: { kind: "color", label: "Line (start)", default: "#7ee0c3", group: "Colours", role: "accent" },
  c2: { kind: "color", label: "Line (end)", default: "#7aa2f7", group: "Colours", role: "accent" },
  style: {
    kind: "select",
    label: "Tile",
    default: "arcs",
    group: "Tiles",
    options: [
      { value: "arcs", label: "Quarter arcs" },
      { value: "diagonals", label: "Diagonals (10 PRINT)" },
      { value: "triangles", label: "Filled triangles" },
    ],
  },
  tile: { kind: "range", label: "Tile size", min: 2, max: 20, step: 0.5, default: 6, group: "Tiles" },
  weight: { kind: "range", label: "Line weight", min: 0.05, max: 0.45, step: 0.01, default: 0.18, group: "Tiles", help: "Fraction of a tile." },
  seed: { kind: "seed", label: "Seed", default: 10 },
  ...textParams({ "text.none": true, "text.line1": "There is always", "text.line2": "*another way*.", "text.font": "grotesk", "text.size": 5 }),
};

const presets: Preset<P>[] = [
  { id: "mint-maze", title: "Mint maze", params: {} },
  { id: "ten-print", title: "10 PRINT", params: { bg: "#3e31a2", c1: "#7c70da", c2: "#7c70da", style: "diagonals", tile: 3, weight: 0.16, seed: 64 } },
  { id: "paper-arcs", title: "Paper arcs", params: { bg: "#f3efe6", c1: "#1d3557", c2: "#e63946", tile: 9, weight: 0.12, seed: 5, "text.color": "#1d3557" } },
  { id: "bold-triangles", title: "Bold triangles", params: { bg: "#111111", c1: "#ffbe0b", c2: "#fb5607", style: "triangles", tile: 7, seed: 19 } },
  { id: "dusk-quote", title: "Dusk + quote", params: { bg: "#1a1b26", c1: "#bb9af7", c2: "#ff9e64", tile: 4.5, seed: 31, "text.none": false, "text.color": "#c0caf5" } },
];

export const truchet: Generator<P> = {
  id: "truchet",
  name: "Truchet",
  description: "Randomly rotated quarter-arc or diagonal tiles that join into flowing, maze-like patterns.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const s = p.tile * u;
    const cols = Math.ceil(size.w / s);
    const rows = Math.ceil(size.h / s);
    const ox = (size.w - cols * s) / 2;
    const oy = (size.h - rows * s) / 2;
    const d: string[] = [];
    const h = s / 2;

    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = ox + i * s;
        const y = oy + j * s;
        const flip = rng() < 0.5;
        if (p.style === "arcs") {
          d.push(
            flip
              ? `M${n(x + h)} ${n(y)}A${n(h)} ${n(h)} 0 0 1 ${n(x)} ${n(y + h)}M${n(x + s)} ${n(y + h)}A${n(h)} ${n(h)} 0 0 0 ${n(x + h)} ${n(y + s)}`
              : `M${n(x + h)} ${n(y)}A${n(h)} ${n(h)} 0 0 0 ${n(x + s)} ${n(y + h)}M${n(x)} ${n(y + h)}A${n(h)} ${n(h)} 0 0 1 ${n(x + h)} ${n(y + s)}`,
          );
        } else if (p.style === "diagonals") {
          d.push(flip ? `M${n(x)} ${n(y)}L${n(x + s)} ${n(y + s)}` : `M${n(x + s)} ${n(y)}L${n(x)} ${n(y + s)}`);
        } else {
          const corner = Math.floor(rng() * 4);
          const pts = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
          const tri = [0, 1, 2, 3].filter((k) => k !== corner).map((k) => `${n(pts[k]![0]!)} ${n(pts[k]![1]!)}`);
          d.push(`M${tri.join("L")}Z`);
        }
      }

    const text = layoutText(p, size, { padding: 1.1 });
    const filled = p.style === "triangles";
    const paint = filled
      ? `fill="url(#tr-grad)" stroke="none"`
      : `fill="none" stroke="url(#tr-grad)" stroke-width="${n(p.weight * s)}" stroke-linecap="${p.style === "diagonals" ? "square" : "round"}"`;
    const defs =
      `<linearGradient id="tr-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${size.w}" y2="${size.h}"><stop offset="0" stop-color="${esc(p.c1)}"/><stop offset="1" stop-color="${esc(p.c2)}"/></linearGradient>` +
      clearZonesMask("tr-zones", size, text.zones);
    return svgDoc(size, defs, rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) + `<path d="${d.join("")}" ${paint} mask="url(#tr-zones)"/>` + text.svg);
  },
};
