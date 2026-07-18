import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const isStaticExport = process.env.ARIADNE_STATIC_EXPORT === "true";

if (!isStaticExport) {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export" as const,
        basePath: "/ariadne",
        assetPrefix: "/ariadne",
        trailingSlash: true,
      }
    : {}),
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.arasaac.org",
        pathname: "/pictograms/**",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/wiki/Special:Redirect/file/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.openverse.org",
        pathname: "/v1/images/**",
      },
    ],
  },
};

export default nextConfig;
