import { dailySeed, isIsoDate, isoDate } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** /today → today's seed page (UTC, or ?date=YYYY-MM-DD). */
export function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const seed = dailySeed(isIsoDate(date) ? date : isoDate(new Date()));
  return new Response(null, { status: 307, headers: { Location: new URL(`/s/${seed}`, url).toString(), "Cache-Control": "no-store" } });
}
