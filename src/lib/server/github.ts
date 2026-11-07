import type { RealCommit } from "@/generators/git-graph";

/**
 * Real GitHub data for personal wallpapers.
 *
 * With GITHUB_TOKEN set (any token, no scopes needed — public data only) it's
 * one GraphQL query with a 5,000/hour budget. Without it we read the public
 * contributions page plus a few REST calls, which share GitHub's 60/hour
 * anonymous limit — fine for development, tight in production.
 * Results are cached by Next's fetch cache for REVALIDATE seconds.
 */
export const REVALIDATE = 6 * 3600;
const UA = "Seedwall (+https://seedwall.suryansh.work)";
const MAX_REPOS = 6;
const MAX_COMMITS = 60;

export interface GitHubProfile {
  login: string;
  name: string | null;
  /** Contributions in the last year. */
  total: number;
  /** First day of the grid (a Sunday), YYYY-MM-DD. */
  start: string;
  /** One digit 0–4 per day, oldest first. */
  levels: string;
  longestStreak: number;
  currentStreak: number;
  /** Most recent commits across their recently pushed repos, oldest first. */
  commits: RealCommit[];
  /** Repo name per git-graph lane (lane 0 = most commits). */
  repos: string[];
}

export class GitHubError extends Error {
  constructor(public readonly code: "not-found" | "rate-limited" | "unavailable", message?: string) {
    super(message ?? code);
  }
}

const LOGIN_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
export const isValidLogin = (s: string): boolean => LOGIN_RE.test(s);

export async function getGitHubProfile(login: string): Promise<GitHubProfile> {
  if (!isValidLogin(login)) throw new GitHubError("not-found");
  const token = process.env.GITHUB_TOKEN?.trim();
  return token ? viaGraphQL(login, token) : viaPublic(login);
}

/* ---------- shared ---------- */

interface Day { date: string; level: number; count: number }
interface RawCommit { repo: string; sha: string; msg: string; date: string }

function finish(login: string, name: string | null, total: number, days: Day[], raw: RawCommit[]): GitHubProfile {
  days.sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 || d.level > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // Current streak: today may still be empty, so start from yesterday in that case.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const active = (days[i]?.count ?? 0) > 0 || (days[i]?.level ?? 0) > 0;
    if (active) current++;
    else if (i === days.length - 1) continue;
    else break;
  }

  const recent = raw.sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_COMMITS);
  const perRepo = new Map<string, number>();
  for (const c of recent) perRepo.set(c.repo, (perRepo.get(c.repo) ?? 0) + 1);
  const repos = [...perRepo.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
  const commits = recent.map((c) => ({ lane: repos.indexOf(c.repo), sha: c.sha, msg: c.msg }));

  return {
    login,
    name,
    total,
    start: days[0]?.date ?? "",
    levels: days.map((d) => String(Math.max(0, Math.min(4, d.level)))).join(""),
    longestStreak: longest,
    currentStreak: current,
    commits,
    repos,
  };
}

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init.headers }, next: { revalidate: REVALIDATE } });
  } catch {
    throw new GitHubError("unavailable");
  }
  if (res.status === 404) throw new GitHubError("not-found");
  if (res.status === 403 || res.status === 429) throw new GitHubError("rate-limited");
  if (!res.ok) throw new GitHubError("unavailable", `GitHub ${res.status} for ${url}`);
  return res;
}

const headline = (msg: string): string => msg.split("\n")[0]?.trim() ?? "";

/* ---------- with a token: one GraphQL query ---------- */

const LEVELS: Record<string, number> = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const QUERY = `query($login: String!) {
  user(login: $login) {
    login name
    contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } }
    repositories(first: ${MAX_REPOS}, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      nodes { name defaultBranchRef { target { ... on Commit { history(first: 40) { nodes { oid messageHeadline committedDate author { user { login } } } } } } } }
    }
  }
}`;

interface GqlResult {
  data?: {
    user: null | {
      login: string;
      name: string | null;
      contributionsCollection: { contributionCalendar: { totalContributions: number; weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[] } };
      repositories: { nodes: { name: string; defaultBranchRef: null | { target: { history?: { nodes: { oid: string; messageHeadline: string; committedDate: string; author: { user: { login: string } | null } | null }[] } } } }[] };
    };
  };
  errors?: { type?: string; message: string }[];
}

async function viaGraphQL(login: string, token: string): Promise<GitHubProfile> {
  const res = await get("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  const json = (await res.json()) as GqlResult;
  if (json.errors?.some((e) => e.type === "NOT_FOUND") || json.data?.user === null) throw new GitHubError("not-found");
  if (json.errors?.some((e) => e.type === "RATE_LIMITED")) throw new GitHubError("rate-limited");
  const user = json.data?.user;
  if (!user) throw new GitHubError("unavailable", json.errors?.map((e) => e.message).join("; "));

  const cal = user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 })));
  const me = user.login.toLowerCase();
  const raw: RawCommit[] = user.repositories.nodes.flatMap((r) =>
    (r.defaultBranchRef?.target.history?.nodes ?? [])
      .filter((c) => c.author?.user?.login.toLowerCase() === me)
      .map((c) => ({ repo: r.name, sha: c.oid, msg: c.messageHeadline, date: c.committedDate })),
  );
  return finish(user.login, user.name, cal.totalContributions, days, raw);
}

/* ---------- without a token: public page + REST ---------- */

/** Parses github.com/users/<login>/contributions. Exported for tests. */
export function parseContributionsHtml(html: string): { total: number; days: Day[] } {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const c = /^([\d,]+) contributions?/.exec(m[2]?.trim() ?? "");
    counts.set(m[1] ?? "", c ? Number(c[1]?.replace(/,/g, "")) : 0);
  }
  const days: Day[] = [];
  for (const m of html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = m[0];
    const level = Number(/\bdata-level="(\d)"/.exec(tag)?.[1] ?? 0);
    const id = /\bid="([^"]+)"/.exec(tag)?.[1] ?? "";
    days.push({ date: m[1] ?? "", level, count: counts.get(id) ?? (level > 0 ? 1 : 0) });
  }
  const total = Number(/([\d,]+)\s+contributions?\s+in the last year/.exec(html)?.[1]?.replace(/,/g, "") ?? days.reduce((s, d) => s + d.count, 0));
  return { total, days };
}

async function viaPublic(login: string): Promise<GitHubProfile> {
  const api = { Accept: "application/vnd.github+json" };
  const [page, userRes, reposRes] = await Promise.all([
    get(`https://github.com/users/${login}/contributions`).then((r) => r.text()),
    get(`https://api.github.com/users/${login}`, { headers: api }),
    get(`https://api.github.com/users/${login}/repos?type=owner&sort=pushed&per_page=12`, { headers: api }),
  ]);
  const { total, days } = parseContributionsHtml(page);
  if (!days.length) throw new GitHubError("unavailable", "Couldn't read the contributions page");
  const user = (await userRes.json()) as { login: string; name: string | null };
  const repos = ((await reposRes.json()) as { name: string; fork: boolean; size: number }[]).filter((r) => !r.fork && r.size > 0).slice(0, 4);

  const raw: RawCommit[] = [];
  const lists = await Promise.allSettled(
    repos.map((r) =>
      get(`https://api.github.com/repos/${login}/${r.name}/commits?author=${login}&per_page=30`, { headers: api }).then(async (res) => ({
        repo: r.name,
        list: (await res.json()) as { sha: string; commit: { message: string; committer: { date: string } | null; author: { date: string } | null } }[],
      })),
    ),
  );
  for (const l of lists)
    if (l.status === "fulfilled")
      for (const c of l.value.list) raw.push({ repo: l.value.repo, sha: c.sha, msg: headline(c.commit.message), date: c.commit.committer?.date ?? c.commit.author?.date ?? "" });

  return finish(user.login, user.name, total, days, raw);
}
