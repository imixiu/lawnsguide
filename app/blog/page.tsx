import { getAllArticles } from "@/lib/db";
import ArticleCard from "@/components/ArticleCard";
import EmptyState from "@/components/EmptyState";
import type { Metadata, ResolvingMetadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string }> }): Promise<Metadata> {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const base: Metadata = {
    title: page > 1 ? `All Articles - Page ${page}` : "All Articles",
    description: "Browse all lawn care, landscaping, and gardening articles on LawnsGuide.",
    alternates: { canonical: page > 1 ? `/blog?page=${page}` : "/blog" },
  };
  if (page > 1) {
    base.robots = { index: false, follow: true };
  }
  return base;
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const perPage = 24;
  const allArticles = (await getAllArticles()).slice(0, 200);
  const start = (page - 1) * perPage;
  const articles = allArticles.slice(start, start + perPage);
  const totalPages = Math.ceil(allArticles.length / perPage);
  if (!allArticles.length) return <EmptyState message="No articles yet." cta={{ label: "Go Home", href: "/" }} />;
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">All Articles{page > 1 ? ` - Page ${page}` : ""}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map(a => <ArticleCard key={a.id} article={a} />)}
      </div>
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
          {page > 1 && (
            <a href={`/blog${page > 2 ? `?page=${page - 1}` : ""}`} className="px-4 py-2 border rounded-lg hover:bg-[var(--color-muted)] transition-colors">Previous</a>
          )}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const n = i + 1;
            return (
              <a key={n} href={n === 1 ? "/blog" : `/blog?page=${n}`}
                className={`px-3 py-2 rounded-lg ${n === page ? "bg-[var(--color-primary)] text-white" : "hover:bg-[var(--color-muted)]"}`}>
                {n}
              </a>
            );
          })}
          {page < totalPages && (
            <a href={`/blog?page=${page + 1}`} className="px-4 py-2 border rounded-lg hover:bg-[var(--color-muted)] transition-colors">Next</a>
          )}
        </nav>
      )}
    </div>
  );
}
