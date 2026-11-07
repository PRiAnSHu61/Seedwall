import { getDevice } from "@/config/devices";
import { getGenerator, renderWallpaper, type Params } from "@/generators";
import { svgToPngBuffer } from "./rasterize";

/** Largest side and pixel count the image API will render (a 6K display fits). */
export const MAX_SIDE = 6144;
export const MAX_PIXELS = 6144 * 3456;

export interface ImageSize { w: number; h: number }

/**
 * Size from the query: ?d=<device id>, or ?w=&h= (clamped), else the fallback.
 * Oversized requests are scaled down keeping the aspect ratio, never rejected.
 */
export function sizeFromQuery(q: URLSearchParams, fallback: ImageSize = { w: 3024, h: 1964 }): ImageSize {
  const d = getDevice(q.get("d") ?? "");
  let w = d?.w ?? Number(q.get("w"));
  let h = d?.h ?? Number(q.get("h"));
  if (!(Number.isFinite(w) && Number.isFinite(h) && w >= 1 && h >= 1)) ({ w, h } = fallback);
  w = Math.round(w);
  h = Math.round(h);
  const k = Math.min(1, MAX_SIDE / Math.max(w, h), Math.sqrt(MAX_PIXELS / (w * h)));
  return { w: Math.max(16, Math.round(w * k)), h: Math.max(16, Math.round(h * k)) };
}

export type ImageFormat = "png" | "svg";
export const formatFromQuery = (q: URLSearchParams): ImageFormat => (q.get("format") === "svg" ? "svg" : "png");

/** Renders a wallpaper as a PNG or SVG response. */
export function wallpaperResponse(genId: string, params: Params, size: ImageSize, format: ImageFormat, cacheControl: string, filename: string, extraHeaders: Record<string, string> = {}): Response {
  const gen = getGenerator(genId);
  if (!gen) return new Response("Unknown generator", { status: 500 });
  const svg = renderWallpaper(gen, params, size);
  const headers: Record<string, string> = {
    "Cache-Control": cacheControl,
    "Content-Disposition": `inline; filename="${filename}.${format}"`,
    "Access-Control-Allow-Origin": "*",
    ...extraHeaders,
  };
  if (format === "svg") return new Response(svg, { headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8" } });
  return new Response(new Uint8Array(svgToPngBuffer(svg)), { headers: { ...headers, "Content-Type": "image/png" } });
}

export const IMMUTABLE = "public, max-age=31536000, s-maxage=31536000, immutable";

/** Cache until the next UTC midnight, when the daily seed changes. */
export function untilUtcMidnight(now = new Date()): string {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const secs = Math.max(60, Math.floor((next - now.getTime()) / 1000));
  return `public, max-age=${Math.min(secs, 3600)}, s-maxage=${secs}, stale-while-revalidate=300`;
}
