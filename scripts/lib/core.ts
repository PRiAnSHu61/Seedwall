import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { getGenerator, renderWallpaper, resolveParams, type AnyGenerator, type Params } from "../../src/generators";
import { validateManifest, type GalleryItem } from "../../src/lib/gallery";
import { svgToPngBuffer } from "../../src/lib/server/rasterize";

export interface Job {
  gen: AnyGenerator;
  presetId: string;
  device: string;
  w: number;
  h: number;
  overrides: Record<string, unknown>;
}

export interface Rendered { job: Job; params: Params; svg: string }

export function requireGenerator(id: string): AnyGenerator {
  const gen = getGenerator(id);
  if (!gen) throw new Error(`Unknown generator "${id}". Try: npx tsx scripts/render.ts --list`);
  return gen;
}

export function render(job: Job): Rendered {
  const params = resolveParams(job.gen, job.presetId, job.overrides);
  return { job, params, svg: renderWallpaper(job.gen, params, { w: job.w, h: job.h }) };
}

export const baseName = (job: Job, suffix = ""): string => `${job.gen.id}-${job.presetId}-${job.device}${suffix}`;

export function writeOutput(r: Rendered, outDir: string, format: "png" | "svg"): string {
  mkdirSync(outDir, { recursive: true });
  const notext = r.params["text.none"] === true ? "-notext" : "";
  const file = join(outDir, `${baseName(r.job, notext)}.${format}`);
  writeFileSync(file, format === "svg" ? r.svg : svgToPngBuffer(r.svg));
  return file;
}

const GALLERY_DIR = join("public", "gallery");
const MANIFEST = join(GALLERY_DIR, "manifest.json");

/**
 * Writes a full-size PNG (palette-quantised to keep the repo light) and a small WebP
 * preview into public/gallery, then upserts the manifest entry.
 */
export async function publish(r: Rendered, tags: string[] = []): Promise<GalleryItem> {
  mkdirSync(GALLERY_DIR, { recursive: true });
  const textFree = r.params["text.none"] === true;
  const id = baseName(r.job, textFree ? "-notext" : "");
  const png = svgToPngBuffer(r.svg);
  writeFileSync(join(GALLERY_DIR, `${id}.png`), await sharp(png).png({ palette: true, quality: 95, effort: 10, dither: 0.5 }).toBuffer());
  writeFileSync(join(GALLERY_DIR, `${id}-preview.webp`), await sharp(png).resize(r.job.h > r.job.w ? 480 : 900).webp({ quality: 80 }).toBuffer());

  const preset = r.job.gen.presets.find((p) => p.id === r.job.presetId);
  const diff: Params = {};
  const base = resolveParams(r.job.gen, r.job.presetId);
  for (const [k, v] of Object.entries(r.params)) if (base[k] !== v) diff[k] = v;

  const item: GalleryItem = {
    id,
    title: `${r.job.gen.name} · ${preset?.title ?? r.job.presetId}`,
    generator: r.job.gen.id,
    presetId: r.job.presetId,
    params: diff,
    device: r.job.device,
    width: r.job.w,
    height: r.job.h,
    tags: [r.job.gen.id, r.job.h > r.job.w ? "phone" : "desktop", ...tags],
    previewUrl: `/gallery/${id}-preview.webp`,
    downloadUrl: `/gallery/${id}.png`,
    hasTextFree: textFree,
    createdAt: new Date().toISOString(),
    source: "samples",
  };

  const existing = existsSync(MANIFEST) ? validateManifest(JSON.parse(readFileSync(MANIFEST, "utf8")), MANIFEST) : [];
  const next = [...existing.filter((e) => e.id !== id), item];
  writeFileSync(MANIFEST, `${JSON.stringify(next, null, 2)}\n`);
  return item;
}
