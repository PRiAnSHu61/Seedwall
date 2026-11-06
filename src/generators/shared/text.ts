import type { ParamSchema, Size } from "../types";
import { FONT_METRICS } from "./fontMetrics";
import { esc, n, unit } from "./svg";

/* ---------- fonts ---------- */

export const FONT_KEYS = ["serif", "sans", "mono", "grotesk", "display"] as const;
export type FontKey = (typeof FONT_KEYS)[number];

const FALLBACK: Record<FontKey, string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Helvetica, Arial, sans-serif",
  mono: "Menlo, Consolas, monospace",
  grotesk: "Helvetica, Arial, sans-serif",
  display: "Georgia, serif",
};

const asFontKey = (v: string): FontKey => ((FONT_KEYS as readonly string[]).includes(v) ? (v as FontKey) : "serif");

/** CSS/SVG font-family stack for a font key (first family matches public/fonts). */
export function fontStack(key: string): string {
  const k = asFontKey(key);
  const fam = FONT_METRICS[`${k}-regular`]?.family ?? "serif";
  return `${fam.includes(" ") ? `'${fam}'` : fam}, ${FALLBACK[k]}`;
}

/** Width of `text` in px, from the generated metrics table (identical everywhere). */
export function measure(text: string, font: string, size: number, italic = false): number {
  const face = FONT_METRICS[`${asFontKey(font)}-${italic ? "italic" : "regular"}`];
  let em = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 63;
    em += (c >= 32 && c < 127 ? face?.widths[c - 32] : undefined) ?? 0.56;
  }
  return em * size;
}

/* ---------- rich runs: *italic* ---------- */

interface Run { text: string; italic: boolean }

export function parseRuns(s: string): Run[] {
  const runs: Run[] = [];
  s.split(/(\*[^*]+\*)/g).forEach((part) => {
    if (!part) return;
    const italic = part.length > 2 && part.startsWith("*") && part.endsWith("*");
    runs.push({ text: italic ? part.slice(1, -1) : part, italic });
  });
  return runs;
}

const runsWidth = (runs: Run[], font: string, size: number): number =>
  runs.reduce((w, r) => w + measure(r.text, font, size, r.italic), 0);

const runsSvg = (runs: Run[]): string =>
  runs.map((r) => (r.italic ? `<tspan font-style="italic">${esc(r.text)}</tspan>` : esc(r.text))).join("");

/* ---------- shared params ---------- */

export const TEXT_POSITIONS = [
  { value: "center", label: "Centre" },
  { value: "upper", label: "Upper third" },
  { value: "lower", label: "Lower third" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
] as const;

export type TextParams = {
  "text.none": boolean;
  "text.line1": string;
  "text.line2": string;
  "text.paragraph": string;
  "text.position": string;
  "text.font": string;
  "text.size": number;
  "text.color": string;
};

/** Spread into every generator's schema. Override defaults per generator with `textParams({...})`. */
export function textParams(defaults: Partial<TextParams> = {}): ParamSchema<TextParams> {
  const g = "Text";
  return {
    "text.none": { kind: "toggle", label: "No text", default: defaults["text.none"] ?? false, group: g },
    "text.line1": { kind: "text", label: "Quote line 1", default: defaults["text.line1"] ?? "Small commits.", group: g, maxLength: 80, help: "Wrap words in *stars* for italics." },
    "text.line2": { kind: "text", label: "Quote line 2", default: defaults["text.line2"] ?? "Big momentum.", group: g, maxLength: 80 },
    "text.paragraph": { kind: "text", label: "Paragraph", default: defaults["text.paragraph"] ?? "", group: g, multiline: true, maxLength: 400 },
    "text.position": { kind: "select", label: "Position", options: TEXT_POSITIONS, default: defaults["text.position"] ?? "center", group: g },
    "text.font": {
      kind: "select",
      label: "Font",
      options: [
        { value: "serif", label: "Serif (Lora)" },
        { value: "display", label: "Display (Instrument Serif)" },
        { value: "sans", label: "Sans (Inter)" },
        { value: "grotesk", label: "Grotesk (Schibsted)" },
        { value: "mono", label: "Mono (JetBrains)" },
      ],
      default: defaults["text.font"] ?? "serif",
      group: g,
    },
    "text.size": { kind: "range", label: "Text size", min: 1.5, max: 16, step: 0.1, default: defaults["text.size"] ?? 3.6, group: g },
    "text.color": { kind: "color", label: "Text colour", default: defaults["text.color"] ?? "#ffffff", group: g, role: "fg" },
  };
}

/* ---------- layout ---------- */

export interface Box { x: number; y: number; w: number; h: number }

export interface TextLayout {
  /** SVG markup for the text (empty when "no text"). */
  svg: string;
  /** Padded areas other elements should keep clear of. */
  zones: Box[];
  quote: Box | null;
}

export interface LayoutOptions {
  /** Distance from the edges for corner positions, in px. Defaults to 9 units. */
  inset?: number;
  /** Opacity of the paragraph relative to the quote ink. */
  paragraphOpacity?: number;
  /** Extra clear-zone padding multiplier. */
  padding?: number;
}

function wrap(text: string, font: string, size: number, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n/)) {
    let cur = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && measure(next, font, size) > maxW) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    }
    lines.push(cur);
  }
  return lines.filter((l, i, a) => l || i < a.length - 1);
}

export function layoutText(p: TextParams, size: Size, opts: LayoutOptions = {}): TextLayout {
  const empty: TextLayout = { svg: "", zones: [], quote: null };
  if (p["text.none"]) return empty;

  const u = unit(size);
  const font = p["text.font"];
  const fam = fontStack(font);
  const ink = p["text.color"];
  const inset = opts.inset ?? 9 * u;
  const pos = p["text.position"];
  const quoteLines = [p["text.line1"], p["text.line2"]].map((s) => s.trim()).filter(Boolean).map(parseRuns);

  // Quote size: requested size, shrunk so the widest line fits 84% of the width.
  let fs = p["text.size"] * u;
  const widest = Math.max(0, ...quoteLines.map((r) => runsWidth(r, font, fs)));
  const maxW = size.w * 0.84 - (pos.includes("-") ? inset : 0);
  if (widest > maxW) fs *= maxW / widest;

  const lh = fs * 1.2;
  const qw = Math.max(0, ...quoteLines.map((r) => runsWidth(r, font, fs)));
  const qh = quoteLines.length ? lh * (quoteLines.length - 1) + fs : 0;

  const align: "left" | "right" | "center" = pos.endsWith("left") ? "left" : pos.endsWith("right") ? "right" : "center";
  let qx: number;
  if (align === "left") qx = inset;
  else if (align === "right") qx = size.w - inset - qw;
  else qx = (size.w - qw) / 2;
  let qy: number;
  if (pos.startsWith("top")) qy = inset;
  else if (pos.startsWith("bottom")) qy = size.h - inset - qh;
  else if (pos === "upper") qy = size.h * 0.3 - qh / 2;
  else if (pos === "lower") qy = size.h * 0.7 - qh / 2;
  else qy = (size.h - qh) / 2;

  // Paragraph
  const ps = Math.max(0.85 * u, Math.min(1.3 * u, fs * 0.3));
  const pMaxW = Math.min(30 * u, size.w * 0.5);
  const para = p["text.paragraph"].trim() ? wrap(p["text.paragraph"].trim(), "sans", ps, pMaxW) : [];
  const plh = ps * 1.55;
  const pw = Math.max(0, ...para.map((l) => measure(l, "sans", ps)));
  const ph = para.length ? plh * (para.length - 1) + ps : 0;

  // Corner positions stack the paragraph below/above the quote; centred ones put it bottom-right.
  let px: number;
  let py: number;
  if (align === "center") {
    px = size.w - inset - pMaxW * 0.9;
    py = size.h - inset - ph;
    if (px < size.w / 2) px = (size.w - pw) / 2;
  } else {
    px = align === "left" ? qx : size.w - inset - pw;
    // Bottom corners keep the quote on the edge and put the paragraph above it.
    py = pos.startsWith("bottom") ? qy - fs * 1.4 - ph : qy + qh + fs * 0.9;
  }

  const parts: string[] = [];
  const zones: Box[] = [];
  const pad = (opts.padding ?? 1) * fs * 1.1;

  if (quoteLines.length) {
    const tspans = quoteLines
      .map((runs, i) => {
        const w = runsWidth(runs, font, fs);
        const lx = align === "left" ? qx : align === "right" ? qx + qw - w : qx + (qw - w) / 2;
        return `<text x="${n(lx)}" y="${n(qy + fs * 0.8 + i * lh)}">${runsSvg(runs)}</text>`;
      })
      .join("");
    parts.push(`<g font-family="${esc(fam)}" font-size="${n(fs)}" fill="${esc(ink)}">${tspans}</g>`);
    zones.push({ x: qx - pad * 1.6, y: qy - pad, w: qw + pad * 3.2, h: qh + pad * 2 });
  }

  if (para.length) {
    const op = opts.paragraphOpacity ?? 0.78;
    const lines = para
      .map((l, i) => {
        const lx = align === "right" ? px + pw - measure(l, "sans", ps) : px;
        return `<text x="${n(lx)}" y="${n(py + ps * 0.8 + i * plh)}">${esc(l)}</text>`;
      })
      .join("");
    parts.push(`<g font-family="${esc(fontStack("sans"))}" font-size="${n(ps)}" fill="${esc(ink)}" fill-opacity="${op}">${lines}</g>`);
    const pp = ps * 2.2;
    zones.push({ x: px - pp, y: py - pp, w: pw + pp * 2, h: ph + pp * 2 });
  }

  return {
    svg: `<g class="ws-text">${parts.join("")}</g>`,
    zones,
    quote: quoteLines.length ? { x: qx, y: qy, w: qw, h: qh } : null,
  };
}

/** SVG mask that hides content inside the given zones (use mask="url(#id)"). */
export function clearZonesMask(id: string, size: Size, zones: Box[]): string {
  const holes = zones.map((z) => `<rect x="${n(z.x)}" y="${n(z.y)}" width="${n(z.w)}" height="${n(z.h)}" fill="#000"/>`).join("");
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${size.w}" height="${size.h}"><rect width="${size.w}" height="${size.h}" fill="#fff"/>${holes}</mask>`;
}
