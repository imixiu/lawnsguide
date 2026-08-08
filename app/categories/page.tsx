import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string }> }): Promise<Metadata> {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const base: Metadata = {
    title: page > 1 ? `Categories - Page ${page}` : "Categories",
    description: "Browse lawn care and gardening articles by category.",
    alternates: { canonical: page > 1 ? `/categories?page=${page}` : "/categories" },
  };
  if (page > 1) {
    base.robots = { index: false, follow: true };
  }
  return base;
}

export default function CategoriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Categories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map(c => (
          <Link key={c.slug} href={`/categories/${c.slug}`}
            className="group p-6 bg-white border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)] hover:shadow-md transition-all">
            <h2 className="text-lg font-bold mb-2 group-hover:text-[var(--color-primary)] transition-colors">{c.label}</h2>
            <p className="text-sm text-[var(--color-muted-fg)]">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
