import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Terms of Service — LawnsGuide`,
  description: `Terms of service for lawnsguide.com.`,
};

export default function TermsOfServicePage() {
  return (
    <div className="static-page">
      <div className="static-page-inner">
        <h1>Terms of Service</h1>
        <p className="last-updated">Last updated: June 2026</p>
        <section><h2>1. Acceptance</h2><p>By using lawnsguide.com you agree to these Terms.</p></section>
        <section><h2>2. Use of Content</h2><p>Content is for informational purposes. Share with attribution. Reproducing substantial portions without permission is prohibited.</p></section>
        <section><h2>3. No Professional Advice</h2><p>Information is general only. We make no warranties about completeness or reliability.</p></section>
        <section><h2>4. User Conduct</h2><p>Do not use unlawfully, attempt unauthorized access, interfere with functionality, or scrape without permission.</p></section>
        <section><h2>5. Intellectual Property</h2><p>All content is owned by or licensed to LawnsGuide.</p></section>
        <section><h2>6. Limitation of Liability</h2><p>We shall not be liable for indirect or consequential damages to the fullest extent permitted by law.</p></section>
        <section><h2>7. Changes</h2><p>We may update these Terms. Continued use constitutes acceptance.</p></section>
        <section><h2>8. Contact</h2><p>Questions? Visit our <a href="/contact">Contact page</a>.</p></section>
      </div>
    </div>
  );
}
