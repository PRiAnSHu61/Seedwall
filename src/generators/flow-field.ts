import type { Generator, ParamSchema, Preset } from "./types";
import { createNoise2D, fbm } from "./shared/noise";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  c1: string;
  c2: string;
  c3: string;
  lines: number;
  length: number;
  scale: number;
  curl: number;
  weight: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#0e0f14", group: "Colours", role: "bg" },
  c1: { kind: "color", label: "Colour 1", default: "#f4a261", group: "Colours", role: "accent" },
  c2: { kind: "color", label: "Colour 2", default: "#e76f51", group: "Colours", role: "accent" },
  c3: { kind: "color", label: "Colour 3", default: "#2a9d8f", group: "Colours", role: "accent" },
  lines: { kind: "range", label: "Lines", min: 100, max: 2400, step: 50, default: 900, group: "Field" },
  length: { kind: "range", label: "Line length", min: 10, max: 120, step: 1, default: 45, group: "Field" },
  scale: { kind: "range", label: "Noise scale", min: 0.3, max: 6, step: 0.1, default: 1.6, group: "Field" },
  curl: { kind: "range", label: "Curl", min: 0.5, max: 4, step: 0.1, default: 1.4, group: "Field" },
  weight: { kind: "range", label: "Line weight", min: 0.03, max: 0.5, step: 0.01, default: 0.12, group: "Field" },
  seed: { kind: "seed", label: "Seed", default: 12 },
  ...textParams({ "text.none": true, "text.line1": "Go with the flow.", "text.line2": "", "text.font": "display", "text.size": 7 }),
};

const presets: Preset<P>[] = [
  { id: "ember", title: "Ember", params: {} },
  { id: "ocean-current", title: "Ocean current", params: { bg: "#06141f", c1: "#4cc9f0", c2: "#4361ee", c3: "#e0fbfc", scale: 1.1, curl: 2, seed: 3 } },
  { id: "ink-on-paper", title: "Ink on paper", params: { bg: "#f2ede3", c1: "#1d1d1f", c2: "#3a3a3c", c3: "#b23a48", lines: 1400, weight: 0.07, seed: 21, "text.color": "#1d1d1f" } },
  { id: "neon-silk", title: "Neon silk", params: { bg: "#0b0221", c1: "#ff2a6d", c2: "#05d9e8", c3: "#d1f7ff", lines: 1600, length: 80, scale: 0.8, curl: 1, weight: 0.06, seed: 8 } },
  { id: "moss-quote", title: "Moss + quote", params: { bg: "#13201a", c1: "#a7c957", c2: "#6a994e", c3: "#f2e8cf", seed: 40, "text.none": false, "text.color": "#f2e8cf" } },
];

export const flowField: Generator<P> = {
  id: "flow-field",
  name: "Flow Field",
  description: "Thousands of thin curved lines drifting through a seeded noise field, in two or three colours.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const noise = createNoise2D(rng);
    const short = Math.min(size.w, size.h);
    const step = 0.9 * u;
    const colors = [p.c1, p.c2, p.c3];
    const paths: string[][] = [[], [], []];
    const f = (v: number): string => String(Math.round(v * 10) / 10);

    for (let i = 0; i < Math.round(p.lines); i++) {
      let x = rng() * size.w;
      let y = rng() * size.h;
      const bucket = Math.min(2, Math.floor(rng() * 3));
      let d = `M${f(x)} ${f(y)}`;
      const len = Math.round(p.length * (0.5 + rng()));
      for (let s = 0; s < len; s++) {
        const a = fbm(noise, (x / short) * p.scale, (y / short) * p.scale, 3) * Math.PI * 2 * p.curl;
        const dx = Math.cos(a) * step;
        const dy = Math.sin(a) * step;
        x += dx;
        y += dy;
        if (x < -step || y < -step || x > size.w + step || y > size.h + step) break;
        d += `l${f(dx)} ${f(dy)}`;
      }
      paths[bucket]!.push(d);
    }

    const text = layoutText(p, size);
    const body = paths
      .map((ds, i) => `<path d="${ds.join("")}" stroke="${esc(colors[i] ?? p.c1)}" stroke-opacity="${n(0.55 + i * 0.12)}"/>`)
      .join("");
    return svgDoc(
      size,
      clearZonesMask("ff-zones", size, text.zones),
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        `<g fill="none" stroke-width="${n(p.weight * u)}" stroke-linecap="round" stroke-linejoin="round" mask="url(#ff-zones)">${body}</g>` +
        text.svg,
    );
  },
};
