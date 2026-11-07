import { absoluteUrl } from "@/config/seo";
import { IMMUTABLE, formatFromQuery, sizeFromQuery, untilUtcMidnight, wallpaperResponse } from "@/lib/server/imageResponse";
import { dailySeed, isIsoDate, isoDate, seedPath, wallpaperFromSeed } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Today's wallpaper — the same seed for everyone on a given day.
 *   GET /api/daily?d=macbook14            → PNG (UTC day)
 *   GET /api/daily?date=2026-11-07&w=…    → that day's PNG (pass the local date to rotate at local midnight)
 *   GET /api/daily?format=json            → { date, seed, page, image, … } for apps
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const explicit = q.get("date");
  const date = isIsoDate(explicit) ? explicit : isoDate(new Date());
  const cache = isIsoDate(explicit) ? IMMUTABLE : untilUtcMidnight();
  const seed = dailySeed(date);
  const wp = wallpaperFromSeed(seed);

  if (q.get("format") === "json") {
    const size = q.has("d") || q.has("w") ? sizeFromQuery(q) : null;
    const image = absoluteUrl(`/api/s/${seed}${size ? `?w=${size.w}&h=${size.h}` : ""}`);
    return Response.json(
      { date, seed, gen: wp.gen, preset: wp.preset, theme: wp.theme, page: absoluteUrl(seedPath(seed)), image },
      { headers: { "Cache-Control": cache, "Access-Control-Allow-Origin": "*" } },
    );
  }
  return wallpaperResponse(wp.gen, wp.params, sizeFromQuery(q), formatFromQuery(q), cache, `seedwall-${date}`, { "X-Seedwall-Seed": String(seed) });
}
