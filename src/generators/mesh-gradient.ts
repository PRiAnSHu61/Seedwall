import type { Generator, ParamSchema, Preset } from "./types";
import { range } from "./shared/rng";
import { blurFilter, esc, grainFilter, grainRect, n, rect, svgDoc, unit } from "./shared/svg";
import { layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  blobs: number;
  softness: number;
  grain: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Base", default: "#ffd8c2", group: "Colours", role: "bg" },
  c1: { kind: "color", label: "Colour 1", default: "#ff7a59", group: "Colours", role: "accent" },
  c2: { kind: "color", label: "Colour 2", default: "#ffb3c7", group: "Colours", role: "accent" },
  c3: { kind: "color", label: "Colour 3", default: "#7d5cff", group: "Colours", role: "accent" },
  c4: { kind: "color", label: "Colour 4", default: "#ffd166", group: "Colours", role: "accent" },
  blobs: { kind: "range", label: "Blobs", min: 3, max: 10, step: 1, default: 6, group: "Shape" },
  softness: { kind: "range", label: "Softness", min: 6, max: 40, step: 1, default: 22, group: "Shape" },
  grain: { kind: "range", label: "Film grain", min: 0, max: 0.4, step: 0.01, default: 0.12, group: "Shape" },
  seed: { kind: "seed", label: "Seed", default: 11 },
  ...textParams({ "text.none": true, "text.line1": "Soft focus.", "text.line2": "", "text.font": "display", "text.size": 8 }),
};

const presets: Preset<P>[] = [
  { id: "peach", title: "Peach", params: {} },
  { id: "lagoon", title: "Lagoon", params: { bg: "#0b2b3a", c1: "#00c2a8", c2: "#2f80ed", c3: "#9be15d", c4: "#00e0ff", seed: 4 } },
  { id: "violet-dusk", title: "Violet dusk", params: { bg: "#1a1033", c1: "#7b2ff7", c2: "#f107a3", c3: "#ff9a8b", c4: "#3a0ca3", seed: 21 } },
  { id: "mint", title: "Mint", params: { bg: "#e9fbf3", c1: "#9ef0c9", c2: "#c6f6ff", c3: "#ffe6a7", c4: "#b9b7ff", seed: 8, grain: 0.08, "text.color": "#1b2a24" } },
  { id: "ember-quote", title: "Ember + quote", params: { bg: "#240a05", c1: "#ff5e3a", c2: "#ff9f1c", c3: "#c9184a", c4: "#6a040f", seed: 33, "text.none": false, "text.line1": "Keep the *fire* small", "text.line2": "and steady." } },
];

export const meshGradient: Generator<P> = {
  id: "mesh-gradient",
  name: "Mesh Gradient",
  description: "Soft multi-colour mesh gradient made of blurred colour fields, finished with film grain.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const colors = [p.c1, p.c2, p.c3, p.c4];
    const blobs = Array.from({ length: Math.round(p.blobs) }, (_, i) => {
      const x = range(rng, -0.1, 1.1) * size.w;
      const y = range(rng, -0.1, 1.1) * size.h;
      const rx = range(rng, 28, 60) * u;
      const ry = rx * range(rng, 0.6, 1.2);
      return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${esc(colors[i % 4] ?? p.c1)}" opacity="${n(range(rng, 0.75, 1))}"/>`;
    }).join("");
    const text = layoutText(p, size);
    const defs = blurFilter("mg-blur", p.softness * u, size) + (p.grain > 0 ? grainFilter("mg-grain", p.grain) : "");
    return svgDoc(
      size,
      defs,
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        `<g filter="url(#mg-blur)">${blobs}</g>` +
        (p.grain > 0 ? grainRect(size, "mg-grain") : "") +
        text.svg,
    );
  },
};
