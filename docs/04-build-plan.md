# Phase 4–8 build guide (read this before writing code)

> **CORRECTION (header, 13 Oct 18:55):** On the old site the desktop **"Shop" mega menu** is NOT the 8 oil tiles. It is a white panel (see `ui-megamenu__desktop__01.png`): left grey column with two white rounded buttons "Login" and "Register" and a "QUICK LINKS" list (Shop All, FAQ's, Contact Us, Blogs); right grey column "ALL PRODUCTS" with big white rounded buttons (icon + label) "SUPER OILS", "SUPER JUICES", "SUPER FOODS", "SPECIAL OFFERS" that expand to the product lists (same groups/items as `home.json` mobileMenu.groups). The **8 oil tiles + the "DEAL OFFER / GET UP TO 55% OFF" banner belong to the SEARCH POPUP** under the trending searches (see `ui-search-popup__desktop__01.png`; data: home.json megaMenu.items + megaMenu.banner).


This file is the shared handbook for everyone building pages for the new Jivo Mart site.
The goal: rebuild shop.jivo.in **as close to the original design as possible**, with every
button and form really working, fast, accessible and SEO friendly.

Project folder: `C:\Users\khushwinder singh\Desktop\chat bot\shop` (Windows; Git Bash and PowerShell available).

## 1. Stack (versions are installed – check types in node_modules when unsure)

| Thing | Version / note |
|---|---|
| Next.js | **16.4** App Router, Turbopack. Bundled docs: `node_modules/next/dist/docs/`. **Read the relevant doc before using an API you are unsure about.** |
| React | 19.3 (Server Components by default; add `"use client"` only where needed). `useActionState` for forms with server actions. |
| Tailwind CSS | 4.3 (CSS-first config in `src/app/globals.css` `@theme`). No tailwind.config.js. |
| DB | PostgreSQL via Drizzle ORM 0.45. Local dev uses PGlite (`./.data/pglite`). Schema: `src/lib/db/schema.ts`. |
| Validation | zod 4 |
| Auth | own: scrypt passwords + signed JWT cookie (`jose`) |
| Carousel | `embla-carousel-react` (wrapped by `src/components/ui/Carousel.tsx`) |
| Email | nodemailer (`src/lib/email.ts`); in dev without SMTP the email is saved to `.data/outbox/*.html` |

### Next.js 16 rules that differ from older versions (important)
- `params` and `searchParams` are **Promises**: `export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; }`. Same for `generateMetadata`.
- `cookies()`, `headers()`, `draftMode()` are async (`await cookies()`).
- `next/image`: the `priority` prop is **deprecated** – use `preload` (or `loading="eager"` / `fetchPriority="high"`) for the LCP image only. Local images in `/public` need `width`/`height` or `fill`. Image sizes for local files are in `src/content/image-sizes.json` (helper `imageSize(url)` in `src/lib/catalog.ts`). Allowed `quality` is the default only (75) unless added to `images.qualities` – do not pass `quality`.
- `middleware.ts` is renamed **`proxy.ts`** (`export function proxy(request)`).
- `revalidateTag(tag, "max")` needs a second argument. Prefer `revalidatePath(path)`.
- We do **not** use `cacheComponents` / `"use cache"`. Caching = the previous model: `unstable_cache` (already used in `src/lib/catalog.ts`), route segment config (`export const revalidate = 600`), `generateStaticParams`.
- `next lint` is gone; run `npx eslint <files>`.
- `trailingSlash: true` is on. **Every internal link and fetch URL must end with `/`** (use `routes` / `api` from `src/lib/routes.ts`). Query strings go after the slash: `/shop/?s=canola`.

### Rendering rules for speed
- Storefront pages (home, shop, category, product, content) must not read cookies on the server, so they stay cacheable. Logged-in state and cart come from the browser via `useCart()` (`cart.user`).
- Product pages: `export const revalidate = 600;` + `generateStaticParams` returning `[]` (pages are generated on first visit, then cached). Read `?attribute_pa_capacity=` in a **client** component with `useSearchParams()` wrapped in `<Suspense>` (never `searchParams` on the server for product pages).
- Shop/category/search pages use `searchParams` (they are dynamic) – fine, the data comes from the cached catalog.
- Cart, checkout, my-account, admin: dynamic (they read cookies). Never cache private data publicly.
- Only the first visible hero/product image gets `preload`. Everything else lazy. Videos: `preload="none"`, start playing only when in view.
- Avoid adding client-side libraries. Ask (in your final report) before needing a new npm package – **do not run `npm install`** yourself.

## 2. Money, URLs, data
- Money is **paise** (integer). Display with `formatPaise(paise)` from `src/lib/pricing.ts` → "₹1,899.00". The old site always showed 2 decimals except the home "In The Spotlight" cards (`₹1209`).
- URLs: `src/lib/routes.ts` (`routes.product(slug)`, `routes.category(slug)`, `routes.cart`, …) and API paths in `api`.
- Site constants (contact, social links, address): `SITE` in `src/lib/site.ts`.
- Indian states list / phone / PIN helpers: `src/lib/india.ts`.
- Seeded content JSON: `src/content/*.json` (home.json has every home/menu/search-popup text and image path; faqs.json; posts.json; products.json is the seed source).

## 3. Shared code you should use (do not rewrite or edit these unless you own them)

| File | What it gives you |
|---|---|
| `src/lib/catalog.ts` | `getAllProducts()`, `getProductBySlug(slug)`, `getProductsBySlugs([])`, `getCategoryProducts(slug, limit)`, `getProductsByTag(tag)`, `getFeaturedProducts()`, `listShopCards(query)` (shop/category/search grid with filters, sort, pagination), `searchSuggestions(q)`, `getCategories()`, `getCategory(slug)`, `getProductReviews(productId)` → `{reviews, summary}`, `getPage(slug)`, `getPosts()`, `getPost(slug)`, `variationCard(p, v)`, `productCard(p)`, `selectVariation(product, searchParams)`, `imageSize(url)` |
| `src/lib/types.ts` | `ProductDetail`, `ProductSummary`, `VariationView`, `ProductCardData`, `ListingQuery/Result`, `SORT_OPTIONS`, `CartView`, `CartLine`, `ReviewView`, `PostView`, `PageView`, `SearchSuggestion` |
| `src/lib/pricing.ts` | `formatPaise`, `discountPercent`, coupon/shipping maths (pure functions) |
| `src/lib/cart.ts` (server) | `getCartView()`, `getCartTotals(db, cart, destination?)` (single source of truth for totals), `findCart(db,{create,user})`, `addToCart`, `setCartQty`, `applyCoupon`, `removeCoupon`, `setCartDestination`, `mergeCartsAfterLogin`, `clearCart(db, cartId)`, `CartError` |
| `src/components/cart/CartProvider.tsx` (client) | `useCart()` → `{ cart, loading, busy, drawerOpen, openDrawer, closeDrawer, refresh, addItem(variationId, qty, {openDrawer}), updateItem, removeItem, applyCoupon(code), removeCoupon, setShipping(state, postcode), notify(kind, text) }`. `cart.user` = logged-in customer or null. |
| `src/components/cart/AddToCartButton.tsx` | client button: adds a variation, or links to the product ("Select options"/"Read more") |
| `src/components/product/ProductCard.tsx` | card in 3 styles: `variant="classic" | "shop" | "carousel"` |
| `src/components/product/WishlistButton.tsx` | `WishlistButton`, `CompareButton` |
| `src/lib/client/saved-lists.ts` | `useWishlist(userId)`, `useCompare()` (browser storage, wishlist syncs to account) |
| `src/components/ui/*` | `Icon`, `Price`, `Stars`, `SectionTitle` (script-font headline with dashed lines), `Breadcrumbs`, `Marquee`, `Carousel`, `LottieIcon`, `RichText` (render DB HTML), `Toasts` |
| `src/components/seo/JsonLd.tsx` + `src/lib/seo.ts` | `pageMetadata({title, description, path, image})`, `productJsonLd`, `breadcrumbJsonLd`, `organizationJsonLd`, `websiteJsonLd`, `faqJsonLd`, `articleJsonLd`, `absoluteUrl` |
| `src/lib/auth/actions.ts` (server actions) | `loginAction`, `registerAction`, `logoutAction`, `lostPasswordAction`, `resetPasswordAction` (all `(prevState, formData)`, use with `useActionState`; form field names: `username`, `password`, `rememberme`, `redirect`; `email`; `user_login`; `token`, `password_1`, `password_2`) |
| `src/lib/auth/session.ts` (server) | `getSessionUser()`, `requireUser()`, `requireAdmin()`, `createSession`, `destroySession` |
| `src/lib/auth/accounts.ts` | `ensureCustomerAccount(email, name, phone)` (checkout "create account") |
| `src/lib/email.ts`, `src/lib/email-templates.ts` | `sendMail`, `adminEmail()`, templates for order confirmation, admin new order, status update, back in stock, contact message, password emails |
| `src/lib/http.ts` | `json`, `errorJson`, `rejectCrossSite(request)` (call first in every POST/PUT/PATCH/DELETE route), `readJson(request, zodSchema)`, `clientIp()` |
| `src/lib/rate-limit.ts` | `rateLimit(key, limit, windowMs)` – use on every public form endpoint |
| `src/lib/db/index.ts` | `getDb()` (server only), `schema` |
| `src/lib/settings.ts` | `getSettings()` (cached) / `readSettings()` (live) |
| `src/components/product/WaitlistForm.tsx` + `POST /api/waitlist/` | out-of-stock message + "Join waiting list" form: `<WaitlistForm productId={..} variationId={..} compact />` |
| `GET /api/products/?ids=1,2,3` | product cards + pack list for client pages (wishlist, compare) |

Design tokens (Tailwind classes from `globals.css`): `bg-primary` (#0F4526 dark green), `bg-accent` (#FFCB42 yellow), `bg-blue` (#2E3A84), `bg-teal` (#005E52), `text-ink` (#222), `text-body` (#555), `text-muted` (#7A7A7A), `border-line` (#e1e1e1), `text-[var(--color-active)]` (#a4004f crimson: prices/active), `bg-onsale` (#c62828), `bg-surface`. Fonts: `font-heading` (Qanelas), default body Lato, `font-robo` (Roboto), Leckerli One via `SectionTitle` or `style={{fontFamily:"var(--font-leckerli)"}}`. Helper classes: `site-container` (1170px), `wide-container` (1650px), `btn btn-primary|btn-outline|btn-accent|btn-dark`, `field`, `label`, `badge-sale`, `prose-shop`.

## 4. Reference material from the old site (use it – the brief says "match the original")
Scratch folder (read-only references): `C:\Users\KHUSHW~1\AppData\Local\Temp\claude\c--Users-khushwinder-singh-Desktop-chat-bot\e87316b2-02c7-46dc-97d3-c8f39bff6cac\scratchpad` (below: `$REF`).

- **Screenshots of the old site** (look at them with the Read tool): `$REF\shots\old_slices\<page>__<desktop|tablet|mobile>__NN.png` (each slice ≤1400 px tall). Pages: `home`, `shop`, `category-super-oils`, `category-special-offers`, `product-rich-rice-bran`, `product-rich-a2-ghee`, `product-standard-coconut`, `product-outofstock-apple`, `cart-empty`, `cart-with-item`, `checkout`, `my-account`, `lost-password`, `track-order`, `wishlist`, `search-canola`, `blog-post`, `ui-search-popup`, `ui-account-panel`, `ui-cart-panel`, `ui-mobile-menu`, `ui-megamenu`. Full-size originals in `$REF\shots\old\`.
- **Structure dumps** (every widget in order with its text, links, images): `$REF\audit\widgets\*.txt` (header, footer, home, mobile-menu, shop-archive, product-rich-rice-bran, product-standard-coconut, cart, checkout, my-account, track-order) and `*.text.txt` (readable page text incl. form fields).
- **Exact CSS per element** (colours, font sizes, paddings, grid columns): `$REF\audit\digests\*.txt` (home, header, footer, product-rich, product-standard, archive, mobile-menu, kit, cart, checkout, track-order, blogs, contact). Elementor ids in the dumps match the ids in the digests.
- Raw HTML (large): `$REF\audit\home.html`, `$REF\audit\pages\*.html`, `$REF\audit\products2\<slug>.html`, `$REF\audit\cartflow\checkout.html`; theme CSS files `$REF\audit\css\theme\*`.
- Audit summary: `docs/01-audit.md` (what every page contains), `docs/03-data-inventory.md`.

Things on the old site we deliberately do **not** copy (they were broken or misleading): spam pages/posts, the theme-demo contact page text ("30 South Avenue San Francisco"), WordPress sample policy text, footer links to jivo.in pages that return 404 (link to our own pages instead), fake "54 people are viewing this product" / "6 items sold in last 3 hours" counters (false urgency is not allowed under India's Dark Patterns Guidelines 2023 – leave them out), the duplicated card bug in /shop/ pagination.

## 5. How to check your work (no `next build`, no second dev server, no `npm install`)
- A dev server is already running at **http://localhost:3100** (hot reload). Do not stop it. If it does not answer, start it with `cd "<project>" && npx next dev -p 3100` in the background (if the port is busy, someone else started it – wait and retry).
- Type check: `npx tsc --noEmit -p .` and look only at errors in **your** files (others may be mid-edit).
- Lint: `npx eslint <your files or folders>`.
- Runtime: `curl -s -o NUL -w "%{http_code}" http://localhost:3100/<path>/` should be 200 (404 where expected). Read the dev server log at `.data/dev-server.log` for errors from your routes.
- Visual check (required for UI work): `node scripts/screenshot.mjs --url http://localhost:3100/<path>/ --out "$REF\shots\new\<your-area>" --name <name> --viewports desktop,mobile` then slice with `python -X utf8 -I "$REF\scripts\slice.py" "$REF\shots\new\<your-area>" "$REF\shots\new\<your-area>\slices" 1400` and compare the slices with the old ones side by side. Fix differences in layout, spacing, colours, fonts, text.
- **Do not** run `npm run db:seed`, `db:reset`, `db:migrate`, or open `./.data/pglite` from a script while the dev server runs (PGlite allows one process). Do not edit `src/lib/db/schema.ts` – if you need a schema change, write it in your report.
- Do not edit files outside your ownership list. If a shared file has a bug or is missing something you need, work around it inside your own files and describe the needed change in your report.

## 6. Accessibility and quality bar
- Semantic HTML (header/nav/main/footer, one `h1` per page, lists for menus), labels for every input, visible focus styles, buttons are `<button>`, links are `<a>`/`<Link>`.
- Keyboard: drawers/modals trap focus while open, close on `Esc`, return focus to the opener; menus open on click and keyboard (not hover only).
- Images: meaningful `alt` (product name + pack size), decorative images `alt=""`.
- Forms: server-side validation (zod), clear error messages next to fields and in an `aria-live` region, disabled submit while pending, honeypot field + rate limit on public forms.
- No `console.log` left behind, no `any` unless unavoidable, no dead buttons (every button does something real or is removed).
- Every page: `export const metadata` or `generateMetadata` using `pageMetadata()` with the right canonical path (with trailing slash).

## 7. Who owns what (parallel build)
| Area | Owner | Files |
|---|---|---|
| Header, mega menu, search popup, account panel, mini-cart drawer, mobile menu, mobile bottom bar, footer + newsletter, cookie notice, back to top | layout | `src/components/layout/**`, `src/app/(store)/layout.tsx`, `src/app/api/newsletter/**` |
| Home page | home | `src/app/(store)/page.tsx`, `src/components/home/**` |
| Shop, categories, search, filters, product cards | catalog | `src/app/(store)/shop/**`, `src/app/(store)/product-category/**`, `src/components/catalog/**`, `src/components/product/ProductCard.tsx` (styling only – keep its props) |
| Product page (both templates), reviews | product | `src/app/(store)/product/**`, `src/components/product/**` (except ProductCard.tsx, WishlistButton.tsx, WaitlistForm.tsx), `src/app/api/reviews/**` |
| Cart page, checkout, Razorpay, order received | checkout | `src/app/(store)/cart/**`, `src/app/(store)/checkout/**`, `src/components/checkout/**`, `src/lib/checkout/**`, `src/lib/razorpay.ts`, `src/app/api/checkout/**`, `src/app/api/razorpay/**` |
| My account, wishlist page, compare page, track order | account | `src/app/(store)/my-account/**`, `src/app/(store)/wishlist/**`, `src/app/(store)/compare/**`, `src/app/(store)/track-order/**`, `src/components/account/**`, `src/lib/account/**`, `src/app/api/track-order/**` |
| FAQ, contact, about, blog, policy pages | content | `src/app/(store)/faq/**`, `src/app/(store)/contact-us/**`, `src/app/(store)/about-us/**`, `src/app/(store)/blogs/**`, `src/app/(store)/[slug]/**`, `src/components/content/**`, `src/app/api/contact/**` |
| Admin area | admin | `src/app/admin/**`, `src/components/admin/**`, `src/lib/admin/**` |
| SEO files, proxy, icons | seo | `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/manifest.ts`, `src/proxy.ts`, `src/app/icon.*`, `src/app/apple-icon.*`, `src/app/favicon.ico`, `src/app/opengraph-image.*`, metadata fields in `src/app/layout.tsx` |
| Tests, migration scripts, Lighthouse script | qa | `tests/**`, `vitest.config.ts`, `playwright.config.ts`, `scripts/import-woocommerce.ts`, `scripts/verify-migration.ts`, `scripts/lighthouse.mjs`, `scripts/fixtures/**` |
