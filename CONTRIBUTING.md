# Contributing to Seedwall

Thanks for helping. The most useful contribution is a **new look** (a generator). Fixes to existing looks, presets and the site are welcome too.

Don't want to write code? [Open a design idea](../../issues/new?template=design-idea.yml) with a sketch or a reference image.

## Setup

```bash
npm install
npm run dev      # http://localhost:3000/studio
npm test
npx tsc --noEmit
```

You don't need any environment variables for development. GitHub wallpapers fall back to anonymous API calls.

## Adding a generator

Each look is one file in `src/generators/` that exports a `Generator`, which is a pure function from `(params, size, rng)` to an SVG string.

1. **Copy the template.** Run `cp src/generators/_template.ts src/generators/<your-id>.ts`, then rename the export, the `id` and any SVG ids (`tp-…`). Use a short prefix that no other generator uses for your SVG ids.
2. **Register it.** Add `reg(yourLook)` to `GENERATORS` in `src/generators/index.ts`.
3. **Add it to the seed-sensitivity test.** Add your id to the list in `tests/generators.test.ts`.
4. **Generate the assets:**
   ```bash
   npm run og        # public/og/<your-id>.png (share image)
   npm run samples   # public/gallery samples + manifest
   ```
5. **Check it.** Run `npm test` and `npx tsc --noEmit`, then open `/studio` and try every preset at desktop and phone sizes.

### Rules every generator follows

The tests enforce most of these.

- **Deterministic.** Use only `p`, `size` and the `rng` you're given. No `Math.random()`, `Date.now()`, network or filesystem calls. The same inputs must always give the same SVG.
- **Responsive units.** Lay out in `u = unit(size)` (1% of the shorter side), not in raw pixels, so the look works from a 320×240 thumbnail up to a 400×1600 phone.
- **Shared text layer.** Spread `...textParams({...})` into your params and render `layoutText(p, size).svg` last. Keep shapes out of `text.zones`, for example with `clearZonesMask()`.
- **Escape user input.** Pass every colour or string param through `esc()` before putting it in the SVG.
- **Round numbers** with `n()` to keep files small.
- **Params:** you need a `seed` param (`kind: "seed"`) and at least one colour with `role: "bg"`. Give foreground and accent colours `role: "fg"` / `"accent"` so editor themes can recolour them.
- **Presets:** at least 4, with unique ids. The first one is the default. Preset values must be valid for their param (in range, an existing option, and so on).
- **Valid output:** the SVG must be well-formed and contain no `NaN`, `undefined` or `Infinity`.
- **Original work.** Don't copy someone else's artwork or a commercial wallpaper. Being inspired by a style is fine; reproducing a specific piece is not.

Helpers worth knowing: `shared/rng.ts` (`range`, `pick`), `shared/noise.ts`, `shared/palettes.ts`, `shared/color.ts`, `shared/svg.ts` (`grainFilter`, `blurFilter`, `smoothPath`) and `shared/contours.ts`.

### Shared helpers, with examples

Import paths are relative to a generator file in `src/generators/`.

**`shared/noise.ts`** — seeded 2D gradient (Perlin-style) noise. `createNoise2D(rng)` returns `(x, y) => number`, roughly in `[-1, 1]`; `fbm()` sums octaves for smoother fields.

```ts
import { createNoise2D, fbm } from "./shared/noise";
const h = fbm(createNoise2D(rng), x * 0.01, y * 0.01, 4); // fractal height at (x, y)
```

**`shared/color.ts`** — hex/RGB conversion and contrast-safe ink. `mix()` interpolates two hex colours; `autoInk()` picks white or near-black text for a background.

```ts
import { autoInk, mix } from "./shared/color";
const ink = autoInk(p.bg);                  // "#ffffff" or "#1b1b1b"
const mid = mix("#101418", "#ff7a59", 0.5); // linear mix, t in [0, 1]
```

**`shared/contours.ts`** — marching squares over a scalar grid. `contourPaths()` returns SVG path data for the region where the field is above `t`; pass `closed: true` for filled loops (use with `fill-rule="evenodd"`).

```ts
import { contourPaths } from "./shared/contours";
const d = contourPaths(field, cols, rows, cell, 0.5, { closed: true }); // path data for field > 0.5
```

## Things that must not change

- **Seed pools in `src/lib/seed.ts`.** `/s/<seed>` links are permanent: every number must show the same wallpaper forever. Never edit `POOL_V1`. New looks reach seed links through a new pool for a new seed range, and that's a maintainer decision, so leave it out of your PR. `tests/seeds.test.ts` fails if an existing seed changes. **Don't update that snapshot to make it pass.**
- **Existing generator output.** Changing how an existing look renders also changes every seed link that uses it. Bug fixes are fine; for anything else, open an issue first.
- **Fonts.** Only the OFL fonts in `public/fonts` are used, because the browser, canvas export and resvg all have to measure them the same way. To add a font, open an issue first. It also needs `npm run fonts:metrics`.

## Pull requests

- Keep each PR to one look or one fix.
- Include a screenshot of each preset, at a desktop size and a phone size.
- `npm test` and `npx tsc --noEmit` must pass.
- By contributing, you agree your work is released under the [MIT License](LICENSE).
