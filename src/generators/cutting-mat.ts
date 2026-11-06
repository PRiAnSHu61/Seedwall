import type { Generator, ParamSchema, Preset, Size } from "./types";
import { darken, lighten, mix } from "./shared/color";
import { range } from "./shared/rng";
import { blurFilter, esc, grainFilter, grainRect, line, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, fontStack, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & {
  bg: string;
  ink: string;
  style: string;
  background: string;
  grain: number;
  cells: number;
  margin: number;
  numbers: boolean;
  ticks: boolean;
  guides: boolean;
  caption: string;
  seed: number;
};

const schema: ParamSchema<P> = {
  bg: { kind: "color", label: "Mat colour", default: "#0a4fc5", group: "Colours" },
  ink: { kind: "color", label: "Line colour", default: "#ffffff", group: "Colours" },
  background: {
    kind: "select",
    label: "Background",
    group: "Colours",
    default: "bands",
    options: [
      { value: "flat", label: "Flat" },
      { value: "bands", label: "Light bands" },
      { value: "shadow", label: "Leaf shadow" },
    ],
  },
  grain: { kind: "range", label: "Film grain", min: 0, max: 0.4, step: 0.01, default: 0.04, group: "Colours" },
  style: {
    kind: "select",
    label: "Grid style",
    group: "Grid",
    default: "bold",
    options: [
      { value: "bold", label: "Bold grid" },
      { value: "light", label: "Fine grid + marks" },
      { value: "dots", label: "Fine grid + dots" },
    ],
  },
  cells: { kind: "range", label: "Cells (short side)", min: 12, max: 60, step: 1, default: 30, group: "Grid" },
  margin: { kind: "range", label: "Margin", min: 2, max: 14, step: 0.5, default: 4.5, group: "Grid" },
  numbers: { kind: "toggle", label: "Edge numbers", default: false, group: "Grid" },
  ticks: { kind: "toggle", label: "Edge ticks", default: true, group: "Grid" },
  guides: { kind: "toggle", label: "Angled guides + arcs", default: true, group: "Grid" },
  caption: { kind: "text", label: "Side caption", default: "COMPILE. DEBUG. DEPLOY. REPEAT.", group: "Grid", maxLength: 60 },
  seed: { kind: "seed", label: "Seed", default: 7 },
  ...textParams({
    "text.paragraph":
      "Great software is rarely written in one heroic night. It is built from small, steady commits that quietly compound into something real.",
  }),
};

/* ---------------- presets: the Drive pack's 6 colours × 3 styles ---------------- */

interface Swatch {
  id: string;
  name: string;
  bg: string;
  ink: string;
  background: string;
  grain: number;
  quote: [string, string];
  paragraph: string;
  caption: string;
}

const SWATCHES: Swatch[] = [
  { id: "blue", name: "Blue", bg: "#0a4fc5", ink: "#ffffff", background: "bands", grain: 0.04, quote: ["Small commits.", "Big momentum."], paragraph: "Great software is rarely written in one heroic night. It is built from small, steady commits that quietly compound into something real.", caption: "COMPILE. DEBUG. DEPLOY. REPEAT." },
  { id: "black", name: "Black", bg: "#0e0e0e", ink: "#ffffff", background: "shadow", grain: 0.05, quote: ["Stay curious.", "Keep committing."], paragraph: "The best engineers never stop asking why. Stay curious about the systems you build, and keep committing a little every single day.", caption: "CUTTING MAT WALLPAPER PACK — DEV EDITION 2026" },
  { id: "cream", name: "Cream", bg: "#efece8", ink: "#1e1e1e", background: "flat", grain: 0.03, quote: ["Good code", "takes time."], paragraph: "The most meaningful software is rarely built quickly. Great products are shaped by patience, consistency and care for the details.", caption: "READ THE DOCS. WRITE THE TESTS. SHIP IT." },
  { id: "green", name: "Green", bg: "#3a8b6f", ink: "#ffffff", background: "bands", grain: 0.04, quote: ["Make it work.", "Then make it *right*."], paragraph: "First solve the problem. Then write the code. Then come back and make it something you are proud to maintain.", caption: "MEASURE. REFACTOR. REPEAT." },
  { id: "orange", name: "Orange", bg: "#d4733c", ink: "#ffffff", background: "bands", grain: 0.04, quote: ["Ship it.", "Then iterate."], paragraph: "Perfect is a moving target. Put real work in front of real people, listen closely, and make the next version better.", caption: "BUILD. MEASURE. LEARN." },
  { id: "silver", name: "Silver", bg: "#d1d1d3", ink: "#2a2a2a", background: "flat", grain: 0.03, quote: ["Measure twice.", "Cut once."], paragraph: "A little planning saves a lot of rework. Sketch the shape of the problem before you start cutting code.", caption: "PLAN. CUT. FINISH." },
];

const STYLE_DEFAULTS: Record<string, Partial<P>> = {
  bold: { style: "bold", numbers: false, ticks: true },
  light: { style: "light", numbers: true, ticks: true },
  dots: { style: "dots", numbers: true, ticks: true },
};

const presets: Preset<P>[] = SWATCHES.flatMap((s) =>
  (["bold", "light", "dots"] as const).map((style) => ({
    id: `${s.id}-${style}`,
    title: `${s.name} · ${style[0]!.toUpperCase()}${style.slice(1)}`,
    params: {
      bg: s.bg,
      ink: s.ink,
      background: s.background,
      grain: s.grain,
      caption: s.caption,
      "text.line1": s.quote[0],
      "text.line2": s.quote[1],
      "text.paragraph": s.paragraph,
      "text.color": s.ink,
      ...STYLE_DEFAULTS[style],
    },
  })),
);

presets.push({
  id: "shadow-grey",
  title: "Grey · Leaf shadow (mono)",
  params: {
    bg: "#9d9d9d",
    ink: "#f4f4f4",
    background: "shadow",
    grain: 0.22,
    style: "bold",
    numbers: true,
    ticks: true,
    cells: 20,
    margin: 9,
    caption: "",
    "text.line1": "Code is *poetry*",
    "text.line2": "with semicolons;",
    "text.paragraph": "",
    "text.font": "mono",
    "text.size": 5,
    "text.color": "#eeeeee",
  },
});

/* ---------------- render helpers ---------------- */

function backgroundLayer(p: P, size: Size, u: number, rng: () => number): { defs: string; body: string } {
  const base = rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`);
  if (p.background === "flat") return { defs: "", body: base };

  const diag = Math.hypot(size.w, size.h);
  const cx = size.w / 2;
  const cy = size.h / 2;
  if (p.background === "bands") {
    const bands = Array.from({ length: 4 }, (_, i) => {
      const off = (i - 1.5) * diag * 0.26 + range(rng, -8, 8) * u;
      const wBand = range(rng, 8, 20) * u;
      const fill = i % 2 ? darken(p.bg, 0.06) : lighten(p.bg, 0.07);
      return `<rect x="${n(cx + off)}" y="${n(cy - diag)}" width="${n(wBand)}" height="${n(diag * 2)}" fill="${fill}" opacity="0.7"/>`;
    }).join("");
    return {
      defs: blurFilter("cm-band-blur", 7 * u, size),
      body: base + `<g filter="url(#cm-band-blur)"><g transform="rotate(-28 ${n(cx)} ${n(cy)})">${bands}</g></g>`,
    };
  }

  // Leaf shadow: soft dark diagonal blobs.
  // Long diagonal streaks (window-blind / leaf shadows) plus a few blobs.
  const shade = darken(p.bg, 0.6);
  const streaks = Array.from({ length: 6 }, (_, i) => {
    const off = (i / 5 - 0.5) * diag * 0.9 + range(rng, -6, 6) * u;
    const t = range(rng, 4, 11) * u;
    return `<rect x="${n(cx - diag)}" y="${n(cy + off)}" width="${n(diag * 2)}" height="${n(t)}" fill="${shade}" opacity="${n(range(rng, 0.35, 0.75))}"/>`;
  }).join("");
  const blobs = Array.from({ length: 5 }, () => {
    const x = range(rng, -0.1, 1.1) * size.w;
    const y = range(rng, -0.1, 1.1) * size.h;
    return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(range(rng, 15, 35) * u)}" ry="${n(range(rng, 5, 12) * u)}" fill="${shade}" opacity="${n(range(rng, 0.3, 0.6))}" transform="rotate(-30 ${n(x)} ${n(y)})"/>`;
  }).join("");
  const glow = `<ellipse cx="${n(size.w * 0.65)}" cy="${n(size.h * 0.35)}" rx="${n(size.w * 0.4)}" ry="${n(size.h * 0.3)}" fill="${lighten(p.bg, 0.12)}" opacity="0.6"/>`;
  return { defs: blurFilter("cm-shadow-blur", 4.5 * u, size), body: base + `<g filter="url(#cm-shadow-blur)">${glow}<g transform="rotate(-30 ${n(cx)} ${n(cy)})">${streaks}</g>${blobs}</g>` };
}

interface Mat { x0: number; y0: number; x1: number; y1: number; cell: number; cols: number; rows: number }

function matGeometry(p: P, size: Size, u: number): Mat {
  const m = p.margin * u + (p.numbers ? 2.2 * u : 0);
  const availW = size.w - 2 * m;
  const availH = size.h - 2 * m;
  const cell = Math.min(availW, availH) / Math.max(4, Math.round(p.cells));
  const cols = Math.max(1, Math.floor(availW / cell + 1e-6));
  const rows = Math.max(1, Math.floor(availH / cell + 1e-6));
  const x0 = (size.w - cols * cell) / 2;
  const y0 = (size.h - rows * cell) / 2;
  return { x0, y0, x1: x0 + cols * cell, y1: y0 + rows * cell, cell, cols, rows };
}

function gridLayer(p: P, mat: Mat, u: number): string {
  const { x0, y0, x1, y1, cell, cols, rows } = mat;
  const minor: string[] = [];
  const major: string[] = [];
  for (let i = 0; i <= cols; i++) (i % 5 === 0 ? major : minor).push(line(x0 + i * cell, y0, x0 + i * cell, y1));
  for (let j = 0; j <= rows; j++) (j % 5 === 0 ? major : minor).push(line(x0, y1 - j * cell, x1, y1 - j * cell));

  // Sub-grid (half cells) — very faint, gives the "printed mat" density.
  const sub: string[] = [];
  if (cell > 1.6 * u) {
    for (let i = 0; i < cols; i++) sub.push(line(x0 + (i + 0.5) * cell, y0, x0 + (i + 0.5) * cell, y1));
    for (let j = 0; j < rows; j++) sub.push(line(x0, y0 + (j + 0.5) * cell, x1, y0 + (j + 0.5) * cell));
  }

  const bold = p.style === "bold";
  const out = [
    `<path d="${sub.join("")}" stroke-width="${n(0.04 * u)}" stroke-opacity="0.07"/>`,
    `<path d="${minor.join("")}" stroke-width="${n(0.06 * u)}" stroke-opacity="${bold ? 0.16 : 0.13}"/>`,
    `<path d="${major.join("")}" stroke-width="${n((bold ? 0.16 : 0.07) * u)}" stroke-opacity="${bold ? 0.78 : 0.3}"/>`,
    `<rect x="${n(x0)}" y="${n(y0)}" width="${n(x1 - x0)}" height="${n(y1 - y0)}" fill="none" stroke-width="${n((bold ? 0.18 : 0.1) * u)}" stroke-opacity="${bold ? 0.85 : 0.5}"/>`,
  ];

  if (p.style === "light") {
    const k = cell * 0.32;
    const marks: string[] = [];
    for (let i = 2; i < cols; i += 2)
      for (let j = 2; j < rows; j += 2) {
        const x = x0 + i * cell;
        const y = y1 - j * cell;
        marks.push(line(x - k, y, x + k, y) + line(x, y - k, x, y + k));
      }
    out.push(`<path d="${marks.join("")}" stroke-width="${n(0.1 * u)}" stroke-opacity="0.85"/>`);
  } else if (p.style === "dots") {
    const dots: string[] = [];
    for (let i = 1; i < cols; i++)
      for (let j = 1; j < rows; j++) dots.push(`M${n(x0 + i * cell)} ${n(y1 - j * cell)}h0`);
    out.push(`<path d="${dots.join("")}" stroke-width="${n(Math.max(0.22 * u, cell * 0.09))}" stroke-linecap="round" stroke-opacity="0.75"/>`);
  }
  return out.join("");
}

function ticksLayer(mat: Mat, u: number): string {
  const { x0, y0, x1, y1, cell, cols, rows } = mat;
  const d: string[] = [];
  const half = cell > 2 * u;
  for (let i = 0; i <= cols * 2; i++) {
    if (!half && i % 2) continue;
    const x = x0 + (i * cell) / 2;
    const len = (i % 10 === 0 ? 1.1 : i % 2 === 0 ? 0.7 : 0.4) * u;
    d.push(line(x, y0, x, y0 - len), line(x, y1, x, y1 + len));
  }
  for (let j = 0; j <= rows * 2; j++) {
    if (!half && j % 2) continue;
    const y = y1 - (j * cell) / 2;
    const len = (j % 10 === 0 ? 1.1 : j % 2 === 0 ? 0.7 : 0.4) * u;
    d.push(line(x0, y, x0 - len, y), line(x1, y, x1 + len, y));
  }
  return `<path d="${d.join("")}" stroke-width="${n(0.07 * u)}" stroke-opacity="0.55"/>`;
}

function numbersLayer(p: P, mat: Mat, u: number): string {
  const { x0, y0, x1, y1, cell, cols, rows } = mat;
  const step = cell >= 2.4 * u ? 1 : cell >= 1.3 * u ? 2 : 5;
  const fs = Math.min(1.05 * u, cell * 0.42);
  const gap = 1.9 * u;
  const t: string[] = [];
  for (let i = 0; i <= cols; i += step) {
    const x = x0 + i * cell;
    t.push(`<text x="${n(x)}" y="${n(y0 - gap)}">${i}</text><text x="${n(x)}" y="${n(y1 + gap + fs * 0.7)}">${i}</text>`);
  }
  const side: string[] = [];
  for (let j = 0; j <= rows; j += step) {
    const y = y1 - j * cell + fs * 0.35;
    side.push(`<text x="${n(x0 - gap)}" y="${n(y)}" text-anchor="end">${j}</text><text x="${n(x1 + gap)}" y="${n(y)}">${j}</text>`);
  }
  return `<g font-family="${esc(fontStack("sans"))}" font-size="${n(fs)}" fill="${esc(p.ink)}" fill-opacity="0.6" stroke="none"><g text-anchor="middle">${t.join("")}</g>${side.join("")}</g>`;
}

function guidesLayer(p: P, mat: Mat, u: number): string {
  const { x0, y1, cell, cols, rows } = mat;
  const reach = Math.hypot(cols, rows) * cell;
  const angles = [15, 30, 45, 60, 75];
  const rays = angles
    .map((a) => {
      const r = (a * Math.PI) / 180;
      const solid = a === 45;
      return `<path d="${line(x0, y1, x0 + Math.cos(r) * reach, y1 - Math.sin(r) * reach)}" stroke-width="${n((solid ? 0.13 : 0.08) * u)}" stroke-opacity="${solid ? 0.9 : 0.6}"${solid ? "" : ` stroke-dasharray="${n(0.9 * u)} ${n(0.7 * u)}"`}/>`;
    })
    .join("");

  const short = Math.min(cols, rows);
  const radii = [8, 14, 20, 26].map((k) => (k * short) / 30).filter((k) => k < Math.max(cols, rows));
  const arcs = radii
    .map((k) => {
      const r = k * cell;
      return `<path d="M${n(x0 + r)} ${n(y1)}A${n(r)} ${n(r)} 0 0 0 ${n(x0)} ${n(y1 - r)}" stroke-width="${n(0.08 * u)}" stroke-opacity="0.45" stroke-dasharray="${n(0.15 * u)} ${n(0.5 * u)}" stroke-linecap="round"/>`;
    })
    .join("");

  const marks: string[] = [];
  const labels: string[] = [];
  const fs = Math.min(0.95 * u, cell * 0.4);
  radii.slice(0, 2).forEach((k, idx) => {
    angles.forEach((a) => {
      const r = (a * Math.PI) / 180;
      marks.push(`<circle cx="${n(x0 + Math.cos(r) * k * cell)}" cy="${n(y1 - Math.sin(r) * k * cell)}" r="${n(0.32 * u)}"/>`);
      if (idx === 1) {
        const lr = (k + (radii[0] ?? 0)) / 2;
        labels.push(`<text x="${n(x0 + Math.cos(r) * lr * cell - fs)}" y="${n(y1 - Math.sin(r) * lr * cell)}">${a}°</text>`);
      }
    });
  });

  return (
    rays +
    arcs +
    `<g fill="none" stroke-width="${n(0.08 * u)}" stroke-opacity="0.8">${marks.join("")}</g>` +
    `<g font-family="${esc(fontStack("sans"))}" font-size="${n(fs)}" fill="${esc(p.ink)}" fill-opacity="0.75" stroke="none">${labels.join("")}</g>`
  );
}

function captionLayer(p: P, mat: Mat, u: number): string {
  if (!p.caption.trim()) return "";
  const fs = Math.min(0.95 * u, mat.cell * 0.42);
  const x = mat.x0 + 1.8 * u;
  const y = mat.y0 + 2 * u;
  return `<text transform="translate(${n(x)} ${n(y)}) rotate(90)" font-family="${esc(fontStack("sans"))}" font-size="${n(fs)}" letter-spacing="${n(fs * 0.55)}" fill="${esc(p.ink)}" fill-opacity="0.85" stroke="none">${esc(p.caption.toUpperCase())}</text>`;
}

/* ---------------- generator ---------------- */

export const cuttingMat: Generator<P> = {
  id: "cutting-mat",
  name: "Cutting Mat",
  description:
    "A drafting cutting mat: bold or fine grid, + marks or dots, angled guides and arcs, edge ticks and numbers, with clear zones kept around your quote.",
  params: schema,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const mat = matGeometry(p, size, u);
    const bg = backgroundLayer(p, size, u, rng);
    const text = layoutText(p, size, { inset: Math.max(mat.x0, mat.y0) + 3 * mat.cell });

    const content =
      gridLayer(p, mat, u) +
      (p.ticks ? ticksLayer(mat, u) : "") +
      (p.guides ? `<g clip-path="url(#cm-clip)">${guidesLayer(p, mat, u)}</g>` : "") +
      (p.numbers ? numbersLayer(p, mat, u) : "") +
      captionLayer(p, mat, u);

    const defs =
      bg.defs +
      `<clipPath id="cm-clip"><rect x="${n(mat.x0)}" y="${n(mat.y0)}" width="${n(mat.x1 - mat.x0)}" height="${n(mat.y1 - mat.y0)}"/></clipPath>` +
      clearZonesMask("cm-zones", size, text.zones) +
      (p.grain > 0 ? grainFilter("cm-grain", p.grain) : "");

    const tint = p.style === "bold" ? p.ink : mix(p.ink, p.bg, 0.08);
    return svgDoc(
      size,
      defs,
      bg.body +
        `<g stroke="${esc(tint)}" fill="none" mask="url(#cm-zones)">${content}</g>` +
        text.svg +
        (p.grain > 0 ? grainRect(size, "cm-grain") : ""),
    );
  },
};
