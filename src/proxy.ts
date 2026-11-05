/**
 * Request proxy (Next.js 16 name for "middleware").
 *
 * Its only job: clean up URLs left over from the old, hacked WordPress site.
 *  - 410 Gone for spam / WordPress-internal URL families, so Google drops them quickly
 *    (410 is a stronger "removed for good" signal than 404).
 *  - 301 for old WooCommerce URLs that have a sensible new home.
 *
 * The matcher below is deliberately tight: the proxy never runs for normal pages
 * (/, /shop/, /product/..., /product-category/..., /<blog-or-policy-slug>/), static files,
 * images or API routes. Other old-URL redirects live in next.config.ts (they run before this).
 */
import { NextResponse, type NextRequest } from "next/server";

const GONE_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Page removed – Jivo Mart | Store</title></head>' +
  '<body style="font-family:system-ui,sans-serif;text-align:center;padding:60px 16px;color:#222">' +
  '<h1 style="font-size:24px">This page has been removed.</h1>' +
  '<p><a href="/" style="color:#0F4526">Go to the Jivo Mart home page</a></p></body></html>';

function gone(): NextResponse {
  return new NextResponse(GONE_HTML, {
    status: 410,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

/** Paths whose whole family is gone (first path segment). */
const GONE_PREFIXES = [
  "/category/",
  "/tag/",
  "/author/",
  "/etheme_mega_menus/",
  "/etheme_slides/",
  "/staticblocks/",
  "/etheme_portfolio/",
  "/wp-admin/",
  "/wp-json/",
  "/wp-content/",
  "/wp-includes/",
];
const GONE_FILES = /^\/(xmlrpc\.php|wp-login\.php|wp-sitemap-(posts|taxonomies|users)-[^/]*\.xml)\/?$/;

function redirect301(request: NextRequest, pathname: string, search = ""): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url, 301);
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  // Normalise so "/category/x" and "/category/x/" behave the same.
  const path = pathname.endsWith("/") ? pathname : pathname + "/";

  if (GONE_FILES.test(pathname) || GONE_PREFIXES.some((p) => path.startsWith(p))) return gone();

  // Old product tag / brand archives -> shop.
  if (path.startsWith("/product-tag/") || path.startsWith("/brand/")) return redirect301(request, "/shop/");

  if (pathname === "/") {
    // Old "add to cart" links: /?add-to-cart=21214 -> cart page (we never add items from a GET link).
    if (searchParams.has("add-to-cart")) return redirect301(request, "/cart/");
    // Old WooCommerce product search: /?s=canola&post_type=product -> /shop/?s=canola
    const q = searchParams.get("s");
    if (q !== null && searchParams.get("post_type") === "product") {
      return redirect301(request, "/shop/", `?s=${encodeURIComponent(q)}`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Spam / WordPress families (with or without a trailing slash and sub-paths).
    "/(category|tag|author|etheme_mega_menus|etheme_slides|staticblocks|etheme_portfolio)/:path*",
    "/(wp-admin|wp-json|wp-content|wp-includes)/:path*",
    "/(xmlrpc\.php|wp-login\.php)",
    "/(wp-sitemap-posts-.*|wp-sitemap-taxonomies-.*|wp-sitemap-users-.*)",
    // Old WooCommerce archives.
    "/(product-tag|brand)/:path*",
    // Home page only when it carries an old query string.
    { source: "/", has: [{ type: "query", key: "add-to-cart" }] },
    { source: "/", has: [{ type: "query", key: "post_type", value: "product" }] },
  ],
};
