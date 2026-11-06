import type { Generator, ParamSchema, Preset } from "./types";
import { mix } from "./shared/color";
import { pick, range } from "./shared/rng";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  sky1: string;
  sky2: string;
  building: string;
  w1: string;
  w2: string;
  w3: string;
  density: number;
  height: number;
  lit: number;
  codeWindows: boolean;
  moon: boolean;
  stars: boolean;
  seed: number;
};

const params: ParamSchema<P> = {
  sky1: { kind: "color", label: "Sky top", default: "#0d1117", group: "Colours", role: "bg" },
  sky2: { kind: "color", label: "Sky horizon", default: "#1f2a44", group: "Colours", role: "accent" },
  building: { kind: "color", label: "Buildings", default: "#161b22", group: "Colours", role: "bg" },
  w1: { kind: "color", label: "Window 1", default: "#ff7b72", group: "Colours", role: "accent" },
  w2: { kind: "color", label: "Window 2", default: "#79c0ff", group: "Colours", role: "accent" },
  w3: { kind: "color", label: "Window 3", default: "#d2a8ff", group: "Colours", role: "accent" },
  density: { kind: "range", label: "Buildings", min: 6, max: 40, step: 1, default: 18, group: "City" },
  height: { kind: "range", label: "Skyline height", min: 0.2, max: 0.75, step: 0.01, default: 0.5, group: "City" },
  lit: { kind: "range", label: "Lit windows", min: 0, max: 1, step: 0.01, default: 0.45, group: "City" },
  codeWindows: { kind: "toggle", label: "Windows as code", default: true, group: "City", help: "Rows of lit windows read like syntax-highlighted code." },
  moon: { kind: "toggle", label: "Moon", default: true, group: "City" },
  stars: { kind: "toggle", label: "Stars", default: true, group: "City" },
  seed: { kind: "seed", label: "Seed", default: 15 },
  ...textParams({ "text.line1": "while (city.sleeps)", "text.line2": "{ *ship*(); }", "text.font": "mono", "text.size": 3.6, "text.position": "upper", "text.color": "#e6edf3" }),
};

const presets: Preset<P>[] = [
  { id: "github-night", title: "GitHub night", params: {} },
  { id: "dracula-city", title: "Dracula", params: { sky1: "#191a21", sky2: "#44475a", building: "#21222c", w1: "#ff79c6", w2: "#50fa7b", w3: "#f1fa8c", seed: 4, "text.color": "#f8f8f2" } },
  { id: "tokyo", title: "Tokyo night", params: { sky1: "#16161e", sky2: "#3b2b5b", building: "#1a1b26", w1: "#7aa2f7", w2: "#bb9af7", w3: "#ff9e64", density: 26, height: 0.62, seed: 22, "text.none": true } },
  { id: "amber-terminal", title: "Amber terminal", params: { sky1: "#120a00", sky2: "#2a1600", building: "#0d0700", w1: "#ffb000", w2: "#ff8c00", w3: "#ffd27f", codeWindows: false, lit: 0.35, seed: 9, "text.color": "#ffb000" } },
  { id: "sunset-skyline", title: "Sunset skyline", params: { sky1: "#2d1b4e", sky2: "#ff8e72", building: "#1c1230", w1: "#ffd166", w2: "#ffb3c1", w3: "#fff1d0", stars: false, seed: 31, "text.none": true } },
];

export const codeCity: Generator<P> = {
  id: "code-city",
  name: "Code City",
  description: "A night skyline whose lit windows read like syntax-highlighted code, in editor-theme colours.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const wins = [p.w1, p.w2, p.w3];
    const body: string[] = [];
    const defs = `<linearGradient id="cc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(p.sky1)}"/><stop offset="1" stop-color="${esc(p.sky2)}"/></linearGradient>`;
    body.push(`<rect width="${size.w}" height="${size.h}" fill="url(#cc-sky)"/>`);

    if (p.stars)
      body.push(`<g fill="#ffffff">${Array.from({ length: 140 }, () => `<circle cx="${n(rng() * size.w)}" cy="${n(rng() * size.h * 0.5)}" r="${n(range(rng, 0.05, 0.18) * u)}" opacity="${n(range(rng, 0.2, 0.8))}"/>`).join("")}</g>`);
    if (p.moon) {
      const mx = size.w * range(rng, 0.65, 0.85), my = size.h * range(rng, 0.12, 0.22), r = 5 * u;
      body.push(`<circle cx="${n(mx)}" cy="${n(my)}" r="${n(r * 2.4)}" fill="${esc(mix(p.sky2, "#ffffff", 0.15))}" opacity="0.25"/><circle cx="${n(mx)}" cy="${n(my)}" r="${n(r)}" fill="${esc(mix(p.w3, "#ffffff", 0.7))}"/>`);
    }

    // Two layers: a faded back row, then the detailed front row.
    for (const layer of [0, 1] as const) {
      const count = Math.round(p.density * (layer ? 1 : 0.8));
      const avgW = size.w / count;
      const color = layer ? p.building : mix(p.building, p.sky2, 0.45);
      let x = -avgW * 0.3;
      while (x < size.w) {
        const w = avgW * range(rng, 0.6, 1.3);
        const maxH = size.h * p.height * (layer ? 1 : 1.12);
        const h = maxH * range(rng, 0.35, 1);
        const top = size.h - h;
        body.push(rect(x, top, w - u * 0.4, h, `fill="${esc(color)}"`));
        if (rng() < 0.25) body.push(rect(x + w * 0.45, top - 4 * u, 0.25 * u, 4 * u, `fill="${esc(color)}"`));

        if (layer) {
          const cw = Math.max(0.6 * u, w / 14);
          const ch = 1.6 * u;
          const pad = cw;
          const rects: string[] = [];
          for (let y = top + 2 * u; y < size.h - 2 * u; y += ch * 1.6) {
            if (p.codeWindows) {
              // A "line of code": indent, then a few tokens of different colours.
              if (rng() > p.lit + 0.2) continue;
              let cx = x + pad + Math.floor(range(rng, 0, 3)) * cw;
              const end = x + w - pad - u * 0.4;
              const tokens = 1 + Math.floor(rng() * 3);
              for (let t = 0; t < tokens && cx < end; t++) {
                const tw = Math.min(end - cx, cw * Math.floor(range(rng, 1, 5)));
                if (tw > 0) rects.push(rect(cx, y, tw, ch * 0.55, `fill="${esc(pick(rng, wins))}" opacity="${n(range(rng, 0.55, 1))}"`));
                cx += tw + cw;
              }
            } else {
              for (let wx = x + pad; wx < x + w - pad - cw; wx += cw * 1.8)
                if (rng() < p.lit) rects.push(rect(wx, y, cw, ch * 0.7, `fill="${esc(pick(rng, wins))}" opacity="${n(range(rng, 0.6, 1))}"`));
            }
          }
          body.push(rects.join(""));
        }
        x += w;
      }
    }
    body.push(layoutText(p, size).svg);
    return svgDoc(size, defs, body.join(""));
  },
};
