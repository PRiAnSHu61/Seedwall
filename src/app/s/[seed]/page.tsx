import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeedView } from "@/components/SeedView";
import { pageMetadata } from "@/config/seo";
import { getGenerator } from "@/generators";
import { dailySeed, isoDate, parseSeed, wallpaperFromSeed } from "@/lib/seed";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ seed: string }> }): Promise<Metadata> {
  const seed = parseSeed((await params).seed);
  if (seed === null) return {};
  const wp = wallpaperFromSeed(seed);
  const name = getGenerator(wp.gen)?.name ?? wp.gen;
  return pageMetadata({
    title: `Seed #${seed} — ${name} wallpaper`,
    description: `Wallpaper seed ${seed} on Seedwall: a ${name} wallpaper that looks the same for everyone. Download it for any screen, or try another seed.`,
    path: `/s/${seed}`,
    image: `/api/s/${seed}?w=1200&h=630`,
    imageAlt: `Seedwall seed ${seed}`,
  });
}

export default async function SeedPage({ params }: { params: Promise<{ seed: string }> }) {
  const seed = parseSeed((await params).seed);
  if (seed === null) notFound();
  const today = isoDate(new Date());
  return <SeedView seed={seed} daily={dailySeed(today) === seed ? today : undefined} />;
}
