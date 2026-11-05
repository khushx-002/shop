# Phase 9 – Data migration plan

What has to move from the old WordPress/WooCommerce site to the new database, what is already done,
and what still needs access that only Jivo has.

## 1. Status at a glance

| Data | Status | How |
|---|---|---|
| Products (32), pack sizes (38), prices, stock flags, categories, brands | **Done** | Captured from the public pages + public Store API on 13 Oct 2026, saved in `src/content/products.json`, loaded by `npm run db:seed` |
| Product images (386 files) and videos (34 files) | **Done** | Downloaded from `wp-content/uploads` into `public/images` and `public/media/videos` |
| Product page content (benefits, FAQs, comparison, stories, …) | **Done** | Parsed from the Elementor product pages |
| Reviews shown on product pages (114 unique) | **Done (partial)** | Only the newest 10 per product are public. The full history needs the export below |
| Home page, menus, footer texts | **Done** | `src/content/home.json` |
| FAQ answers | **Done** | Saved before the FAQ page was overwritten by spam (`src/content/faqs.json`) |
| Blog posts (3 real ones) | **Done** | `src/content/posts.json`; the ~90,000 spam posts are deliberately **not** migrated |
| Policy pages | **Rewritten** | The old pages were WordPress sample text; new texts are in `src/content/pages.ts` (built from the real FAQ policy answers and jivo.in's privacy policy). **Jivo must review them** |
| Customers | **Waiting for export** | needs WP-Admin or database access |
| Orders and order history | **Waiting for export** | needs WP-Admin or database access |
| Coupons (full rules) | **Partly known** | JIVO200 and JIVO100 exist (both were expired on the old site). Exact rules need the export |
| Shipping rules | **Needs confirmation** | Only Delhi NCR had rates (flat ₹100, free from ₹999). All other states had **no** shipping option on the old site. The new site uses the same rule for all of India until Jivo confirms (editable in `/admin/shipping/`) |
| Tax rules | **Nothing to migrate** | The old shop had no tax configured; prices are final |
| Payment settings | **Needs keys** | Razorpay keys and webhook secret from the Razorpay dashboard |

## 2. Exports to request from whoever manages WordPress

1. **Database backup** (`.sql` from phpMyAdmin) – the safest single source.
2. **Customers CSV** – email, first name, last name, phone, billing and shipping address.
3. **Orders CSV** – order number, date, status, customer email, billing/shipping address, line items (product/variation id, SKU, name, quantity, line total), discount, shipping total, order total, payment method, Razorpay payment id if available.
4. **Coupons CSV** – code, discount type, amount, minimum/maximum spend, expiry date, usage limit, usage count.
5. **Reviews CSV** – product id, author, email, rating, text, date, status.

The expected column names are listed at the top of `scripts/import-woocommerce.ts`, and sample files are in `scripts/fixtures/`.

## 3. Import steps

```bash
# 1) always try a dry run first – nothing is written
npx tsx scripts/import-woocommerce.ts --customers exports/customers.csv --orders exports/orders.csv --coupons exports/coupons.csv --reviews exports/reviews.csv --dry-run

# 2) real import (safe to run again: records are matched by their old WooCommerce id, email or code)
npx tsx scripts/import-woocommerce.ts --customers exports/customers.csv --orders exports/orders.csv --coupons exports/coupons.csv --reviews exports/reviews.csv

# 3) check that products, pack sizes, prices and stock match (and optionally the live old shop)
npx tsx scripts/verify-migration.ts
npx tsx scripts/verify-migration.ts --live
```

Notes:
- With the local database, stop `npm run dev` first (the local database allows one program at a time). With `DATABASE_URL` set this is not needed.
- **Passwords cannot be migrated**: WordPress stores passwords with a different method. Customers keep their email; they set a new password with "Lost your password?". After go-live you may send everybody a "set your password" email with `--send-invites`.
- Old order numbers are kept, so customers can still find their orders in "My account" and "Track order".

## 4. URLs (SEO) – nothing gets lost

| Old URL | New URL | How |
|---|---|---|
| `/` | `/` | same |
| `/shop/`, `/shop/page/N/` | same | same |
| `/product-category/<slug>/` (+ `/page/N/`) | same | same |
| `/product/<slug>/` (incl. `?attribute_pa_capacity=...`) | same | same, the pack size is pre-selected |
| `/shop/<product-slug>/` (old menu links) | `/product/<slug>/` | 301 redirect (`next.config.ts`) |
| `/shop/?filter_cat=<slug>` | `/product-category/<slug>/` | 301 redirect |
| `/?s=x&post_type=product`, `/shop/?s=x` | `/shop/?s=x` | same / 301 |
| `/cart/`, `/checkout/`, `/my-account/...`, `/wishlist/`, `/track-order/` | same | same |
| `/faq/`, `/contact-us/`, `/about-us/`, `/privacy-policy/`, `/refund_returns/`, `/blogs/` | same | same (with real content now) |
| 3 real blog posts `/<slug>/` | same | same |
| spam: `/category/*`, `/tag/*`, `/author/*`, `/etheme_*/*`, `/staticblocks/*`, `/wp-sitemap-*.xml`, spam posts | — | **410 Gone** (tells Google to drop them) or 404 |
| `/product-tag/*`, `/brand/*` | `/shop/` | 301 redirect |
| `/wp-sitemap.xml` | `/sitemap.xml` | 301 redirect |

## 5. Verification checklist after import

- Product count 32, pack sizes 38, the 13 visible products and their prices equal the old Store API (`verify-migration.ts --live`).
- Number of customers and orders in `/admin/` equals the WooCommerce counts.
- Open 5 random old orders in `/admin/orders/` and compare totals, items and addresses with WooCommerce.
- A migrated customer can use "Lost your password?" and then sees their old orders under "My account → Orders".
