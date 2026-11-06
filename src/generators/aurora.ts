import type { Generator, ParamSchema, Preset } from "./types";
import { range } from "./shared/rng";
import { blurFilter, esc, grainFilter, grainRect, n, rect, svgDoc, unit } from "./shared/svg";
import { layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  c1: string;
  c2: string;
  c3: string;
  bands: number;
  softness: number;
  grain: number;
  stars: boolean;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Sky", default: "#050816", group: "Colours", role: "bg" },
  c1: { kind: "color", label: "Light 1", default: "#2cffb0", group: "Colours", role: "accent" },
  c2: { kind: "color", label: "Light 2", default: "#3b82f6", group: "Colours", role: "accent" },
  c3: { kind: "color", label: "Light 3", default: "#a855f7", group: "Colours", role: "accent" },
  bands: { kind: "range", label: "Bands", min: 2, max: 7, step: 1, default: 4, group: "Aurora" },
  softness: { kind: "range", label: "Softness", min: 2, max: 14, step: 0.5, default: 6, group: "Aurora" },
  grain: { kind: "range", label: "Film grain", min: 0, max: 0.4, step: 0.01, default: 0.1, group: "Aurora" },
  stars: { kind: "toggle", label: "Stars", default: true, group: "Aurora" },
  seed: { kind: "seed", label: "Seed", default: 23 },
  ...textParams({ "text.none": true, "text.line1": "Look up.", "text.line2": "", "text.font": "display", "text.size": 8, "text.position": "lower" }),
};

const presets: Preset<P>[] = [
  { id: "borealis", title: "Borealis", params: {} },
  { id: "solar-wind", title: "Solar wind", params: { bg: "#0c0410", c1: "#ff4d6d", c2: "#ffb703", c3: "#7209b7", seed: 8 } },
  { id: "glacier", title: "Glacier", params: { bg: "#03121c", c1: "#9bf6ff", c2: "#48cae4", c3: "#caffbf", bands: 3, softness: 9, seed: 41 } },
  { id: "night-quote", title: "Night + quote", params: { seed: 4, "text.none": false } },
  { id: "dawn", title: "Dawn (light)", params: { bg: "#fbeee6", c1: "#ff8fab", c2: "#ffc8dd", c3: "#bde0fe", stars: false, grain: 0.06, seed: 12, "text.color": "#3d2c3a" } },
];

export const aurora: Generator<P> = {
  id: "aurora",
  name: "Aurora",
  description: "Layered, blurred ribbons of light over a night sky, with optional stars and film grain.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const colors = [p.c1, p.c2, p.c3];
    const defs: string[] = [blurFilter("au-blur", p.softness * u, size)];
    const ribbons: string[] = [];
    const steps = 6;

    for (let b = 0; b < Math.round(p.bands); b++) {
      const base = size.h * range(rng, 0.15, 0.7);
      const amp = range(rng, 6, 18) * u;
      const thick = range(rng, 12, 34) * u;
      const phase = range(rng, 0, Math.PI * 2);
      const freq = range(rng, 0.6, 1.6);
      const tilt = range(rng, -0.25, 0.25) * size.h;
      const pts = Array.from({ length: steps + 1 }, (_, i) => {
        const x = (i / steps) * (size.w + 40 * u) - 20 * u;
        const y = base + tilt * (i / steps - 0.5) + Math.sin(phase + (i / steps) * Math.PI * 2 * freq) * amp;
        return [x, y] as const;
      });
      let d = `M${n(pts[0]![0])} ${n(pts[0]![1])}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1]!;
        const [x1, y1] = pts[i]!;
        const mx = (x0 + x1) / 2;
        d += `C${n(mx)} ${n(y0)} ${n(mx)} ${n(y1)} ${n(x1)} ${n(y1)}`;
      }
      d += `L${n(pts[pts.length - 1]![0])} ${n(pts[pts.length - 1]![1] + thick)}`;
      for (let i = pts.length - 1; i > 0; i--) {
        const [x0, y0] = pts[i]!;
        const [x1, y1] = pts[i - 1]!;
        const mx = (x0 + x1) / 2;
        d += `C${n(mx)} ${n(y0 + thick)} ${n(mx)} ${n(y1 + thick)} ${n(x1)} ${n(y1 + thick)}`;
      }
      d += "Z";
      const c = esc(colors[b % 3] ?? p.c1);
      const gid = `au-g${b}`;
      defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset="0.45" stop-color="${c}" stop-opacity="0.9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`);
      ribbons.push(`<path d="${d}" fill="url(#${gid})" opacity="${n(range(rng, 0.55, 0.95))}"/>`);
    }

    const stars = p.stars
      ? Array.from({ length: 160 }, () =>
          `<circle cx="${n(rng() * size.w)}" cy="${n(rng() * size.h)}" r="${n(range(rng, 0.05, 0.22) * u)}" opacity="${n(range(rng, 0.25, 0.9))}"/>`,
        ).join("")
      : "";
    if (p.grain > 0) defs.push(grainFilter("au-grain", p.grain));
    const text = layoutText(p, size);

    return svgDoc(
      size,
      defs.join(""),
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        `<g fill="#ffffff">${stars}</g>` +
        `<g filter="url(#au-blur)">${ribbons.join("")}</g>` +
        (p.grain > 0 ? grainRect(size, "au-grain") : "") +
        text.svg,
    );
  },
};
