import { SITE, driveFolderId } from "@/config/site";
import snapshot from "@/data/drive-snapshot.json";
import manifest from "../../public/gallery/manifest.json";
import { loadDriveItems } from "./drive";
import { validateManifest, type GalleryItem } from "./gallery";

// Validated at module load → a malformed manifest fails `next build`.
const SAMPLES = validateManifest(manifest, "public/gallery/manifest.json");
const SNAPSHOT = validateManifest(snapshot, "src/data/drive-snapshot.json");

/** How often the live Drive listing is re-read (seconds). */
export const DRIVE_REVALIDATE = 3600;

/**
 * Live Drive pack (refreshed hourly), keeping the real pixel sizes from the snapshot.
 * Falls back to the snapshot if Drive is unreachable.
 */
export async function getDriveItems(): Promise<GalleryItem[]> {
  const rootId = driveFolderId(SITE.driveUrl);
  if (!rootId) return [];
  try {
    const live = await loadDriveItems(rootId, { next: { revalidate: DRIVE_REVALIDATE } });
    if (!live.length) return SNAPSHOT;
    const known = new Map(SNAPSHOT.map((i) => [i.id, i]));
    return live.map((i) => {
      const k = known.get(i.id);
      return k ? { ...i, width: k.width, height: k.height } : i;
    });
  } catch {
    return SNAPSHOT;
  }
}

export const getSampleItems = (): GalleryItem[] => SAMPLES;

export async function getGallery(): Promise<GalleryItem[]> {
  return [...(await getDriveItems()), ...getSampleItems()];
}
