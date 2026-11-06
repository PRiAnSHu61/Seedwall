import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default config;
