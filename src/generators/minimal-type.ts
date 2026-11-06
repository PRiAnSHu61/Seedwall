import type { Generator, ParamSchema, Preset } from "./types";
import { esc, grainFilter, grainRect, n, svgDoc } from "./shared/svg";
import { layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  bg2: string;
  fill: string;
  angle: number;
  grain: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Colour", default: "#f4efe6", group: "Background", role: "bg" },
  bg2: { kind: "color", label: "Second colour", default: "#e7dccb", group: "Background", role: "accent" },
  fill: {
    kind: "select",
    label: "Fill",
    default: "flat",
    group: "Background",
    options: [
      { value: "flat", label: "Flat" },
      { value: "linear", label: "Linear gradient" },
      { value: "radial", label: "Radial gradient" },
    ],
  },
  angle: { kind: "range", label: "Gradient angle", min: 0, max: 360, step: 1, default: 135, group: "Background" },
  grain: { kind: "range", label: "Film grain", min: 0, max: 0.4, step: 0.01, default: 0, group: "Background" },
  seed: { kind: "seed", label: "Seed", default: 1 },
  ...textParams({ "text.line1": "Less, but *better*.", "text.line2": "", "text.font": "display", "text.size": 11, "text.color": "#1f1a14", "text.paragraph": "" }),
};

const presets: Preset<P>[] = [
  { id: "paper", title: "Paper", params: {} },
  { id: "ink", title: "Ink", params: { bg: "#111111", "text.color": "#f5f5f5", "text.line1": "Do the work.", "text.font": "grotesk", "text.size": 9 } },
  { id: "dusk-gradient", title: "Dusk gradient", params: { bg: "#ff9a8b", bg2: "#6a2c91", fill: "linear", angle: 160, grain: 0.08, "text.color": "#ffffff", "text.line1": "Stay *soft*.", "text.line2": "Stay sharp." } },
  { id: "electric", title: "Electric", params: { bg: "#2457ff", bg2: "#0a1a66", fill: "radial", "text.color": "#ffffff", "text.font": "mono", "text.size": 6, "text.line1": "hello, world", "text.position": "bottom-left" } },
  { id: "sage", title: "Sage", params: { bg: "#c8d5b9", bg2: "#8fc0a9", fill: "linear", angle: 90, "text.color": "#203325", "text.font": "serif", "text.line1": "Slow is smooth.", "text.line2": "Smooth is fast." } },
];

export const minimalType: Generator<P> = {
  id: "minimal-type",
  name: "Minimal Type",
  description: "A flat colour or gentle gradient with one large quote in the font of your choice.",
  params,
  presets,
  render(p, size) {
    let defs = "";
    let fill = esc(p.bg);
    if (p.fill === "linear") {
      const a = (p.angle * Math.PI) / 180;
      const x = Math.cos(a) / 2, y = Math.sin(a) / 2;
      defs += `<linearGradient id="mt-bg" x1="${n(0.5 - x)}" y1="${n(0.5 - y)}" x2="${n(0.5 + x)}" y2="${n(0.5 + y)}"><stop offset="0" stop-color="${esc(p.bg)}"/><stop offset="1" stop-color="${esc(p.bg2)}"/></linearGradient>`;
      fill = "url(#mt-bg)";
    } else if (p.fill === "radial") {
      defs += `<radialGradient id="mt-bg" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="${esc(p.bg)}"/><stop offset="1" stop-color="${esc(p.bg2)}"/></radialGradient>`;
      fill = "url(#mt-bg)";
    }
    if (p.grain > 0) defs += grainFilter("mt-grain", p.grain);
    const text = layoutText(p, size);
    return svgDoc(size, defs, `<rect width="${size.w}" height="${size.h}" fill="${fill}"/>` + (p.grain > 0 ? grainRect(size, "mt-grain") : "") + text.svg);
  },
};
