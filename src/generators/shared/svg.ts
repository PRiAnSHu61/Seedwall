import type { Size } from "../types";

/** Round to 2 decimals to keep SVG strings small. */
export const n = (v: number): string => String(Math.round(v * 100) / 100);

export const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One unit = 1% of the shorter side. Every generator lays out in units. */
export const unit = (size: Size): number => Math.min(size.w, size.h) / 100;

export const svgDoc = (size: Size, defs: string, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}">` +
  (defs ? `<defs>${defs}</defs>` : "") +
  body +
  `</svg>`;

export const rect = (x: number, y: number, w: number, h: number, attrs: string): string =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${attrs}/>`;

export const line = (x1: number, y1: number, x2: number, y2: number): string =>
  `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;

/** Film grain as an SVG filter — works in browsers and resvg alike. */
export function grainFilter(id: string, amount: number, freq = 0.85): string {
  const a = Math.max(0, Math.min(1, amount));
  return (
    `<filter id="${id}" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="3" stitchTiles="stitch" result="t"/>` +
    `<feColorMatrix in="t" type="matrix" values="2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  0 0 0 0 ${n(a)}"/>` +
    `</filter>`
  );
}

/** A full-bleed grain overlay rect using a grain filter (needs grainFilter in defs). */
export const grainRect = (size: Size, id: string): string =>
  `<rect width="${size.w}" height="${size.h}" fill="#fff" filter="url(#${id})"/>`;

/** Gaussian blur. Pass the canvas size to pin the filter region to it (needed for huge/rotated groups). */
export const blurFilter = (id: string, std: number, canvas?: Size): string =>
  canvas
    ? `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${canvas.w}" height="${canvas.h}"><feGaussianBlur stdDeviation="${n(std)}"/></filter>`
    : `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n(std)}"/></filter>`;

/** Smooth open path through points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(pts: readonly (readonly [number, number])[], move = true): string {
  if (pts.length < 2) return "";
  const p = (i: number): readonly [number, number] => pts[Math.max(0, Math.min(pts.length - 1, i))]!;
  let d = move ? `M${n(p(0)[0])} ${n(p(0)[1])}` : `L${n(p(0)[0])} ${n(p(0)[1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = p(i - 1), [x1, y1] = p(i), [x2, y2] = p(i + 1), [x3, y3] = p(i + 2);
    d += `C${n(x1 + (x2 - x0) / 6)} ${n(y1 + (y2 - y0) / 6)} ${n(x2 - (x3 - x1) / 6)} ${n(y2 - (y3 - y1) / 6)} ${n(x2)} ${n(y2)}`;
  }
  return d;
}
