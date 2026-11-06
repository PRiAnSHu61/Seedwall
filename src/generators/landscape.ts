import type { Generator, ParamSchema, Preset } from "./types";
import { mix } from "./shared/color";
import { createNoise2D, fbm } from "./shared/noise";
import { range } from "./shared/rng";
import { esc, grainFilter, grainRect, n, smoothPath, svgDoc, unit } from "./shared/svg";
import { layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  sky1: string;
  sky2: string;
  far: string;
  near: string;
  sun1: string;
  sun2: string;
  layers: number;
  roughness: number;
  sun: boolean;
  stripes: boolean;
  grid: boolean;
  stars: boolean;
  grain: number;
  seed: number;
};

const params: ParamSchema<P> = {
  sky1: { kind: "color", label: "Sky top", default: "#f7d9c4", group: "Sky", role: "bg" },
  sky2: { kind: "color", label: "Sky horizon", default: "#fbe7d3", group: "Sky", role: "accent" },
  sun1: { kind: "color", label: "Sun top", default: "#ffb38a", group: "Sky", role: "accent" },
  sun2: { kind: "color", label: "Sun bottom", default: "#ff7b6b", group: "Sky", role: "accent" },
  sun: { kind: "toggle", label: "Sun", default: true, group: "Sky" },
  stripes: { kind: "toggle", label: "Retro sun stripes", default: false, group: "Sky" },
  stars: { kind: "toggle", label: "Stars", default: false, group: "Sky" },
  far: { kind: "color", label: "Far hills", default: "#e9a990", group: "Land", role: "accent" },
  near: { kind: "color", label: "Near hills", default: "#5b3a4a", group: "Land", role: "bg" },
  layers: { kind: "range", label: "Layers", min: 2, max: 9, step: 1, default: 5, group: "Land" },
  roughness: { kind: "range", label: "Roughness", min: 0.3, max: 4, step: 0.1, default: 1.4, group: "Land" },
  grid: { kind: "toggle", label: "Synthwave grid floor", default: false, group: "Land" },
  grain: { kind: "range", label: "Film grain", min: 0, max: 0.4, step: 0.01, default: 0.08, group: "Land" },
  seed: { kind: "seed", label: "Seed", default: 14 },
  ...textParams({ "text.none": true, "text.line1": "Take the long way.", "text.line2": "", "text.font": "display", "text.size": 6, "text.position": "upper", "text.color": "#5b3a4a" }),
};

const presets: Preset<P>[] = [
  { id: "paper-dunes", title: "Paper dunes", params: {} },
  { id: "synthwave", title: "Synthwave", params: { sky1: "#0d0221", sky2: "#541388", sun1: "#ffd319", sun2: "#ff2975", far: "#8c1eff", near: "#0d0221", stripes: true, grid: true, stars: true, layers: 2, roughness: 2.2, grain: 0.06, seed: 7, "text.color": "#ffd319" } },
  { id: "misty-blue", title: "Misty blue", params: { sky1: "#dfe9f3", sky2: "#ffffff", far: "#b6c9dc", near: "#1f3a5f", sun: false, layers: 7, roughness: 2, seed: 4, "text.color": "#1f3a5f" } },
  { id: "desert", title: "Desert", params: { sky1: "#87b7d9", sky2: "#f2d8b3", sun1: "#fff2cc", sun2: "#ffd27f", far: "#e8b77d", near: "#9a4f2b", layers: 4, roughness: 0.8, seed: 22 } },
  { id: "lofi-night", title: "Lo-fi night", params: { sky1: "#1b1d3a", sky2: "#e98a9a", sun1: "#ffe3c4", sun2: "#ffb4a2", far: "#9c6f97", near: "#141225", stars: true, layers: 5, seed: 18, grain: 0.12, "text.none": false, "text.line1": "late night", "text.line2": "*lo-fi* beats", "text.color": "#ffe3c4" } },
];

export const landscape: Generator<P> = {
  id: "landscape",
  name: "Landscape",
  description: "Layered hills and dunes fading into a gradient sky, with an optional striped retro sun and synthwave grid floor.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const noise = createNoise2D(rng);
    const layers = Math.round(p.layers);
    const horizon = size.h * (p.grid ? 0.62 : 0.55);
    const defs: string[] = [
      `<linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(p.sky1)}"/><stop offset="1" stop-color="${esc(p.sky2)}"/></linearGradient>`,
    ];
    const body: string[] = [`<rect width="${size.w}" height="${size.h}" fill="url(#ls-sky)"/>`];

    if (p.stars)
      body.push(
        `<g fill="#ffffff">${Array.from({ length: 120 }, () => `<circle cx="${n(rng() * size.w)}" cy="${n(rng() * horizon * 0.85)}" r="${n(range(rng, 0.06, 0.2) * u)}" opacity="${n(range(rng, 0.3, 0.9))}"/>`).join("")}</g>`,
      );

    if (p.sun) {
      const r = 18 * u;
      const cx = size.w * range(rng, 0.38, 0.62);
      const cy = horizon - r * 0.45;
      defs.push(`<linearGradient id="ls-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(p.sun1)}"/><stop offset="1" stop-color="${esc(p.sun2)}"/></linearGradient>`);
      let mask = "";
      if (p.stripes) {
        const bars = Array.from({ length: 7 }, (_, i) => {
          const y = cy + r * (0.05 + i * 0.14);
          return `<rect x="${n(cx - r)}" y="${n(y)}" width="${n(r * 2)}" height="${n(r * 0.025 * (i + 1))}" fill="#000"/>`;
        }).join("");
        defs.push(`<mask id="ls-stripes" maskUnits="userSpaceOnUse" x="0" y="0" width="${size.w}" height="${size.h}"><rect width="${size.w}" height="${size.h}" fill="#fff"/>${bars}</mask>`);
        mask = ` mask="url(#ls-stripes)"`;
      }
      body.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="url(#ls-sun)"${mask}/>`);
    }

    for (let l = 0; l < layers; l++) {
      const t = layers === 1 ? 1 : l / (layers - 1);
      const base = horizon + (size.h - horizon) * t * (p.grid ? 0.15 : 0.62);
      const amp = (8 + 10 * (1 - t)) * u;
      const pts: [number, number][] = [];
      const cols = 40;
      for (let c = 0; c <= cols; c++) {
        const x = (size.w * c) / cols;
        pts.push([x, base - Math.abs(fbm(noise, (c / cols) * p.roughness * 2, l * 3.7, 4)) * amp * 2.4]);
      }
      const color = mix(p.far, p.near, t);
      body.push(`<path d="${smoothPath(pts)}L${size.w} ${size.h}L0 ${size.h}Z" fill="${color}"/>`);
    }

    if (p.grid) {
      const top = horizon + (size.h - horizon) * 0.15;
      const vx = size.w / 2;
      const lines: string[] = [];
      for (let i = -24; i <= 24; i++) lines.push(`M${n(vx + i * u * 1.2)} ${n(top)}L${n(vx + i * size.w * 0.09)} ${n(size.h)}`);
      for (let j = 1; j <= 14; j++) {
        const y = top + (size.h - top) * (j / 14) ** 2;
        lines.push(`M0 ${n(y)}H${size.w}`);
      }
      body.push(`<rect x="0" y="${n(top)}" width="${size.w}" height="${n(size.h - top)}" fill="${esc(p.near)}"/>`);
      body.push(`<path d="${lines.join("")}" stroke="${esc(p.sun2)}" stroke-width="${n(0.14 * u)}" stroke-opacity="0.85" fill="none"/>`);
    }

    if (p.grain > 0) {
      defs.push(grainFilter("ls-grain", p.grain));
      body.push(grainRect(size, "ls-grain"));
    }
    body.push(layoutText(p, size).svg);
    return svgDoc(size, defs.join(""), body.join(""));
  },
};
