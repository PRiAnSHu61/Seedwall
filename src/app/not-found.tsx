import type { Metadata } from "next";
import Link from "next/link";
import { getGenerator, renderWallpaper, resolveParams } from "@/generators";
import { scopeSvgIds } from "@/lib/scopeSvg";
import { encodeState } from "@/lib/studioState";

export const metadata: Metadata = {
  title: "404 — this seed didn't grow",
  robots: { index: false, follow: true },
};

// The 404 is itself a wallpaper: a cutting mat with the error as the quote.
const OVERRIDES = {
  "text.line1": "404.",
  "text.line2": "This seed didn't *grow*.",
  "text.paragraph": "The page you were after isn't here. It may have moved, or the link had a typo. Every other seed on this site still works.",
  "text.size": 6,
  caption: "ERROR 404 — NOTHING PLANTED AT THIS ADDRESS",
};

export default function NotFound() {
  const gen = getGenerator("cutting-mat");
  const params = gen ? resolveParams(gen, "black-light", OVERRIDES) : {};
  const svg = gen ? scopeSvgIds(renderWallpaper(gen, params, { w: 2400, h: 1500 }), "nf") : "";
  const keepIt = `/studio?${encodeState({ gen: "cutting-mat", preset: "black-light", device: "macbook14", w: 3024, h: 1964, params })}`;

  return (
    <div className="container nf">
      <div className="nf-art" role="img" aria-label="A cutting-mat wallpaper reading: 404. This seed didn't grow." dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="nf-body">
        <span className="eyebrow">Error 404</span>
        <h1>Nothing grew here.</h1>
        <p>
          This address doesn&apos;t point at a page. While you&apos;re here, the error above is a real wallpaper. Every
          generator on Seedwall made something; this one just made a 404.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/">Back to home</Link>
          <Link className="btn" href="/studio">Open the studio</Link>
          <Link className="btn" href="/gallery">Browse the gallery</Link>
          <Link className="btn btn-ghost" href={keepIt}>Keep this 404 as a wallpaper →</Link>
        </div>
      </div>
    </div>
  );
}
