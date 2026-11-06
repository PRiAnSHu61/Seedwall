# Seedwall

Browse, customise and generate desktop and phone wallpapers — **https://seedwall.suryansh.work**

- **/studio**: pick a generator and preset, then change colours, text (or go text-free), device and seed. Download a full-size PNG or SVG, copy a share link, save to your collection, or copy a Claude Code prompt or CLI command.
- **/gallery**: the Cutting Mat pack, read live from the shared Google Drive folder (refreshed hourly, with direct downloads), plus generated samples. Filter by generator, device, tag and text-free.
- **/generators/[id]**: one page per look, showing its presets and parameter table.

Every wallpaper is an **SVG string produced by a pure TypeScript function**. The same code runs in the browser (live preview, PNG export via canvas) and in Node (CLI, PNG via resvg). Output is deterministic from `(generator, params, size, seed)`.

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # vitest: every generator × every device, determinism, URL state, manifest
npx tsc --noEmit
npm run build
```

## How it fits together

```
src/generators/
  types.ts            Generator<P>, ParamSchema<P>, Preset<P>
  index.ts            the registry (GENERATORS)
  render.ts           resolveParams (defaults ← preset ← overrides, validated) + renderWallpaper
  shared/             rng, noise, palettes, colour, svg helpers, text layout + metrics
  cutting-mat.ts … minimal-type.ts   one file per look
src/config/           devices.ts, site.ts
src/lib/              studioState (URL), svgToPng (browser), prompt, collection, drive, gallery
src/components/       Hero, GeneratorCard, ParamsPanel, Preview, DevicePicker, GalleryGrid, WallpaperDialog, …
scripts/              render.ts (CLI), samples.ts, sync-drive.ts, font-metrics.ts
public/fonts          the TTFs every renderer uses (browser, canvas export, resvg)
public/gallery        generated samples + manifest.json
```

**Text** is a shared layer on every generator: `text.line1`, `text.line2`, `text.paragraph`, `text.position`, `text.font`, `text.size`, `text.color` and the `text.none` toggle. Wrap words in `*stars*` to set them in italics. `layoutText()` measures text with `shared/fontMetrics.ts`, an advance-width table generated from the real TTFs by `npm run fonts:metrics`. Browser, CLI and tests therefore measure the same way, so placement is identical everywhere. The layout returns **clear zones**, and generators mask their grid or shapes out of those zones so nothing runs through the quote.

**Units:** generators lay out in `u = min(w, h) / 100`, so portrait and landscape both work.

## Add a new generator (worked example)

1. Create `src/generators/stripes.ts`:

```ts
import type { Generator, ParamSchema, Preset } from "./types";
import { esc, n, rect, svgDoc, unit } from "./shared/svg";
import { clearZonesMask, layoutText, textParams, type TextParams } from "./shared/text";

type P = TextParams & { bg: string; fg: string; width: number; angle: number; seed: number };

const params: ParamSchema<P> = {
  bg: { kind: "color", label: "Background", default: "#111111", group: "Colours", role: "bg" },
  fg: { kind: "color", label: "Stripe", default: "#2457ff", group: "Colours", role: "accent" },
  width: { kind: "range", label: "Stripe width", min: 1, max: 20, step: 0.5, default: 6, group: "Stripes" },
  angle: { kind: "range", label: "Angle", min: 0, max: 180, step: 1, default: 30, group: "Stripes" },
  seed: { kind: "seed", label: "Seed", default: 1 },
  ...textParams({ "text.line1": "Stay in", "text.line2": "your lane." }),
};

const presets: Preset<P>[] = [
  { id: "electric", title: "Electric", params: {} },
  { id: "candy", title: "Candy", params: { bg: "#ffd6e0", fg: "#ff4d6d", "text.color": "#3a0d16" } },
  { id: "mono", title: "Mono", params: { bg: "#f2f2f2", fg: "#222222", "text.color": "#111111" } },
  { id: "sunset", title: "Sunset", params: { bg: "#2b0f3a", fg: "#ff8a5b", angle: 75 } },
];

export const stripes: Generator<P> = {
  id: "stripes",
  name: "Stripes",
  description: "Bold diagonal stripes at any angle.",
  params,
  presets,
  render(p, size, rng) {
    const u = unit(size);
    const step = p.width * u * 2;
    const diag = Math.hypot(size.w, size.h);
    const bars: string[] = [];
    const jitter = rng() * step; // use rng only, never Math.random(), to stay deterministic
    for (let x = -diag + jitter; x < diag; x += step) bars.push(rect(x, -diag, p.width * u, diag * 2, ""));
    const text = layoutText(p, size);
    return svgDoc(
      size,
      clearZonesMask("st-zones", size, text.zones),
      rect(0, 0, size.w, size.h, `fill="${esc(p.bg)}"`) +
        `<g mask="url(#st-zones)"><g fill="${esc(p.fg)}" transform="rotate(${n(p.angle)} ${n(size.w / 2)} ${n(size.h / 2)})">${bars.join("")}</g></g>` +
        text.svg,
    );
  },
};
```

2. Register it in `src/generators/index.ts`:

```ts
import { stripes } from "./stripes";
// …
  reg(stripes),
```

Give every colour a `role` (`"bg"`, `"fg"` or `"accent"`) so the syntax themes can recolour it. The tests fail if a generator has no themable background.

That's all. The studio controls, generator page, home card, CLI (`--gen stripes`) and the test matrix pick it up automatically. Prefix SVG ids (`st-…`) so they don't clash with other generators. The studio scopes ids per instance anyway. Run `npm test` to check it produces valid, deterministic SVG on every device.

## Syntax themes

`src/generators/shared/themes.ts` holds Dracula, Nord, Tokyo Night, Gruvbox, Catppuccin Mocha, One Dark, Rosé Pine, Solarized Dark and GitHub Light. `applyTheme(gen, params, id)` maps any generator's colours by role: `bg` → theme background, `fg` → theme foreground, and `accent` → the theme's accents in order. A `palette` select is also set to the theme. In the studio they're one-click chips; in the CLI use `--theme tokyo-night`. To add a theme, append one entry with `bg`, `fg` and six accents.

## Add a device

Add one line to `DEVICES` in `src/config/devices.ts`:

```ts
{ id: "pixel9", label: "Pixel 9", w: 1080, h: 2424, kind: "phone" },
```

It then appears in the studio picker, `--device pixel9`, `--all-devices` and the tests.

## Add a preset

Append to the generator's `presets` array. Only list what differs from the schema defaults:

```ts
{ id: "red-bold", title: "Red · Bold", params: { bg: "#b3261e", ink: "#ffffff", style: "bold", "text.color": "#ffffff" } },
```

The tests check that every preset key exists in the schema and every value is valid.

## CLI

```bash
npx tsx scripts/render.ts --list
npx tsx scripts/render.ts --gen cutting-mat --preset blue-bold --device macbook14 \
  --text "Small commits.|Big momentum.|A short paragraph" --seed 7 --out out/
npx tsx scripts/render.ts --gen aurora --all-presets --all-devices --no-text
npx tsx scripts/render.ts --gen flow-field --theme tokyo-night --device 4k
npx tsx scripts/render.ts --gen topographic --size 5120x2880 --params '{"bg":"#101820","line":"#fee715"}'
npx tsx scripts/render.ts --gen geometric --preset bauhaus --device iphone --publish   # → public/gallery + manifest
npm run samples       # regenerate 3 samples per generator
npm run sync:drive    # refresh the Drive snapshot (fallback + real pixel sizes)
```

Flags: `--gen --preset --all-presets --device --all-devices --size WxH --text "a|b|para" --no-text --seed --params JSON --theme <id> --format png|svg --out --publish --list`.

## The Drive pack

`NEXT_PUBLIC_DRIVE_URL` (in `.env`) points at the public Google Drive folder. The gallery reads it server-side through Drive's public embed listing (no API key), revalidating hourly. Each image gets a Drive thumbnail and a direct-download link. Files named `wallpaper-<colour>-<bold|dots|light>…` map to the matching cutting-mat preset, so "Open in Studio" recreates them, with `text.none` set for files in the "without text" folders. If Drive can't be reached, the gallery falls back to `src/data/drive-snapshot.json` (`npm run sync:drive`). If the variable is empty, "Download the full pack" shows a disabled "Link coming soon".

To add wallpapers, drop PNGs into the Drive sub-folders. They appear on the site within an hour.

## Deploy to Vercel (seedwall.suryansh.work)

1. Push this folder to a GitHub repo and **Import** it in Vercel. The framework (Next.js) is detected automatically, and the defaults are fine (`npm run build`).
2. Environment variables: the public values are already committed in `.env` (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DRIVE_URL`). Override them in Project → Settings → Environment Variables if needed.
3. **Domains** → add `seedwall.suryansh.work`. At your DNS provider for `suryansh.work`, create
   `CNAME  seedwall  →  cname.vercel-dns.com` (Vercel shows the exact target). HTTPS is issued automatically.
4. Redeploy. Pages are static, and the gallery and home re-fetch the Drive listing at most once an hour (ISR).

Or from the CLI: `npx vercel link && npx vercel --prod`, then `npx vercel domains add seedwall.suryansh.work`.
