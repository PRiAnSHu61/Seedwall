import { describe, expect, it } from "vitest";
import { XMLValidator } from "fast-xml-parser";
import { getGenerator, renderWallpaper, resolveParams } from "@/generators";
import { formatHistory, parseHistory } from "@/generators/git-graph";
import { parseLevels } from "@/generators/contributions";
import { SEED_MAX, SEED_POOL_ENTRIES, SEED_THEMES, dailySeed, parseSeed, wallpaperFromSeed } from "@/lib/seed";
import { PERSONAL_LOOKS, personalWallpaper, type PersonalData } from "@/lib/personal";
import { parseContributionsHtml } from "@/lib/server/github";
import { sizeFromQuery } from "@/lib/server/imageResponse";
import { getTheme } from "@/generators/shared/themes";

describe("seed links", () => {
  it("every frozen pool entry still exists", () => {
    for (const [g, p] of SEED_POOL_ENTRIES) {
      const gen = getGenerator(g);
      expect(gen, g).toBeDefined();
      expect(gen?.presets.some((x) => x.id === p), `${g}/${p}`).toBe(true);
    }
    for (const t of SEED_THEMES) expect(getTheme(t), t).toBeDefined();
  });

  it("is deterministic and covers many looks", () => {
    expect(wallpaperFromSeed(48213)).toEqual(wallpaperFromSeed(48213));
    const gens = new Set(Array.from({ length: 400 }, (_, i) => wallpaperFromSeed(i + 1).gen));
    expect(gens.size).toBeGreaterThanOrEqual(18);
  });

  // If this fails, an existing /s/<seed> link now shows a different wallpaper. Don't update
  // the expectation — fix whatever changed the mapping (see the note in src/lib/seed.ts).
  it("keeps published seeds stable", () => {
    const pick = (s: number) => {
      const w = wallpaperFromSeed(s);
      return `${w.gen}/${w.preset}/${w.theme ?? "-"}/${w.params["text.none"] ? "notext" : "text"}`;
    };
    expect([1, 7, 42, 48213, 999999].map(pick)).toMatchSnapshot();
  });

  it("renders valid SVG for a spread of seeds", () => {
    for (const s of [1, 2, 3, 100, 4242, 48213, 777777, SEED_MAX]) {
      const w = wallpaperFromSeed(s);
      const svg = renderWallpaper(getGenerator(w.gen)!, w.params, { w: 1200, h: 630 });
      expect(XMLValidator.validate(svg), `seed ${s}`).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });

  it("parses seeds strictly", () => {
    expect(parseSeed("48213")).toBe(48213);
    for (const bad of ["0", "1000000", "-3", "4.2", "abc", "", "0012345678"]) expect(parseSeed(bad), bad).toBeNull();
  });

  it("has one daily seed per date", () => {
    expect(dailySeed("2026-11-07")).toBe(dailySeed("2026-11-07"));
    expect(dailySeed("2026-11-07")).not.toBe(dailySeed("2026-11-08"));
    const s = dailySeed("2030-01-01");
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(SEED_MAX);
  });
});

describe("image size from the query", () => {
  it("uses devices, custom sizes and clamps huge requests", () => {
    expect(sizeFromQuery(new URLSearchParams("d=iphone"))).toEqual({ w: 1290, h: 2796 });
    expect(sizeFromQuery(new URLSearchParams("w=1200&h=630"))).toEqual({ w: 1200, h: 630 });
    expect(sizeFromQuery(new URLSearchParams("w=junk"))).toEqual({ w: 3024, h: 1964 });
    const big = sizeFromQuery(new URLSearchParams("w=20000&h=10000"));
    expect(Math.max(big.w, big.h)).toBeLessThanOrEqual(6144);
    expect(big.w / big.h).toBeCloseTo(2, 1);
  });
});

describe("real GitHub data", () => {
  const html = `<h2 id="js-contribution-activity-description">
      1,707
      contributions
        in the last year
    </h2><table>
    <td data-date="2025-11-02" id="contribution-day-component-0-0" data-level="0" class="ContributionCalendar-day"></td>
    <td data-date="2025-11-03" id="contribution-day-component-1-0" data-level="3" class="ContributionCalendar-day"></td>
    <td data-date="2025-11-04" id="contribution-day-component-2-0" data-level="4" class="ContributionCalendar-day"></td></table>
    <tool-tip id="t1" for="contribution-day-component-0-0" class="sr-only">No contributions on November 2nd.</tool-tip>
    <tool-tip id="t2" for="contribution-day-component-1-0" class="sr-only">12 contributions on November 3rd.</tool-tip>
    <tool-tip id="t3" for="contribution-day-component-2-0" class="sr-only">1,024 contributions on November 4th.</tool-tip>`;

  it("parses the public contributions page", () => {
    const { total, days } = parseContributionsHtml(html);
    expect(total).toBe(1707);
    expect(days).toEqual([
      { date: "2025-11-02", level: 0, count: 0 },
      { date: "2025-11-03", level: 3, count: 12 },
      { date: "2025-11-04", level: 4, count: 1024 },
    ]);
  });

  it("round-trips commit history and drops junk lines", () => {
    const list = [{ lane: 0, sha: "a1b2c3d", msg: "feat: seeds" }, { lane: 2, sha: "0f0f0f0", msg: "fix:\ttabs\nand newlines" }];
    const back = parseHistory(formatHistory(list) + "\nnot a commit\n-1\tabc1234\tneg");
    expect(back).toEqual([list[0], { lane: 2, sha: "0f0f0f0", msg: "fix: tabs and newlines" }]);
  });

  it("only accepts 0–4 levels", () => {
    expect(parseLevels("0123x49")).toEqual([0, 1, 2, 3, 4]);
  });

  const data: PersonalData = {
    login: "octo-cat",
    total: 1707,
    start: "2025-11-02",
    levels: Array.from({ length: 371 }, (_, i) => String((i * 7) % 5)).join(""),
    longestStreak: 12,
    currentStreak: 3,
    commits: Array.from({ length: 30 }, (_, i) => ({ lane: i % 3, sha: (0xabc0000 + i).toString(16), msg: `commit <${i}> & "more"` })),
    repos: ["seedwall", "macget", "portfolio"],
  };

  it.each(PERSONAL_LOOKS.map((l) => [l.id] as const))("renders the %s look from real data at every shape", (look) => {
    const wp = personalWallpaper(data, look);
    for (const size of [{ w: 3024, h: 1964 }, { w: 1290, h: 2796 }, { w: 3440, h: 1440 }, { w: 1200, h: 630 }]) {
      const svg = renderWallpaper(getGenerator(wp.gen)!, wp.params, size);
      expect(XMLValidator.validate(svg), `${look} ${size.w}x${size.h}`).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      expect(svg).toContain("@octo-cat");
    }
  });

  it("uses the real data, not the seed", () => {
    const wp = personalWallpaper(data, "history");
    const svg = renderWallpaper(getGenerator(wp.gen)!, wp.params, { w: 3024, h: 1964 });
    expect(svg).toContain("abc0000");
    expect(svg).toContain("seedwall");
    const other = renderWallpaper(getGenerator(wp.gen)!, { ...wp.params, seed: 1 }, { w: 3024, h: 1964 });
    expect(other).toBe(svg); // the seed never moves real commits
  });

  it("tolerates params without the hidden data keys (switching looks mid-render)", () => {
    for (const id of ["git-graph", "contributions"]) {
      const gen = getGenerator(id)!;
      const p = { ...resolveParams(gen, gen.presets[0]?.id) };
      for (const k of ["history", "repos", "data", "start"]) delete p[k];
      const svg = renderWallpaper(gen, p, { w: 1600, h: 1000 });
      expect(XMLValidator.validate(svg), id).toBe(true);
    }
  });

  it("the synthetic grid still varies by seed", () => {
    const gen = getGenerator("contributions")!;
    const a = renderWallpaper(gen, resolveParams(gen, "github-dark", { seed: 1 }), { w: 1600, h: 1000 });
    const b = renderWallpaper(gen, resolveParams(gen, "github-dark", { seed: 2 }), { w: 1600, h: 1000 });
    expect(a).not.toBe(b);
  });
});
