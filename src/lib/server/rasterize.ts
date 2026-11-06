import { readdirSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const FONT_DIR = join(process.cwd(), "public", "fonts");
const fontFiles = (): string[] =>
  readdirSync(FONT_DIR)
    .filter((f) => f.endsWith(".ttf"))
    .map((f) => join(FONT_DIR, f));

/** Rasterise an SVG to PNG with the same fonts the site uses. Node-only. */
export function svgToPngBuffer(svg: string, width?: number): Buffer {
  const resvg = new Resvg(svg, {
    font: { fontFiles: fontFiles(), loadSystemFonts: false, defaultFontFamily: "Inter" },
    fitTo: width ? { mode: "width", value: width } : { mode: "original" },
    shapeRendering: 2,
    textRendering: 1,
  });
  return resvg.render().asPng();
}
