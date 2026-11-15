import type { Generator, ParamSchema, Preset } from "./types";
import { mix } from "./shared/color";
import { createNoise2D, fbm } from "./shared/noise";
import { range } from "./shared/rng";
import { blurFilter, esc, n, rect, svgDoc, unit } from "./shared/svg";
import { freeCols } from "./shared/layout";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  top: string;
  bottom: string;
  hot: string;
  fire: string;
  mist: string;
  width: number;
  strands: number;
  embers: number;
  clouds: number;
  seekers: boolean;
  seed: number;
};

const params: ParamSchema<P> = {
  top: { kind: "color", label: "Sky above", default: "#07060f", group: "Colours", role: "bg" },
  bottom: { kind: "color", label: "Sky below", default: "#1a0d1c", group: "Colours", role: "bg" },
  hot: { kind: "color", label: "Light", default: "#fff4dc", group: "Colours", role: "fg" },
  fire: { kind: "color", label: "Fire", default: "#ff8c2b", group: "Colours", role: "accent" },
  mist: { kind: "color", label: "Clouds", default: "#3a2a3e", group: "Colours", role: "bg" },
  width: { kind: "range", label: "Pillar width", min: 3, max: 20, step: 0.5, default: 9, group: "Pillar" },
  strands: { kind: "range", label: "Flame strands", min: 0, max: 160, step: 2, default: 70, group: "Pillar" },
  embers: { kind: "range", label: "Embers", min: 0, max: 900, step: 10, default: 380, group: "Pillar" },
  clouds: { kind: "range", label: "Cloud layers", min: 0, max: 6, step: 1, default: 3, group: "Pillar", help: "The pillar runs through every world, above the clouds and below them." },
  seekers: { kind: "toggle", label: "Brahma and Vishnu searching", default: true, group: "Pillar", help: "Two small lights: one flying up to find the top, one digging down to find the bottom." },
  seed: { kind: "seed", label: "Seed", default: 5 },
  ...textParams({ "text.none": false, "text.line1": "न आदि,", "text.line2": "न अंत।", "text.color": "#fff4dc", "text.position": "bottom-left", "text.font": "hindi", "text.size": 4.6 }),
};

const presets: Preset<P>[] = [
  { id: "agni-stambha", title: "Pillar of fire", params: {} },
  { id: "himalaya", title: "Snow light", params: { top: "#050a14", bottom: "#0d1a2c", hot: "#f2f8ff", fire: "#6fa8ff", mist: "#1e2c44", width: 7, embers: 300, seed: 9 } },
  { id: "kumkum", title: "Kumkum", params: { top: "#1a0306", bottom: "#3a0a0c", hot: "#fff0d0", fire: "#ff3b1f", mist: "#5a1a1c", width: 12, strands: 100, embers: 600, clouds: 4, seed: 14 } },
  { id: "dawn", title: "Dawn (light)", params: { top: "#f3ece0", bottom: "#e8d8c4", hot: "#ffffff", fire: "#e8590c", mist: "#ffffff", width: 8, embers: 200, clouds: 4, seed: 3, "text.color": "#4a3b2e" } },
  { id: "thread", title: "Thread of light", params: { width: 3, strands: 20, embers: 160, clouds: 2, seekers: false, seed: 22 } },
];

export const jyotirlinga: Generator<P> = {
  id: "jyotirlinga",
  name: "Jyotirlinga",
  description: "The endless pillar of light from the Lingodbhava story. Brahma flew up and Vishnu dug down to find its ends, and neither did. Here it runs off both edges of the screen.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const noise = createNoise2D(rng);
    const W = p.width * u;
    const text = layoutText(p, size, { padding: 0.8 });
    let cx = size.w / 2 + range(rng, -1, 1) * u;
    // If the quote sits across the pillar, move the pillar into the widest free column.
    const cols = freeCols(size.w, text.zones, 0, size.h);
    if (cx - W * 2 < cols.from || cx + W * 2 > cols.to) cx = (cols.from + cols.to) / 2;
    const H = size.h;

    const defs =
      `<linearGradient id="jl-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(p.top)}"/><stop offset="1" stop-color="${esc(p.bottom)}"/></linearGradient>` +
      `<linearGradient id="jl-core" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${esc(p.fire)}" stop-opacity="0"/><stop offset="0.22" stop-color="${esc(p.fire)}" stop-opacity="0.85"/><stop offset="0.42" stop-color="${esc(p.hot)}"/><stop offset="0.58" stop-color="${esc(p.hot)}"/><stop offset="0.78" stop-color="${esc(p.fire)}" stop-opacity="0.85"/><stop offset="1" stop-color="${esc(p.fire)}" stop-opacity="0"/></linearGradient>` +
      blurFilter("jl-far", W * 2.2 + 4 * u, size) +
      blurFilter("jl-near", W * 0.55 + 1 * u, size) +
      blurFilter("jl-mist", 3.5 * u, size) +
      blurFilter("jl-soft", 0.5 * u, size);

    // The pillar breathes: its width swells and narrows along its length.
    const steps = 40;
    const edge = (side: number, scale: number): string => {
      const pts: string[] = [];
      for (let i = 0; i <= steps; i++) {
        const y = -10 * u + ((H + 20 * u) * i) / steps;
        const swell = 1 + 0.18 * fbm(noise, y / (30 * u), side * 3.1, 3);
        pts.push(`${n(cx + side * W * 0.5 * scale * swell)} ${n(y)}`);
      }
      return side < 0 ? pts.join("L") : pts.reverse().join("L");
    };
    const pillarPath = (scale: number) => `M${edge(-1, scale)}L${edge(1, scale)}Z`;

    // Flame strands: thin wavering lines running the whole height, inside the pillar.
    const strands: string[] = [];
    for (let i = 0; i < Math.round(p.strands); i++) {
      const off = (rng() + rng() - 1) * 0.5;
      const amp = range(rng, 0.1, 0.45) * W;
      const freq = range(rng, 0.6, 1.8);
      const z = rng() * 50;
      const pts: string[] = [];
      for (let s = 0; s <= 36; s++) {
        const y = -5 * u + ((H + 10 * u) * s) / 36;
        const x = cx + off * W + amp * fbm(noise, (y / (40 * u)) * freq, z, 2);
        pts.push(`${s ? "L" : "M"}${n(x)} ${n(y)}`);
      }
      strands.push(`<path d="${pts.join("")}" stroke-width="${n(range(rng, 0.06, 0.22) * u)}" stroke-opacity="${n(range(rng, 0.2, 0.7))}"/>`);
    }

    // Embers rise off the pillar: dense close in, thinning outward.
    const embers: string[] = [];
    const spread = Math.max(size.w * 0.45, W * 4);
    for (let i = 0; i < Math.round(p.embers); i++) {
      const side = rng() < 0.5 ? -1 : 1;
      const d = Math.pow(rng(), 2.2);
      const x = cx + side * (W * 0.45 + d * spread);
      const y = rng() * H;
      const len = range(rng, 0.2, 1.4) * u * (1 - d * 0.5);
      const o = (1 - d) * range(rng, 0.35, 1);
      embers.push(`<path d="M${n(x)} ${n(y)}l${n(side * range(rng, 0, 0.4) * u)} ${n(-len)}" stroke-opacity="${n(o)}" stroke-width="${n(range(rng, 0.1, 0.32) * u)}"/>`);
    }

    // Cloud layers in front of the pillar: the worlds it passes through.
    const clouds: string[] = [];
    for (let i = 0; i < Math.round(p.clouds); i++) {
      const y = H * (0.12 + (0.76 * (i + range(rng, 0.2, 0.8))) / Math.max(1, p.clouds));
      const blobs = 7;
      for (let b = 0; b < blobs; b++) {
        const bx = range(rng, -0.1, 1.1) * size.w;
        const rx = range(rng, 10, 32) * u, ry = range(rng, 1.2, 3.2) * u;
        clouds.push(`<ellipse cx="${n(bx)}" cy="${n(y + range(rng, -2, 2) * u)}" rx="${n(rx)}" ry="${n(ry)}" opacity="${n(range(rng, 0.12, 0.32))}"/>`);
      }
    }

    // Brahma (a swan) flying up the upper half, Vishnu (a boar) heading down the lower half. Two small lights.
    let seekers = "";
    if (p.seekers) {
      const sx = cx + W * 1.6 + 3 * u;
      const upY = H * range(rng, 0.16, 0.26), downY = H * range(rng, 0.76, 0.86);
      const trail = 14 * u;
      seekers =
        `<path d="M${n(sx)} ${n(upY)}V${n(upY + trail)}" stroke="${esc(p.hot)}" stroke-opacity="0.35" stroke-width="${n(0.18 * u)}" stroke-dasharray="${n(0.4 * u)} ${n(0.9 * u)}"/>` +
        `<circle cx="${n(sx)}" cy="${n(upY)}" r="${n(0.65 * u)}" fill="${esc(p.hot)}"/>` +
        `<path d="M${n(cx - W * 1.6 - 3 * u)} ${n(downY)}V${n(downY - trail)}" stroke="${esc(p.hot)}" stroke-opacity="0.35" stroke-width="${n(0.18 * u)}" stroke-dasharray="${n(0.4 * u)} ${n(0.9 * u)}"/>` +
        `<circle cx="${n(cx - W * 1.6 - 3 * u)}" cy="${n(downY)}" r="${n(0.65 * u)}" fill="${esc(mix(p.hot, p.fire, 0.3))}"/>`;
    }

    const body =
      rect(0, 0, size.w, size.h, `fill="url(#jl-sky)"`) +
      `<path d="${pillarPath(3.2)}" fill="${esc(p.fire)}" opacity="0.38" filter="url(#jl-far)"/>` +
      `<g mask="url(#jl-zones)">` +
      `<path d="${pillarPath(1.5)}" fill="${esc(p.fire)}" opacity="0.75" filter="url(#jl-near)"/>` +
      `<g fill="none" stroke="${esc(mix(p.hot, p.fire, 0.35))}" stroke-linecap="round">${embers.join("")}</g>` +
      `<path d="${pillarPath(1)}" fill="url(#jl-core)" filter="url(#jl-soft)"/>` +
      `<g fill="none" stroke="${esc(p.hot)}">${strands.join("")}</g>` +
      `<g fill="${esc(p.mist)}" filter="url(#jl-mist)">${clouds.join("")}</g>` +
      seekers +
      `</g>` +
      text.svg;
    return svgDoc(size, defs + clearZonesMask("jl-zones", size, text.zones), body);
  },
};
