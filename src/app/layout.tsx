import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

/* New heritage look: Playfair Display for headings, DM Sans for everything else (both variable fonts, one file per style). */
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
/* Not preloaded: on slow phones the heading files would compete with the banner image (LCP). Headings show in Georgia first. */
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap", preload: false });

/* Search engines may index the site only when ALLOW_INDEXING=true (production). Local and staging copies stay out of Google. */
const allowIndexing = process.env.ALLOW_INDEXING === "true";

/*
 * Icons, the web manifest and the default Open Graph image come from files in src/app
 * (favicon.ico, icon.png, apple-icon.png, manifest.ts, opengraph-image.png), so they are not listed here.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.homeTitle, template: `%s – ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { siteName: SITE.name, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image", site: "@jivo_wellness" },
  robots: allowIndexing
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
    : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0F4526",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${dmSans.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
