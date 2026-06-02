import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getArticleBySlug, getRelatedArticles } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import ArticleCard from "@/components/ArticleCard";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title ?? undefined,
    description: article.description ?? undefined,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title: article.title ?? undefined, description: article.description ?? undefined, images: article.img ? [article.img] : [] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const related = article.type && article.id ? await getRelatedArticles(article.id, article.type) : [];
  const cat = CATEGORIES.find(c => c.slug === article.type);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: article.img,
    datePublished: article.published_time,
    dateModified: article.modified_time,
    author: { "@type": "Person", name: article.author },
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="max-w-[800px] mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-[var(--color-muted-fg)] mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-[var(--color-primary)]">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-[var(--color-primary)]">Blog</Link>
          {cat && (<><span>/</span><Link href={`/categories/${cat.slug}`} className="hover:text-[var(--color-primary)]">{cat.label}</Link></>)}
        </nav>

        {cat && (
          <Link href={`/categories/${cat.slug}`}
            className="inline-block text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wide mb-3 hover:underline">
            {cat.label}
          </Link>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">{article.title}</h1>
        <div className="flex items-center gap-3 text-sm text-[var(--color-muted-fg)] mb-8">
          {article.author && <Link href={`/authors/${article.author}`} className="hover:text-[var(--color-primary)] font-medium">{article.author}</Link>}
          {article.published_time && (
            <time dateTime={article.published_time}>
              {new Date(article.published_time).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </time>
          )}
        </div>

        {article.img && (
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-8">
            <Image src={article.img} alt={article.title || "Article"} fill priority sizes="(max-width: 960px) 100vw, 800px" className="object-cover" />
          </div>
        )}

        <div className="article-body prose max-w-none" dangerouslySetInnerHTML={{ __html: article.body || "" }} />
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-16 max-w-[1280px]">
          <h2 className="text-xl font-bold mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.slice(0, 3).map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
