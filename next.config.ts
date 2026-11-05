import type { NextConfig } from "next";

/**
 * Next.js configuration for Jivo Mart.
 *
 * - Images: AVIF/WebP with responsive sizes (big speed win over the old site).
 * - Security headers on every response.
 * - Redirects keep the old WordPress URLs working (see docs/07-data-migration.md).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\" \"https://api.razorpay.com\")",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Browsers always use https for this site for 1 year (ignored on plain-http localhost).
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite loads WASM/data files from disk; bundling it breaks file paths, so load it from node_modules.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The old WordPress URLs end with "/" (e.g. /product/jivo-rice-bran-oil/). Keep them identical for SEO.
  trailingSlash: true,
  // `npm run dev` only trusts pages opened as "localhost". Opened by another address, the browser shows the
  // page but React never starts (no button works). Allow this PC's Tailscale and home-network addresses.
  // Development only: production (`next start`) ignores this.
  allowedDevOrigins: ["100.116.119.38", "192.168.1.81"],
  experimental: {
    // Let the Next.js CLI/DevTools remind us when the installed version has a security advisory.
    agentUpgrade: "security",
    // The local PGlite database can be opened by only ONE process. Without DATABASE_URL, build with a
    // single worker so prerendering never opens the database twice. Production (DATABASE_URL set) is unaffected.
    ...(process.env.DATABASE_URL ? {} : { cpus: 1, staticGenerationMaxConcurrency: 1 }),
  },
  // Pin the project root (a stray package-lock.json exists in the user home folder).
  outputFileTracingRoot: process.cwd(),
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [48, 64, 96, 128, 160, 240, 300, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Old menu links used /shop/<product-slug>/ for products.
      { source: "/shop/jivo-extra-virgin-olive-oil", destination: "/product/jivo-extra-virgin-olive-oil/", permanent: true },
      { source: "/shop/jivo-extra-light-olive-oil", destination: "/product/jivo-extra-light-olive-oil/", permanent: true },
      { source: "/shop/jivo-pomace-olive-oil", destination: "/product/jivo-pomace-olive-oil/", permanent: true },
      { source: "/shop/jivo-kachi-ghani-mustard-oil", destination: "/product/jivo-kachi-ghani-mustard-oil/", permanent: true },
      { source: "/shop/jivo-cold-press-sunflower-oil", destination: "/product/jivo-cold-press-sunflower-oil/", permanent: true },
      { source: "/shop/jivo-cold-press-groundnut-oil", destination: "/product/jivo-cold-press-groundnut-oil/", permanent: true },
      { source: "/shop/jivo-rice-bran-oil", destination: "/product/jivo-rice-bran-oil/", permanent: true },
      { source: "/shop/jivo-soyabean-oil", destination: "/product/jivo-soyabean-oil/", permanent: true },
      { source: "/shop/jivo-desi-ghee", destination: "/product/kirpa-desi-ghee/", permanent: true },
      { source: "/shop/jivo-a2-ghee", destination: "/product/jivo-a2-cow-ghee/", permanent: true },
      { source: "/shop/jivo-desi-ghee-steel-container", destination: "/product-category/super-food/", permanent: true },
      { source: "/shop/sano-pure-honey", destination: "/product-category/super-food/", permanent: true },
      { source: "/shop/jivo-organic-basmati-rice", destination: "/product-category/super-food/", permanent: true },
      // Old category filter links.
      { source: "/shop", has: [{ type: "query", key: "filter_cat", value: "(?<cat>.*)" }], destination: "/product-category/:cat/", permanent: true },
      // Old post ids / feeds / xmlrpc that spam bots hit.
      { source: "/feed", destination: "/", permanent: true },
      { source: "/comments/feed", destination: "/", permanent: true },
      { source: "/wp-sitemap.xml", destination: "/sitemap.xml", permanent: true },
    ];
  },
};

export default nextConfig;
