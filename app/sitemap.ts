import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

const SITE_URL = "https://lawnsguide.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles] = await Promise.all([
    getAllArticles()(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Category hub pages: /categories/{slug}
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/categories/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => {
    const path = a.url
      ? a.url.replace(/^https?:\/\/[^/]+/, "")
      : `/${a.type ?? "blog"}/${a.short_title ?? ""}`;
    return {
      url: `${SITE_URL}${path}`,
      lastModified: new Date(a.modified_time ?? a.published_time ?? Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });


  return [...staticPages, ...categoryPages, ...articlePages];
}
