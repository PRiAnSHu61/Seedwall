import type { Generator, ParamSchema, Preset } from "./types";
import { mix } from "./shared/color";
import { range } from "./shared/rng";
import { blurFilter, esc, n, rect, svgDoc, unit } from "./shared/svg";
import { freeRows } from "./shared/layout";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  hot: string;
  fire: string;
  line: string;
  teeth: number;
  spokes: number;
  size: number;
  speed: number;
  sparks: number;
  petals: number;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#060914", group: "Colours", role: "bg" },
  hot: { kind: "color", label: "Gold", default: "#ffd27a", group: "Colours", role: "fg" },
  fire: { kind: "color", label: "Fire", default: "#ff6a1a", group: "Colours", role: "accent" },
  line: { kind: "color", label: "Spokes", default: "#fff3d6", group: "Colours", role: "fg" },
  teeth: { kind: "range", label: "Teeth on the rim", min: 24, max: 144, step: 4, default: 108, group: "Chakra" },
  spokes: { kind: "range", label: "Spokes", min: 24, max: 360, step: 4, default: 180, group: "Chakra" },
  size: { kind: "range", label: "Size", min: 0.4, max: 1.1, step: 0.01, default: 0.8, group: "Chakra" },
  speed: { kind: "range", label: "Spin", min: 0, max: 1, step: 0.05, default: 0.65, group: "Chakra", help: "More spin: more motion blur, more streaks of light, more sparks." },
  sparks: { kind: "range", label: "Sparks", min: 0, max: 400, step: 10, default: 160, group: "Chakra" },
  petals: { kind: "range", label: "Lotus petals at the hub", min: 0, max: 16, step: 1, default: 8, group: "Chakra" },
  seed: { kind: "seed", label: "Seed", default: 3 },
  ...textParams({ "text.none": false, "text.line1": "चक्र घूमे,", "text.line2": "धर्म बचे।", "text.color": "#fff3d6", "text.position": "bottom-left", "text.font": "hindi", "text.size": 4.6 }),
};

const presets: Preset<P>[] = [
  { id: "sudarshan", title: "Spinning", params: {} },
  { id: "still", title: "At rest (blue)", params: { bg: "#050b1a", hot: "#9cc3ff", fire: "#2f6bff", line: "#e3eeff", speed: 0.1, sparks: 20, seed: 8 } },
  { id: "gold-leaf", title: "Gold leaf (light)", params: { bg: "#f1eadb", hot: "#b8862b", fire: "#c2410c", line: "#6b4b16", speed: 0.4, sparks: 60, petals: 12, seed: 11, "text.color": "#4a3412" } },
  { id: "fury", title: "Fury", params: { bg: "#0b0303", hot: "#ffe08a", fire: "#ff2e00", line: "#ffe9c4", speed: 1, sparks: 400, size: 0.9, seed: 21 } },
  { id: "plain", title: "Plain disc", params: { bg: "#0d0d0d", hot: "#e6e6e6", fire: "#7a7a7a", line: "#ffffff", speed: 0, sparks: 0, teeth: 72, spokes: 96, petals: 0, seed: 2 } },
];

export const sudarshan: Generator<P> = {
  id: "sudarshan",
  name: "Sudarshan",
  description: "Vishnu's spinning discus: a serrated rim of fire, a wheel of fine spokes, a lotus at the hub, and sparks thrown off the edge as it turns.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const portrait = size.h > size.w;
    const cx = size.w / 2;
    const text = layoutText(p, size, { padding: 0.8 });
    let cy = size.h * (portrait ? 0.56 : 0.5);
    let R = (Math.min(size.w, size.h) / 2) * p.size * (portrait ? 1.05 : 0.8);
    // Fit the disc into the space the quote leaves.
    const band = freeRows(size.h, text.zones, cx - R * 1.15, cx + R * 1.15);
    if (band.from > 0 || band.to < size.h) {
      R = Math.min(R, (band.to - band.from) / 2 / 1.12);
      cy = (band.from + band.to) / 2;
    }
    const rot = rng() * Math.PI * 2;
    const spin = p.speed;

    // Rim teeth lean forward like a saw blade, so you can tell which way it turns.
    const T = Math.round(p.teeth);
    const step = (Math.PI * 2) / T;
    const rRoot = R * 0.9;
    const teeth = (shift: number): string => {
      const parts: string[] = [];
      for (let k = 0; k < T; k++) {
        const a = rot + shift + k * step;
        const pt = (ang: number, r: number) => `${n(cx + Math.cos(ang) * r)} ${n(cy + Math.sin(ang) * r)}`;
        parts.push(`${k ? "L" : "M"}${pt(a, rRoot)}L${pt(a + step * 0.78, R)}L${pt(a + step * 0.86, rRoot * 1.005)}`);
      }
      // Cut out the middle so the teeth form a ring, not a filled disc.
      const ri = rRoot * 0.97;
      return parts.join("") + `ZM${n(cx + ri)} ${n(cy)}A${n(ri)} ${n(ri)} 0 1 0 ${n(cx - ri)} ${n(cy)}A${n(ri)} ${n(ri)} 0 1 0 ${n(cx + ri)} ${n(cy)}Z`;
    };

    // Streaks of light circling just outside the rim.
    const streaks: string[] = [];
    const streakCount = Math.round(10 + spin * 50);
    for (let i = 0; i < streakCount; i++) {
      const r = R * (1.02 + Math.pow(rng(), 1.8) * 0.5);
      const a0 = rng() * Math.PI * 2;
      const len = range(rng, 0.15, 0.9) * spin + 0.05;
      const a1 = a0 + len;
      const o = (1 - (r / R - 1) * 1.6) * range(rng, 0.2, 0.7);
      streaks.push(`<path d="M${n(cx + Math.cos(a0) * r)} ${n(cy + Math.sin(a0) * r)}A${n(r)} ${n(r)} 0 0 1 ${n(cx + Math.cos(a1) * r)} ${n(cy + Math.sin(a1) * r)}" stroke-opacity="${n(Math.max(0.05, o))}" stroke-width="${n(range(rng, 0.08, 0.3) * u)}"/>`);
    }

    // Sparks fly off along the tangent of the rim.
    const sparks: string[] = [];
    for (let i = 0; i < Math.round(p.sparks * (0.2 + spin)); i++) {
      const a = rng() * Math.PI * 2;
      const r0 = R * range(rng, 0.98, 1.08);
      const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
      const dirA = a + Math.PI / 2 - range(rng, 0.05, 0.45); // tangent, a little outward
      const len = Math.pow(rng(), 2) * R * 0.45 * (0.3 + spin) + 0.4 * u;
      const gap = range(rng, 0, 1) * R * 0.25;
      const sx = x0 + Math.cos(dirA) * gap, sy = y0 + Math.sin(dirA) * gap;
      sparks.push(`<path d="M${n(sx)} ${n(sy)}l${n(Math.cos(dirA) * len)} ${n(Math.sin(dirA) * len)}" stroke-opacity="${n(range(rng, 0.3, 1) * (1 - gap / (R * 0.3)))}" stroke-width="${n(range(rng, 0.08, 0.3) * u)}"/>`);
    }

    // A thousand-spoked wheel: fine spokes that curve with the spin.
    const S = Math.round(p.spokes);
    const rIn = R * 0.3, rOut = R * 0.78;
    const bend = 0.25 + spin * 0.35;
    const spokes: string[] = [];
    for (let k = 0; k < S; k++) {
      const a = rot + (k / S) * Math.PI * 2;
      const am = a + bend * 0.5, ae = a + bend;
      spokes.push(`M${n(cx + Math.cos(a) * rIn)} ${n(cy + Math.sin(a) * rIn)}Q${n(cx + Math.cos(am) * (rIn + rOut) * 0.55)} ${n(cy + Math.sin(am) * (rIn + rOut) * 0.55)} ${n(cx + Math.cos(ae) * rOut)} ${n(cy + Math.sin(ae) * rOut)}`);
    }

    // Lotus at the hub.
    const petals: string[] = [];
    const Pn = Math.round(p.petals);
    const pr0 = R * 0.1, pr1 = R * 0.27;
    for (let k = 0; k < Pn; k++) {
      const a = rot * 0.5 + (k / Pn) * Math.PI * 2;
      const w = (Math.PI / Pn) * 0.8;
      const pt = (ang: number, r: number) => `${n(cx + Math.cos(ang) * r)} ${n(cy + Math.sin(ang) * r)}`;
      petals.push(`M${pt(a - w, pr0)}Q${pt(a - w * 0.9, pr1 * 0.85)} ${pt(a, pr1)}Q${pt(a + w * 0.9, pr1 * 0.85)} ${pt(a + w, pr0)}Z`);
    }

    const defs =
      `<radialGradient id="su-halo" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 2)}"><stop offset="0" stop-color="${esc(p.fire)}" stop-opacity="0.5"/><stop offset="0.45" stop-color="${esc(p.fire)}" stop-opacity="0.22"/><stop offset="1" stop-color="${esc(p.fire)}" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="su-rim" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(R)}"><stop offset="0.85" stop-color="${esc(p.hot)}"/><stop offset="1" stop-color="${esc(p.fire)}"/></radialGradient>` +
      `<radialGradient id="su-disc" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(R)}"><stop offset="0" stop-color="${esc(mix(p.fire, p.bg, 0.35))}"/><stop offset="0.5" stop-color="${esc(mix(p.fire, p.bg, 0.72))}"/><stop offset="0.9" stop-color="${esc(mix(p.fire, p.bg, 0.55))}"/><stop offset="1" stop-color="${esc(mix(p.fire, p.bg, 0.3))}"/></radialGradient>` +
      `<radialGradient id="su-hub" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 0.32)}"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="${esc(p.hot)}"/><stop offset="1" stop-color="${esc(p.fire)}" stop-opacity="0"/></radialGradient>` +
      blurFilter("su-bloom", R * 0.05 + u, size);

    const ring = (r: number, w: number, o: number) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${esc(p.hot)}" stroke-width="${n(w)}" stroke-opacity="${n(o)}"/>`;
    const lw = Math.max(0.5, R * 0.004);

    const body =
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 2)}" fill="url(#su-halo)"/>` +
      `<g mask="url(#su-zones)">` +
      `<g fill="none" stroke="${esc(p.hot)}" stroke-linecap="round">${streaks.join("")}</g>` +
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rRoot)}" fill="url(#su-disc)"/>` +
      // Motion blur: ghost copies of the teeth trailing behind.
      (spin > 0.05 ? `<path d="${teeth(-step * 0.9 * spin)}" fill="${esc(p.fire)}" fill-rule="evenodd" opacity="${n(0.25 * spin)}"/><path d="${teeth(-step * 0.45 * spin)}" fill="${esc(p.fire)}" fill-rule="evenodd" opacity="${n(0.4 * spin)}"/>` : "") +
      `<path d="${teeth(0)}" fill="${esc(p.fire)}" fill-rule="evenodd" opacity="0.9" filter="url(#su-bloom)"/>` +
      `<path d="${teeth(0)}" fill="url(#su-rim)" fill-rule="evenodd"/>` +
      ring(rRoot * 0.985, lw * 3, 0.9) +
      ring(rRoot * 0.93, lw, 0.6) +
      ring(rOut * 1.01, lw * 2, 0.75) +
      `<path d="${spokes.join("")}" fill="none" stroke="${esc(p.line)}" stroke-width="${n(lw * 1.2)}" stroke-opacity="0.75"/>` +
      ring(rIn, lw * 2, 0.8) +
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 0.32)}" fill="url(#su-hub)"/>` +
      (Pn > 0 ? `<path d="${petals.join("")}" fill="${esc(p.hot)}" fill-opacity="0.35" stroke="${esc(p.line)}" stroke-width="${n(lw * 1.4)}"/>` : "") +
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 0.06)}" fill="${esc(p.line)}"/>` +
      `<g fill="none" stroke="${esc(mix(p.hot, "#ffffff", 0.3))}" stroke-linecap="round">${sparks.join("")}</g>` +
      `</g>` +
      text.svg;
    return svgDoc(size, defs + clearZonesMask("su-zones", size, text.zones), body);
  },
};
