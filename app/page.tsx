import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Scissors, TreePine, Bug, Sprout, Flower2, Home, ArrowRight, Calendar } from "lucide-react";
import { getRecentArticles } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import ArticleCard from "@/components/ArticleCard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Lawn Care Guide – Expert Tips for a Healthy Green Lawn | LawnsGuide",
  description:
    "LawnsGuide covers lawn mowing, watering, fertilizing, pest control, landscaping, and gardening — practical guides to help you grow a lush, healthy lawn year-round.",
  alternates: { canonical: "https://lawnsguide.com" },
  openGraph: {
    title: "Lawn Care Guide – Expert Tips for a Healthy Green Lawn | LawnsGuide",
    description:
      "Practical lawn care, landscaping, and gardening guides for every season. Expert tips to grow a beautiful outdoor space.",
    url: "https://lawnsguide.com",
    type: "website",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LawnsGuide",
  url: "https://lawnsguide.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://lawnsguide.com/blog?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LawnsGuide",
  url: "https://lawnsguide.com",
  logo: "https://lawnsguide.com/icon.png",
};

const CAT_ICONS: Record<string, React.ReactNode> = {
  "lawn-care":    <Scissors size={28} />,
  "landscaping":  <TreePine size={28} />,
  "pest-control": <Bug size={28} />,
  "tree-care":    <Sprout size={28} />,
  "gardening":    <Flower2 size={28} />,
  "home-garden":  <Home size={28} />,
};

const SEASONS = [
  { label: "Spring", color: "bg-emerald-50 border-emerald-200 text-emerald-800", tip: "Aerate, overseed, and apply the first fertilizer of the year." },
  { label: "Summer", color: "bg-amber-50 border-amber-200 text-amber-800", tip: "Raise mowing height, water deeply, watch for fungal disease." },
  { label: "Fall", color: "bg-orange-50 border-orange-200 text-orange-800", tip: "Most critical for cool-season grasses — overseed + slow-release fertilizer." },
  { label: "Winter", color: "bg-blue-50 border-blue-200 text-blue-800", tip: "Clean equipment, test soil, plan amendments for spring." },
];

export default async function HomePage() {
  const articles = await getRecentArticles(7);
  const featured = articles[0];
  const recent = articles.slice(1, 7);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />

      {/* Hero */}
      <section className="relative bg-[var(--color-primary)] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_#fff_0%,_transparent_70%)]" />
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-20 md:py-28 flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-white/60 mb-4">Lawn &amp; Garden Guides</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
              Grow a Lawn You're<br />
              <span className="text-[var(--color-accent)]">Proud Of</span>
            </h1>
            <p className="text-white/75 text-lg max-w-xl mb-8 mx-auto md:mx-0">
              Practical guides on mowing, watering, fertilizing, pest control, and landscaping — everything for a lush outdoor space, every season.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
                Browse All Guides <ArrowRight size={16} />
              </Link>
              <Link href="/categories/lawn-care" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors">
                Lawn Care Tips
              </Link>
            </div>
          </div>
          {/* Stats */}
          <div className="flex md:flex-col gap-4 md:gap-6">
            {[["6", "Topic Categories"], ["100+", "Expert Guides"], ["4", "Seasons Covered"]].map(([n, l]) => (
              <div key={l} className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-center min-w-[100px]">
                <div className="text-3xl font-bold text-[var(--color-accent)]">{n}</div>
                <div className="text-xs text-white/70 mt-1 leading-tight">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-2xl font-bold mb-2 text-center">Browse by Category</h2>
        <p className="text-[var(--color-muted-fg)] text-center mb-8 max-w-xl mx-auto">Find guides for every corner of your outdoor space.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/categories/${c.slug}`}
              className="group flex flex-col items-center text-center p-5 bg-white border border-[var(--color-border)] rounded-2xl hover:border-[var(--color-primary)] hover:shadow-md transition-all">
              <div className="w-14 h-14 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-3 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                {CAT_ICONS[c.slug]}
              </div>
              <span className="font-semibold text-sm leading-tight group-hover:text-[var(--color-primary)] transition-colors">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured article */}
      {featured && (
        <section className="bg-[var(--color-muted)] py-12 px-4">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Featured Article</h2>
              <Link href="/blog" className="text-sm text-[var(--color-primary)] font-medium hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
            </div>
            <Link href={`/blog/${featured.short_title}`}
              className="group grid md:grid-cols-[1fr_1fr] gap-0 bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="relative aspect-[4/3] md:aspect-auto min-h-[280px]">
                <Image
                  src={featured.img || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&crop=center"}
                  alt={featured.title || "Featured"}
                  fill priority
                  sizes="(max-width: 960px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              <div className="p-8 flex flex-col justify-center">
                {featured.type && (
                  <span className="inline-block text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3 bg-[var(--color-primary)]/10 px-3 py-1 rounded-full w-fit">
                    {CATEGORIES.find((c) => c.slug === featured.type)?.label || featured.type}
                  </span>
                )}
                <h3 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-[var(--color-primary)] transition-colors leading-snug">
                  {featured.title}
                </h3>
                <p className="text-[var(--color-muted-fg)] leading-relaxed mb-6 line-clamp-3">{featured.description}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                  Read Article <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Recent articles */}
      {recent.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Latest Guides</h2>
            <Link href="/blog" className="text-sm text-[var(--color-primary)] font-medium hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recent.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}

      {/* Seasonal guide */}
      <section className="bg-[var(--color-muted)] py-14 px-4">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-2 justify-center">
            <Calendar size={22} className="text-[var(--color-primary)]" />
            <h2 className="text-2xl font-bold">Lawn Care by the Season</h2>
          </div>
          <p className="text-[var(--color-muted-fg)] text-center mb-8 max-w-xl mx-auto">Timing is everything. Here's what matters most each season.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SEASONS.map(({ label, color, tip }) => (
              <div key={label} className={`rounded-2xl border p-6 ${color}`}>
                <div className="font-bold text-lg mb-2">{label}</div>
                <p className="text-sm leading-relaxed opacity-80">{tip}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-[var(--color-muted-fg)]">
            Not sure where to start?{" "}
            <Link href="/categories/lawn-care" className="text-[var(--color-primary)] font-semibold hover:underline">Browse lawn care guides</Link>
            {" "}or{" "}
            <Link href="/blog" className="text-[var(--color-primary)] font-semibold hover:underline">see all articles</Link>.
          </p>
        </div>
      </section>

      {/* Editorial SEO content */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-14">
        <div className="max-w-none">
          <h2 className="text-2xl font-bold mb-4">Why a Healthy Lawn Starts With the Right Knowledge</h2>
          <p className="text-[var(--color-muted-fg)] leading-relaxed mb-4">
            A beautiful lawn doesn't happen by accident. It takes consistent care — the right mowing height, a reliable watering schedule, timely fertilization, and knowing how to spot trouble before it spreads. Whether you're dealing with a patchy backyard or maintaining a lush garden, the principles are the same: understand your grass type, respect the seasons, and act before small problems become expensive ones.
          </p>
          <p className="text-[var(--color-muted-fg)] leading-relaxed mb-4">
            LawnsGuide cuts through the noise. We focus on practical, actionable guides — from{" "}
            <Link href="/categories/lawn-care" className="text-[var(--color-primary)] hover:underline font-medium">seasonal lawn care schedules</Link>{" "}
            to{" "}
            <Link href="/categories/pest-control" className="text-[var(--color-primary)] hover:underline font-medium">identifying and eliminating lawn pests</Link>.
            Every guide is designed to give you a clear next step, not just general advice.
          </p>
        </div>
      </section>
    </>
  );
}
