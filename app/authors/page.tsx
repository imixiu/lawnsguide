import Image from "next/image";
import Link from "next/link";
import { getAllAuthors } from "@/lib/db";
import EmptyState from "@/components/EmptyState";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "Authors",
  description: "Meet the lawn care and gardening experts behind LawnsGuide.",
  alternates: { canonical: "/authors" },
};

export default async function AuthorsPage() {
  const authors = await getAllAuthors();
  if (!authors.length) return <EmptyState message="No authors yet." cta={{ label: "Go Home", href: "/" }} />;
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Our Authors</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {authors.map(a => (
          <Link key={a.id} href={`/authors/${a.slug}`}
            className="group flex flex-col items-center text-center p-6 bg-white border border-[var(--color-border)] rounded-xl hover:shadow-md hover:border-[var(--color-primary)] transition-all">
            <div className="relative w-20 h-20 rounded-full overflow-hidden mb-4 bg-[var(--color-muted)]">
              <Image
                src={a.img || `https://placehold.co/160x160/2d6a2d/ffffff?text=${encodeURIComponent((a.name || 'A')[0])}`}
                alt={a.name || "Author"}
                fill sizes="80px"
                className="object-cover"
              />
            </div>
            <h2 className="font-bold text-base group-hover:text-[var(--color-primary)] transition-colors">{a.name}</h2>
            {a.description && <p className="text-xs text-[var(--color-muted-fg)] mt-2 line-clamp-2">{a.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
