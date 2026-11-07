import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/seo";
import { GENERATORS } from "@/generators";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/studio"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/gallery"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/mac"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...GENERATORS.map((g) => ({
      url: absoluteUrl(`/generators/${g.id}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: [absoluteUrl(`/og/${g.id}.png`)],
    })),
  ];
}
