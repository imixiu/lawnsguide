import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getArticleBySlug, getRelatedArticles } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import ArticleCard from "@/components/ArticleCard";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

const getCachedArticle = unstable_cache(
  (slug: string) => getArticleBySlug(slug),
  ["article-by-slug-type"],
  { revalidate: 3600 }
);

const getCachedRelated = unstable_cache(
  (id: number, type: string) => getRelatedArticles(id, type),
  ["related-articles-type"],
  { revalidate: 3600 }
);

export async function generateMetadata({ params }: { params: Promise<{ type: string; slug: string }> }): Promise<Metadata> {
  const { type, slug } = await params;
  const article = await getCachedArticle(slug);
  if (!article) return {};
  return {
    title: article.title ?? undefined,
    description: article.description ?? undefined,
    alternates: { canonical: `/${type}/${slug}` },
    openGraph: { title: article.title ?? undefined, description: article.description ?? undefined, images: article.img ? [article.img] : [] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ type: string; slug: string }> }) {
  const { slug } = await params;
  const article = await getCachedArticle(slug);
  if (!article) notFound();

  const related = article.type && article.id ? await getCachedRelated(article.id, article.type) : [];
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

        <div
          className="[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-[var(--color-foreground)] [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-[var(--color-foreground)] [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_p]:mb-5 [&_p]:leading-7 [&_a]:text-[var(--color-primary)] [&_a]:underline [&_a:hover]:text-[var(--color-primary-dark)] [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-5 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-5 [&_li]:mb-2 [&_li]:leading-7 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-primary)] [&_blockquote]:pl-4 [&_blockquote]:my-6 [&_blockquote]:text-[var(--color-muted-fg)] [&_blockquote]:italic [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_table]:text-sm [&_thead]:bg-[var(--color-primary)] [&_th]:text-white [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_td]:px-4 [&_td]:py-3 [&_td]:border-b [&_td]:border-[var(--color-border)] [&_code]:bg-[var(--color-muted)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_pre]:bg-[var(--color-muted)] [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-6 [&_hr]:border-[var(--color-border)] [&_hr]:my-8 [&_strong]:font-semibold [&_strong]:text-[var(--color-foreground)] [&_em]:italic"
          dangerouslySetInnerHTML={{ __html: article.body || "" }}
        />
      </div>

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
