# Lighthouse summary – 2026-10-14

Base URL: http://localhost:3000 · Lighthouse 12 · mobile + desktop preset(s) · reports in this folder.

| Page | Form factor | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| / | mobile | 72 | 100 | 100 | 100 | 5.58 s | 0.000 | 119 ms |
| / | desktop | 98 | 100 | 100 | 100 | 1.00 s | 0.000 | 1 ms |
| /shop/ | mobile | 74 | 100 | 100 | 100 | 5.86 s | 0.001 | 122 ms |
| /shop/ | desktop | 100 | 100 | 100 | 100 | 0.44 s | 0.000 | 4 ms |
| /product-category/super-oils/ | mobile | 81 | 100 | 100 | 100 | 4.62 s | 0.000 | 74 ms |
| /product-category/super-oils/ | desktop | 99 | 100 | 100 | 100 | 0.90 s | 0.000 | 1 ms |
| /product/jivo-rice-bran-oil/ | mobile | 73 | 100 | 100 | 100 | 5.21 s | 0.000 | 215 ms |
| /product/jivo-rice-bran-oil/ | desktop | 100 | 100 | 100 | 100 | 0.73 s | 0.000 | 1 ms |
| /product/jivo-extra-virgin-coconut-oil/ | mobile | 78 | 100 | 100 | 100 | 4.77 s | 0.000 | 121 ms |
| /product/jivo-extra-virgin-coconut-oil/ | desktop | 99 | 100 | 100 | 100 | 0.92 s | 0.000 | 9 ms |
| /cart/ | mobile | 94 | 100 | 100 | 69 | 3.05 s | 0.019 | 65 ms |
| /cart/ | desktop | 100 | 100 | 100 | 69 | 0.61 s | 0.000 | 0 ms |

Targets: Performance ≥ 90 (mobile ≥ 80), Accessibility/Best Practices/SEO ≥ 95, LCP < 2.5 s, CLS < 0.1, TBT < 200 ms.
Old site baseline (mobile home page): Performance 17, Accessibility 83, Best Practices 75, SEO 85, LCP 25.2 s, CLS 0.194, TBT 6,400 ms.

## Notes (added after the run)

- This run used a production build with `ALLOW_INDEXING=true`, so the SEO score is the real one. `/cart/` scores SEO 69 **on purpose**: the cart is marked "noindex" so Google does not list it.
- **Two ways to measure phone speed.** The table above uses Lighthouse's default *simulated* phone: the page loads at full speed and Lighthouse estimates a slow phone. On localhost this estimate counts all JavaScript as blocking the main image, and it swings by up to ±18 points between runs (the home page scored 90 in one run and 72 in the next with no speed change). With **real slow-down** (`--throttling-method=devtools`, same phone settings), the final code gave:

| Page | Performance | First paint | Main image (LCP) | TBT | CLS |
|---|---|---|---|---|---|
| / | 81 | 2.9 s | 2.9 s | 320 ms | 0 |
| /shop/ | 89 | 2.4 s | 2.4 s | 290 ms | 0.001 |
| /product-category/super-oils/ | 86 | 2.2 s | 3.7 s | 110 ms | 0 |
| /product/jivo-rice-bran-oil/ | 86 | 2.7 s | 2.7 s | 260 ms | 0 |
| /product/jivo-extra-virgin-coconut-oil/ | 85 | 2.6 s | 2.6 s | 350 ms | 0 |
| /cart/ | 95 | 2.1 s | 2.1 s | 160 ms | 0.019 |

- **Target check:** the brief asks for 90+. Desktop: met (98–100). Accessibility, Best Practices, SEO: met (100). Phone performance: met on the cart, close on shop (89), **not yet met** on home, category and product pages (81–86). What is left is JavaScript run time (TBT 260–350 ms) and the time to first paint (HTML + 2 CSS files).
- After going live on a CDN (compressed HTML, HTTP/2, servers close to India), measure again with PageSpeed Insights. It also shows real-visitor data after about 28 days.
- Fixes made in this round:
  - Brand fonts are no longer preloaded (they competed with the banner image).
  - Lato is loaded as a small WOFF2 file from `next/font/google`.
  - Carousel slides are clipped correctly before JavaScript starts (the phone page was 1,769px wide for a moment).
  - Slider dots are rendered on the server, so they no longer cause a layout jump.
  - The bottom bar uses 4 fixed columns, so it no longer jumps.
  - The first visible images are marked `fetchpriority="high"`.
  - Contrast and tap-size fixes.
