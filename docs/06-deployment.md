# Deployment guide (Phase 11)

This guide explains, step by step, how to put the new Jivo Mart site on the internet **safely**.
Nothing here has been done yet. The old WordPress site keeps running until you approve the switch.

Words used:
- **Staging** = a private test copy of the new site on the internet (for example `new.shop.jivo.in`). Customers do not see it.
- **Production** = the real site customers use (`shop.jivo.in`).
- **DNS** = the setting that decides which server a domain name points to.
- **Environment variables** = secret settings (passwords, keys) given to the server, never written in the code.

## 1. What you need before starting

| Item | Where to get it | Why |
|---|---|---|
| A PostgreSQL database | Neon (neon.tech, free tier is enough to start) or Supabase, or Postgres on a Hostinger VPS | Stores products, carts, orders, customers |
| A hosting account | **Vercel (recommended)** or a VPS (Hostinger VPS, DigitalOcean) | Runs the Next.js site |
| Razorpay API keys | Razorpay Dashboard → Settings → API Keys (use **Test mode** first) | Online payments |
| Razorpay webhook secret | Razorpay Dashboard → Settings → Webhooks | Confirms payments even if the customer closes the browser |
| SMTP email login | Hostinger mail (smtp.hostinger.com, port 465) or any email provider | Order emails, password emails, contact form |
| Access to the domain's DNS | Wherever jivo.in is managed (Hostinger hPanel) | To point shop.jivo.in to the new site |
| A full backup of the old site | Hostinger hPanel → Backups, plus phpMyAdmin export | Safety first (see section 2) |

## 2. Backup the old site first (do this before anything else)

1. Hostinger hPanel → **Files → Backups** → generate a new backup and download it (files + database).
2. hPanel → **Databases → phpMyAdmin** → select the WordPress database → **Export** → "Quick" → SQL → Go. Keep the `.sql` file safe.
3. Download `public_html/wp-content/uploads` (all product images and media) as a zip.
4. WooCommerce exports for migration (WP-Admin):
   - **Customers**: WooCommerce → Customers (or Users → export plugin) → CSV.
   - **Orders**: WooCommerce → Orders → Export (WooCommerce "Order Export" or "Customer / Order / Coupon Export" plugin) → CSV.
   - **Coupons**: Marketing → Coupons → export.
   - **Reviews**: Products → Reviews (or the Customer Reviews plugin export) → CSV.
5. Store these files somewhere private (they contain customer data). **Never** put them in a public folder or a public git repository.

## 3. Create the database

**Neon (simplest):**
1. Create a project at neon.tech → region **Asia Pacific (Singapore) or Mumbai** if available (closest to India).
2. Copy the connection string, it looks like `postgres://user:password@host/dbname?sslmode=require`.
3. On your PC, in the `shop` folder, create the tables and load the products:

```bash
# PowerShell
$env:DATABASE_URL="postgres://...your connection string..."
npm run db:migrate
npm run db:seed
```

This creates all tables, loads the 32 products, categories, pages, blog posts, coupons, shipping zones and one admin user (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env.local`). **Change the admin password right after the first login** (My account → Account details).

## 4. Deploy on Vercel (recommended)

1. Put the `shop` folder in a **private** GitHub repository (do not commit `.env.local` – it is already in `.gitignore`).
2. vercel.com → Add New Project → import the repository → Framework: Next.js (auto).
3. Add the environment variables (Project → Settings → Environment Variables):

| Name | Example / note |
|---|---|
| `DATABASE_URL` | the Neon connection string |
| `AUTH_SECRET` | a long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NEXT_PUBLIC_SITE_URL` | `https://new.shop.jivo.in` for staging, `https://shop.jivo.in` for production |
| `ALLOW_INDEXING` | `false` on staging, `true` on production only |
| `TRUSTED_IP_HEADER` | the one header your host sets with the real visitor IP: empty on Vercel, `cf-connecting-ip` behind Cloudflare, `x-real-ip` behind your own Nginx. Needed so visitors cannot fake their IP to dodge the login and form limits. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_test_...` (test) → later `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | from Razorpay (secret – never share) |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you type when creating the webhook |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | email settings |
| `MAIL_FROM` | `Jivo Mart <info@jivo.in>` |
| `MAIL_ADMIN` | where new-order and contact emails go |

4. Deploy. Vercel builds the site and gives a URL like `jivo-mart.vercel.app`.
5. Add the staging domain: Vercel → Project → Domains → `new.shop.jivo.in`, then add the CNAME record Vercel shows you in Hostinger DNS.

**Videos:** the product videos are in `public/media/videos` (about 177 MB). They deploy with the site. If you prefer a CDN (Cloudflare R2, S3), upload the folder and set `NEXT_PUBLIC_MEDIA_URL` to its address.

## 5. Set up Razorpay

1. Razorpay Dashboard (Test mode) → Settings → **Webhooks** → Add new webhook:
   - URL: `https://new.shop.jivo.in/api/razorpay/webhook/`
   - Secret: any long random text (same value as `RAZORPAY_WEBHOOK_SECRET`)
   - Events: `payment.captured`, `payment.failed`, `order.paid`
2. Settings → **Payment capture** → automatic capture (recommended).
3. Place a test order on staging with a Razorpay test card / test UPI. Check: the order appears in `/admin/orders/` as *Processing*, the confirmation email arrives, stock and coupon usage update.
4. When everything is approved, switch the dashboard to **Live mode**, create live keys and a live webhook with the production URL, and update the environment variables.

## 6. Test on staging (checklist)

Use `docs/08-comparison-report.md` as the checklist. At minimum:
- Every page opens on phone, tablet and computer.
- Search, filters, sorting, pagination work.
- Add to cart, change quantity, remove, coupon JIVO200, shipping for a Delhi PIN and an outside-Delhi PIN.
- Checkout with a Razorpay test payment, failed payment, closed payment window.
- Register, login, lost password email, change password, addresses, order history, track order.
- Contact form and newsletter (check the emails arrive).
- Admin: change an order to *Shipped* with tracking, edit a price, approve a review.
- Run Lighthouse: `npm run audit:lighthouse -- https://new.shop.jivo.in`.

## 7. Import customers and orders (after the staging test)

```bash
# point to the PRODUCTION database
$env:DATABASE_URL="postgres://..."
npx tsx scripts/import-woocommerce.ts --customers exports/customers.csv --orders exports/orders.csv --coupons exports/coupons.csv --reviews exports/reviews.csv --dry-run
# read the summary, then run again without --dry-run
npx tsx scripts/verify-migration.ts --live
```

WordPress passwords cannot be copied (different encryption). Customers set a new password with "Lost your password?" or you can send everyone a set-password email with `--send-invites` (only after the new site is live).

## 8. Go live (switch the domain)

1. Pick a quiet time (early morning, weekday). Announce a short maintenance window if you want.
2. In the old WordPress admin, put WooCommerce in maintenance mode so no new orders arrive there; export the last orders and import them (section 7).
3. Vercel → Domains → add `shop.jivo.in`. In Hostinger DNS change the `shop` record to what Vercel shows (CNAME `cname.vercel-dns.com` or the A record). DNS changes take from a few minutes up to a few hours.
4. Set `NEXT_PUBLIC_SITE_URL=https://shop.jivo.in` and `ALLOW_INDEXING=true`, switch Razorpay to live keys and the live webhook URL, redeploy.
5. Check: home page, one test order with a small real payment (refund it after), emails, `https://shop.jivo.in/sitemap.xml`, `https://shop.jivo.in/robots.txt`.
6. Google Search Console: submit the new sitemap; watch "Pages" for errors for 2 weeks. The spam URLs return "410 Gone", which tells Google to remove them faster.

## 9. After go-live

- Keep the old WordPress files and database backup for at least 3 months, but **take the hacked WordPress site offline** (it is still a security risk).
- Change the WordPress admin passwords and any keys that were used on the old server (Razorpay keys, email passwords), because the old site was hacked.
- Daily database backups: Neon keeps history automatically (point-in-time restore); on a VPS use `pg_dump` with a cron job.

## 10. Alternative: Hostinger VPS (if you prefer not to use Vercel)

1. Ubuntu VPS → install Node.js 24, PostgreSQL 16, Nginx, and PM2.
2. Copy the project, create `.env.production.local` with the variables above, `npm ci && npm run db:migrate && npm run db:seed && npm run build`.
3. `pm2 start npm --name jivo-mart -- start` (port 3000) and an Nginx reverse proxy with HTTPS (Let's Encrypt / certbot) for `shop.jivo.in`.
4. Put Cloudflare (free) in front for a CDN.
