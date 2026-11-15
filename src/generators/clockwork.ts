import type { Generator, ParamSchema, Preset } from "./types";
import { pick, range } from "./shared/rng";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  ink: string;
  accent: string;
  gears: number;
  module: number;
  style: string;
  spokes: boolean;
  seed: number;
};

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#101215", group: "Colours", role: "bg" },
  ink: { kind: "color", label: "Gears", default: "#d8d4cc", group: "Colours", role: "fg" },
  accent: { kind: "color", label: "Driver", default: "#e2a33b", group: "Colours", role: "accent" },
  gears: { kind: "range", label: "Gears", min: 2, max: 24, step: 1, default: 9, group: "Train" },
  module: { kind: "range", label: "Tooth size", min: 0.4, max: 2.5, step: 0.05, default: 1, group: "Train" },
  style: { kind: "select", label: "Drawing", options: [{ value: "line", label: "Line" }, { value: "solid", label: "Solid" }], default: "line", group: "Train" },
  spokes: { kind: "toggle", label: "Spoked wheels", default: true, group: "Train" },
  seed: { kind: "seed", label: "Seed", default: 8 },
  ...textParams({ "text.none": true, "text.line1": "Every tooth turns *another*.", "text.line2": "", "text.color": "#d8d4cc", "text.position": "bottom-left", "text.font": "mono", "text.size": 3 }),
};

const presets: Preset<P>[] = [
  { id: "escapement", title: "Escapement", params: {} },
  { id: "brass", title: "Brass (solid)", params: { bg: "#1a1410", ink: "#b8894a", accent: "#e9cf8f", style: "solid", gears: 12, module: 0.8, seed: 5 } },
  { id: "drafting", title: "Drafting (light)", params: { bg: "#f1efe9", ink: "#2b3540", accent: "#d1495b", gears: 7, module: 1.3, seed: 13, "text.color": "#2b3540" } },
  { id: "watch", title: "Watch movement", params: { bg: "#0d1a2b", ink: "#c7d3e3", accent: "#e8b04b", gears: 20, module: 0.5, seed: 27 } },
  { id: "two", title: "Two gears", params: { bg: "#000000", ink: "#ffffff", accent: "#ffffff", gears: 2, module: 2.2, spokes: false, seed: 1 } },
];

interface Gear { x: number; y: number; teeth: number; r: number; rot: number; driver: boolean }

/** Outline of a spur gear: trapezoid teeth between the root circle and the tip circle. */
function gearPath(g: Gear, m: number): string {
  const T = (Math.PI * 2) / g.teeth;
  const ra = g.r + m, rr = g.r - 1.25 * m;
  const pt = (a: number, rad: number) => `${n(g.x + Math.cos(a) * rad)} ${n(g.y + Math.sin(a) * rad)}`;
  const parts: string[] = [];
  for (let k = 0; k < g.teeth; k++) {
    const c = g.rot + k * T;
    parts.push(`${k ? "L" : "M"}${pt(c - T * 0.5, rr)}`, `L${pt(c - T * 0.24, rr)}`, `L${pt(c - T * 0.13, ra)}`, `L${pt(c + T * 0.13, ra)}`, `L${pt(c + T * 0.24, rr)}`);
  }
  return parts.join("") + "Z";
}

export const clockwork: Generator<P> = {
  id: "clockwork",
  name: "Clockwork",
  description: "A train of spur gears that really mesh: each one is sized in whole teeth, set at the exact distance from its neighbour, and turned so tooth meets gap.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const m = p.module * 1.1 * u;
    const counts = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 60];
    const want = Math.round(p.gears);
    // A gear may hang off the edge, but its centre stays close enough that most of it shows.
    const onCanvas = (x: number, y: number, r: number) => x > -r * 0.3 && y > -r * 0.3 && x < size.w + r * 0.3 && y < size.h + r * 0.3;

    const first: Gear = { x: size.w * range(rng, 0.35, 0.65), y: size.h * range(rng, 0.35, 0.65), teeth: pick(rng, counts.slice(6)), r: 0, rot: rng() * Math.PI, driver: true };
    first.r = (m * first.teeth) / 2;
    const gears: Gear[] = [first];

    let tries = 0;
    while (gears.length < want && tries < want * 60) {
      tries++;
      // Attach to a recent gear more often, so the train winds across the canvas.
      const parent = gears[Math.max(0, gears.length - 1 - Math.floor(Math.pow(rng(), 2) * gears.length))]!;
      const teeth = pick(rng, counts);
      const r = (m * teeth) / 2;
      const theta = rng() * Math.PI * 2;
      const d = parent.r + r;
      const x = parent.x + Math.cos(theta) * d, y = parent.y + Math.sin(theta) * d;
      if (!onCanvas(x, y, r)) continue;
      if (gears.some((g) => g !== parent && Math.hypot(g.x - x, g.y - y) < g.r + r + 2.6 * m)) continue;
      // Turn the new gear so a gap faces the parent's tooth at the contact point.
      const Tb = (Math.PI * 2) / teeth;
      const rot = theta + Math.PI + Tb / 2 + (theta - parent.rot) * (parent.teeth / teeth);
      gears.push({ x, y, teeth, r, rot, driver: false });
    }

    const solid = p.style === "solid";
    const sw = Math.max(0.6, 0.18 * u);
    const shapes: string[] = [];
    for (const g of gears) {
      const col = g.driver ? p.accent : p.ink;
      const outline = gearPath(g, m);
      const rr = g.r - 1.25 * m;
      const hub = Math.max(1.4 * m, g.r * 0.18);
      const axle = hub * 0.42;
      let inner = "";
      // Big wheels get a rim and spokes; small pinions stay solid with a hub.
      if (p.spokes && g.teeth >= 28) {
        const rim = rr - 1.2 * m;
        const spokes = g.teeth >= 48 ? 6 : 5;
        const sp = Array.from({ length: spokes }, (_, i) => {
          const a = g.rot * 0.3 + (i / spokes) * Math.PI * 2;
          return `M${n(g.x + Math.cos(a) * hub)} ${n(g.y + Math.sin(a) * hub)}L${n(g.x + Math.cos(a) * rim)} ${n(g.y + Math.sin(a) * rim)}`;
        }).join("");
        if (solid) {
          // Cut the windows out between the spokes by painting the background, then the spokes over it.
          inner =
            `<circle cx="${n(g.x)}" cy="${n(g.y)}" r="${n(rim)}" fill="${esc(p.bg)}"/>` +
            `<path d="${sp}" stroke="${esc(col)}" stroke-width="${n(Math.max(1.2 * m, 1.6 * sw))}" stroke-linecap="round"/>` +
            `<circle cx="${n(g.x)}" cy="${n(g.y)}" r="${n(hub)}" fill="${esc(col)}"/>`;
        } else {
          inner =
            `<circle cx="${n(g.x)}" cy="${n(g.y)}" r="${n(rim)}" fill="none" stroke="${esc(col)}" stroke-width="${n(sw)}"/>` +
            `<path d="${sp}" stroke="${esc(col)}" stroke-width="${n(sw)}"/>` +
            `<circle cx="${n(g.x)}" cy="${n(g.y)}" r="${n(hub)}" fill="none" stroke="${esc(col)}" stroke-width="${n(sw)}"/>`;
        }
      } else if (!solid) {
        inner = `<circle cx="${n(g.x)}" cy="${n(g.y)}" r="${n(hub)}" fill="none" stroke="${esc(col)}" stroke-width="${n(sw)}"/>`;
      }
      const axleSvg = `<circle cx="${n(g.x)}" cy="${n(g.y)}" r="${n(axle)}" fill="${esc(solid ? p.bg : col)}"/>`;
      shapes.push(
        (solid ? `<path d="${outline}" fill="${esc(col)}"/>` : `<path d="${outline}" fill="none" stroke="${esc(col)}" stroke-width="${n(sw)}" stroke-linejoin="round"/>`) +
          inner +
          axleSvg,
      );
    }
    // Faint pitch circles in line mode: the circles that actually roll on each other.
    const pitch = solid
      ? ""
      : `<g fill="none" stroke="${esc(p.ink)}" stroke-opacity="0.18" stroke-width="${n(sw * 0.7)}" stroke-dasharray="${n(sw * 6)} ${n(sw * 4)}">` +
        gears.map((g) => `<circle cx="${n(g.x)}" cy="${n(g.y)}" r="${n(g.r)}"/>`).join("") +
        `</g>`;

    const text = layoutText(p, size, { padding: 0.8 });
    const body =
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
      `<g mask="url(#ck-zones)">${pitch}${shapes.join("")}</g>` +
      text.svg;
    return svgDoc(size, clearZonesMask("ck-zones", size, text.zones), body);
  },
};
