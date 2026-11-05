/**
 * /robots.txt
 *
 * Indexing is OFF unless the environment variable ALLOW_INDEXING is exactly "true".
 * This keeps local, preview and staging copies out of Google. Production must set
 * ALLOW_INDEXING=true (at build time AND run time – the file can be prerendered at build).
 */
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, "");
  if (process.env.ALLOW_INDEXING !== "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // Private or per-visitor pages.
        "/cart/",
        "/checkout/",
        "/my-account/",
        "/admin/",
        "/api/",
        "/wishlist/",
        "/compare/",
        // Endless URL variants (search results, sorting, add-to-cart links).
        "/*?s=",
        "/*&s=",
        "/*?orderby=",
        "/*add-to-cart=",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
