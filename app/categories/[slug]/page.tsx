import { notFound } from "next/navigation";
import { getArticlesByType } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import ArticleCard from "@/components/ArticleCard";
import EmptyState from "@/components/EmptyState";
import type { Metadata } from "next";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { CATEGORIES } = await import("@/lib/categories");
  return CATEGORIES.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES.find(c => c.slug === slug);
  if (!cat) return {};
  return {
    title: cat.label,
    description: cat.description,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORIES.find(c => c.slug === slug);
  if (!cat) notFound();
  const articles = await getArticlesByType(slug);
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">{cat.label}</h1>
      <p className="text-[var(--color-muted-fg)] mb-8">{cat.description}</p>
      {articles.length === 0
        ? <EmptyState message="No articles in this category yet." cta={{ label: "Browse All", href: "/blog" }} />
        : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
      }
    </div>
  );
}
