# 08 – Security review

Date: 2026-10-14. A read-only review of the whole app, plus a few safe test requests against the local production build. Nothing was sent to the live site.

**Result:** no High-severity problems. The 2 Medium problems are fixed. 4 of the 8 Low problems are fixed. The other 4 are listed below with a recommendation.

## What is protected (checked and fine)

| Area | How it is protected |
|---|---|
| Admin area | Every admin page and every admin action checks the admin login on the server. Roles are read from the database on every request. |
| Other customers' data | Orders, addresses, wishlist, cart and account changes always use the logged-in user's id. The thank-you page needs the owner or a random 24-byte key. Track-order needs order number **and** email. |
| Prices and totals | Always calculated on the server. The browser cannot change prices, shipping or coupon amounts. |
| Payments (Razorpay) | Signature checked with a timing-safe compare. Payment amount, currency and status re-checked with Razorpay. Webhook signature checked over the raw body. An order can only be marked paid once. |
| Passwords | scrypt hashes. Reset tokens: random, stored only as a hash, expire after 1 hour, single use. A reset or password change logs out other devices. |
| Cookies | `HttpOnly`, `SameSite=Lax`, `Secure` in production. |
| Cross-site requests (CSRF) | All state-changing API routes reject foreign `Origin` / `Sec-Fetch-Site: cross-site`. Server Actions have Next.js's own origin check. |
| Injection | All SQL goes through Drizzle with parameters. User text (reviews, contact, orders) is shown as plain text. Emails escape user values. CSV export guards against Excel formulas. |
| Secrets | No secret values in the browser code (`.next/static` checked). `.env*` and `.data/` are in `.gitignore`. |
| Private pages | Cart, checkout, account, admin and order pages send `Cache-Control: private, no-store`. Public cached pages contain no customer data. |
| Old WordPress URLs | `src/proxy.ts` only returns 410/301 responses; it has no security role. |

## Findings

| # | Severity | Problem | Status |
|---|---|---|---|
| M1 | Medium | Visitors could fake their IP with headers like `CF-Connecting-IP` and so dodge the "too many tries" limits and the login lockout. | **Fixed.** `src/lib/http.ts` now trusts only one header, set by `TRUSTED_IP_HEADER` (on Vercel: `x-vercel-forwarded-for`). See `docs/06-deployment.md`. |
| M2 | Medium | The example `AUTH_SECRET` from `.env.example` was accepted in production, and a missing secret fell back to a known string on staging. Someone knowing the secret can make an admin login cookie. | **Fixed.** `src/lib/auth/session.ts` refuses a missing secret, one shorter than 32 characters, or one containing "change-me". The dev fallback only works for local `next dev`. |
| L1 | Low | No HSTS and no Content-Security-Policy header. | **HSTS added** (`next.config.ts`). CSP: **to do before launch**, start in report-only mode and test with Razorpay checkout. |
| L2 | Low | The HTML cleaner for product descriptions (`RichText`) can be bypassed. Only admins write this HTML, so it matters only if an admin account is stolen. | **Open.** Recommended: use `sanitize-html` when an admin saves product HTML. |
| L3 | Low | Anyone could get the "Verified owner" badge on a review by typing a real buyer's email. | **Fixed.** The badge is only given when the reviewer is logged in and their account has a paid order with that product. |
| L4 | Low | Logout only deleted the cookie in the browser; a stolen cookie kept working for up to 14 days. Changing the email did not log out other devices. | **Fixed.** Logout and email change now bump `sessionVersion`, which makes every old cookie invalid (logout ends the session on all devices). |
| L5 | Low | Emails are not verified on register or email change (same as WooCommerce). | **Accepted** (same as the old site). Optional later: confirmation link. |
| L6 | Low | Someone who knows a customer's email can lock their login for 15 minutes with 20 wrong passwords. | **Open.** Optional later: CAPTCHA or slow-down instead of a hard block. |
| L7 | Low | Coupon use limits are counted when an order is paid, so two orders at the same moment could both use a one-time coupon (same kind of race as stock). | **Open.** Fix together with the stock race: count the use atomically when the order is placed. |
| L8 | Low | Anyone can add someone else's email to the newsletter or back-in-stock list (no confirmation email). | **Open.** Recommended before sending marketing mail: double opt-in. |

## Known and accepted earlier

- The rate limiter keeps its counts in memory, so on hosting with many server copies it is weaker. The login lockout itself uses the database.
- Stock can be oversold if two people buy the last pack at the same moment.
- The "not an admin" page returns status 200 instead of 403 (it shows no admin data).

## Before launch (security checklist)

1. Set a new random `AUTH_SECRET` (at least 32 characters) in the hosting settings, never the example value.
2. Set `TRUSTED_IP_HEADER` to match the host (empty on Vercel).
3. Use Razorpay **live** keys and a webhook secret only in the hosting settings, never in the code.
4. Change the seed admin password (`SEED_ADMIN_PASSWORD`) or create the real admin and remove the seed one.
5. Add a Content-Security-Policy (report-only first).
