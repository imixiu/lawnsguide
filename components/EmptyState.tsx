import Link from "next/link";

export default function EmptyState({ message, cta }: { message: string; cta?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <p className="text-[var(--color-muted-fg)] text-lg mb-4">{message}</p>
      {cta && (
        <Link href={cta.href}
          className="inline-block px-5 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-light)] transition-colors">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
