import type { Generator, ParamSchema, Preset } from "./types";
import { range } from "./shared/rng";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, fontStack, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  planet: string;
  ink: string;
  accent: string;
  turn: number;
  progress: number;
  stars: number;
  labels: boolean;
  booster: boolean;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Sky", default: "#070910", group: "Colours", role: "bg" },
  planet: { kind: "color", label: "Planet", default: "#141a2a", group: "Colours", role: "bg" },
  ink: { kind: "color", label: "Trajectory", default: "#e9edf5", group: "Colours", role: "fg" },
  accent: { kind: "color", label: "Engine", default: "#ff8a3d", group: "Colours", role: "accent" },
  turn: { kind: "range", label: "Gravity turn", min: 0.1, max: 1, step: 0.01, default: 0.6, group: "Flight", help: "How hard the rocket pitches over toward orbit." },
  progress: { kind: "range", label: "Into the flight", min: 0.35, max: 1, step: 0.01, default: 0.78, group: "Flight" },
  stars: { kind: "range", label: "Stars", min: 0, max: 300, step: 10, default: 90, group: "Flight" },
  labels: { kind: "toggle", label: "Flight events", default: true, group: "Flight" },
  booster: { kind: "toggle", label: "Booster coming home", default: true, group: "Flight" },
  seed: { kind: "seed", label: "Seed", default: 14 },
  ...textParams({ "text.none": true, "text.line1": "Leave the *ground*.", "text.line2": "", "text.color": "#e9edf5", "text.position": "top-left", "text.font": "grotesk", "text.size": 4 }),
};

const presets: Preset<P>[] = [
  { id: "night-launch", title: "Night launch", params: {} },
  { id: "dawn", title: "Dawn window", params: { bg: "#1b2340", planet: "#0d1222", ink: "#ffe9d6", accent: "#ffb067", turn: 0.45, progress: 0.9, stars: 40, seed: 7 } },
  { id: "flight-plan", title: "Flight plan (light)", params: { bg: "#f2efe8", planet: "#dcd6ca", ink: "#1d2633", accent: "#e4572e", stars: 0, turn: 0.75, seed: 3, "text.color": "#1d2633" } },
  { id: "blueprint", title: "Mission blue", params: { bg: "#123a73", planet: "#0d2b57", ink: "#d8e6ff", accent: "#ffffff", stars: 0, turn: 0.55, progress: 0.62, seed: 21 } },
  { id: "silent", title: "Silent", params: { bg: "#000000", planet: "#0a0a0a", ink: "#bbbbbb", accent: "#ffffff", labels: false, booster: false, stars: 160, seed: 2 } },
];

type Pt = [number, number];

const EVENTS = [
  { at: 0, secs: 0, label: "LIFTOFF" },
  { at: 0.28, secs: 72, label: "MAX-Q" },
  { at: 0.48, secs: 158, label: "STAGE SEP" },
  { at: 0.64, secs: 212, label: "FAIRING SEP" },
  { at: 0.86, secs: 512, label: "SECO" },
];

export const ascent: Generator<P> = {
  id: "ascent",
  name: "Ascent",
  description: "A rocket's climb drawn as a flight plan: the gravity turn over a curved horizon, the flight events along the way, and the booster falling back to land.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const portrait = size.h > size.w;

    // A planet so big only a sliver of its curve shows.
    const R = Math.max(size.w, size.h) * 2.6;
    const groundY = size.h * (portrait ? 0.82 : 0.8);
    const pcx = size.w * range(rng, 0.35, 0.65);
    const pcy = groundY + R;
    const surface = (x: number) => pcy - Math.sqrt(Math.max(0, R * R - (x - pcx) ** 2));

    // Trajectory: a cubic from the pad, straight up at first, pitching over toward orbit.
    const x0 = size.w * (portrait ? 0.2 : 0.16) + range(rng, 0, 4) * u;
    const y0 = surface(x0);
    const x3 = size.w * 1.08, y3 = size.h * (portrait ? 0.08 : 0.06) + range(rng, 0, 8) * u;
    const lift = (y0 - y3) * (0.25 + (1 - p.turn) * 0.6);
    const P0: Pt = [x0, y0], P1: Pt = [x0, y0 - lift], P2: Pt = [x0 + (x3 - x0) * (0.25 + p.turn * 0.25), y3 + (y0 - y3) * 0.04], P3: Pt = [x3, y3];
    const at = (t: number): Pt => {
      const m = 1 - t;
      return [
        m * m * m * P0[0] + 3 * m * m * t * P1[0] + 3 * m * t * t * P2[0] + t * t * t * P3[0],
        m * m * m * P0[1] + 3 * m * m * t * P1[1] + 3 * m * t * t * P2[1] + t * t * t * P3[1],
      ];
    };
    const tan = (t: number): Pt => {
      const m = 1 - t;
      return [
        3 * m * m * (P1[0] - P0[0]) + 6 * m * t * (P2[0] - P1[0]) + 3 * t * t * (P3[0] - P2[0]),
        3 * m * m * (P1[1] - P0[1]) + 6 * m * t * (P2[1] - P1[1]) + 3 * t * t * (P3[1] - P2[1]),
      ];
    };

    const prog = p.progress;
    const w = Math.max(0.6, 0.2 * u);
    // Flown path: solid and brightening with altitude. Planned path: a faint dashed line ahead.
    const flown: string[] = [];
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const t0 = (i / steps) * prog, t1 = ((i + 1) / steps) * prog;
      const [ax, ay] = at(t0), [bx, by] = at(t1);
      flown.push(`<path d="M${n(ax)} ${n(ay)}L${n(bx)} ${n(by)}" stroke-opacity="${n(0.25 + 0.75 * (i / steps))}"/>`);
    }
    const plan: Pt[] = Array.from({ length: 31 }, (_, i) => at(prog + ((1 - prog) * i) / 30));
    const planD = plan.map(([x, y], i) => `${i ? "L" : "M"}${n(x)} ${n(y)}`).join("");

    // The rocket: a slim body pointing along the path, with a short plume behind.
    const [rx, ry] = at(prog);
    const [tx, ty] = tan(prog);
    const ang = (Math.atan2(ty, tx) * 180) / Math.PI;
    const L = 3.2 * u, B = 0.42 * u;
    const rocket =
      `<g transform="translate(${n(rx)} ${n(ry)}) rotate(${n(ang)})">` +
      `<path d="M${n(-L * 2.4)} 0L${n(-L)} ${n(-B * 0.9)}L${n(-L)} ${n(B * 0.9)}Z" fill="${esc(p.accent)}" fill-opacity="0.85"/>` +
      `<path d="M${n(-L)} ${n(-B)}H${n(L * 0.55)}L${n(L)} 0L${n(L * 0.55)} ${n(B)}H${n(-L)}Z" fill="${esc(p.ink)}"/>` +
      `</g>`;

    // Flight events: a tick across the path and a small mono label.
    const mono = fontStack("mono");
    const fs = 1.35 * u;
    const marks: string[] = [];
    if (p.labels && fs >= 5) {
      for (const e of EVENTS) {
        const t = Math.max(0.015, e.at);
        if (t > prog) break;
        const [ex, ey] = at(t);
        const [dx, dy] = tan(t);
        const l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l; // normal, pointing up-left of the path
        const clock = e.secs ? Math.round(e.secs + range(rng, -5, 5)) : 0;
        const mm = String(Math.floor(clock / 60)).padStart(2, "0"), ss = String(clock % 60).padStart(2, "0");
        marks.push(`<path d="M${n(ex - nx * 1.2 * u)} ${n(ey - ny * 1.2 * u)}L${n(ex + nx * 1.2 * u)} ${n(ey + ny * 1.2 * u)}" stroke="${esc(p.ink)}" stroke-width="${n(w)}"/>`);
        const lx = ex + nx * 2.6 * u, ly = ey + ny * 2.6 * u;
        marks.push(`<text x="${n(lx)}" y="${n(ly)}" fill="${esc(p.ink)}" fill-opacity="0.7">${e.label}<tspan x="${n(lx)}" dy="${n(fs * 1.3)}" fill-opacity="0.6">T+00:${mm}:${ss}</tspan></text>`);
      }
    }

    // The first stage turns back after separation and lands near the pad.
    let booster = "";
    if (p.booster && prog > 0.5) {
      const [sx, sy] = at(0.475);
      const lx = x0 + range(rng, 3, 9) * u;
      const ly = surface(lx);
      const cx = sx + (sx - x0) * 0.35, cy = sy - (y0 - sy) * 0.2;
      booster =
        `<path d="M${n(sx)} ${n(sy)}Q${n(cx)} ${n(cy)} ${n(lx)} ${n(ly)}" fill="none" stroke="${esc(p.ink)}" stroke-opacity="0.45" stroke-width="${n(w * 0.8)}" stroke-dasharray="${n(w * 1.5)} ${n(w * 3)}"/>` +
        `<circle cx="${n(lx)}" cy="${n(ly)}" r="${n(0.6 * u)}" fill="${esc(p.accent)}"/>`;
    }

    const stars: string[] = [];
    for (let i = 0; i < Math.round(p.stars); i++) {
      const x = rng() * size.w, y = rng() * groundY;
      stars.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n((0.08 + Math.pow(rng(), 3) * 0.25) * u)}" fill-opacity="${n(range(rng, 0.2, 0.8))}"/>`);
    }

    const planet = `<circle cx="${n(pcx)}" cy="${n(pcy)}" r="${n(R)}" fill="${esc(p.planet)}"/>` +
      `<circle cx="${n(pcx)}" cy="${n(pcy)}" r="${n(R + 0.8 * u)}" fill="none" stroke="${esc(p.ink)}" stroke-opacity="0.12" stroke-width="${n(1.6 * u)}"/>` +
      `<circle cx="${n(pcx)}" cy="${n(pcy)}" r="${n(R)}" fill="none" stroke="${esc(p.ink)}" stroke-opacity="0.35" stroke-width="${n(w)}"/>`;
    const pad = `<path d="M${n(x0 - 1.5 * u)} ${n(y0)}H${n(x0 + 1.5 * u)}M${n(x0 - 1 * u)} ${n(y0)}V${n(y0 - 2.4 * u)}" stroke="${esc(p.ink)}" stroke-width="${n(w)}" stroke-opacity="0.8"/>`;

    const text = layoutText(p, size, { padding: 0.8 });
    const body =
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
      `<g mask="url(#as-zones)">` +
      `<g fill="${esc(p.ink)}">${stars.join("")}</g>` +
      planet +
      pad +
      `<path d="${planD}" fill="none" stroke="${esc(p.ink)}" stroke-opacity="0.3" stroke-width="${n(w * 0.8)}" stroke-dasharray="${n(w * 2)} ${n(w * 4)}"/>` +
      `<g fill="none" stroke="${esc(p.ink)}" stroke-width="${n(w * 1.3)}" stroke-linecap="round">${flown.join("")}</g>` +
      booster +
      `<g font-family="${esc(mono)}" font-size="${n(fs)}" letter-spacing="${n(fs * 0.08)}">${marks.join("")}</g>` +
      rocket +
      `</g>` +
      text.svg;
    return svgDoc(size, clearZonesMask("as-zones", size, text.zones), body);
  },
};
