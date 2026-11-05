# Phase 2 - Technology choice and architecture

## 1. Recommended stack (and why)

| Layer | Choice | Why this and not something else |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | Server rendering and static generation for speed and SEO; one codebase for pages and API; required by the brief. |
| Styling | **Tailwind CSS 4** with design tokens copied from the old theme (colours, fonts, sizes) | Fast to write, tiny CSS output, no runtime cost. |
| Database | **PostgreSQL** through **Drizzle ORM** | Products, variations, carts, orders, users, coupons, shipping zones need a real relational database. Drizzle is light, type-safe and generates plain SQL migrations. |
| Local database | **PGlite** (PostgreSQL compiled to run inside Node, stored in `./.data/pglite`) | Nothing to install on this PC (no Docker, no Postgres found). Same SQL as production, so what works locally works in production. |
| Production database | Any managed PostgreSQL (Neon, Supabase, or Hostinger VPS Postgres) via `DATABASE_URL` | Switching is a one-line change; the code uses the `pg` driver when `DATABASE_URL` is set. |
| Commerce backend | **Own backend inside Next.js** (not headless WooCommerce) | The WordPress install is hacked and WooCommerce 7.4 is 3 years old. Keeping it would keep the risk and the spam. The catalog is small (32 products, 37 pack sizes), so a custom catalog with an admin area is realistic and much faster. |
| Authentication | Email + password, passwords hashed with scrypt (built into Node), signed httpOnly session cookie (JWT via `jose`), password-reset links by email, login rate limit | Secure, no third-party account needed, matches the old site's flows (register with email, password link by email). |
| Payments | **Razorpay** (the existing provider) using its REST API from the server and the Razorpay Checkout popup in the browser; payment verified with HMAC signature on the server and again through the webhook | Same provider customers already know; supports cards, UPI, net banking and EMI in India. |
| Email | SMTP through `nodemailer` (Hostinger mail or any SMTP) | Order confirmation, password reset, waiting-list, contact form, newsletter. |
| Images | Originals stored in `public/images`, served by `next/image` (automatic WebP/AVIF, responsive sizes, lazy loading) | Biggest single speed win over the old site. |
| Carousels | `embla-carousel-react` (small) | Needed for banner, product, testimonial sliders with dots and autoplay like the original. |
| Lottie icons | `lottie-web` light player, loaded only when the section scrolls into view | Keeps the three animated home-page icons without slowing first paint. |
| Tests | Vitest (unit: pricing, coupons, shipping, auth) and Playwright (end-to-end shopping journey) | Required by the brief. |
| Hosting | **Vercel** (recommended) with CDN and image optimisation built in, database on Neon. Alternative: Hostinger VPS running `next start` behind Nginx with Docker Postgres. | Simplest path to 90+ Lighthouse with global CDN. |

Simplest architecture that covers the business: one Next.js app (storefront + admin + API), one PostgreSQL database, Razorpay, SMTP. No message queues, no separate services.

## 2. How pages are rendered (speed plan)

| Page type | Rendering | Cache |
|---|---|---|
| Home, shop, category, product, blog, info pages | Static HTML generated at build and re-generated in the background (ISR) | Revalidated instantly by tag when an admin edits a product, price or stock |
| Search results | Server-rendered per request (fast DB query) | Short cache |
| Cart, checkout, account, admin | Dynamic per request, never cached publicly | Private |
| Cart drawer / counts | Small client components reading `/api/cart` | No public caching |

Private data (cart, checkout, orders, addresses) is never put in a public cache.

## 3. Folder plan

```
shop/
  docs/                      audit, plan, inventory, migration, testing, comparison reports
  drizzle/                   SQL migrations generated from the schema
  scripts/                   seed (products, content, pages), import (WooCommerce CSV), image tools
  src/app/                   routes (App Router)
    (store)/                 storefront pages sharing header/footer
      page.tsx               home
      shop/                  all products, search, filters
      product-category/[slug]/
      product/[slug]/
      cart/ checkout/ checkout/order-received/[id]/
      my-account/...         login, register, lost-password, dashboard, orders, addresses, account details
      wishlist/ compare/ track-order/ faq/ contact-us/ about-us/ blogs/ [postSlug]/
      privacy-policy/ refund_returns/ shipping-policy/ terms-conditions/
    admin/                   protected admin area
    api/                     JSON endpoints (cart, checkout, razorpay webhook, search, newsletter, contact)
    sitemap.ts robots.ts     clean SEO files
  src/components/            header, footer, product card, carousels, forms, admin UI
  src/lib/                   db (schema, client), auth, cart, pricing, shipping, coupons, razorpay, email, seo
  src/content/               seeded content JSON (products, landing page content, pages, FAQ, blog posts)
  public/images/             brand, home, products, payments, lottie
  src/app/fonts/             Qanelas + Lato font files
  tests/                     vitest unit tests, playwright e2e
```

## 4. Data model (tables)

- `users` (id, email, password_hash, name, phone, role customer/admin, created_at)
- `password_reset_tokens`, `login_attempts`
- `addresses` (user_id, type billing/shipping, full_name, company, address_1, address_2, city, state, postcode, country, phone, email, is_default)
- `categories` (id, slug, name, description, image, parent_id, sort)
- `brands` (jivo, sano)
- `products` (id, slug, name, short_description, description_html, brand_id, status, visibility, featured, tags, tagline, rating_avg, rating_count, units_sold_text, template rich/standard, seo_title, seo_description, created_at)
- `product_categories` (product_id, category_id)
- `product_images` (product_id, url, alt, sort)
- `variations` (id, product_id, sku, attribute_name, attribute_value, attribute_label, swatch_image, price, regular_price, stock_qty, manage_stock, in_stock, image, weight, sort)
- `product_content` (product_id, json: benefits, stat boxes, benefit cards, infographic images, cooking images, comparison lists, marquee claims, videos, customer stories, faqs, disclaimer)
- `reviews` (product_id, author, email, rating, text, verified, status, created_at)
- `carts` (id, user_id nullable, token, created_at, updated_at) and `cart_items` (cart_id, variation_id, qty)
- `coupons` (code, type fixed/percent/free_shipping, amount, min_spend, max_spend, expires_at, usage_limit, used_count, active) and `coupon_usages`
- `shipping_zones` (name, states[], pincode_prefixes[], sort) and `shipping_rates` (zone_id, type flat/free, label, cost, min_order_for_free)
- `orders` (id, number, user_id, email, status pending/paid/processing/shipped/completed/cancelled/failed, subtotal, discount, shipping, total, coupon_code, billing json, shipping json, notes, payment_provider, razorpay_order_id, razorpay_payment_id, tracking_number, tracking_url, created_at) and `order_items` (order_id, variation_id, product_name, variation_label, sku, qty, unit_price, line_total) and `order_events`
- `waitlist` (variation_id or product_id, email, notified_at)
- `wishlists` (user_id, product_id)
- `newsletter_subscribers`, `contact_messages`
- `pages` (slug, title, body_html) for FAQ, About, policies
- `posts` (slug, title, excerpt, body_html, cover_image, published_at)
- `settings` (key/value: free_shipping_threshold, announcement texts, contact details)

## 5. Business rules carried over

- Prices are final (no tax). Currency INR, rupee sign in front, 2 decimals.
- Sale price shown with the regular price struck through and a "Sale" badge.
- Each pack size is its own card in the shop grid; the product page shows all pack sizes as image swatches.
- Free shipping when the cart subtotal is at or above the threshold (seeded 999, editable).
- Shipping zones: seeded with the observed "Delhi NCR - Flat ₹100" zone and a "Rest of India" zone that the business must confirm (seeded as Flat ₹100 with the same free-shipping rule and flagged in the admin).
- Coupons: seeded JIVO200 (₹200 off above ₹5000, active) and JIVO100 (inactive); both editable.
- Orders are created only after Razorpay confirms payment (signature verified) or through the admin.
- Out-of-stock pack sizes cannot be added to the cart; the product page offers "Join waiting list".
- Registration by email only; a set-password link is emailed (same as old site). Passwords never stored in plain text.

## 6. Migration plan (Phase 9)

1. Backup: export the WordPress database and `wp-content/uploads` from Hostinger before anything else (hPanel > Databases > phpMyAdmin > Export; Files > uploads zip).
2. Products, variations, prices, stock, images, categories, brands, reviews shown publicly, landing-page content: already captured in this audit and seeded by `npm run db:seed`.
3. Customers, orders, full review history, coupons: import scripts read WooCommerce CSV exports (`scripts/import-woocommerce.ts`). Needs admin access. Passwords cannot be migrated (WordPress uses a different hash); customers get a "set a new password" email on first login.
4. URLs: all product, category, blog and page URLs are kept. Old `/shop/<product>/` links and `?filter_cat=` links are redirected. Spam URLs return 410.
5. Verification: `scripts/verify-migration.ts` compares product counts, variation counts, prices and stock between the captured data and the new database.
6. No change is made to the live WordPress site. Launch happens by pointing the `shop.jivo.in` DNS to the new host after sign-off.

## 7. Phase order

1. Audit (done - `docs/01-audit.md`)
2. Stack and architecture (this document)
3. Data inventory (done - `docs/03-data-inventory.md`)
4. Project setup, design tokens, fonts, database schema, seed
5. Header, footer, home page, shared components
6. Shop, categories, search, filters, product pages
7. Cart, checkout, Razorpay, shipping, coupons
8. Accounts, orders, tracking, wishlist, compare
9. Migration scripts, SEO (sitemap, robots, redirects, structured data), security pass
10. Performance and testing (Lighthouse, unit, e2e)
11. Staging review, fixes, deployment runbook

## 8. Implementation decisions taken during the build

| Decision | Why |
|---|---|
| Next.js "previous" caching model (`unstable_cache`, ISR with `revalidate`), **not** `cacheComponents` | Simpler and well documented for a team; storefront pages are static anyway because cart/login data is loaded in the browser (`/api/cart/`). |
| The catalog is loaded as one cached "snapshot" (`src/lib/catalog.ts`) and filtered in memory | With ~30 products this is faster than many small SQL queries. Cart and checkout always read live prices/stock from the database. If the catalog grows past a few hundred products, move filtering into SQL. |
| Shop grid shows one card per pack size, in the old order (`variations.shop_order`) | Same as the old site. The old site's duplicate card at the page-2 boundary (a WordPress sorting bug) is not copied. |
| Trailing slashes on every URL (`trailingSlash: true`) | Keeps every old URL identical for Google. |
| Money stored as integer paise | No rounding errors in totals. |
| Local database = PGlite in `./.data/pglite` | No database software to install on this PC. It allows only one program at a time (stop `npm run dev` before `npm run db:seed`). Production uses `DATABASE_URL`. |
| Registration asks only for an email and emails a set-password link | Same as the old WooCommerce setting. |
| Fake urgency counters removed | "54 people are viewing" / "6 items sold in last 3 hours" were random numbers on the old site. India's Guidelines for Prevention and Regulation of Dark Patterns (2023) list false urgency as a prohibited practice. |
| Old footer links to jivo.in pages that return 404 now point to the shop's own pages | Broken links hurt users and SEO. |
| Product videos stay in `public/media/videos` (177 MB) with an optional CDN switch (`NEXT_PUBLIC_MEDIA_URL`) | Works out of the box; can move to a CDN later without code changes. Videos load only when scrolled into view. |
