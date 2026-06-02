import Link from "next/link";
import Image from "next/image";
import { getAllArticles } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import ArticleCard from "@/components/ArticleCard";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const articles = await getAllArticles();
  const featured = articles.slice(0, 1)[0];
  const recent = articles.slice(1, 7);

  return (
    <>
      {/* Hero */}
      <section className="bg-[var(--color-primary)] text-white py-16 px-4">
        <div className="max-w-[1280px] mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            Your Complete Lawn Care & Gardening Guide
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
            Expert tips on lawn maintenance, landscaping, pest control, and growing a beautiful outdoor space.
          </p>
          <Link href="/blog"
            className="inline-block px-6 py-3 bg-[var(--color-accent)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
            Browse All Articles
          </Link>
        </div>
      </section>

      {/* Featured article */}
      {featured && (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-xl font-bold mb-6">Featured Article</h2>
          <Link href={`/blog/${featured.short_title}`}
            className="group grid md:grid-cols-2 gap-6 bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative aspect-[16/9] md:aspect-auto min-h-[240px] bg-[var(--color-muted)]">
              <Image
                src={featured.img || "https://placehold.co/800x450/2d6a2d/ffffff?text=Featured"}
                alt={featured.title || "Featured"}
                fill priority
                sizes="(max-width: 960px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="p-6 flex flex-col justify-center">
              {featured.type && (
                <span className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wide mb-2">
                  {CATEGORIES.find(c => c.slug === featured.type)?.label || featured.type}
                </span>
              )}
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[var(--color-primary)] transition-colors leading-snug">
                {featured.title}
              </h3>
              <p className="text-[var(--color-muted-fg)] leading-relaxed">{featured.description}</p>
              <span className="mt-4 text-sm font-semibold text-[var(--color-primary)]">Read More →</span>
            </div>
          </Link>
        </section>
      )}

      {/* Recent articles */}
      {recent.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Latest Articles</h2>
            <Link href="/blog" className="text-sm text-[var(--color-primary)] font-medium hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recent.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="bg-[var(--color-muted)] py-12 px-4">
        <div className="max-w-[1280px] mx-auto">
          <h2 className="text-xl font-bold mb-6 text-center">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(c => (
              <Link key={c.slug} href={`/categories/${c.slug}`}
                className="flex flex-col items-center text-center p-4 bg-white rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all group">
                <span className="font-semibold text-sm group-hover:text-[var(--color-primary)] transition-colors">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
