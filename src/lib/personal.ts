import { applyTheme, getGenerator, resolveParams, type Params } from "@/generators";
import { formatHistory, type RealCommit } from "@/generators/git-graph";
import { getTheme } from "@/generators/shared/themes";

/** The slice of a GitHub profile a personal wallpaper needs — plain data, safe to send to the client. */
export interface PersonalData {
  login: string;
  total: number;
  start: string;
  levels: string;
  longestStreak: number;
  currentStreak: number;
  commits: RealCommit[];
  repos: string[];
}

/** The looks offered on /u/<login>, in display order. */
export const PERSONAL_LOOKS = [
  { id: "grid", gen: "contributions", preset: "github-dark", title: "Contribution grid" },
  { id: "skyline", gen: "contributions", preset: "skyline", title: "Skyline" },
  { id: "dots", gen: "contributions", preset: "dots-ocean", title: "Dots" },
  { id: "light", gen: "contributions", preset: "github-light", title: "Grid · light" },
  { id: "history", gen: "git-graph", preset: "github-dark", title: "Commit history" },
  { id: "history-paper", gen: "git-graph", preset: "paper-log", title: "History · paper" },
] as const;

export type PersonalLookId = (typeof PERSONAL_LOOKS)[number]["id"];

export const getLook = (id: string | null | undefined) => PERSONAL_LOOKS.find((l) => l.id === id) ?? PERSONAL_LOOKS[0];

const fmt = (v: number): string => v.toLocaleString("en-US");

/** Builds the generator params for one of a person's wallpapers. Pure: same data → same wallpaper. */
export function personalWallpaper(data: PersonalData, lookId?: string | null, themeId?: string | null): { gen: string; preset: string; params: Params } {
  const look = getLook(lookId);
  const gen = getGenerator(look.gen);
  if (!gen) throw new Error(`Missing generator ${look.gen}`);
  const seed = [...data.login.toLowerCase()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 999_999, 7);
  const isGraph = look.gen === "git-graph";
  const hasCommits = data.commits.length >= 2;
  const streak = data.longestStreak > 1 ? ` · longest streak ${data.longestStreak} days` : "";

  const overrides: Params = isGraph
    ? {
        seed,
        history: formatHistory(data.commits),
        repos: data.repos.join("|"),
        lanes: Math.max(2, Math.min(10, data.repos.length || 2)),
        commits: Math.max(12, Math.min(90, data.commits.length || 40)),
        "text.none": false,
        "text.line1": `@${data.login}`,
        "text.line2": hasCommits ? `${data.commits.length} recent commits` : `${fmt(data.total)} contributions`,
      }
    : {
        seed,
        data: data.levels,
        start: data.start,
        "text.none": false,
        "text.line1": `@${data.login}`,
        "text.line2": `${fmt(data.total)} contributions in the last year${streak}`,
        "text.size": 2.6,
      };
  let params = resolveParams(gen, look.preset, overrides);
  if (themeId && getTheme(themeId)) params = applyTheme(gen, params, themeId);
  return { gen: look.gen, preset: look.preset, params };
}
