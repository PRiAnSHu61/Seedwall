import type { Generator, ParamSchema, Preset } from "./types";
import { pick } from "./shared/rng";
import { PALETTE_OPTIONS, palette } from "./shared/palettes";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  palette: string;
  bg: string;
  shape: string;
  cell: number;
  gap: number;
  seed: number;
};

const params: ParamSchema<P> = {
  palette: { kind: "select", label: "Palette", options: PALETTE_OPTIONS, default: "bauhaus", group: "Colours" },
  bg: { kind: "color", label: "Background", default: "#f1ede4", group: "Colours" },
  shape: {
    kind: "select",
    label: "Shapes",
    default: "mixed",
    group: "Tiles",
    options: [
      { value: "mixed", label: "Mixed (Bauhaus)" },
      { value: "circles", label: "Circles" },
      { value: "triangles", label: "Triangles" },
      { value: "hex", label: "Hexagons" },
    ],
  },
  cell: { kind: "range", label: "Tile size", min: 4, max: 30, step: 0.5, default: 12, group: "Tiles" },
  gap: { kind: "range", label: "Gap", min: 0, max: 3, step: 0.1, default: 0, group: "Tiles" },
  seed: { kind: "seed", label: "Seed", default: 17 },
  ...textParams({ "text.none": true, "text.line1": "Form follows", "text.line2": "function.", "text.font": "grotesk", "text.size": 6, "text.color": "#1d3557" }),
};

const presets: Preset<P>[] = [
  { id: "bauhaus", title: "Bauhaus", params: {} },
  { id: "ocean-circles", title: "Ocean circles", params: { palette: "ocean", bg: "#0b132b", shape: "circles", cell: 9, seed: 3 } },
  { id: "candy-triangles", title: "Candy triangles", params: { palette: "candy", bg: "#ffffff", shape: "triangles", cell: 14, seed: 8 } },
  { id: "ember-hex", title: "Ember hex", params: { palette: "ember", bg: "#1a0b0b", shape: "hex", cell: 8, gap: 0.6, seed: 5 } },
  { id: "forest-quote", title: "Forest + quote", params: { palette: "forest", bg: "#f2e8cf", cell: 16, seed: 29, "text.none": false, "text.color": "#1b3a2b" } },
];

function tile(kind: string, x: number, y: number, s: number, fg: string, alt: string, rot: number): string {
  const c = `${n(x + s / 2)} ${n(y + s / 2)}`;
  const tr = `transform="rotate(${rot} ${c})"`;
  switch (kind) {
    case "circle": return `<circle cx="${n(x + s / 2)}" cy="${n(y + s / 2)}" r="${n(s / 2)}" fill="${fg}"/>`;
    case "quarter": return `<path d="M${n(x)} ${n(y)}h${n(s)}A${n(s)} ${n(s)} 0 0 1 ${n(x)} ${n(y + s)}Z" fill="${fg}" ${tr}/>`;
    case "half": return `<path d="M${n(x)} ${n(y + s / 2)}a${n(s / 2)} ${n(s / 2)} 0 0 1 ${n(s)} 0Z" fill="${fg}" ${tr}/>`;
    case "triangle": return `<path d="M${n(x)} ${n(y)}h${n(s)}L${n(x)} ${n(y + s)}Z" fill="${fg}" ${tr}/>`;
    case "ring": return `<circle cx="${n(x + s / 2)}" cy="${n(y + s / 2)}" r="${n(s * 0.32)}" fill="none" stroke="${fg}" stroke-width="${n(s * 0.14)}"/>`;
    default: return rect(x, y, s, s, `fill="${fg}"`) + `<circle cx="${n(x + s / 2)}" cy="${n(y + s / 2)}" r="${n(s * 0.3)}" fill="${alt}"/>`;
  }
}

export const geometric: Generator<P> = {
  id: "geometric",
  name: "Geometric",
  description: "Tiled shapes — Bauhaus mixes, circles, triangles or hexagons — in a chosen palette.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const colors = palette(p.palette).filter((c) => c.toLowerCase() !== p.bg.toLowerCase());
    const col = (): string => esc(pick(rng, colors));
    const s = p.cell * u;
    const g = p.gap * u;
    const shapes: string[] = [];

    if (p.shape === "hex") {
      const r = s / 2;
      const hw = Math.sqrt(3) * r;
      for (let row = -1, y = 0; y < size.h + r * 2; row++, y = row * r * 1.5)
        for (let x = (row & 1 ? hw / 2 : 0) - hw; x < size.w + hw; x += hw) {
          const pts = (rr: number) => Array.from({ length: 6 }, (_, k) => {
            const a = (Math.PI / 3) * k + Math.PI / 6;
            return `${n(x + rr * Math.cos(a))},${n(y + rr * Math.sin(a))}`;
          }).join(" ");
          shapes.push(`<polygon points="${pts(r - g / 2)}" fill="${col()}"/>`);
          if (rng() > 0.7) shapes.push(`<polygon points="${pts(r * 0.45)}" fill="${col()}"/>`);
        }
    } else {
      const cols = Math.ceil(size.w / s);
      const rows = Math.ceil(size.h / s);
      const ox = (size.w - cols * s) / 2;
      const oy = (size.h - rows * s) / 2;
      const kinds = p.shape === "circles" ? ["circle", "ring", "half", "circle"] : p.shape === "triangles" ? ["triangle"] : ["quarter", "half", "circle", "triangle", "square", "ring"];
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const x = ox + i * s + g / 2;
          const y = oy + j * s + g / 2;
          const inner = s - g;
          if (p.shape === "triangles") {
            shapes.push(rect(x, y, inner, inner, `fill="${col()}"`));
          } else if (rng() < 0.25) {
            shapes.push(rect(x, y, inner, inner, `fill="${col()}"`));
          }
          shapes.push(tile(pick(rng, kinds), x, y, inner, col(), col(), pick(rng, [0, 90, 180, 270])));
        }
    }

    const text = layoutText(p, size, { padding: 1.2 });
    return svgDoc(
      size,
      clearZonesMask("ge-zones", size, text.zones),
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) + `<g mask="url(#ge-zones)">${shapes.join("")}</g>` + text.svg,
    );
  },
};
