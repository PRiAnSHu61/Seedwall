import { IMMUTABLE, formatFromQuery, sizeFromQuery, wallpaperResponse } from "@/lib/server/imageResponse";
import { parseSeed, wallpaperFromSeed } from "@/lib/seed";

export const runtime = "nodejs";

/** GET /api/s/48213?d=macbook14 | ?w=3024&h=1964 [&format=svg|json] — one seed, one wallpaper, cached forever. */
export async function GET(req: Request, { params }: { params: Promise<{ seed: string }> }) {
  const seed = parseSeed((await params).seed.replace(/\.(png|svg)$/, ""));
  if (seed === null) return new Response("Seeds are whole numbers from 1 to 999999", { status: 404 });
  const q = new URL(req.url).searchParams;
  const wp = wallpaperFromSeed(seed);
  if (q.get("format") === "json") {
    const { params: p, ...rest } = wp;
    return Response.json({ ...rest, textFree: p["text.none"] === true }, { headers: { "Cache-Control": IMMUTABLE, "Access-Control-Allow-Origin": "*" } });
  }
  return wallpaperResponse(wp.gen, wp.params, sizeFromQuery(q), formatFromQuery(q), IMMUTABLE, `seedwall-${seed}`);
}
