import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about LawnsGuide and our mission to help homeowners grow beautiful lawns.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">About LawnsGuide</h1>
      <div className="prose max-w-none text-[var(--color-foreground)]">
        <p className="text-lg text-[var(--color-muted-fg)] mb-6 leading-relaxed">
          LawnsGuide is your trusted resource for lawn care, landscaping, and gardening knowledge.
          We help homeowners and garden enthusiasts grow beautiful, healthy outdoor spaces.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-3">Our Mission</h2>
        <p className="text-[var(--color-muted-fg)] leading-relaxed">
          We believe everyone deserves a beautiful lawn. Our team of lawn care experts and
          horticulturists create practical, science-backed guides covering everything from
          basic mowing techniques to advanced landscaping design.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-3">What We Cover</h2>
        <ul className="space-y-2 text-[var(--color-muted-fg)]">
          <li>Lawn care and maintenance schedules</li>
          <li>Landscaping design and hardscaping</li>
          <li>Pest and weed control strategies</li>
          <li>Tree and shrub care</li>
          <li>Vegetable and flower gardening</li>
          <li>Seasonal outdoor living tips</li>
        </ul>
      </div>
    </div>
  );
}
