/** One wallpaper in the gallery — from the Drive pack or rendered into public/gallery. */
export interface GalleryItem {
  id: string;
  title: string;
  generator: string;
  presetId: string | null;
  params: Record<string, string | number | boolean>;
  device: string;
  width: number;
  height: number;
  tags: string[];
  previewUrl: string;
  downloadUrl: string;
  /** True when the wallpaper has no text on it. */
  hasTextFree: boolean;
  createdAt: string;
  source: "drive" | "samples";
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function isGalleryItem(v: unknown): v is GalleryItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const params = o.params;
  return (
    isStr(o.id) &&
    isStr(o.title) &&
    isStr(o.generator) &&
    (o.presetId === null || isStr(o.presetId)) &&
    !!params &&
    typeof params === "object" &&
    Object.values(params).every((x) => isStr(x) || isNum(x) || typeof x === "boolean") &&
    isStr(o.device) &&
    isNum(o.width) &&
    isNum(o.height) &&
    Array.isArray(o.tags) &&
    o.tags.every(isStr) &&
    isStr(o.previewUrl) &&
    isStr(o.downloadUrl) &&
    typeof o.hasTextFree === "boolean" &&
    isStr(o.createdAt) &&
    (o.source === "drive" || o.source === "samples")
  );
}

/** Throws with the offending index so a bad manifest fails the build loudly. */
export function validateManifest(data: unknown, label: string): GalleryItem[] {
  if (!Array.isArray(data)) throw new Error(`${label}: expected an array`);
  data.forEach((item, i) => {
    if (!isGalleryItem(item)) throw new Error(`${label}: invalid entry at index ${i}: ${JSON.stringify(item).slice(0, 200)}`);
  });
  return data as GalleryItem[];
}

/** Studio link that loads an item's exact params, or null when it can't be reproduced. */
export function studioLinkFor(item: GalleryItem): string | null {
  if (!item.presetId) return null;
  const q = new URLSearchParams({ g: item.generator, p: item.presetId, d: item.device });
  if (Object.keys(item.params).length) {
    const bytes = new TextEncoder().encode(JSON.stringify(item.params));
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    q.set("x", btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
  }
  return `/studio?${q.toString()}`;
}
