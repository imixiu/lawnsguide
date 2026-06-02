import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the LawnsGuide team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="text-[var(--color-muted-fg)] mb-10">
        Have a question or want to contribute? We'd love to hear from you.
      </p>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="flex items-start gap-4 p-6 bg-[var(--color-muted)] rounded-xl">
          <Mail className="text-[var(--color-primary)] mt-1 flex-shrink-0" size={20} />
          <div>
            <h2 className="font-semibold mb-1">Email</h2>
            <p className="text-sm text-[var(--color-muted-fg)]">hello@lawnsguide.com</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-6 bg-[var(--color-muted)] rounded-xl">
          <MapPin className="text-[var(--color-primary)] mt-1 flex-shrink-0" size={20} />
          <div>
            <h2 className="font-semibold mb-1">Location</h2>
            <p className="text-sm text-[var(--color-muted-fg)]">United States</p>
          </div>
        </div>
      </div>
    </div>
  );
}
