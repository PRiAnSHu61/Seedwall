import type { Generator, ParamSchema, Preset } from "./types";
import { mix } from "./shared/color";
import { range } from "./shared/rng";
import { blurFilter, esc, grainFilter, grainRect, n, rect, smoothPath, svgDoc, unit } from "./shared/svg";
import { freeRows } from "./shared/layout";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  ash: string;
  fire: string;
  core: string;
  lid: string;
  open: number;
  width: number;
  embers: number;
  glow: number;
  grain: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#16141a", group: "Colours", role: "bg" },
  ash: { kind: "color", label: "Ash", default: "#e7e2da", group: "Colours", role: "fg" },
  fire: { kind: "color", label: "Fire", default: "#ff5a1f", group: "Colours", role: "accent" },
  core: { kind: "color", label: "Heart of the fire", default: "#ffe7a8", group: "Colours", role: "fg" },
  lid: { kind: "color", label: "Eyelid", default: "#c8281e", group: "Colours", role: "accent" },
  open: { kind: "range", label: "Eye open", min: 0, max: 1, step: 0.01, default: 0.62, group: "Eye", help: "Closed is meditation. Open is the fire that burned desire to ash." },
  width: { kind: "range", label: "Ash line length", min: 0.4, max: 1, step: 0.01, default: 0.84, group: "Ash" },
  embers: { kind: "range", label: "Embers", min: 0, max: 300, step: 10, default: 90, group: "Eye" },
  glow: { kind: "range", label: "Glow", min: 0, max: 1, step: 0.05, default: 0.75, group: "Eye" },
  grain: { kind: "range", label: "Grain", min: 0, max: 0.3, step: 0.01, default: 0.12, group: "Ash" },
  seed: { kind: "seed", label: "Seed", default: 7 },
  ...textParams({ "text.none": false, "text.line1": "एक दृष्टि,", "text.line2": "और सब भस्म।", "text.color": "#e7e2da", "text.position": "bottom-left", "text.font": "hindi", "text.size": 4.6 }),
};

const presets: Preset<P>[] = [
  { id: "agni", title: "Agni", params: {} },
  { id: "dhyana", title: "Dhyana (closed)", params: { bg: "#0d1420", ash: "#cdd6e2", fire: "#4f7cff", core: "#e6eeff", lid: "#8fa6c8", open: 0.04, embers: 30, glow: 0.5, seed: 12 } },
  { id: "kashi", title: "Kashi (light)", params: { bg: "#ece6dc", ash: "#6d655d", fire: "#d9480f", core: "#ffd43b", lid: "#b3261e", open: 0.5, embers: 40, glow: 0.35, grain: 0.06, seed: 4, "text.color": "#3d3833" } },
  { id: "pralaya", title: "Pralaya", params: { bg: "#0a0505", ash: "#d9c9b8", fire: "#ff2d00", core: "#fff1c1", lid: "#ff6a00", open: 1, embers: 260, glow: 1, seed: 31 } },
  { id: "bhasma", title: "Bhasma", params: { bg: "#2a2622", ash: "#f4efe6", fire: "#e8590c", core: "#ffec99", lid: "#e03131", open: 0.3, embers: 0, glow: 0.4, seed: 18 } },
];

export const trinetra: Generator<P> = {
  id: "trinetra",
  name: "Trinetra",
  description: "Shiva's forehead: three bands of sacred ash, and the third eye opening through them. Closed, it is meditation; open, it is the fire that burns desire to ash.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const portrait = size.h > size.w;
    const cx = size.w / 2;
    const short = Math.min(size.w, size.h);
    const text = layoutText(p, size, { padding: 0.8 });
    const bandH0 = short * (portrait ? 0.085 : 0.07);
    // Fit the forehead into the space the quote leaves, rather than cutting the quote's box out of it.
    let cy = size.h * (portrait ? 0.54 : 0.5);
    let fit = 1;
    const band = freeRows(size.h, text.zones, size.w * 0.08, size.w * 0.92);
    if (band.from > 0 || band.to < size.h) {
      fit = Math.min(1, (band.to - band.from) / (bandH0 * 10.4));
      cy = (band.from + band.to) / 2;
    }
    const bandH = bandH0 * fit;
    const pitch = bandH * 2.05;
    const halfW = (size.w * Math.min(1, p.width * (portrait ? 1.12 : 1))) / 2;

    // The eye spans all three bands, vertically.
    const eyeH = pitch * 1.75 + bandH;
    const eyeW = eyeH * (0.06 + 0.3 * p.open);
    const eye = `M${n(cx)} ${n(cy - eyeH)}C${n(cx + eyeW * 1.1)} ${n(cy - eyeH * 0.42)} ${n(cx + eyeW * 1.1)} ${n(cy + eyeH * 0.42)} ${n(cx)} ${n(cy + eyeH)}C${n(cx - eyeW * 1.1)} ${n(cy + eyeH * 0.42)} ${n(cx - eyeW * 1.1)} ${n(cy - eyeH * 0.42)} ${n(cx)} ${n(cy - eyeH)}Z`;
    const eyeHalf = eyeW * 0.825; // widest point of the almond

    // Ash: each band is a finger-drag of many streaks, dense in the middle and frayed at the ends.
    const streaks: string[] = [];
    for (let b = -1; b <= 1; b++) {
      const y0 = cy + b * pitch;
      const sag = range(rng, -0.25, 0.25) * bandH;
      for (let k = 0; k < 150; k++) {
        const off = (rng() + rng() + rng() - 1.5) / 1.5;
        const y = y0 + off * bandH * 0.5;
        const edge = Math.abs(off);
        const x0 = cx - halfW * range(rng, 0.84, 1.03) * (1 - edge * 0.2);
        const x1 = cx + halfW * range(rng, 0.84, 1.03) * (1 - edge * 0.2);
        const pts: [number, number][] = [];
        for (let s = 0; s <= 10; s++) {
          const t = s / 10;
          pts.push([x0 + (x1 - x0) * t, y + sag * Math.sin(Math.PI * t) + range(rng, -0.12, 0.12) * bandH * 0.4]);
        }
        streaks.push(`<path d="${smoothPath(pts)}" stroke-width="${n(range(rng, 0.1, 0.5) * bandH * 0.22)}" stroke-opacity="${n(range(rng, 0.2, 0.8) * (1 - edge * 0.55))}"/>`);
      }
      // A soft body under the streaks so the band reads as one stroke from far away.
      streaks.push(`<path d="M${n(cx - halfW * 0.9)} ${n(y0)}Q${n(cx)} ${n(y0 + sag * 2)} ${n(cx + halfW * 0.9)} ${n(y0)}" stroke-width="${n(bandH * 0.62)}" stroke-opacity="0.32"/>`);
    }

    // Inside the eye: a fire iris with rings and rays, clipped to the almond.
    const irisR = Math.max(eyeHalf * 1.3, eyeH * 0.24);
    const iy = cy;
    const rays: string[] = [];
    const rayCount = 72;
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2 + range(rng, -0.02, 0.02);
      const r0 = irisR * range(rng, 0.18, 0.3), r1 = irisR * range(rng, 0.7, 1);
      rays.push(`M${n(cx + Math.cos(a) * r0)} ${n(iy + Math.sin(a) * r0)}L${n(cx + Math.cos(a) * r1)} ${n(iy + Math.sin(a) * r1)}`);
    }
    const rings = Array.from({ length: 5 }, (_, i) => `<circle cx="${n(cx)}" cy="${n(iy)}" r="${n(irisR * (0.35 + i * 0.15 + range(rng, -0.02, 0.02)))}"/>`).join("");
    const iris =
      `<rect x="${n(cx - eyeH)}" y="${n(cy - eyeH)}" width="${n(eyeH * 2)}" height="${n(eyeH * 2)}" fill="url(#tn-deep)"/>` +
      `<circle cx="${n(cx)}" cy="${n(iy)}" r="${n(irisR)}" fill="url(#tn-iris)"/>` +
      `<g stroke="${esc(p.core)}" fill="none">` +
      `<path d="${rays.join("")}" stroke-width="${n(Math.max(0.5, irisR * 0.012))}" stroke-opacity="0.45"/>` +
      `<g stroke-width="${n(Math.max(0.5, irisR * 0.01))}" stroke-opacity="0.35">${rings}</g>` +
      `</g>` +
      `<ellipse cx="${n(cx)}" cy="${n(iy)}" rx="${n(irisR * 0.16)}" ry="${n(irisR * 0.32)}" fill="${esc(p.core)}"/>`;

    // Embers rise from the eye and drift.
    const embers: string[] = [];
    if (p.open > 0.08) {
      for (let i = 0; i < Math.round(p.embers * p.open); i++) {
        const t = Math.pow(rng(), 1.4);
        const x = cx + range(rng, -1, 1) * (eyeW + t * short * 0.35);
        const y = cy - eyeH * 0.6 - t * (cy - eyeH * 0.6) * range(rng, 0.4, 1.05);
        const len = range(rng, 0.3, 1.6) * u;
        embers.push(`<path d="M${n(x)} ${n(y)}l${n(range(rng, -0.3, 0.3) * u)} ${n(-len)}" stroke-opacity="${n((1 - t) * range(rng, 0.4, 1))}" stroke-width="${n(range(rng, 0.12, 0.35) * u)}"/>`);
      }
    }

    const defs =
      `<clipPath id="tn-eye"><path d="${eye}"/></clipPath>` +
      `<radialGradient id="tn-iris"><stop offset="0" stop-color="${esc(p.core)}"/><stop offset="0.35" stop-color="${esc(mix(p.core, p.fire, 0.6))}"/><stop offset="0.8" stop-color="${esc(p.fire)}"/><stop offset="1" stop-color="${esc(mix(p.fire, "#000000", 0.55))}"/></radialGradient>` +
      `<radialGradient id="tn-deep" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(eyeH)}"><stop offset="0" stop-color="${esc(mix(p.fire, "#000000", 0.35))}"/><stop offset="0.6" stop-color="${esc(mix(p.fire, "#000000", 0.78))}"/><stop offset="1" stop-color="${esc(mix(p.fire, "#000000", 0.92))}"/></radialGradient>` +
      `<radialGradient id="tn-halo"><stop offset="0" stop-color="${esc(p.fire)}" stop-opacity="0.75"/><stop offset="0.45" stop-color="${esc(p.fire)}" stop-opacity="0.18"/><stop offset="1" stop-color="${esc(p.fire)}" stop-opacity="0"/></radialGradient>` +
      `<mask id="tn-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="${size.w}" height="${size.h}"><rect width="${size.w}" height="${size.h}" fill="#fff"/><path d="${eye}" fill="#000" stroke="#000" stroke-width="${n(bandH * 0.55)}"/></mask>` +
      blurFilter("tn-blur", eyeW * 0.5 + 1.5 * u, size) +
      (p.grain > 0 ? grainFilter("tn-grain", p.grain) : "");

    const glowR = eyeH * (0.9 + p.open * 0.9);
    const body =
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
      (p.glow > 0 ? `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(glowR * 0.75)}" ry="${n(glowR)}" fill="url(#tn-halo)" opacity="${n(p.glow * (0.35 + 0.65 * p.open))}"/>` : "") +
      `<g mask="url(#tz-zones)">` +
      `<g mask="url(#tn-cut)" fill="none" stroke="${esc(p.ash)}" stroke-linecap="round">${streaks.join("")}</g>` +
      (p.glow > 0 ? `<path d="${eye}" fill="${esc(p.fire)}" filter="url(#tn-blur)" opacity="${n(p.glow * 0.8)}"/>` : "") +
      `<g clip-path="url(#tn-eye)">${iris}</g>` +
      `<path d="${eye}" fill="none" stroke="${esc(p.lid)}" stroke-width="${n(Math.max(1, bandH * 0.09))}" stroke-linejoin="round"/>` +
      `<g fill="none" stroke="${esc(p.core)}" stroke-linecap="round">${embers.join("")}</g>` +
      `</g>` +
      (p.grain > 0 ? grainRect(size, "tn-grain") : "") +
      text.svg;
    return svgDoc(size, defs + clearZonesMask("tz-zones", size, text.zones), body);
  },
};
