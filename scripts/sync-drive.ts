/**
 * Snapshots the public Drive pack into src/data/drive-snapshot.json — the fallback the
 * gallery uses if Drive can't be reached at request time. Also reads each PNG's real
 * pixel size from its header (a 32-byte range request).
 *   npm run sync:drive
 */
import { writeFileSync } from "node:fs";
import { SITE, driveFolderId } from "../src/config/site";
import { driveDownload, loadDriveItems } from "../src/lib/drive";
import type { GalleryItem } from "../src/lib/gallery";

async function pngSize(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-32" }, redirect: "follow" });
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null;
    const dv = new DataView(buf.buffer);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const rootId = driveFolderId(process.env.NEXT_PUBLIC_DRIVE_URL || SITE.driveUrl);
  if (!rootId) throw new Error("Set NEXT_PUBLIC_DRIVE_URL to a Drive folder link");
  const items = await loadDriveItems(rootId);
  const out: GalleryItem[] = [];
  for (const item of items) {
    const dims = await pngSize(driveDownload(item.id.replace(/^drive-/, "")));
    out.push(dims ? { ...item, ...dims } : item);
    process.stdout.write(".");
  }
  writeFileSync("src/data/drive-snapshot.json", `${JSON.stringify(out, null, 2)}\n`);
  console.log(`\nwrote ${out.length} items to src/data/drive-snapshot.json`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
