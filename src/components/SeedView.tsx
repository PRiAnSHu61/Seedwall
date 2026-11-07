"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { getGenerator } from "@/generators";
import { getTheme } from "@/generators/shared/themes";
import { SEED_MAX, randomSeed, seedPath, wallpaperFromSeed } from "@/lib/seed";
import { WallpaperStage } from "./WallpaperStage";

interface Props {
  seed: number;
  /** Set when this is today's seed — shown as a badge. */
  daily?: string;
}

export function SeedView({ seed, daily }: Props) {
  const router = useRouter();
  const wp = useMemo(() => wallpaperFromSeed(seed), [seed]);
  const gen = getGenerator(wp.gen);
  const preset = gen?.presets.find((p) => p.id === wp.preset);
  const theme = wp.theme ? getTheme(wp.theme) : undefined;
  const prev = seed > 1 ? seed - 1 : SEED_MAX;
  const next = seed < SEED_MAX ? seed + 1 : 1;

  const side = (
    <>
      <section className="col-section">
        <span className="label">Seed</span>
        <p className="seed-big mono">#{seed}</p>
        {daily && <p className="badge">Today&apos;s seed · {daily}</p>}
        <dl className="seed-facts">
          <dt>Generator</dt>
          <dd><Link href={`/generators/${wp.gen}`}>{gen?.name ?? wp.gen}</Link></dd>
          <dt>Preset</dt>
          <dd>{preset?.title ?? wp.preset}</dd>
          <dt>Theme</dt>
          <dd>{theme?.name ?? "—"}</dd>
          <dt>Text</dt>
          <dd>{wp.params["text.none"] ? "None" : "Quote"}</dd>
        </dl>
      </section>
      <section className="col-section">
        <span className="label">Try another</span>
        <div className="seed-nav">
          <Link className="btn btn-sm" href={seedPath(prev)} aria-label={`Seed ${prev}`}>← {prev}</Link>
          <Link className="btn btn-sm" href={seedPath(next)} aria-label={`Seed ${next}`}>{next} →</Link>
        </div>
        <button type="button" className="btn btn-block" onClick={() => router.push(seedPath(randomSeed()))}>Random seed</button>
        <form
          className="seed-jump"
          onSubmit={(e) => {
            e.preventDefault();
            const v = Number(new FormData(e.currentTarget).get("seed"));
            if (Number.isInteger(v) && v >= 1 && v <= SEED_MAX) router.push(seedPath(v));
          }}
        >
          <label className="visually-hidden" htmlFor="seed-jump">Go to seed</label>
          <input id="seed-jump" name="seed" className="input mono" type="number" min={1} max={SEED_MAX} placeholder="Any seed, 1–999999" />
          <button type="submit" className="btn">Go</button>
        </form>
      </section>
    </>
  );

  return (
    <WallpaperStage
      gen={wp.gen}
      preset={wp.preset}
      params={wp.params}
      name={`seedwall-${seed}`}
      sharePath={seedPath(seed)}
      title={<>Seed <span className="mono">#{seed}</span></>}
      subtitle={`${gen?.name ?? wp.gen} · ${preset?.title ?? wp.preset}${theme ? ` · ${theme.name}` : ""}`}
      side={side}
      footer={<p className="preview-dims">Everyone who opens seedwall.suryansh.work/s/{seed} gets exactly this wallpaper, at any size.</p>}
    />
  );
}
