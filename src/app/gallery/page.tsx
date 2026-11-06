import type { Metadata } from "next";
import { GalleryGrid } from "@/components/GalleryGrid";
import { DrivePackButton } from "@/components/DrivePackButton";
import { GENERATORS } from "@/generators";
import { JsonLd } from "@/components/JsonLd";
import { AUTHOR, absoluteUrl, pageMetadata } from "@/config/seo";
import { getGallery } from "@/lib/galleryData";

export const metadata: Metadata = pageMetadata({
  title: "Wallpaper Gallery — free desktop & phone wallpapers",
  description:
    "Free downloads: the Cutting Mat wallpaper pack for MacBook and iPhone, with and without text, plus samples from every Seedwall generator. Download directly or open any one in the studio to customise it.",
  path: "/gallery",
  image: "/og/gallery.png",
});

// Re-read the Drive folder at most once an hour.
export const revalidate = 3600;

export default async function GalleryPage() {
  const items = await getGallery();
  const structured = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "Seedwall wallpaper gallery",
    url: absoluteUrl("/gallery"),
    author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
    numberOfItems: items.length,
    image: items.slice(0, 40).map((i) => ({
      "@type": "ImageObject",
      name: i.title,
      contentUrl: absoluteUrl(i.downloadUrl),
      thumbnailUrl: absoluteUrl(i.previewUrl),
      width: i.width,
      height: i.height,
      encodingFormat: "image/png",
      isAccessibleForFree: true,
    })),
  };
  return (
    <div className="container section">
      <JsonLd data={structured} />
      <div className="section-head">
        <div>
          <span className="eyebrow">Gallery</span>
          <h1 style={{ fontSize: 40, marginTop: 6 }}>Ready-made wallpapers</h1>
          <p>The Cutting Mat pack from Google Drive plus samples from every generator. Click one to download it or open it in the studio.</p>
        </div>
        <DrivePackButton primary />
      </div>
      <GalleryGrid items={items} generators={GENERATORS.map((g) => ({ id: g.id, name: g.name }))} />
    </div>
  );
}
