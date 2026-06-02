import Link from "next/link";
import { Leaf } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export default function Footer() {
  return (
    <footer className="bg-[var(--color-primary-dark)] text-white mt-auto">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-3">
            <Leaf size={20} /> LawnsGuide
          </Link>
          <p className="text-sm text-white/70 max-w-xs leading-relaxed">
            Expert lawn care, landscaping, and gardening guides to help you grow a beautiful outdoor space.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wider mb-3 text-white/80">Categories</h3>
          <ul className="space-y-2">
            {CATEGORIES.slice(0, 4).map(c => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="text-sm text-white/70 hover:text-white transition-colors">{c.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wider mb-3 text-white/80">Quick Links</h3>
          <ul className="space-y-2">
            {[
              { href: "/blog", label: "All Articles" },
              { href: "/authors", label: "Our Authors" },
              { href: "/about", label: "About Us" },
              { href: "/contact", label: "Contact" },
            ].map(item => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-white/70 hover:text-white transition-colors">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 text-xs text-white/50">
          © {new Date().getFullYear()} LawnsGuide. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
