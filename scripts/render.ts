/**
 * Seedwall CLI — renders wallpapers with exactly the same generator code as the site.
 *
 *   npx tsx scripts/render.ts --gen cutting-mat --preset blue-bold --device macbook14 \
 *     --text "line1|line2|paragraph" --seed 7 --out out/
 *
 * Flags:
 *   --gen <id>            generator id (see --list)
 *   --preset <id>         preset id (default: first preset)
 *   --all-presets         render every preset of the generator
 *   --device <id>         device id (default macbook14)
 *   --all-devices         render for every device
 *   --size <WxH>          custom size instead of --device
 *   --text "a|b|para"     quote line 1 | line 2 | paragraph
 *   --no-text             hide all text
 *   --seed <n>            seed
 *   --params '<json>'     any other params, e.g. '{"bg":"#112233"}'
 *   --theme <id>          recolour with a syntax theme (dracula, nord, tokyo-night, …)
 *   --format png|svg      output format (default png)
 *   --out <dir>           output directory (default out/)
 *   --publish             also write to public/gallery + manifest.json
 *   --list                list generators, presets and devices
 */
import { parseArgs } from "node:util";
import { DEVICES, clampDimension, getDevice } from "../src/config/devices";
import { GENERATORS, applyTheme, resolveParams } from "../src/generators";
import { THEMES, getTheme } from "../src/generators/shared/themes";
import { publish, render, requireGenerator, writeOutput, type Job } from "./lib/core";

const { values } = parseArgs({
  options: {
    gen: { type: "string" },
    preset: { type: "string" },
    "all-presets": { type: "boolean", default: false },
    device: { type: "string", default: "macbook14" },
    "all-devices": { type: "boolean", default: false },
    size: { type: "string" },
    text: { type: "string" },
    "no-text": { type: "boolean", default: false },
    seed: { type: "string" },
    params: { type: "string" },
    theme: { type: "string" },
    format: { type: "string", default: "png" },
    out: { type: "string", default: "out" },
    publish: { type: "boolean", default: false },
    list: { type: "boolean", default: false },
  },
  strict: true,
});

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

if (values.list) {
  for (const g of GENERATORS) console.log(`${g.id.padEnd(14)} ${g.presets.map((p) => p.id).join(", ")}`);
  console.log(`\ndevices: ${DEVICES.map((d) => `${d.id} (${d.w}x${d.h})`).join(", ")}`);
  console.log(`themes: ${THEMES.map((t) => t.id).join(", ")}`);
  process.exit(0);
}

if (!values.gen) fail("--gen is required (see --list)");
const gen = requireGenerator(values.gen);
const format = values.format === "svg" ? "svg" : values.format === "png" ? "png" : fail("--format must be png or svg");

const overrides: Record<string, unknown> = {};
if (values.params) {
  try {
    const parsed: unknown = JSON.parse(values.params);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("--params must be a JSON object");
    Object.assign(overrides, parsed);
  } catch {
    fail("--params is not valid JSON");
  }
}
if (values.text !== undefined) {
  const [l1 = "", l2 = "", para = ""] = values.text.split("|");
  Object.assign(overrides, { "text.line1": l1, "text.line2": l2, "text.paragraph": para, "text.none": false });
}
if (values["no-text"]) overrides["text.none"] = true;
if (values.seed !== undefined) overrides.seed = values.seed;

if (values.theme && !getTheme(values.theme)) fail(`unknown theme "${values.theme}" (see --list)`);

const presets = values["all-presets"] ? gen.presets.map((p) => p.id) : [values.preset ?? gen.presets[0]?.id ?? ""];
for (const p of presets) if (!gen.presets.some((x) => x.id === p)) fail(`unknown preset "${p}" for ${gen.id}`);

let sizes: { device: string; w: number; h: number }[];
if (values.size) {
  const m = /^(\d+)x(\d+)$/i.exec(values.size);
  if (!m) fail("--size must look like 2560x1440");
  sizes = [{ device: `${m[1]}x${m[2]}`, w: clampDimension(Number(m[1])), h: clampDimension(Number(m[2])) }];
} else if (values["all-devices"]) {
  sizes = DEVICES.map((d) => ({ device: d.id, w: d.w, h: d.h }));
} else {
  const d = getDevice(values.device) ?? fail(`unknown device "${values.device}"`);
  sizes = [{ device: d.id, w: d.w, h: d.h }];
}

for (const presetId of presets)
  for (const s of sizes) {
    // A theme recolours the preset, then explicit --params/--text still win.
    const themed = values.theme ? { ...applyTheme(gen, resolveParams(gen, presetId), values.theme), ...overrides } : overrides;
    const job: Job = { gen, presetId, device: s.device, w: s.w, h: s.h, overrides: themed };
    const t = Date.now();
    const r = render(job);
    const file = writeOutput(r, values.out, format);
    console.log(`✓ ${file}  (${s.w}×${s.h}, ${Date.now() - t}ms)`);
    if (values.publish) console.log(`  published → ${(await publish(r)).previewUrl}`);
  }
