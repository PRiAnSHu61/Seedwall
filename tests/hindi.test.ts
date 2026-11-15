import { describe, expect, it } from "vitest";
import { getGenerator, renderWallpaper, resolveParams } from "@/generators";
import { measure, syllables } from "@/generators/shared/text";

describe("Devanagari text", () => {
  it("splits into syllables, keeping vowel signs and conjuncts together", () => {
    expect(syllables("नाभि से")).toEqual(["ना", "भि", " ", "से"]);
    expect(syllables("ध्रुव सृष्टि")).toEqual(["ध्रु", "व", " ", "सृ", "ष्टि"]);
    expect(syllables("Om नमः")).toEqual(["Om ", "न", "मः"]);
  });

  it("measures conjuncts narrower than their parts", () => {
    expect(measure("ष्ट", "hindi", 10)).toBeLessThan(measure("ष", "hindi", 10) + measure("ट", "hindi", 10));
  });

  it("draws Hindi quotes one syllable at a time, and leaves Latin quotes untouched", () => {
    const g = getGenerator("padmanabha")!;
    const hindi = renderWallpaper(g, resolveParams(g, "pink-lotus"), { w: 1600, h: 1000 });
    expect(hindi).toContain(`<tspan x=`);
    expect(hindi).toContain("ना</tspan>");
    const latin = renderWallpaper(g, resolveParams(g, "pink-lotus", { "text.font": "serif", "text.line1": "Lotus", "text.line2": "" }), { w: 1600, h: 1000 });
    expect(latin).toContain(">Lotus</text>");
  });
});
