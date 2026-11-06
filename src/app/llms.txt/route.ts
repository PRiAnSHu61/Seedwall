import { AUTHOR, REPO_URL, absoluteUrl } from "@/config/seo";
import { SITE } from "@/config/site";
import { DEVICES } from "@/config/devices";
import { GENERATORS } from "@/generators";
import { THEMES } from "@/generators/shared/themes";

export const dynamic = "force-static";

/** A plain-text map of the site for LLM crawlers (llmstxt.org). */
export function GET(): Response {
  const body = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.tagline} Every wallpaper is an SVG produced by a deterministic TypeScript generator from parameters and a seed. Free, no account.`,
    "",
    `Made by ${AUTHOR.name} (${AUTHOR.url}). Source: ${REPO_URL}`,
    "",
    "## Pages",
    `- [Studio](${absoluteUrl("/studio")}): pick a generator and preset, change colours, apply an editor theme, write a quote or go text-free, download PNG/SVG.`,
    `- [Gallery](${absoluteUrl("/gallery")}): the Cutting Mat pack (desktop + phone, with and without text) and generated samples, all free to download.`,
    "",
    "## Generators",
    ...GENERATORS.map((g) => `- [${g.name}](${absoluteUrl(`/generators/${g.id}`)}): ${g.description}`),
    "",
    "## Editor themes",
    THEMES.map((t) => t.name).join(", "),
    "",
    "## Sizes",
    DEVICES.map((d) => `${d.label} ${d.w}×${d.h}`).join(", ") + ", or any custom size.",
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
