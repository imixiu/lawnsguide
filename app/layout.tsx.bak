import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AplusTracker from "@/components/AplusTracker";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lawnsguide.com"),
  verification: {
    google: ["LF0EkL5hrd-mZ58GiiubfUJcruHZT2WuaCahORivC_Q", "9AQKfZBrs6H-eY48LF6Qok51JIvOZjEY7zPCHCXVEU8"],
    other: { "msvalidate.01": "46A263D9F5B5B42F858E448A6A9C5D16" },
  },
  other: { "aplus-core": "aplus.js", "aplus-waiting": "MAN" },
  title: { default: "LawnsGuide – Lawn Care & Gardening Tips", template: "%s | LawnsGuide" },
  description: "Expert lawn care, landscaping, pest control, and gardening guides to help you grow a beautiful outdoor space.",
  openGraph: { type: "website", siteName: "LawnsGuide", locale: "en_US", images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ['/og-image.png'] },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <Script id="aplus" strategy="afterInteractive">{`window.APLUS_CONFIG={pid:'seo_vertical'};(function(w,d,s,q){w[q]=w[q]||[];var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.id='beacon-aplus';j.setAttribute('exparams','userid=&aplus&sidx=aplusSidex&ckx=aplusCkx');j.src='//g.alicdn.com/alilog/mlog/aplus_v2.js';j.crossorigin='anonymous';f.parentNode.insertBefore(j,f);})(window,document,'script','aplus_queue');var q=(window.aplus_queue||(window.aplus_queue=[]));q.push({action:'aplus.setPageSPM',arguments:['a27h9','46134557']});`}</Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-95PY8PSZ0Y" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-95PY8PSZ0Y');
        `}</Script>
      </head>
      <body className="flex flex-col min-h-dvh">
        <AplusTracker />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
