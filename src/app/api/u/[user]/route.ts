import { GitHubError, REVALIDATE, getGitHubProfile } from "@/lib/server/github";
import { formatFromQuery, sizeFromQuery, wallpaperResponse } from "@/lib/server/imageResponse";
import { personalWallpaper } from "@/lib/personal";

export const runtime = "nodejs";

/**
 * A wallpaper from someone's real GitHub history.
 *   GET /api/u/<login>?look=grid|skyline|dots|light|history|history-paper&theme=<id>&d=<device>|w=&h=[&format=svg]
 */
export async function GET(req: Request, { params }: { params: Promise<{ user: string }> }) {
  const login = (await params).user.replace(/\.(png|svg)$/, "");
  const q = new URL(req.url).searchParams;
  try {
    const profile = await getGitHubProfile(login);
    const wp = personalWallpaper(profile, q.get("look"), q.get("theme"));
    const cache = `public, max-age=3600, s-maxage=${REVALIDATE}, stale-while-revalidate=86400`;
    return wallpaperResponse(wp.gen, wp.params, sizeFromQuery(q), formatFromQuery(q), cache, `seedwall-${profile.login}-${q.get("look") ?? "grid"}`);
  } catch (e) {
    if (e instanceof GitHubError) {
      const status = e.code === "not-found" ? 404 : e.code === "rate-limited" ? 429 : 502;
      return new Response(e.code === "not-found" ? `No GitHub user called ${login}` : "GitHub is busy right now, try again in a few minutes", {
        status,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }
    throw e;
  }
}
