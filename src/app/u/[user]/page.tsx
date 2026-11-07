import type { Metadata } from "next";
import Link from "next/link";
import { GitHubForm } from "@/components/GitHubForm";
import { PersonalView } from "@/components/PersonalView";
import { pageMetadata } from "@/config/seo";
import { GitHubError, getGitHubProfile, isValidLogin } from "@/lib/server/github";
import type { PersonalData } from "@/lib/personal";

export const revalidate = 21600;

type Props = { params: Promise<{ user: string }>; searchParams: Promise<{ look?: string; theme?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const login = (await params).user;
  if (!isValidLogin(login)) return { title: "GitHub wallpaper", robots: { index: false } };
  return pageMetadata({
    title: `@${login}'s GitHub wallpaper`,
    description: `A wallpaper made from @${login}'s real GitHub contribution graph and commit history. Make your own from your username on Seedwall.`,
    path: `/u/${login}`,
    image: `/api/u/${login}?w=1200&h=630`,
    imageAlt: `@${login}'s contribution graph as a wallpaper`,
  });
}

export default async function UserPage({ params, searchParams }: Props) {
  const login = (await params).user;
  const { look, theme } = await searchParams;
  let data: PersonalData | null = null;
  let problem: GitHubError["code"] = "not-found";
  try {
    const p = await getGitHubProfile(login);
    data = { login: p.login, total: p.total, start: p.start, levels: p.levels, longestStreak: p.longestStreak, currentStreak: p.currentStreak, commits: p.commits, repos: p.repos };
  } catch (e) {
    if (!(e instanceof GitHubError)) throw e;
    problem = e.code;
  }

  if (!data)
    return (
      <div className="container section narrow">
        <span className="eyebrow">GitHub wallpaper</span>
        <h1 className="page-h1">{problem === "not-found" ? `No one called @${login} on GitHub.` : "GitHub is busy right now."}</h1>
        <p className="lead">
          {problem === "not-found"
            ? "Check the spelling and try again. Only public activity is used."
            : "We hit GitHub's rate limit or it didn't answer. Give it a few minutes, then reload."}
        </p>
        <GitHubForm initial={problem === "not-found" ? "" : login} cta={problem === "not-found" ? "Try again" : "Retry"} />
        <p className="hero-actions"><Link className="btn" href="/today">Or see today&apos;s seed</Link></p>
      </div>
    );

  return <PersonalView data={data} initialLook={look} initialTheme={theme} />;
}
