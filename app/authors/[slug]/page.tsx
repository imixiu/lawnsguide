import { notFound } from "next/navigation";
import Image from "next/image";
import { getAuthorBySlug, getAllArticles } from "@/lib/db";
import ArticleCard from "@/components/ArticleCard";
import EmptyState from "@/components/EmptyState";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return {};
  return {
    title: author.name ?? undefined,
    description: author.description ?? undefined,
    alternates: { canonical: `/authors/${slug}` },
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();
  const all = await getAllArticles();
  const articles = all.filter(a => a.author === slug);
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-[var(--color-muted)]">
          <Image
            src={author.img || `https://placehold.co/192x192/2d6a2d/ffffff?text=${encodeURIComponent((author.name || 'A')[0])}`}
            alt={author.name || "Author"}
            fill sizes="96px"
            className="object-cover"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{author.name}</h1>
          {author.description && <p className="text-[var(--color-muted-fg)] max-w-xl">{author.description}</p>}
        </div>
      </div>
      <h2 className="text-xl font-bold mb-6">Articles by {author.name}</h2>
      {articles.length === 0
        ? <EmptyState message="No articles by this author yet." cta={{ label: "Browse All", href: "/blog" }} />
        : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
      }
    </div>
  );
}
