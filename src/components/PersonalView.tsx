"use client";

import { useEffect, useMemo, useState } from "react";
import { THEMES } from "@/generators/shared/themes";
import { PERSONAL_LOOKS, getLook, personalWallpaper, type PersonalData } from "@/lib/personal";
import { LiveThumb } from "./LiveThumb";
import { WallpaperStage } from "./WallpaperStage";

interface Props {
  data: PersonalData;
  initialLook?: string;
  initialTheme?: string;
}

const fmt = (v: number) => v.toLocaleString("en-US");

export function PersonalView({ data, initialLook, initialTheme }: Props) {
  const [look, setLook] = useState<string>(getLook(initialLook).id);
  const [theme, setTheme] = useState<string>(THEMES.some((t) => t.id === initialTheme) ? (initialTheme as string) : "");
  const wp = useMemo(() => personalWallpaper(data, look, theme || null), [data, look, theme]);
  const query = new URLSearchParams({ ...(look !== PERSONAL_LOOKS[0].id && { look }), ...(theme && { theme }) }).toString();
  const sharePath = `/u/${data.login}${query ? `?${query}` : ""}`;

  useEffect(() => {
    if (window.location.pathname + window.location.search !== sharePath) window.history.replaceState(null, "", sharePath);
  }, [sharePath]);

  const thumbs = useMemo(() => PERSONAL_LOOKS.map((l) => ({ ...l, params: personalWallpaper(data, l.id, theme || null).params })), [data, theme]);

  const side = (
    <>
      <section className="col-section">
        <span className="label">@{data.login}</span>
        <dl className="seed-facts">
          <dt>Last year</dt>
          <dd>{fmt(data.total)} contributions</dd>
          <dt>Longest streak</dt>
          <dd>{data.longestStreak} days</dd>
          <dt>Current streak</dt>
          <dd>{data.currentStreak} days</dd>
          {data.repos.length > 0 && (
            <>
              <dt>Repos</dt>
              <dd className="mono small">{data.repos.slice(0, 4).join(", ")}</dd>
            </>
          )}
        </dl>
      </section>
      <section className="col-section">
        <span className="label">Look</span>
        <div className="preset-grid">
          {thumbs.map((l) => (
            <button key={l.id} type="button" className="preset-btn" aria-pressed={l.id === look} onClick={() => setLook(l.id)}>
              <div className="pm">
                <LiveThumb gen={l.gen} params={l.params} w={800} h={500} label={l.title} />
              </div>
              <span>{l.title}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="col-section">
        <span className="label">Editor theme</span>
        <div className="theme-grid" role="group" aria-label="Recolour with an editor theme">
          <button type="button" className="theme-chip" aria-pressed={theme === ""} onClick={() => setTheme("")}>
            <span className="theme-name">Original</span>
          </button>
          {THEMES.map((t) => (
            <button key={t.id} type="button" className="theme-chip" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)} style={{ background: t.bg, color: t.fg }}>
              <span className="theme-dots" aria-hidden="true">
                {t.accents.slice(0, 4).map((c) => <i key={c} style={{ background: c }} />)}
              </span>
              <span className="theme-name">{t.name}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );

  return (
    <WallpaperStage
      gen={wp.gen}
      preset={wp.preset}
      params={wp.params}
      name={`seedwall-${data.login}-${look}`}
      sharePath={sharePath}
      title={<>@{data.login}</>}
      subtitle={`${getLook(look).title} · drawn from real GitHub activity`}
      side={side}
      footer={<p className="preview-dims">Refreshed from GitHub every few hours. Share the link and anyone sees your wallpaper.</p>}
    />
  );
}
