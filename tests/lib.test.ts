import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getGenerator, resolveParams } from "@/generators";
import { layoutText, measure, parseRuns, type TextParams } from "@/generators/shared/text";
import { decodeState, encodeState, initialState } from "@/lib/studioState";
import { buildCliCommand } from "@/lib/prompt";
import { validateManifest } from "@/lib/gallery";
import { parseFolderHtml, toGalleryItem } from "@/lib/drive";
import { scopeSvgIds } from "@/lib/scopeSvg";

describe("url state", () => {
  it("round-trips generator, preset, device and edited params", () => {
    const s = initialState("cutting-mat", "cream-dots");
    s.params = { ...s.params, bg: "#123456", "text.line1": "Héllo ✨ <world>", "text.none": true, seed: 99 };
    s.device = "iphone";
    s.w = 1290;
    s.h = 2796;
    const back = decodeState(new URLSearchParams(encodeState(s)));
    expect(back).toEqual(s);
  });

  it("round-trips a custom size", () => {
    const s = { ...initialState("aurora"), device: "custom", w: 1234, h: 777 };
    const back = decodeState(new URLSearchParams(encodeState(s)));
    expect([back.device, back.w, back.h]).toEqual(["custom", 1234, 777]);
  });

  it("ignores junk input", () => {
    const s = decodeState(new URLSearchParams("g=nope&x=%%%&d=fridge"));
    expect(s.gen).toBe("cutting-mat");
    expect(s.device).toBe("macbook14");
  });

  it("rejects invalid param values from the URL", () => {
    const gen = getGenerator("cutting-mat")!;
    const p = resolveParams(gen, "blue-bold", { bg: "red", cells: 9999, style: "zigzag" });
    expect(p.bg).toBe("#0a4fc5");
    expect(p.cells).toBe(60);
    expect(p.style).toBe("bold");
  });
});

describe("text layout", () => {
  const base: TextParams = {
    "text.none": false, "text.line1": "Small commits.", "text.line2": "Big momentum.", "text.paragraph": "Some paragraph text here.",
    "text.position": "center", "text.font": "serif", "text.size": 3.6, "text.color": "#ffffff",
  };

  it("measures mono text as 0.6em per glyph", () => {
    expect(measure("abcd", "mono", 10)).toBeCloseTo(24, 0);
  });

  it("parses *italic* runs", () => {
    expect(parseRuns("Code is *poetry*")).toEqual([{ text: "Code is ", italic: false }, { text: "poetry", italic: true }]);
  });

  it("returns clear zones that contain the quote", () => {
    const t = layoutText(base, { w: 3024, h: 1964 });
    const q = t.quote!;
    const z = t.zones[0]!;
    expect(z.x).toBeLessThan(q.x);
    expect(z.x + z.w).toBeGreaterThan(q.x + q.w);
    expect(t.zones).toHaveLength(2);
  });

  it("shrinks long quotes to fit", () => {
    const t = layoutText({ ...base, "text.line1": "x".repeat(80), "text.size": 16 }, { w: 1000, h: 1000 });
    expect(t.quote!.w).toBeLessThanOrEqual(1000 * 0.84 + 1);
  });

  it("emits nothing when text is off", () => {
    expect(layoutText({ ...base, "text.none": true }, { w: 100, h: 100 })).toEqual({ svg: "", zones: [], quote: null });
  });
});

describe("cli command", () => {
  it("includes only changed params", () => {
    const s = initialState("cutting-mat", "blue-bold");
    s.params = { ...s.params, bg: "#000000" };
    const cmd = buildCliCommand(s);
    expect(cmd).toContain("--gen cutting-mat --preset blue-bold --device macbook14");
    expect(cmd).toContain(`--params '{"bg":"#000000"}'`);
  });
});

describe("gallery data", () => {
  it("public/gallery/manifest.json is valid", () => {
    const items = validateManifest(JSON.parse(readFileSync("public/gallery/manifest.json", "utf8")), "manifest");
    expect(items.length).toBeGreaterThanOrEqual(27);
  });

  it("the Drive snapshot is valid", () => {
    expect(validateManifest(JSON.parse(readFileSync("src/data/drive-snapshot.json", "utf8")), "snapshot").length).toBeGreaterThan(0);
  });

  it("rejects a malformed entry", () => {
    expect(() => validateManifest([{ id: 1 }], "bad")).toThrow(/index 0/);
  });

  it("parses Drive listings and maps pack files to presets", () => {
    const html = `<div class="flip-entry" id="entry-abc123" tabindex="0"><a href="https://drive.google.com/file/d/abc123/view"><div class="flip-entry-title">wallpaper-blue-bold-notext-3024x1964.png</div></a></div>`;
    const [entry] = parseFolderHtml(html);
    expect(entry).toEqual({ id: "abc123", name: "wallpaper-blue-bold-notext-3024x1964.png", isFolder: false });
    const item = toGalleryItem(entry!, "Desktop without text")!;
    expect(item.presetId).toBe("blue-bold");
    expect(item.hasTextFree).toBe(true);
    expect(item.params).toEqual({ "text.none": true });
    expect(item.downloadUrl).toContain("abc123");
  });
});

describe("svg id scoping", () => {
  it("prefixes ids and references", () => {
    expect(scopeSvgIds(`<mask id="m"/><g mask="url(#m)"/>`, "s")).toBe(`<mask id="s-m"/><g mask="url(#s-m)"/>`);
  });
});

describe("syntax themes", () => {
  it("recolours every generator by role and stays valid", async () => {
    const { GENERATORS, applyTheme, renderWallpaper, resolveParams } = await import("@/generators");
    const { THEMES } = await import("@/generators/shared/themes");
    const { XMLValidator } = await import("fast-xml-parser");
    for (const gen of GENERATORS)
      for (const theme of THEMES) {
        const p = applyTheme(gen, resolveParams(gen, gen.presets[0]?.id), theme.id);
        for (const [key, def] of Object.entries(gen.params)) {
          if (def.kind !== "color") continue;
          if (def.role === "bg") expect(p[key], `${gen.id}.${key}`).toBe(theme.bg);
          if (def.role === "fg") expect(p[key], `${gen.id}.${key}`).toBe(theme.fg);
          if (def.role === "accent") expect(theme.accents).toContain(p[key]);
        }
        expect(XMLValidator.validate(renderWallpaper(gen, p, { w: 800, h: 500 }))).toBe(true);
      }
  });

  it("every generator has a themable background", async () => {
    const { GENERATORS } = await import("@/generators");
    for (const gen of GENERATORS) {
      const roles = Object.values(gen.params).flatMap((d) => (d.kind === "color" && d.role ? [d.role] : []));
      expect(roles, gen.id).toContain("bg");
    }
  });

  it("ignores unknown themes", async () => {
    const { applyTheme, getGenerator, resolveParams } = await import("@/generators");
    const g = getGenerator("aurora")!;
    const p = resolveParams(g, "borealis");
    expect(applyTheme(g, p, "nope")).toEqual(p);
  });
});

describe("seo", () => {
  it("sitemap lists every page and generator with absolute URLs", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const { GENERATORS } = await import("@/generators");
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain("https://seedwall.suryansh.work/studio");
    expect(urls).toContain("https://seedwall.suryansh.work/gallery");
    for (const g of GENERATORS) expect(urls).toContain(`https://seedwall.suryansh.work/generators/${g.id}`);
  });

  it("has an OG image for every generator", async () => {
    const { existsSync } = await import("node:fs");
    const { GENERATORS } = await import("@/generators");
    for (const f of ["default", "gallery", ...GENERATORS.map((g) => g.id)]) expect(existsSync(`public/og/${f}.png`), f).toBe(true);
  });
});
