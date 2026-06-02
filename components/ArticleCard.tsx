import Link from "next/link";
import Image from "next/image";
import { Article } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

export default function ArticleCard({ article }: { article: Article }) {
  const cat = CATEGORIES.find(c => c.slug === article.type);
  return (
    <article className="group flex flex-col bg-white border border-[var(--color-border)] rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/blog/${article.short_title}`} className="block relative aspect-[16/9] overflow-hidden bg-[var(--color-muted)]">
        <Image
          src={article.img || `https://placehold.co/800x450/2d6a2d/ffffff?text=${encodeURIComponent(article.title || 'Article')}`}
          alt={article.title || "Article"}
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </Link>
      <div className="p-4 flex flex-col flex-1">
        {cat && (
          <Link href={`/categories/${cat.slug}`}
            className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wide mb-2 hover:underline">
            {cat.label}
          </Link>
        )}
        <Link href={`/blog/${article.short_title}`}>
          <h2 className="font-bold text-base leading-snug mb-2 group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
            {article.title}
          </h2>
        </Link>
        <p className="text-sm text-[var(--color-muted-fg)] line-clamp-2 flex-1">{article.description}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted-fg)]">
          <span>{article.author}</span>
          {article.published_time && (
            <time dateTime={article.published_time}>
              {new Date(article.published_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </time>
          )}
        </div>
      </div>
    </article>
  );
}
