import type { Metadata } from "next";
import { SITE } from "./site";

/** One source of truth for facts shared by metadata, JSON-LD and page copy. */
export const AUTHOR = {
  name: "Suryansh Chaudhary",
  url: "https://suryansh.work/",
  x: "https://x.com/Suryansh_2001",
  xHandle: "@Suryansh_2001",
  linkedin: "https://www.linkedin.com/in/suryansh-chaudhary-2209/",
  github: "https://github.com/Suryansh-Codes2209",
} as const;

export const REPO_URL = "https://github.com/Suryansh-Codes2209/Seedwall";

export const KEYWORDS = [
  "wallpaper generator",
  "generative wallpapers",
  "desktop wallpaper",
  "phone wallpaper",
  "iPhone wallpaper",
  "MacBook wallpaper",
  "4K wallpaper",
  "developer wallpaper",
  "cutting mat wallpaper",
  "flow field",
  "synthwave wallpaper",
  "minimal wallpaper",
  "SVG wallpaper",
  "custom quote wallpaper",
  "Dracula theme wallpaper",
  "Tokyo Night wallpaper",
];

export const absoluteUrl = (path: string): string => new URL(path, SITE.url).toString();

/** Metadata for a page: title, description, canonical URL, Open Graph and Twitter card. */
export function pageMetadata(opts: { title: string; description: string; path: string; image?: string; imageAlt?: string }): Metadata {
  const image = opts.image ?? "/og/default.png";
  const images = [{ url: image, width: 1200, height: 630, alt: opts.imageAlt ?? opts.title }];
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: { title: opts.title, description: opts.description, url: opts.path, images, type: "website", siteName: SITE.name, locale: "en_US" },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: [image], creator: AUTHOR.xHandle, site: AUTHOR.xHandle },
  };
}
