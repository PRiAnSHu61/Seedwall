import type { Generator, ParamSchema, Preset } from "./types";
import { mix } from "./shared/color";
import { createNoise2D, fbm } from "./shared/noise";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  warm: string;
  cool: string;
  pole: string;
  land: string;
  stars: number;
  hours: number;
  pos: string;
  horizon: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Night", default: "#070a14", group: "Colours", role: "bg" },
  warm: { kind: "color", label: "Warm stars", default: "#ffcf9a", group: "Colours", role: "accent" },
  cool: { kind: "color", label: "Cool stars", default: "#b9d4ff", group: "Colours", role: "fg" },
  pole: { kind: "color", label: "Pole star", default: "#ffffff", group: "Colours", role: "fg" },
  land: { kind: "color", label: "Land", default: "#020305", group: "Colours", role: "bg" },
  stars: { kind: "range", label: "Stars", min: 40, max: 900, step: 10, default: 380, group: "Sky" },
  hours: { kind: "range", label: "Exposure (hours)", min: 0.5, max: 12, step: 0.5, default: 3, group: "Sky", help: "The sky turns 15° an hour around the pole star." },
  pos: { kind: "select", label: "Pole star", options: [{ value: "high", label: "High" }, { value: "centre", label: "Centre" }, { value: "corner", label: "Upper corner" }], default: "high", group: "Sky" },
  horizon: { kind: "range", label: "Land", min: 0, max: 0.4, step: 0.01, default: 0.14, group: "Sky" },
  seed: { kind: "seed", label: "Seed", default: 17 },
  ...textParams({ "text.none": false, "text.line1": "सब घूमे,", "text.line2": "ध्रुव अटल।", "text.color": "#ffffff", "text.position": "lower", "text.font": "hindi", "text.size": 4.6 }),
};

const presets: Preset<P>[] = [
  { id: "long-night", title: "Long night", params: {} },
  { id: "full-turn", title: "A full night", params: { bg: "#0a0716", warm: "#ff9fb2", cool: "#9ad1ff", hours: 11, stars: 520, pos: "centre", horizon: 0.08, seed: 6 } },
  { id: "himalaya", title: "Himalaya", params: { bg: "#0b1220", land: "#05070c", cool: "#d6e4ff", warm: "#ffe0b5", hours: 2, stars: 700, horizon: 0.3, seed: 23 } },
  { id: "paper", title: "Paper (light)", params: { bg: "#f1ede6", land: "#d8d1c6", warm: "#b5543c", cool: "#2e4a6b", pole: "#111111", hours: 4, stars: 260, seed: 9, "text.color": "#2e2a26" } },
  { id: "few", title: "Few stars", params: { bg: "#000000", land: "#000000", warm: "#888888", cool: "#bbbbbb", stars: 60, hours: 6, pos: "corner", horizon: 0, seed: 3 } },
];

export const dhruva: Generator<P> = {
  id: "dhruva",
  name: "Dhruva",
  description: "Dhruva, the child whose devotion to Vishnu made him the pole star: a long exposure where the whole sky wheels around one point that never moves.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const px = p.pos === "corner" ? size.w * 0.82 : size.w / 2;
    const py = p.pos === "centre" ? size.h * 0.45 : size.h * (size.h > size.w ? 0.24 : 0.2);
    const reach = Math.max(Math.hypot(px, py), Math.hypot(size.w - px, py), Math.hypot(px, size.h - py), Math.hypot(size.w - px, size.h - py));
    const sweep = ((p.hours * 15) * Math.PI) / 180;
    const w = Math.max(0.5, 0.16 * u);

    // Stars grouped by colour step, so the SVG stays small.
    const groups = new Map<string, string[]>();
    for (let i = 0; i < Math.round(p.stars); i++) {
      const r = Math.sqrt(rng()) * reach;
      if (r < 1.2 * u) continue;
      const a0 = rng() * Math.PI * 2;
      const a1 = a0 + sweep;
      const big = sweep > Math.PI ? 1 : 0;
      const bright = Math.pow(rng(), 2.2);
      const col = mix(p.cool, p.warm, Math.round(rng() * 6) / 6);
      const op = n(0.15 + bright * 0.75);
      const sw = n(w * (0.6 + bright * 2.2));
      const key = `${col}|${op}`;
      const d = `<path d="M${n(px + r * Math.cos(a0))} ${n(py + r * Math.sin(a0))}A${n(r)} ${n(r)} 0 ${big} 1 ${n(px + r * Math.cos(a1))} ${n(py + r * Math.sin(a1))}" stroke-width="${sw}"/>`;
      const list = groups.get(key) ?? [];
      list.push(d);
      groups.set(key, list);
    }
    const trails = [...groups]
      .map(([key, list]) => {
        const [col, op] = key.split("|");
        return `<g stroke="${esc(col!)}" stroke-opacity="${op}">${list.join("")}</g>`;
      })
      .join("");

    const pole =
      `<circle cx="${n(px)}" cy="${n(py)}" r="${n(2.6 * u)}" fill="${esc(p.pole)}" fill-opacity="0.08"/>` +
      `<circle cx="${n(px)}" cy="${n(py)}" r="${n(0.7 * u)}" fill="${esc(p.pole)}"/>`;

    // A low ridge of land, drawn from noise.
    let land = "";
    if (p.horizon > 0) {
      const noise = createNoise2D(rng);
      const base = size.h * (1 - p.horizon);
      const pts: string[] = [];
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * size.w;
        const y = base - (fbm(noise, i / 14, 0.5, 4) * 0.5 + 0.5) * p.horizon * size.h * 0.55;
        pts.push(`${i ? "L" : "M"}${n(x)} ${n(y)}`);
      }
      land = `<path d="${pts.join("")}L${size.w} ${size.h}L0 ${size.h}Z" fill="${esc(p.land)}"/>`;
    }

    const text = layoutText(p, size, { padding: 0.8 });
    const body =
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
      `<g mask="url(#dh-zones)">` +
      `<g fill="none" stroke-linecap="round">${trails}</g>` +
      pole +
      land +
      `</g>` +
      text.svg;
    return svgDoc(size, clearZonesMask("dh-zones", size, text.zones), body);
  },
};
