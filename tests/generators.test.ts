import { describe, expect, it } from "vitest";
import { XMLValidator } from "fast-xml-parser";
import { DEVICES } from "@/config/devices";
import { GENERATORS, renderWallpaper, resolveParams } from "@/generators";
import { coerceParam } from "@/generators/render";

const SIZES = [...DEVICES.map((d) => ({ id: d.id, w: d.w, h: d.h })), { id: "tiny", w: 320, h: 240 }, { id: "tall", w: 400, h: 1600 }];

describe.each(GENERATORS.map((g) => [g.id, g] as const))("%s", (_id, gen) => {
  it("has metadata, a seed param, text params and ≥4 presets", () => {
    expect(gen.name).toBeTruthy();
    expect(gen.description.length).toBeGreaterThan(20);
    expect(gen.params.seed?.kind).toBe("seed");
    expect(gen.params["text.none"]?.kind).toBe("toggle");
    expect(gen.presets.length).toBeGreaterThanOrEqual(4);
    expect(new Set(gen.presets.map((p) => p.id)).size).toBe(gen.presets.length);
  });

  it("presets only use valid param keys and values", () => {
    for (const preset of gen.presets)
      for (const [key, value] of Object.entries(preset.params)) {
        const def = gen.params[key];
        expect(def, `${preset.id}.${key}`).toBeDefined();
        if (def) expect(coerceParam(def, value), `${preset.id}.${key}=${String(value)}`).toBe(value);
      }
  });

  it.each(SIZES.map((s) => [s.id, s] as const))("renders valid SVG at %s", (_d, s) => {
    const svg = renderWallpaper(gen, resolveParams(gen, gen.presets[0]?.id), s);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${s.w} ${s.h}"`);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    expect(XMLValidator.validate(svg)).toBe(true);
  });

  it("renders every preset, with and without text", () => {
    for (const preset of gen.presets)
      for (const none of [false, true]) {
        const svg = renderWallpaper(gen, resolveParams(gen, preset.id, { "text.none": none }), { w: 1200, h: 800 });
        expect(XMLValidator.validate(svg), `${preset.id} text.none=${none}`).toBe(true);
        expect(svg).not.toMatch(/NaN|undefined/);
      }
  });

  it("is deterministic for a fixed seed", () => {
    const p = resolveParams(gen, gen.presets[0]?.id, { seed: 1234 });
    const a = renderWallpaper(gen, p, { w: 1920, h: 1080 });
    const b = renderWallpaper(gen, { ...p }, { w: 1920, h: 1080 });
    expect(a).toBe(b);
  });

  it("escapes user text", () => {
    const svg = renderWallpaper(gen, resolveParams(gen, gen.presets[0]?.id, { "text.none": false, "text.line1": `<b>&"x"</b>` }), { w: 1600, h: 1000 });
    expect(XMLValidator.validate(svg)).toBe(true);
    expect(svg).not.toContain("<b>");
  });
});

describe("seed sensitivity", () => {
  it.each(["cutting-mat", "mesh-gradient", "topographic", "blueprint", "terminal", "geometric", "aurora", "flow-field", "wave-lines", "landscape", "truchet", "git-graph", "circuit", "halftone", "spirograph", "code-city", "marble", "contributions"])("%s changes with the seed", (id) => {
    const gen = GENERATORS.find((g) => g.id === id)!;
    const a = renderWallpaper(gen, resolveParams(gen, gen.presets[0]?.id, { seed: 1 }), { w: 1600, h: 1000 });
    const b = renderWallpaper(gen, resolveParams(gen, gen.presets[0]?.id, { seed: 2 }), { w: 1600, h: 1000 });
    expect(a).not.toBe(b);
  });
});
