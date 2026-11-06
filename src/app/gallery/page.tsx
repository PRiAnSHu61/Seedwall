import type { Metadata } from "next";
import { GalleryGrid } from "@/components/GalleryGrid";
import { DrivePackButton } from "@/components/DrivePackButton";
import { GENERATORS } from "@/generators";
import { getGallery } from "@/lib/galleryData";

export const metadata: Metadata = {
  title: "Gallery",
  description: "The Cutting Mat wallpaper pack and samples from every generator — download directly or open in the studio.",
};

// Re-read the Drive folder at most once an hour.
export const revalidate = 3600;

export default async function GalleryPage() {
  const items = await getGallery();
  return (
    <div className="container section">
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
