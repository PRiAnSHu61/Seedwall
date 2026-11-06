/**
 * Renders 3 sample wallpapers per generator into public/gallery and rebuilds the manifest.
 *   npm run samples
 */
import { writeFileSync } from "node:fs";
import { getDevice } from "../src/config/devices";
import { GENERATORS } from "../src/generators";
import { publish, render } from "./lib/core";

const DEVICES = ["1440p", "iphone", "macbook14"] as const;

writeFileSync("public/gallery/manifest.json", "[]\n");
for (const gen of GENERATORS) {
  for (const [i, preset] of gen.presets.slice(0, 3).entries()) {
    const d = getDevice(DEVICES[i % DEVICES.length]!);
    if (!d) throw new Error("missing device");
    const r = render({ gen, presetId: preset.id, device: d.id, w: d.w, h: d.h, overrides: {} });
    const item = await publish(r, ["sample"]);
    console.log(`✓ ${item.id}`);
  }
}
