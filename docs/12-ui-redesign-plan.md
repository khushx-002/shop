# 12 – New UI design plan (style of anshrikapure.com)

Status (this folder, 29 Oct 2026): **Phases 0–8 applied.** Phase 0 = this copy + before/after screenshots in `.data/shots/`. Phase 9 (optional new pages) not started. Phase 10: type check, lint, unit and e2e tests done; Lighthouse speed check and removing the unused old font files are still open.

## 1. Goal in one line

Give the Jivo shop the **look and feel** of https://anshrikapure.com (calm, premium, "heritage" style),
while keeping **all our features** (real cart, checkout, Razorpay, accounts, wishlist, admin) and **all our URLs** (SEO).

We copy the **style** (layout, spacing, colors approach, fonts, card shapes).
We do **not** copy their logo, photos, text or code. We use Jivo's own logo, photos and words.

---

## 2. What I studied on their site

| Page | URL | Works? | Main parts (top to bottom) |
|---|---|---|---|
| Home | `index.php` | Yes | Top bar → sticky header → full-width image slider → 4 trust cards → "Our journey" 3 numbered cards → product grid (4 cards) → sample-kit promo → seasonal banner → social feeds (Instagram / Facebook / YouTube) → 4-icon benefits bar → footer |
| Products | `products.php` | Yes | Cream hero with title → "All Products" grid (9 cards, filter by category) → sample-kit banner → benefits strip |
| Product detail | `products.php?slug=…` | **No real page** | Shows the same Products page. They have no product detail page. |
| Our Story | `story.php` | Yes | Hero → 3-chapter journey → founders → 4 values cards → big quote |
| Sourcing | `sourcing.php` | Yes | Hero → 4 trust cards → "How we source" 4 steps → banner → commitment → FAQ link |
| Quality | `quality.php` | Yes | Banner → pick a product → test-report panel → 4 "commitment" cards |
| FAQ | `faq.php` | Yes | Hero → category chips → grouped questions (accordion) → "Still have a question?" box → sample-kit promo |
| Contact | `contact.php` | Yes | Hero → info strip → form card + WhatsApp box + location → sample-kit promo → benefits |
| Cart | `cart.php` | Yes | Title → items list + "Order Summary" box (two columns) |
| Sample Kit | `sample-kit.php` | Yes | Hero → 3 kit cards (₹99 / ₹149 / custom) → delivery + notes boxes |
| Our Story (footer link), Privacy, Terms | `our-story.php`, `privacy-policy.php`, `terms.php` | **404 – broken on their site** | – |

**Fact:** they order through WhatsApp, not a real checkout. We keep our real checkout. Only the look changes.

---

## 3. Their design system (taken from their `style.css`)

### Colors

| Name | Color | Used for |
|---|---|---|
| Deep green | `#123F32` | Headings, main buttons, top bar, links |
| Footer green | `#073F32` (bottom strip `#05362B`) | Footer |
| Gold | `#B68A2A` | Accents, small lines, active slider dot, hover color |
| Cream | `#F7F2E8` | Section backgrounds, page heroes |
| Light cream | `#FBF6EB`, `#FFF8EC` | Product and journey sections |
| Brown | `#684C32` | Badges |
| Text (ink) | `#1F2A26` | Body text |
| Grey text | `#65716C` | Sub-titles, small text |
| Border | `#E6DFD1` | Card borders, lines |
| Sage | `#E9ECD8` | Benefits bar |

### Fonts (both free, from Google Fonts)

- **Playfair Display** (serif, elegant) – all headings. Sizes: H1 44–78px, H2 34–52px, H3 25px. Gold *italic* words inside headings.
- **DM Sans** (clean) – body text, buttons, menu. Line height 1.65.

### Shapes and spacing

| Thing | Value |
|---|---|
| Page width | 1160px max, 92% on small screens |
| Section space | 88px top and bottom (smaller sections 35–45px) |
| Button | 14px × 21px padding, 10px corners, bold. Three kinds: green, gold, green outline |
| Header button (cart) | Pill shape (fully round ends), green, soft shadow |
| Cards | White, 1px border `#E6DFD1`, 16–20px corners |
| Product card | 20px corners, thin gold border, cream gradient picture box with a second thin gold frame inside, lifts 5px on hover |
| Shadow | Very soft, green-tinted: `0 18px 50px rgba(18,63,50,.10)` |
| "Eyebrow" label | Small 12px gold UPPERCASE text with letter spacing, above headings |
| Gold line | 45px × 2px gold line under headings |

### Header and footer

- **Top bar:** 34px high, green, 11px text, gold link.
- **Header:** sticky, white with a little see-through blur, 88px high. Logo left, menu right.
  Menu links are 12px bold green; on hover a thin **gold line slides in** under the link.
- **Footer:** dark green, 4 columns (logo + text, quick links, products, social), darker bottom strip with copyright.

### Movement

Only gentle movement: slider fades (0.8s), cards lift on hover, link underline slides. They respect "reduce motion" settings.

### Screen sizes (breakpoints) they design for

1100px, 900px (tablet), 768px, 600px (phone), 380px / 360px (small phone).

---

## 4. Their parts → our parts (what becomes what)

| Their part | Our part today | Plan |
|---|---|---|
| Top bar | Marquee + header top | Green top bar with free-delivery text (from admin settings) |
| Sticky header with gold-underline menu | `Header`, `HeaderBar`, `ShopMenu` (mega menu), `MobileMenu` | Restyle. **Keep** our mega menu, search, account and cart drawer – only new look |
| Full-width fade slider | `HeroSlider` | Restyle arrows (round green) and dots (gold pill) |
| 4 trust cards | `InfoTiles`, `TrustStrip` | Restyle as white bordered cards with gold icons |
| "Our journey" 3 numbered cards | `CoreTenets` (already 3 items) | Restyle as 01 / 02 / 03 cards with arrows |
| Product grid | `Spotlight`, `OurRange`, `DealsOfTheWeek` | Use the new product card |
| Sample-kit promo (image + heading + button + 3 ticks) | `HealthyEconomy` band | Restyle in the same split layout |
| Seasonal banner | Juice banner inside `DealsOfTheWeek` | Restyle |
| Social feeds | `InTheNews`, `Testimonials` | Restyle in their soft framed boxes. Real social feeds = optional (Phase 9) |
| Benefits bar (4 icons, sage) | `TrustStrip` | Restyle |
| Yellow marquees | `Marquee` (×2) | **Decision needed** (see section 6) |
| Footer | `Footer`, `NewsletterForm` | Restyle to dark-green 4 columns. Keep newsletter |
| Products page | `ShopView`, `CategoryView`, sidebar, toolbar, filters, pagination | Cream hero + new cards. Keep filters and paging |
| (none – they have no product page) | `StandardProduct`, `RichProduct`, `PurchasePanel`, gallery, tabs, reviews | Use their style language: cream picture box, pack-size pills, green buttons |
| Our Story | About us page | Same structure: hero → journey → values → quote |
| FAQ | FAQ page, `FaqAccordion` | Category chips + grouped accordions + "still have a question" box |
| Contact | Contact page, `ContactForm`, `ContactBlocks` | Cream form card + info strip + WhatsApp box |
| Cart | `CartPage`, `CartDrawer` | Two columns: items + order summary box |
| Forms | `form-styles.ts` | Their input style: 13px padding, 9px corners, warm grey border |

---

## 5. Rules for the whole redesign

1. **Style only.** Do not change cart, checkout, payment, login, admin or database logic.
2. **Keep every URL** (SEO and old WordPress redirects in `next.config.ts`).
3. **Jivo content only.** No logo, photo, text or code copied from anshrikapure.com.
4. **Readable colors.** Their gold `#B68A2A` on white is only 3.1 : 1 contrast. That is too weak for small text (the rule is 4.5 : 1).
   Use gold only for big text, lines and icons. For small gold text use a darker gold, `#86651D` (5.4 : 1 on white, 4.8 : 1 on cream).
5. **Mobile first-class.** Check every phase at desktop, tablet and phone width.
6. **One phase at a time.** Finish, check, and get your OK before the next phase.
7. **Admin area (`/admin`) is not part of this redesign.**

---

## 6. Decisions needed from you (with my recommendation)

| # | Question | Recommended | Why | Other options |
|---|---|---|---|---|
| 1 | Colors | **Keep Jivo green `#0F4526` as the main color + add their gold and cream** | Looks premium like their site, but customers still see "Jivo". Their green is very close to ours anyway. | (b) Use their exact colors. (c) Keep all current colors, change only layout |
| 2 | Fonts | **Playfair Display + DM Sans** (like theirs) | The serif heading font is the biggest part of their "premium" feel | Keep Jivo's Qanelas for headings, DM Sans for text |
| 3 | Yellow marquees on home | **Remove the 2nd one, turn the 1st into the green top bar** | Their site has no moving text; it feels calmer | Keep both, restyle in cream/gold |
| 4 | New pages (Sourcing, Quality reports, Sample kit, social feeds, floating WhatsApp) | **Later (Phase 9), only if Jivo has real content** | These need real facts (test reports, kit prices). Empty pages hurt trust | Build them now with placeholder text |

---

## 7. Phases

Size: S = small, M = medium, L = large.

### Phase 0 – Safety first (S)

- **Fact:** this project folder is **not a git repository**. Today there is no easy "undo".
- Turn on git and save the current state as the first commit, so every phase can be undone.
- Take "before" screenshots of every page (desktop + phone) with `scripts/screenshot.mjs`.
- Take reference screenshots of anshrikapure.com pages.
- **Done when:** first git commit exists, before-screenshots saved.

### Phase 1 – Design foundation (M)

- `src/app/globals.css` (`@theme`): add new color tokens (green, gold, dark gold, cream, light cream, brown, ink, grey text, border, sage), shadow, corner sizes, container 1160px.
- `src/app/layout.tsx`: load **Playfair Display** and **DM Sans** with `next/font/google`. Remove fonts that are no longer used at the end (Phase 10).
- Base styles: headings in Playfair, body in DM Sans, link and focus colors.
- Shared pieces in `src/components/ui/`: buttons (green / gold / outline), eyebrow label, gold line, section heading (`SectionTitle`), card, badge, notice box.
- **Done when:** a test page shows all shared pieces correctly; type check and lint pass.
- Note: because colors and sizes are written inside each component (about 490 fixed colors, about 2,500 fixed pixel sizes), this phase alone will **not** change most pages. Phases 2–8 do that.

### Phase 2 – Header, footer and things on every page (L)

- Top bar (green, 34px, free-delivery text from admin settings).
- `Header`, `HeaderBar`: white sticky header with blur, 88px high, logo left, menu right, gold underline on hover, green pill cart button with count.
- `ShopMenu` (mega menu), `MobileMenu`, `SearchPopup`, `AccountPanel`, `CartDrawer`: new colors, fonts, corners.
- `MobileBottomBar`, `BackToTop`, `CookieNotice`, `Toasts`: new colors.
- `Footer`, `NewsletterForm`: dark-green 4 columns + darker bottom strip.
- **Done when:** every page has the new header and footer; menus work with mouse and keyboard; phone view checked.

### Phase 3 – New product card (M)

- `ProductCard` (all 3 kinds): white card, 20px corners, thin gold border, cream gradient picture box with inner gold frame, hover lift, Playfair title, price + pack size, full-width green button.
- **Extra (needs your OK):** pack-size buttons (e.g. 1 L / 5 L) and a − / + quantity box **on the card**, like theirs.
  This needs the card data to include all pack sizes and prices (`ProductCardData` in `src/lib/types.ts`, plus `components/home/data.ts` and `components/catalog/data.ts`). Without it, the card links to the product page to choose a pack (as today).
- **Done when:** cards look right on home, shop, category and related-product lists; add-to-cart still works.

### Phase 4 – Home page (L)

Follow the mapping in section 4, one section at a time:
slider → trust cards → journey cards (`CoreTenets`) → product grids → promo band (`HealthyEconomy`) → deals + seasonal banner → testimonials / news → benefits bar.
- **Done when:** home page matches the new style at all screen sizes; no layout jump while loading; speed score not worse than before.

### Phase 5 – Shop and category pages (M)

- `ShopView`, `CategoryView`, `ShopTop`, `CatalogSidebar`, `Toolbar`, `FiltersDrawer`, `Pagination`, `ListCard`, `CategoryCarousels`, `NoProducts`, `Breadcrumbs`.
- Cream hero with title + short text, category chips like theirs, new cards.
- **Done when:** filtering, sorting and paging still work; URLs unchanged.

### Phase 6 – Product page (L)

They have no product page, so we use their style language on ours:
- `ProductGallery`: big cream gradient box, 24px corners, thin gold border.
- `PurchasePanel`: pack sizes as bordered pill buttons (gold/green when selected), green "Add to cart" button, gold notice box for offers.
- `ProductTabs`, `ProductSections`, `RichProduct`, `ProductFaq`, `ProductReviews`, `VideoReels`, `StickyAddToCart`, `WaitlistForm`, `ScriptHeading`.
- **Done when:** both product page kinds (standard and rich) look right; pack change, add to cart, wishlist, reviews and waitlist still work.

### Phase 7 – Content pages (M)

- About us → their "Our Story" layout (hero → journey → values cards → quote).
- Contact → cream form card, info strip, WhatsApp box, location.
- FAQ → category chips, grouped accordions, "Still have a question?" box.
- Blogs list + blog post (`PostCard`, `BlogPostView`), policy pages (`[slug]`, `PolicyView`), track order, 404 page, `PageHeader`.
- **Done when:** all content pages use the new style; contact form and track-order still work.

### Phase 8 – Cart, checkout, account, wishlist, compare (L, careful)

- `CartPage`: two columns, items + "Order Summary" box like theirs.
- `CheckoutForm`, `CheckoutHeader`, `StepsBar`, `OrderReview`, `SafeCheckoutBox`, `Notice`, `QtyStepper`, order-received page.
- `AccountShell`, `PageBanner`, `LoginRegister`, `form-styles.ts` (their input style), orders, addresses, wishlist, compare.
- **Style only. No change to payment or order logic.**
- **Done when:** a full test order works in Razorpay **test mode**; e2e tests `cart-checkout`, `payment`, `account` pass.

### Phase 9 – Optional new pages (only with real Jivo content)

- Sourcing page, Quality / test-report page, Sample kit page, social feed section, floating WhatsApp button.
- Each one needs: real text, real photos, real prices or reports, and your approval.

### Phase 10 – Final check and clean-up (M)

- All tests: type check, lint, unit tests (`npm test`), e2e tests (`npm run test:e2e`).
- Speed: Lighthouse (`npm run audit:lighthouse`) – must not be worse than before (new fonts add a little weight).
- Accessibility: contrast, keyboard, focus outlines, screen-reader labels.
- Remove fonts and colors that are no longer used (Qanelas / Lato / Roboto / Leckerli, old tokens).
- After-screenshots of every page vs the before-screenshots from Phase 0.
- Update `docs/09-comparison-report.md`: the design no longer matches the old WordPress site – on purpose.

---

## 8. Risks

| Risk | What could happen | How we avoid it |
|---|---|---|
| No git today | A bad change cannot be undone easily | Phase 0 |
| Many fixed colors and sizes in components | Some old colors stay hidden on rare pages | Search for old color codes in Phase 10 |
| Checkout pages | A style change could hide a button or break a form | Style only, test order in test mode, e2e tests |
| Tests look for text or buttons | e2e tests may fail after renaming | Update tests only when the change is on purpose |
| Gold text too light | Hard to read, fails accessibility | Darker gold for small text (rule 4) |
| Speed | New fonts and big images slow the page | Only needed font weights, `next/image`, Lighthouse check |
| Brand | Site looks like a copy of another brand | Jivo logo, photos, text and Jivo green (decision 1) |
