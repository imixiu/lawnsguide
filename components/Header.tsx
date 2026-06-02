'use client';
import { useState } from "react";
import Link from "next/link";
import { Menu, X, Leaf } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[var(--color-border)] shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-[var(--color-primary)]">
          <Leaf size={22} />
          LawnsGuide
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
          <Link href="/blog" className="hover:text-[var(--color-primary)] transition-colors">Blog</Link>
          <div className="relative group">
            <Link href="/categories" className="hover:text-[var(--color-primary)] transition-colors">Categories</Link>
            <div className="absolute top-full left-0 hidden group-hover:block bg-white border border-[var(--color-border)] rounded-lg shadow-lg py-2 min-w-[180px] z-50">
              {CATEGORIES.map(c => (
                <Link key={c.slug} href={`/categories/${c.slug}`}
                  className="block px-4 py-2 text-sm hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/authors" className="hover:text-[var(--color-primary)] transition-colors">Authors</Link>
          <Link href="/about" className="hover:text-[var(--color-primary)] transition-colors">About</Link>
        </nav>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(o => !o)} className="md:hidden p-2 rounded-md hover:bg-[var(--color-muted)] cursor-pointer" aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <nav className="absolute top-16 left-0 right-0 bg-white border-b border-[var(--color-border)] shadow-lg px-4 py-4 flex flex-col gap-1"
            onClick={e => e.stopPropagation()}>
            {[
              { href: "/", label: "Home" },
              { href: "/blog", label: "Blog" },
              { href: "/categories", label: "Categories" },
              ...CATEGORIES.map(c => ({ href: `/categories/${c.slug}`, label: `  · ${c.label}` })),
              { href: "/authors", label: "Authors" },
              { href: "/about", label: "About" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors text-sm font-medium">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
