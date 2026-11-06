import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/seo";
import { SITE } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
