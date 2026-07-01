import type { MetadataRoute } from "next";
import { getAllArticles, getAllAuthors } from "@/lib/db";

const SITE_URL = "https://lawnsguide.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, authors] = await Promise.all([
    getAllArticles(),
    getAllAuthors(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/authors`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

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

  const authorPages: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${SITE_URL}/author/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...authorPages, ...articlePages];
}
