# 09 – Old site vs new site: final comparison report

Date: 2026-10-14. Old site: shop.jivo.in (WordPress 7.1.3, WooCommerce 7.4.1, XStore theme, Elementor). New site: this folder (Next.js 16, React 19, Tailwind 4, TypeScript, PostgreSQL).

Status: **built and tested locally. Not deployed.** The live WordPress site has not been changed.

## 1. Summary

| Topic | Old site | New site |
|---|---|---|
| Phone speed (Lighthouse, home) | 17 | 81 with real slow-down (81–95 across the 6 tested pages). Lighthouse's estimate swings between 72 and 90 on localhost. |
| Desktop speed | – | 98–100 |
| Accessibility | 83 | 100 on all tested pages |
| Best practices | 75 | 100 |
| SEO | 85 | 100 (cart is "noindex" on purpose) |
| Main image shows (phone, LCP) | 25.2 s | 2.1–3.7 s (real slow-down) |
| Layout jumps (CLS) | 0.194 | 0.000–0.001 |
| Blocked time (TBT) | 6,400 ms | 110–350 ms (real slow-down) |
| Security | hacked: about 90,000 spam posts; FAQ and About pages overwritten | review done, no High findings (see `08-security.md`) |

**Target check (brief: 90+):** desktop, accessibility, best practices and SEO meet it. Phone speed meets it on the cart (95), is close on shop (89), and is **not yet met** on home, category and product pages (81–86). What is left is JavaScript run time and the time to first paint. Measure again on the real hosting/CDN before deciding on more work.

Details: `docs/reports/lighthouse/2026-10-14/summary.md`.

## 2. Pages and features

✅ = works the same as the old site (or better) · ⚠️ = works, but needs a decision or setup · ➖ = removed on purpose

| Feature | Old | New | Notes |
|---|---|---|---|
| Home page (banner slider, marquees, spotlight, range, deals, tenets, testimonials, news) | yes | ✅ | Same order and content (`src/content/home.json`). |
| Shop page, 37 pack-size cards, sorting, per-page, paging | yes | ✅ | Same old URLs (`/shop/page/2/`). |
| Category pages (Super Oils, Super Juice, Super Food, Special Offers) | yes | ✅ | Same URLs. |
| Search (header popup + results) | yes | ✅ | Live suggestions. |
| Product pages: "rich" layout (oils, ghee) and standard layout | yes | ✅ | Pack-size switch updates the image and the cart item. Like the old site, rich pages show prices inside the pack pictures; screen readers hear them too ("1 Litre, ₹189 (was ₹285)"). |
| Reviews (show, search, sort, pages, write) | yes | ✅ | New reviews wait for admin approval. Star totals keep the old site's numbers (about 50 per product) and change by one when a review is approved or removed. |
| Out-of-stock "notify me" (waiting list) | yes | ✅ | Small "Notify when available" bar like the old site; the email form opens on click. Emails are saved in admin → Waitlist. |
| Wishlist and Compare | yes | ✅ | Saved in the browser; wishlist is also saved to the account after login. |
| Mini cart drawer, cart page, coupons | yes | ✅ | JIVO200 (₹200 off from ₹5,000) works. Cart and checkout use the old small white header with the 3 steps. Like WooCommerce, no shipping cost is shown until an address is entered. |
| Shipping | Re-checked on the live checkout 2026-10-16: 130 Delhi NCR PIN codes (₹100 below ₹500, free from ₹500) + Punjab (free from ₹500, nothing below); no shipping elsewhere | ✅ | Same zones and PIN codes copied (scripts/data/shipping-zones.ts). "Rest of India" is there but disabled, like the old site. Only difference: a ₹500 cart got no shipping at all on the old site; here it is free. |
| Checkout + Razorpay payment | yes | ⚠️ | Built with server-side checks. **Needs Razorpay keys** to take real payments. |
| Cash on delivery | Delhi NCR only; Punjab shows "Sorry! COD (Cash On Delivery) is not available at the moment." | ✅ | Same: per shipping zone (Admin → Shipping), same texts. Works without Razorpay keys. |
| Order emails | yes | ⚠️ | Built. **Needs SMTP settings**; locally emails are saved in `.data/outbox`. |
| My account: login, register, lost/reset password, orders, addresses, account details | yes | ✅ | Old customer passwords cannot be copied: customers set a new one with "Lost password" (see `07-data-migration.md`). |
| Track order | yes | ✅ | Needs order number + email. |
| FAQ, About, Contact, Blogs, policy pages | hacked / demo text | ✅ | Real FAQ answers and real About text restored. **Policy texts and the address need business review.** |
| Admin area | WordPress admin | ✅ | Orders, products (price, stock, texts), coupons, shipping, customers, reviews, messages, subscribers, waitlist, settings, "Refresh store data". Cannot yet add new pack sizes or upload images (see section 6). |
| Old URLs | – | ✅ | `/shop/<product>/`, `?filter_cat=`, `/feed/`, tag and brand pages redirect (301). Spam URLs return 410 "gone", so Google drops them. |
| Sitemap, robots, structured data (Product, Breadcrumb, FAQ, Organization) | partly | ✅ | Search engines are allowed only when `ALLOW_INDEXING=true`. |
| "N people are viewing / sold in last hours" counters | yes (fake) | ➖ | Removed: fake urgency is a "dark pattern" under Indian consumer rules. |
| Spam posts and broken footer links | yes | ➖ | Removed. |

## 3. Data moved

| Data | Count | How |
|---|---|---|
| Products | 32 (13 shown in the shop), 37 sellable pack sizes + 1 out of stock | from the old site's public product data |
| Product images | 386 images, 34 videos | downloaded from the old site |
| Reviews | 114 | only 10 per product were public; star totals keep the old numbers |
| Blog posts | 3 real posts | spam left out |
| Pages | FAQ, About, Contact, 5 policy pages | |
| Customers, past orders, full coupon rules | **not moved** | need a WordPress database export; the import script is ready (`npm run import:woocommerce`, see `07-data-migration.md`) |

One problem found and fixed during testing: two old images, `Front.webp` (Soyabean 1 L) and `front.png` (Wheatgrass Mojito), had the same name apart from capital letters. On Windows they overwrote each other. Both are now stored under clear names.

## 4. Tests

| Test | Result |
|---|---|
| Type check (`tsc`) and lint | pass |
| Unit tests (`npm test`) | 122 of 122 pass |
| Browser tests (`npm run test:e2e`, against the production build) | 20 pass, 2 skipped (they need Razorpay keys) |
| Lint | clean (generated test reports in `.data/` are now skipped) |
| Lighthouse, 6 pages × phone and desktop | see section 1 |
| All main pages fit a 375px phone screen, with and without JavaScript | pass (19 pages) |
| Security checks done by hand | fake-IP trick blocked; an old login cookie stops working after logout; private pages send `no-store` |
| Admin "Refresh store data" button, review approve/delete updating the star totals | pass |

## 5. Design match

Old and new pages were compared using screenshots at desktop (1440px), tablet (1024px) and phone (390px). The differences found were then fixed:

| Fixed | Details |
|---|---|
| Cart / checkout header | Small white header with logo and the 3 steps on one line, like the old site |
| "Guaranteed Safe Checkout" badge | Shown once, not twice; none on the empty cart |
| Shipping before an address | No ₹100 line until a PIN code is known (WooCommerce behaviour) |
| Standard product page on tablet | Picture on top, details below, up to 1024px |
| Out-of-stock waiting list | Small "Notify when available" bar; form opens on click |
| Rich product buy box | Only pack choices + one "Add To Cart" button, like the old page |
| A2 / Kirpa ghee icons | Old yellow round icons |
| "Healthy Food With Great Taste!" band | Full page width again |
| Reviews | Search box, sort menu, page numbers (10 per page) |
| Blog post | "Tags:" line restored |
| Phone text size | Card, checkout and footer text sizes match the old phone sizes |
| Category card pictures | ‹ › arrows to switch between the two pictures |
| Small items | Footer social icons, shop grid pictures on tablet, Punjabi Jeera banner hidden on phones |

**Still different (needs input):**
- **Blog banner:** the wide banner above the canola blog post is missing because the image file was never downloaded. The file name is `Untitled-design-17-1024x420.png`.
- **Review sort options:** the old site had "Most Helpful", but there are no "helpful" votes, so we use Most Recent / Highest / Lowest rating.
- **Sold-out cards on the home page:** these show "Read More" instead of the old green "Add To Cart", because a sold-out product cannot be added to the cart.
- **A2 ghee page:** the old page also had yellow numbers, a yellow tagline and a cream background. These were not changed.
- **Checkout button:** it stays grey until Razorpay keys are added.

## 6. Still open

| # | What | Who |
|---|---|---|
| 1 | Razorpay live keys + webhook secret | business |
| 2 | SMTP (email) settings | business |
| 3 | Confirm shipping rules, delivery areas, store address, policy texts, marketing claims ("India's first…") | business |
| 4 | WordPress database export for customers, orders and coupon rules | business / hosting |
| 5 | Hosting choice, domain/DNS, real PostgreSQL database | business + developer |
| 6 | Admin: add new pack sizes and upload images (19 products cannot be restocked from admin yet) | developer |
| 7 | Stock and coupon-limit "race": two orders at the same moment for the last item | developer |
| 8 | Content-Security-Policy header; stronger HTML cleaner for admin text; email confirmation for newsletter/waitlist | developer |
| 9 | Rate limits are kept in server memory (weaker on hosting with many servers) | developer |

## 7. Go-live steps (need your approval)

Nothing below has been done. Each step needs your OK first.

1. Create the hosting project and a PostgreSQL database. Set the settings from `docs/06-deployment.md` (new `AUTH_SECRET`, `TRUSTED_IP_HEADER`, Razorpay, SMTP, `ALLOW_INDEXING=false`).
2. Deploy to a **staging** address. Run the import with the real WordPress export. Run `npm run verify:migration`.
3. Test a real ₹1 payment with Razorpay test mode, then live mode.
4. Business checks the pages and texts.
5. Switch DNS for shop.jivo.in, set `ALLOW_INDEXING=true`, and submit the sitemap in Google Search Console.
6. Keep the old WordPress site (offline backup) for at least 30 days.
