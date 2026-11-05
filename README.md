# Jivo Mart – new online store (shop.jivo.in)

This folder is the **new version of shop.jivo.in**, rebuilt without WordPress.
It keeps the same look, products, prices, pages and URLs as the old site, but it is much faster and safer.

- Built with **Next.js 16** (React), **TypeScript**, **Tailwind CSS**, and a **PostgreSQL** database.
- Payments: **Razorpay** (same as the old site).
- Includes an **admin area** at `/admin/` to manage orders, products, prices, stock, coupons, shipping, reviews and more.

> The old WordPress site is **not touched** by anything in this folder.

---

## 1. Run the site on your computer (5 minutes)

You need **Node.js 20.9 or newer** (this PC has Node 24).

```bash
cd "C:\Users\khushwinder singh\Desktop\chat bot\shop"
npm install          # only the first time
npm run db:seed      # creates the local database and loads all products (first time, or to reset data)
npm run dev          # starts the site
```

Open **http://localhost:3000** in your browser.

- The local database is stored in the `.data` folder (no database software to install).
- Emails are **not sent** on your computer. Instead each email is saved as a file in `.data/outbox/` (open it in a browser). This is how you can test "lost password" links locally.
- Admin login: go to http://localhost:3000/my-account/ and log in with the admin email and password from `.env.local` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). Then open http://localhost:3000/admin/.

**Important:** stop `npm run dev` (press Ctrl+C) before running `npm run db:seed` again. The local database allows only one program at a time.

## 2. Settings (`.env.local`)

Copy `.env.example` to `.env.local` and fill in what you have. Nothing secret is ever written in the code.

| Setting | What it is | Needed for |
|---|---|---|
| `AUTH_SECRET` | long random text that protects login cookies | always (already filled locally) |
| `DATABASE_URL` | PostgreSQL address (empty = local database) | production |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay keys | taking payments |
| `SMTP_*`, `MAIL_FROM`, `MAIL_ADMIN` | email account | sending emails |
| `NEXT_PUBLIC_SITE_URL` | the site address | links in emails, SEO |
| `ALLOW_INDEXING` | `true` only on the real live site | Google indexing |

Without Razorpay keys the checkout still works up to the payment step and then clearly says that online payment is not configured. No fake orders are created.

## 3. Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | start the site for development (http://localhost:3000) |
| `npm run build` then `npm start` | build and run the fast production version |
| `npm run db:seed` | create/refresh the local database with the products and pages |
| `npm run db:reset` | delete the local database and seed it again from scratch |
| `npm run db:generate` | create a new database migration after changing `src/lib/db/schema.ts` |
| `npm run db:migrate` | apply migrations to the database in `DATABASE_URL` |
| `npm test` | run the automatic unit tests |
| `npm run test:e2e` | run the browser tests (the site must be running) |
| `npm run typecheck` | check the code for type errors |
| `npm run lint` | check code style |
| `npm run audit:lighthouse` | measure speed/accessibility/SEO scores (run against `npm start`) |

## 4. Where things are

```
docs/                 all reports: audit, plan, data inventory, build guide, deployment, comparison report
src/app/(store)/      the shop pages (home, shop, product, cart, checkout, my-account, ...)
src/app/admin/        the admin area
src/app/api/          small server endpoints (cart, checkout, Razorpay webhook, search, forms)
src/components/       reusable parts of the pages (header, footer, product card, ...)
src/lib/              business logic (catalog, cart, prices, coupons, shipping, login, emails, database)
src/content/          the content copied from the old site (products, home page texts, FAQ, blog posts)
public/images/        all product and page images (copied from the old site)
public/media/videos/  product page videos (copied from the old site)
scripts/              database seed/import tools, screenshot and Lighthouse tools
tests/                automatic tests
```

## 5. Going live

Read **`docs/06-deployment.md`**. It explains backups, the database, hosting (Vercel recommended), Razorpay setup, testing on a private staging address, importing customers and orders, and switching the domain safely.

## 6. Reports

| File | What is inside |
|---|---|
| `docs/01-audit.md` | everything found on the old site (pages, features, design, problems such as the hack) |
| `docs/02-architecture-plan.md` | technology choices and why |
| `docs/03-data-inventory.md` | all products, pack sizes, prices and what data still needs to be exported |
| `docs/04-build-plan.md` | the developer handbook used to build the site |
| `docs/06-deployment.md` | how to go live safely |
| `docs/08-comparison-report.md` | old site vs new site, feature by feature, with test results |
