/**
 * Browser-side export. An SVG drawn into a canvas via <img> can't see page fonts,
 * so the font files the SVG uses are inlined as data: URLs first.
 */
const FONT_FILES: Record<string, { regular: string; italic: string }> = {
  Lora: { regular: "/fonts/Lora-Regular.ttf", italic: "/fonts/Lora-Italic.ttf" },
  Inter: { regular: "/fonts/Inter-Regular.ttf", italic: "/fonts/Inter-Italic.ttf" },
  "JetBrains Mono": { regular: "/fonts/JetBrainsMono-Regular.ttf", italic: "/fonts/JetBrainsMono-Italic.ttf" },
  "Schibsted Grotesk": { regular: "/fonts/SchibstedGrotesk-Regular.ttf", italic: "/fonts/SchibstedGrotesk-Italic.ttf" },
  "Instrument Serif": { regular: "/fonts/InstrumentSerif-Regular.ttf", italic: "/fonts/InstrumentSerif-Italic.ttf" },
};

const cache = new Map<string, Promise<string>>();

function fontDataUrl(path: string): Promise<string> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`font ${path}: ${r.status}`);
        return r.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(fr.error ?? new Error("font read failed"));
            fr.readAsDataURL(blob);
          }),
      );
    cache.set(path, p);
  }
  return p;
}

export async function embedFonts(svg: string): Promise<string> {
  const rules: string[] = [];
  for (const [family, files] of Object.entries(FONT_FILES)) {
    if (!svg.includes(family)) continue;
    const [reg, ital] = await Promise.all([fontDataUrl(files.regular), fontDataUrl(files.italic)]);
    rules.push(
      `@font-face{font-family:'${family}';src:url(${reg}) format('truetype');font-style:normal}`,
      `@font-face{font-family:'${family}';src:url(${ital}) format('truetype');font-style:italic}`,
    );
  }
  if (!rules.length) return svg;
  return svg.replace(/(<svg[^>]*>)/, `$1<style>${rules.join("")}</style>`);
}

export async function svgToPngBlob(svg: string, w: number, h: number): Promise<Blob> {
  const withFonts = await embedFonts(svg);
  const url = URL.createObjectURL(new Blob([withFonts], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
