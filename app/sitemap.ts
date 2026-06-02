import { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

const BASE_URL = "https://lawnsguide.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllArticles();
  return [
    { url: BASE_URL, lastModified: new Date(), priority: 1 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), priority: 0.8 },
    { url: `${BASE_URL}/authors`, lastModified: new Date(), priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), priority: 0.5 },
    ...CATEGORIES.map(c => ({ url: `${BASE_URL}/categories/${c.slug}`, priority: 0.8 as const })),
    ...articles.map(a => ({
      url: `${BASE_URL}/blog/${a.short_title}`,
      lastModified: a.modified_time ? new Date(a.modified_time) : new Date(),
      priority: 0.7 as const,
    })),
  ];
}
