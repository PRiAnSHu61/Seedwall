import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@resvg/resvg-js"],
  // The image API rasterises with the same TTFs as the site; ship them with the functions.
  outputFileTracingIncludes: { "/api/**": ["./public/fonts/**"] },
  // The service worker must always be re-checked, or a stale one could linger.
  headers: async () => [
    { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
  ],
};

export default config;
