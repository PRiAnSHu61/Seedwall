import Link from "next/link";
import { GalleryGrid } from "@/components/GalleryGrid";
import { GeneratorCard } from "@/components/GeneratorCard";
import { GitHubForm } from "@/components/GitHubForm";
import { Hero } from "@/components/Hero";
import { LiveThumb } from "@/components/LiveThumb";
import { dailySeed, isoDate, wallpaperFromSeed } from "@/lib/seed";
import { GENERATORS } from "@/generators";
import { getDriveItems, getSampleItems } from "@/lib/galleryData";

export const revalidate = 3600;

export default async function HomePage() {
  const drive = await getDriveItems();
  // A mix: with-text desktop mats from the pack, then a generated sample per generator.
  const featured = [
    ...drive.filter((i) => !i.hasTextFree && i.presetId?.endsWith("-bold")).slice(0, 4),
    ...drive.filter((i) => i.height > i.width && !i.hasTextFree).slice(0, 2),
    ...getSampleItems().filter((_, idx) => idx % 3 === 0).slice(0, 6),
  ];
  const today = isoDate(new Date());
  const daily = wallpaperFromSeed(dailySeed(today));
  return (
    <>
      <Hero />
      <section className="container section split" aria-labelledby="personal-h">
        <div className="split-card">
          <span className="eyebrow">New · from your real data</span>
          <h2 id="personal-h">Your year of commits, as a wallpaper.</h2>
          <p>Type a GitHub username. Seedwall reads the public contribution graph and recent commits and draws them as a grid, a 3D skyline or a branch graph. It&apos;s yours alone, and the link is yours to share.</p>
          <GitHubForm />
          <div className="split-art">
            <LiveThumb gen="contributions" preset="skyline" w={1600} h={1000} label="A contribution graph drawn as a neon skyline" />
          </div>
        </div>
        <Link className="split-card daily-card" href={`/s/${daily.seed}`}>
          <span className="eyebrow">Today&apos;s seed · {today}</span>
          <h2>Seed #{daily.seed}</h2>
          <p>One wallpaper a day, the same for everyone. Every seed has its own link: send yours with “here&apos;s my seed”.</p>
          <div className="split-art">
            <LiveThumb gen={daily.gen} params={daily.params} w={1600} h={1000} label={`Today's wallpaper, seed ${daily.seed}`} />
          </div>
          <span className="btn">Open seed #{daily.seed} →</span>
        </Link>
      </section>
      <section className="container section" aria-labelledby="featured-h">
        <div className="section-head">
          <div>
            <h2 id="featured-h">Featured wallpapers</h2>
            <p>From the Cutting Mat pack on Google Drive and the generators. Click to download.</p>
          </div>
          <Link className="btn" href="/gallery">See all {drive.length + getSampleItems().length} →</Link>
        </div>
        <GalleryGrid compact items={featured} generators={GENERATORS.map((g) => ({ id: g.id, name: g.name }))} />
      </section>
      <section id="generators" className="container section" aria-labelledby="gens-h">
        <div className="section-head">
          <div>
            <h2 id="gens-h">Generators</h2>
            <p>Each look is one TypeScript file that turns parameters and a seed into an SVG.</p>
          </div>
        </div>
        <div className="grid-cards">
          {GENERATORS.map((g) => (
            <GeneratorCard key={g.id} gen={g} />
          ))}
        </div>
      </section>
    </>
  );
}
