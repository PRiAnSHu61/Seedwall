import { AUTHOR, REPO_URL } from "@/config/seo";

/**
 * A mailto: link that pre-fills a bug report. Called in the browser, so it can
 * include the page the person was on — they just press Send.
 */
export function reportMailto(opts: { subject?: string; error?: string; digest?: string } = {}): string {
  const page = typeof window !== "undefined" ? window.location.href : "";
  const agent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const body = [
    "Hi Suryansh,",
    "",
    "Something went wrong on Seedwall.",
    "",
    "What I was doing:",
    "",
    "",
    "---",
    page && `Page: ${page}`,
    opts.error && `Error: ${opts.error.slice(0, 300)}`,
    opts.digest && `Digest: ${opts.digest}`,
    agent && `Browser: ${agent}`,
  ]
    .filter((l): l is string => typeof l === "string")
    .join("\n");
  const q = `subject=${encodeURIComponent(opts.subject ?? "Seedwall: something broke")}&body=${encodeURIComponent(body)}`;
  return `mailto:${AUTHOR.email}?${q}`;
}

export const ISSUES_URL = `${REPO_URL}/issues/new`;
