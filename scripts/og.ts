/**
 * Social share images (1200×630) and PWA icons, rendered with the real generators.
 *   npm run og      → public/og/{default,gallery,<generator>}.png, public/icons/*.png
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { GENERATORS, getGenerator, renderWallpaper, resolveParams } from "../src/generators";
import { esc } from "../src/generators/shared/svg";
import { svgToPngBuffer } from "../src/lib/server/rasterize";

const W = 1200;
const H = 630;

const MARK = (x: number, y: number, s: number): string =>
  `<g transform="translate(${x} ${y}) scale(${s / 32})">` +
  `<rect x="1" y="1" width="30" height="30" rx="7" fill="#2457ff"/>` +
  `<path d="M1 11.5H31M1 20.5H31M11.5 1V31M20.5 1V31" stroke="#fff" stroke-opacity=".14" stroke-width=".8"/>` +
  `<path d="M8.4 23.6L10.6 21.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>` +
  `<circle cx="5.8" cy="26.2" r="1.7" fill="#fff"/>` +
  `<path d="M12 20C8.8 16.8 9.6 11.6 13.6 8.6C16.4 6.5 21.6 5.6 25.4 6.6C26.4 10.4 25.5 15.6 23.4 18.4C20.4 22.4 15.2 23.2 12 20Z" fill="#fff"/>` +
  `<path d="M14.6 17.4C16.6 15.4 18.8 13.2 21.4 10.6" stroke="#2457ff" stroke-width="1.5" stroke-linecap="round"/></g>`;

/** Bottom-left brand card laid over any wallpaper. */
function card(title: string, subtitle: string): string {
  const cw = Math.max(520, 34 + title.length * 27);
  return (
    `<g>` +
    `<rect x="40" y="${H - 210}" width="${cw}" height="170" rx="14" fill="#0b0c10" fill-opacity="0.82"/>` +
    MARK(68, H - 182, 44) +
    `<text x="124" y="${H - 150}" font-family="'Schibsted Grotesk', Inter, sans-serif" font-size="30" fill="#ffffff" letter-spacing="-0.5">Seed<tspan fill="#7d9bff">wall</tspan></text>` +
    `<text x="68" y="${H - 96}" font-family="'Schibsted Grotesk', Inter, sans-serif" font-size="44" fill="#ffffff" letter-spacing="-1">${esc(title)}</text>` +
    `<text x="68" y="${H - 60}" font-family="'JetBrains Mono', monospace" font-size="18" fill="#c9cdd6">${esc(subtitle)}</text>` +
    `</g>`
  );
}

const withOverlay = (svg: string, overlay: string): string => svg.replace(/<\/svg>$/, `${overlay}</svg>`);

function wallpaper(genId: string, presetId?: string, w = W, h = H): string {
  const gen = getGenerator(genId);
  if (!gen) throw new Error(genId);
  return renderWallpaper(gen, resolveParams(gen, presetId ?? gen.presets[0]?.id, { "text.none": true }), { w, h });
}

async function savePng(svg: string, file: string): Promise<void> {
  writeFileSync(file, await sharp(svgToPngBuffer(svg)).png({ palette: true, quality: 90, effort: 10 }).toBuffer());
  console.log(`✓ ${file}`);
}

mkdirSync("public/og", { recursive: true });
mkdirSync("public/icons", { recursive: true });

await savePng(withOverlay(wallpaper("cutting-mat", "blue-bold"), card("Wallpapers grown from a seed", "seedwall.suryansh.work · free · any screen")), "public/og/default.png");

for (const g of GENERATORS)
  await savePng(withOverlay(wallpaper(g.id), card(`${g.name}`, `wallpaper generator · ${g.presets.length} presets · free PNG`)), `public/og/${g.id}.png`);

// Gallery: a 4×2 collage of different generators.
const picks = ["cutting-mat", "flow-field", "landscape", "git-graph", "aurora", "truchet", "marble", "code-city"];
const tw = W / 4, th = H / 2;
const tiles = picks
  .map((id, i) => {
    const inner = wallpaper(id, undefined, tw * 2, th * 2).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    const scoped = inner.replace(/id="([^"]+)"/g, `id="t${i}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#t${i}-$1)`);
    return `<svg x="${(i % 4) * tw}" y="${Math.floor(i / 4) * th}" width="${tw}" height="${th}" viewBox="0 0 ${tw * 2} ${th * 2}">${scoped}</svg>`;
  })
  .join("");
await savePng(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${tiles}${card("Free wallpaper gallery", "desktop · phone · with or without text")}</svg>`,
  "public/og/gallery.png",
);

// PWA icons from the favicon SVG; maskable gets a safe-zone margin.
const icon = readFileSync("src/app/icon.svg");
for (const s of [192, 512]) {
  await sharp(icon, { density: 1200 }).resize(s, s).png().toFile(`public/icons/icon-${s}.png`);
  console.log(`✓ public/icons/icon-${s}.png`);
}
const inner = await sharp(icon, { density: 1200 }).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#2457ff" } })
  .composite([{ input: inner, left: 76, top: 76 }])
  .png()
  .toFile("public/icons/icon-maskable-512.png");
console.log("✓ public/icons/icon-maskable-512.png");
