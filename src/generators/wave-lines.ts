import type { Generator, ParamSchema, Preset } from "./types";
import { createNoise2D, fbm } from "./shared/noise";
import { range } from "./shared/rng";
import { esc, n, rect, smoothPath, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  c1: string;
  c2: string;
  lines: number;
  amplitude: number;
  spread: number;
  roughness: number;
  occlude: boolean;
  weight: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#0b0b0c", group: "Colours", role: "bg" },
  c1: { kind: "color", label: "Line (top)", default: "#f5f5f5", group: "Colours", role: "fg" },
  c2: { kind: "color", label: "Line (bottom)", default: "#f5f5f5", group: "Colours", role: "accent" },
  lines: { kind: "range", label: "Lines", min: 12, max: 140, step: 1, default: 64, group: "Waves" },
  amplitude: { kind: "range", label: "Amplitude", min: 1, max: 30, step: 0.5, default: 9, group: "Waves" },
  spread: { kind: "range", label: "Peak width", min: 0.1, max: 1, step: 0.01, default: 0.28, group: "Waves" },
  roughness: { kind: "range", label: "Roughness", min: 1, max: 12, step: 0.5, default: 5, group: "Waves" },
  occlude: { kind: "toggle", label: "Hide lines behind peaks", default: true, group: "Waves" },
  weight: { kind: "range", label: "Line weight", min: 0.05, max: 0.6, step: 0.01, default: 0.18, group: "Waves" },
  seed: { kind: "seed", label: "Seed", default: 79 },
  ...textParams({ "text.none": true, "text.line1": "UNKNOWN PLEASURES", "text.line2": "", "text.font": "grotesk", "text.size": 2.4, "text.position": "bottom-left" }),
};

const presets: Preset<P>[] = [
  { id: "pulsar", title: "Pulsar", params: {} },
  { id: "sunset-gradient", title: "Sunset gradient", params: { bg: "#120a1f", c1: "#ffb86c", c2: "#ff3c8e", amplitude: 12, lines: 70, seed: 5 } },
  { id: "terrain-slice", title: "Terrain slice", params: { bg: "#f1ece2", c1: "#2b2b2b", c2: "#7d6b55", spread: 0.9, amplitude: 6, roughness: 3, lines: 90, weight: 0.1, seed: 33, "text.color": "#2b2b2b" } },
  { id: "signal", title: "Signal (quote)", params: { bg: "#03111a", c1: "#7dcfff", c2: "#2a9d8f", lines: 48, amplitude: 14, spread: 0.18, seed: 2, "text.none": false, "text.color": "#e0fbfc" } },
  { id: "calm-water", title: "Calm water", params: { bg: "#0b1a2c", c1: "#9fd3ff", c2: "#3d5a80", occlude: false, amplitude: 3, spread: 1, roughness: 2, lines: 110, weight: 0.08, seed: 9 } },
];

export const waveLines: Generator<P> = {
  id: "wave-lines",
  name: "Wave Lines",
  description: "Stacked horizontal lines that ripple into ridges — the pulsar / terrain-slice look, with a gradient stroke.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const noise = createNoise2D(rng);
    const count = Math.round(p.lines);
    const mx = size.w * 0.12;
    const top = size.h * 0.16;
    const bottom = size.h * 0.88;
    const gap = (bottom - top) / Math.max(1, count - 1);
    const cols = 90;
    const centre = size.w / 2 + range(rng, -0.05, 0.05) * size.w;
    const half = (size.w / 2 - mx) * p.spread;

    const rows: string[] = [];
    for (let i = 0; i < count; i++) {
      const y0 = top + i * gap;
      const pts: [number, number][] = [];
      for (let c = 0; c <= cols; c++) {
        const x = mx + ((size.w - 2 * mx) * c) / cols;
        const env = Math.exp(-(((x - centre) / Math.max(1, half)) ** 2));
        const nz = Math.abs(fbm(noise, (c / cols) * p.roughness, i * 0.13, 3));
        const ripple = 0.08 * fbm(noise, (c / cols) * p.roughness * 3, i * 0.5 + 100, 2);
        pts.push([x, y0 - (env * nz * 2.2 + ripple) * p.amplitude * u]);
      }
      const d = smoothPath(pts);
      // Fill hides the lines behind this one; stroke only the ridge itself (no box edges).
      if (p.occlude) rows.push(`<path d="${d}L${n(size.w - mx)} ${n(y0 + gap * 3)}L${n(mx)} ${n(y0 + gap * 3)}Z" fill="${esc(p.bg)}" stroke="none"/>`);
      rows.push(`<path d="${d}" fill="none"/>`);
    }

    const text = layoutText(p, size);
    const defs =
      `<linearGradient id="wl-grad" gradientUnits="userSpaceOnUse" x1="0" y1="${n(top)}" x2="0" y2="${n(bottom)}"><stop offset="0" stop-color="${esc(p.c1)}"/><stop offset="1" stop-color="${esc(p.c2)}"/></linearGradient>` +
      clearZonesMask("wl-zones", size, text.zones);
    return svgDoc(
      size,
      defs,
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        `<g stroke="url(#wl-grad)" stroke-width="${n(p.weight * u)}" stroke-linejoin="round" mask="url(#wl-zones)">${rows.join("")}</g>` +
        text.svg,
    );
  },
};
