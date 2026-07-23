import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // /author/ (singular) → /authors/ (plural)
      { source: "/author/:slug", destination: "/authors/:slug", permanent: true },
      // Bare category paths → /categories/
      { source: "/landscaping", destination: "/categories/landscaping", permanent: true },
      { source: "/lawn-care", destination: "/categories/lawn-care", permanent: true },
      { source: "/pest-control", destination: "/categories/pest-control", permanent: true },
      { source: "/tree-care", destination: "/categories/tree-care", permanent: true },
      { source: "/gardening", destination: "/categories/gardening", permanent: true },
      { source: "/home-garden", destination: "/categories/home-garden", permanent: true },
      { source: "/home-and-garden", destination: "/categories/home-garden", permanent: true },
      { source: "/grass-types", destination: "/categories/home-garden", permanent: true },
      // Stale static sitemap paths → 410
      { source: "/sitemap/sitemapindex.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/sitemap/sitemap1.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/sitemap/sitemap2.xml", destination: "/sitemap.xml", permanent: true },
    ];
  },
};

export default nextConfig;
