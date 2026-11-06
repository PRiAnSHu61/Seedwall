/**
 * Reads a PUBLIC Google Drive folder (no API key) via its embeddable listing,
 * and maps the files to gallery items with direct download links.
 */
import type { GalleryItem } from "./gallery";

export interface DriveEntry { id: string; name: string; isFolder: boolean }

const ENTRY_RE = /<div class="flip-entry" id="entry-([\w-]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)</g;

const decode = (s: string): string =>
  s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

export function parseFolderHtml(html: string): DriveEntry[] {
  const out: DriveEntry[] = [];
  for (const m of html.matchAll(ENTRY_RE)) {
    const [, id, href, name] = m;
    if (id && href && name) out.push({ id, name: decode(name), isFolder: href.includes("/folders/") });
  }
  return out;
}

export async function listFolder(id: string, init?: RequestInit): Promise<DriveEntry[]> {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(id)}`, init);
  if (!res.ok) throw new Error(`Drive folder ${id}: HTTP ${res.status}`);
  return parseFolderHtml(await res.text());
}

export const driveThumb = (id: string, width = 800): string => `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
export const driveDownload = (id: string): string => `https://drive.google.com/uc?export=download&id=${id}`;

const COLOURS = ["black", "blue", "cream", "green", "orange", "silver"];

/** Turns one Drive file (inside a named sub-folder) into a gallery item. */
export function toGalleryItem(file: DriveEntry, folder: string, dims?: { width: number; height: number }): GalleryItem | null {
  if (!/\.(png|jpe?g|webp)$/i.test(file.name)) return null;
  const base = file.name.replace(/\.\w+$/, "");
  const phone = /phone/i.test(folder);
  const textFree = /without\s*text|no\s*text/i.test(folder) || /notext/i.test(base);
  const named = /^wallpaper-([a-z]+)-(bold|dots|light)/i.exec(base);
  const size = /(\d{3,5})x(\d{3,5})/.exec(base);
  const width = dims?.width ?? (size ? Number(size[1]) : phone ? 1290 : 3024);
  const height = dims?.height ?? (size ? Number(size[2]) : phone ? 2796 : 1964);

  const colour = named?.[1]?.toLowerCase();
  const style = named?.[2]?.toLowerCase();
  const presetId = colour && style && COLOURS.includes(colour) ? `${colour}-${style}` : null;
  const cap = (s: string): string => s[0]!.toUpperCase() + s.slice(1);
  const title = colour && style ? `${cap(colour)} · ${cap(style)}` : base.replace(/[-_]+/g, " ").replace(/^frame/i, "Frame");

  return {
    id: `drive-${file.id}`,
    title,
    generator: "cutting-mat",
    presetId,
    params: presetId && textFree ? { "text.none": true } : {},
    device: phone ? "iphone" : "macbook14",
    width,
    height,
    tags: [phone ? "phone" : "desktop", ...(colour ? [colour] : []), ...(style ? [style] : []), ...(presetId ? [] : ["shadow"]), textFree ? "text-free" : "with-text"],
    previewUrl: driveThumb(file.id, phone ? 500 : 900),
    downloadUrl: driveDownload(file.id),
    hasTextFree: textFree,
    createdAt: "2026-11-06T00:00:00.000Z",
    source: "drive",
  };
}

/** Root folder → each sub-folder's images (one level deep, which is how the pack is organised). */
export async function loadDriveItems(rootId: string, init?: RequestInit): Promise<GalleryItem[]> {
  const root = await listFolder(rootId, init);
  const items: GalleryItem[] = [];
  const groups: { folder: string; files: DriveEntry[] }[] = [{ folder: "", files: root.filter((e) => !e.isFolder) }];
  for (const sub of root.filter((e) => e.isFolder)) groups.push({ folder: sub.name, files: await listFolder(sub.id, init) });
  for (const g of groups)
    for (const f of g.files) {
      const item = toGalleryItem(f, g.folder);
      if (item) items.push(item);
    }
  return items;
}
