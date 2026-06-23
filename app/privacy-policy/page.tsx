import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Privacy Policy — LawnsGuide`,
  description: `Privacy policy for lawnsguide.com.`,
};

export default function PrivacyPolicyPage() {
  return (
    <div className="static-page">
      <div className="static-page-inner">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: June 2026</p>
        <section><h2>1. Information We Collect</h2><p>We collect information you provide directly and automatically collect visit data including IP address, browser type, and pages viewed.</p></section>
        <section><h2>2. How We Use Information</h2><p>To provide and improve content, send newsletters with consent, analyze usage, and respond to inquiries.</p></section>
        <section><h2>3. Cookies and Analytics</h2><p>We use cookies and Google Analytics. You can control cookies through browser settings.</p></section>
        <section><h2>4. Third-Party Services</h2><p>We are not responsible for the privacy practices of linked third-party websites.</p></section>
        <section><h2>5. Data Security</h2><p>We implement reasonable security measures but no internet transmission is completely secure.</p></section>
        <section><h2>6. Changes</h2><p>Updates will be posted with a revised date.</p></section>
        <section><h2>7. Contact</h2><p>Questions? Visit our <a href="/contact">Contact page</a>.</p></section>
      </div>
    </div>
  );
}
