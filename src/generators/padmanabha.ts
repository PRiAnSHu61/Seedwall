import type { Generator, ParamSchema, Preset } from "./types";
import { mix } from "./shared/color";
import { range } from "./shared/rng";
import { blurFilter, esc, n, rect, svgDoc, unit } from "./shared/svg";
import { freeRows } from "./shared/layout";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  sky: string;
  horizon: string;
  sea: string;
  petal: string;
  tip: string;
  stem: string;
  light: string;
  size: number;
  rays: number;
  stars: number;
  bloom: number;
  seed: number;
};

const params: ParamSchema<P> = {
  sky: { kind: "color", label: "Sky", default: "#070818", group: "Colours", role: "bg" },
  horizon: { kind: "color", label: "Horizon", default: "#2b1840", group: "Colours", role: "bg" },
  sea: { kind: "color", label: "Ocean", default: "#060a16", group: "Colours", role: "bg" },
  petal: { kind: "color", label: "Petal base", default: "#c2255c", group: "Colours", role: "accent" },
  tip: { kind: "color", label: "Petal tip", default: "#ffd6e4", group: "Colours", role: "fg" },
  stem: { kind: "color", label: "Stem", default: "#5c7f4a", group: "Colours", role: "accent" },
  light: { kind: "color", label: "Light of creation", default: "#ffd98a", group: "Colours", role: "fg" },
  size: { kind: "range", label: "Lotus size", min: 0.5, max: 1.4, step: 0.01, default: 1, group: "Lotus" },
  bloom: { kind: "range", label: "Open", min: 0.3, max: 1, step: 0.01, default: 0.78, group: "Lotus" },
  rays: { kind: "range", label: "Rays", min: 0, max: 120, step: 2, default: 48, group: "Creation" },
  stars: { kind: "range", label: "New stars", min: 0, max: 800, step: 10, default: 360, group: "Creation" },
  seed: { kind: "seed", label: "Seed", default: 6 },
  ...textParams({ "text.none": false, "text.line1": "नाभि से कमल,", "text.line2": "कमल से सृष्टि।", "text.color": "#ffe9c2", "text.position": "top-left", "text.font": "hindi", "text.size": 4.6 }),
};

const presets: Preset<P>[] = [
  { id: "pink-lotus", title: "Pink lotus", params: {} },
  { id: "nilotpala", title: "Blue lotus", params: { sky: "#03060f", horizon: "#0d2140", sea: "#030812", petal: "#1c4fd8", tip: "#cfe3ff", stem: "#3f6d6a", light: "#bfe0ff", bloom: 0.9, seed: 12 } },
  { id: "dawn", title: "Dawn (light)", params: { sky: "#f6ede2", horizon: "#f2c9b0", sea: "#e8dccf", petal: "#d6336c", tip: "#fff0f5", stem: "#6b8f4e", light: "#ffb347", stars: 120, rays: 30, seed: 4, "text.color": "#5c3a2e" } },
  { id: "gold", title: "Golden lotus", params: { sky: "#0b0805", horizon: "#2a1a08", sea: "#070502", petal: "#b7791f", tip: "#fff1c1", stem: "#6b5a2a", light: "#ffe08a", rays: 80, seed: 19 } },
  { id: "bud", title: "Before creation", params: { bloom: 0.35, rays: 0, stars: 80, seed: 2 } },
];

export const padmanabha: Generator<P> = {
  id: "padmanabha",
  name: "Padmanabha",
  description: "From Vishnu, asleep on the cosmic ocean, a lotus rises on a single stem. Brahma sits in it and creates the world, so the light of creation spreads out from the flower.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const portrait = size.h > size.w;
    const short = Math.min(size.w, size.h);
    const sea = size.h * (portrait ? 0.8 : 0.78);
    const cx = size.w / 2 + range(rng, -1.5, 1.5) * u;
    const text = layoutText(p, size, { padding: 0.8 });
    let cy = size.h * (portrait ? 0.5 : 0.44);
    let L = short * (portrait ? 0.36 : 0.26) * p.size;
    // Fit the flower (about 1.3 petal-lengths tall) into the sky the quote leaves free.
    const skyEnd = sea - 3 * u;
    const band = freeRows(skyEnd, text.zones, cx - L * 1.15, cx + L * 1.15);
    if (band.from > 0 || band.to < skyEnd) {
      L = Math.min(L, (band.to - band.from - 4 * u) / 1.35);
      cy = (band.from + band.to) / 2 + 0.28 * L;
    }
    const open = p.bloom;

    const defs: string[] = [
      `<linearGradient id="pn-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(p.sky)}"/><stop offset="0.75" stop-color="${esc(mix(p.sky, p.horizon, 0.6))}"/><stop offset="1" stop-color="${esc(p.horizon)}"/></linearGradient>`,
      `<linearGradient id="pn-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(mix(p.sea, p.horizon, 0.35))}"/><stop offset="1" stop-color="${esc(p.sea)}"/></linearGradient>`,
      `<radialGradient id="pn-glow" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(L * 3.2)}"><stop offset="0" stop-color="${esc(p.light)}" stop-opacity="0.55"/><stop offset="0.3" stop-color="${esc(p.light)}" stop-opacity="0.16"/><stop offset="1" stop-color="${esc(p.light)}" stop-opacity="0"/></radialGradient>`,
      blurFilter("pn-blur", L * 0.12, size),
    ];
    // Petals shade from base to tip. Each row gets its own depth (darker behind, lighter in front).
    const rows = [
      { id: "pn-p0", base: mix(p.petal, "#000000", 0.35), tip: mix(p.tip, p.petal, 0.45) },
      { id: "pn-p1", base: mix(p.petal, "#000000", 0.12), tip: mix(p.tip, p.petal, 0.2) },
      { id: "pn-p2", base: p.petal, tip: p.tip },
    ];
    for (const r of rows)
      defs.push(`<linearGradient id="${r.id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${esc(r.base)}"/><stop offset="0.55" stop-color="${esc(mix(r.base, r.tip, 0.55))}"/><stop offset="1" stop-color="${esc(r.tip)}"/></linearGradient>`);

    // One petal in local coordinates: base at the origin, tip straight up. Rotated into place.
    const petal = (len: number, wid: number, angDeg: number, ox: number, oy: number, row: number, squash = 1): string => {
      const d = `M0 0C${n(wid * 0.95)} ${n(-len * 0.22)} ${n(wid * 0.62)} ${n(-len * 0.78)} 0 ${n(-len)}C${n(-wid * 0.62)} ${n(-len * 0.78)} ${n(-wid * 0.95)} ${n(-len * 0.22)} 0 0Z`;
      const vein = `M0 ${n(-len * 0.08)}L0 ${n(-len * 0.88)}`;
      return (
        `<g transform="translate(${n(ox)} ${n(oy)}) rotate(${n(angDeg)}) scale(1 ${n(squash)})">` +
        `<path d="${d}" fill="url(#${rows[row]!.id})" stroke="${esc(mix(p.tip, p.petal, 0.3))}" stroke-opacity="0.5" stroke-width="${n(Math.max(0.5, L * 0.006))}"/>` +
        `<path d="${vein}" stroke="${esc(p.tip)}" stroke-opacity="0.35" stroke-width="${n(Math.max(0.5, L * 0.005))}"/>` +
        `</g>`
      );
    };

    const by = cy + L * 0.12; // where the petals meet the stem
    const spreadOf = (max: number) => max * (0.35 + 0.65 * open);
    const jitter = () => range(rng, -4, 4);
    const lotus: string[] = [];
    // Sepals drooping behind.
    for (const s of [-1, 1]) lotus.push(petal(L * 0.62, L * 0.2, s * (95 + 25 * open) + jitter(), cx, by, 0, 0.9));
    // Back row: many long petals fanned wide.
    const back = 9;
    for (let i = 0; i < back; i++) {
      const t = i / (back - 1) - 0.5;
      lotus.push(petal(L * range(rng, 0.95, 1.05), L * 0.3, t * 2 * spreadOf(78) + jitter(), cx, by, 0));
    }
    // Middle row.
    const mid = 7;
    for (let i = 0; i < mid; i++) {
      const t = i / (mid - 1) - 0.5;
      lotus.push(petal(L * range(rng, 0.84, 0.92), L * 0.3, t * 2 * spreadOf(56) + jitter(), cx, by + L * 0.03, 1));
    }
    // The seed pod, glowing: this is where Brahma sits.
    const podY = by - L * 0.42 * (0.6 + 0.4 * open);
    lotus.push(
      `<circle cx="${n(cx)}" cy="${n(podY)}" r="${n(L * 0.32)}" fill="${esc(p.light)}" opacity="0.65" filter="url(#pn-blur)"/>` +
        `<ellipse cx="${n(cx)}" cy="${n(podY)}" rx="${n(L * 0.16)}" ry="${n(L * 0.06)}" fill="${esc(p.light)}"/>`,
    );
    // Front row: a few short petals, cupped toward us.
    const front = [-1, -0.38, 0.38, 1];
    for (const t of front) lotus.push(petal(L * range(rng, 0.68, 0.76), L * 0.32, t * spreadOf(44) + jitter(), cx, by + L * 0.07, 2, 0.94));

    // Rays and newborn stars spreading from the flower.
    const rays: string[] = [];
    for (let i = 0; i < Math.round(p.rays); i++) {
      const a = -Math.PI / 2 + range(rng, -1, 1) * Math.PI * 0.95;
      const r0 = L * range(rng, 0.7, 1.1), r1 = r0 + L * range(rng, 0.8, 4);
      rays.push(`<path d="M${n(cx + Math.cos(a) * r0)} ${n(podY + Math.sin(a) * r0)}L${n(cx + Math.cos(a) * r1)} ${n(podY + Math.sin(a) * r1)}" stroke-opacity="${n(range(rng, 0.05, 0.22))}" stroke-width="${n(range(rng, 0.08, 0.25) * u)}"/>`);
    }
    const stars: string[] = [];
    const reach = Math.hypot(size.w, size.h);
    for (let i = 0; i < Math.round(p.stars); i++) {
      const a = rng() * Math.PI * 2;
      const r = L * 0.9 + Math.pow(rng(), 1.7) * reach * 0.6;
      const x = cx + Math.cos(a) * r, y = podY + Math.sin(a) * r;
      if (y > sea - u || x < 0 || x > size.w || y < 0) continue;
      const near = 1 - Math.min(1, r / (reach * 0.6));
      stars.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n((0.06 + Math.pow(rng(), 3) * 0.28) * u)}" fill-opacity="${n(0.2 + near * range(rng, 0.3, 0.8))}"/>`);
    }

    // The stem rises out of the ocean in a long, gentle S.
    const sx = cx + range(rng, -10, 10) * u;
    const stemW = Math.max(1, L * 0.045);
    const stem = `M${n(sx)} ${n(size.h + 2 * u)}C${n(sx + range(rng, -14, 14) * u)} ${n(sea - (sea - by) * 0.1)} ${n(cx + range(rng, -10, 10) * u)} ${n(by + (sea - by) * 0.45)} ${n(cx)} ${n(by)}`;
    const leafX = sx + range(rng, 6, 14) * u * (rng() < 0.5 ? -1 : 1);

    // Ripples where the stem meets the water, and the glow reflected below.
    const ripples: string[] = [];
    const stemAtSea = sx + (cx - sx) * 0.08;
    for (let i = 1; i <= 6; i++) {
      const rx = i * L * 0.22 * range(rng, 0.9, 1.1);
      ripples.push(`<ellipse cx="${n(stemAtSea)}" cy="${n(sea + u * 0.4)}" rx="${n(rx)}" ry="${n(rx * 0.08)}" stroke-opacity="${n(0.5 - i * 0.07)}"/>`);
    }
    const glints: string[] = [];
    for (let i = 0; i < 40; i++) {
      const d = Math.pow(rng(), 1.3);
      const y = sea + 1.5 * u + d * (size.h - sea);
      const w = range(rng, 2, 9) * u * (1 - d * 0.5);
      const x = cx + range(rng, -1, 1) * L * (0.4 + d);
      glints.push(`<path d="M${n(x - w / 2)} ${n(y)}H${n(x + w / 2)}" stroke-opacity="${n((1 - d) * range(rng, 0.15, 0.5))}"/>`);
    }

    const body =
      rect(0, 0, size.w, size.h, `fill="url(#pn-sky)"`) +
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(L * 3.2)}" fill="url(#pn-glow)"/>` +
      `<g mask="url(#pn-zones)">` +
      `<g stroke="${esc(p.light)}" stroke-linecap="round">${rays.join("")}</g>` +
      `<g fill="${esc(p.light)}">${stars.join("")}</g>` +
      `<path d="${stem}" fill="none" stroke="${esc(p.stem)}" stroke-width="${n(stemW)}" stroke-linecap="round"/>` +
      rect(0, sea, size.w, size.h - sea, `fill="url(#pn-sea)" fill-opacity="0.94"`) +
      `<path d="M0 ${n(sea)}H${size.w}" stroke="${esc(p.light)}" stroke-opacity="0.18" stroke-width="${n(Math.max(0.5, 0.12 * u))}"/>` +
      `<ellipse cx="${n(leafX)}" cy="${n(sea + 0.6 * u)}" rx="${n(L * 0.5)}" ry="${n(L * 0.07)}" fill="${esc(mix(p.stem, p.sea, 0.35))}"/>` +
      `<g fill="none" stroke="${esc(p.light)}" stroke-width="${n(Math.max(0.5, 0.12 * u))}">${ripples.join("")}</g>` +
      `<g stroke="${esc(p.light)}" stroke-width="${n(Math.max(0.5, 0.2 * u))}" stroke-linecap="round">${glints.join("")}</g>` +
      lotus.join("") +
      `</g>` +
      text.svg;
    return svgDoc(size, defs.join("") + clearZonesMask("pn-zones", size, text.zones), body);
  },
};
