import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Flutter uses `${baseUrl}/catalog.json` when baseUrl is the site origin.
      {
        source: "/catalog.json",
        destination: "/api/text-packs/catalog",
      },
      {
        source: "/text_packs/catalog.json",
        destination: "/api/text-packs/catalog",
      },
      {
        source: "/api/text-packs/catalog.json",
        destination: "/api/text-packs/catalog",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
