import { getAllArticles } from "@/lib/db";
import ArticleCard from "@/components/ArticleCard";
import EmptyState from "@/components/EmptyState";
import type { Metadata } from "next";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "All Articles",
  description: "Browse all lawn care, landscaping, and gardening articles on LawnsGuide.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const articles = (await getAllArticles()).slice(0, 200);
  if (!articles.length) return <EmptyState message="No articles yet." cta={{ label: "Go Home", href: "/" }} />;
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">All Articles</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map(a => <ArticleCard key={a.id} article={a} />)}
      </div>
    </div>
  );
}
