import Link from "next/link";
import { GalleryGrid } from "@/components/GalleryGrid";
import { GeneratorCard } from "@/components/GeneratorCard";
import { Hero } from "@/components/Hero";
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
  return (
    <>
      <Hero />
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
