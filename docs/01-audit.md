# Phase 1 - Audit of shop.jivo.in (the website we are rebuilding)

Date of audit: 13 October 2026.
How it was done: every public page was downloaded and read (HTML, CSS, images, fonts), the public WooCommerce Store API was queried, a real cart was walked through the API to learn shipping, tax and payment rules, and Lighthouse was run on the live home page. Browser screenshots were not possible in this session (no Chrome window was selected), so layout facts come from the page HTML and the theme CSS, which is more exact than screenshots anyway.

Words used below:
- **WooCommerce** = the shop plugin inside WordPress that holds products, carts and orders.
- **Elementor** = the drag-and-drop page builder used for every page layout.
- **Variation** = one pack size of a product (for example "Rice Bran Oil - 5 Litres"). Each has its own price and stock.

## 1. What the old site is made of

| Part | Fact |
|---|---|
| CMS | WordPress 7.1.3 |
| Shop | WooCommerce 7.4.1 (very old, released 2023) |
| Theme | XStore 9.4.10 + xstore-child |
| Page builder | Elementor 3.24.5 + Elementor Pro 3.24.2, Premium Addons, Unlimited Elements |
| Other plugins seen | Customer Reviews for WooCommerce (CusRev), Variation Swatches, Variation Price Display, Iconic WooThumbs (gallery), Contact Form 7, Print Invoices, Independent Analytics, Conditional Shipping and Payments |
| Payments | Razorpay only (cards, UPI, net banking, EMI inside Razorpay's popup) |
| Hosting | Hostinger, LiteSpeed cache, PHP 8.3 |
| Currency | INR, prices shown with the rupee sign in front, 2 decimals |
| Tax | None configured. No tax line appears on any cart |

### 1.1 The site is hacked (important)

**Fact.** The WordPress install is compromised:
- About 90,000 spam posts exist (casino, betting, escorts) with 46 sitemap files of spam URLs.
- The FAQ page and the About Us page now show casino text instead of Jivo content.
- Spam categories, tags and pages (for example /casino-770/) are published under the Jivo domain.

**What this means for the rebuild.** We must not copy the WordPress database as it is. Only the real content (32 products, 3 blog posts, reviews, customers, orders) should be migrated, and the old site should be taken down or cleaned after launch. The real FAQ answers were saved earlier on the same day in the chatbot project (`Chat Bot/data/faqs.json`) before the page was overwritten, so they are not lost.

## 2. Page inventory

| URL on old site | What it is | State | Rebuild plan |
|---|---|---|---|
| `/` | Home page (Elementor) | OK | Rebuild exactly |
| `/shop/` | All products (Elementor archive template with banners, category tiles, filters, sorting, per-page, grid/list, carousels) | OK | Rebuild exactly |
| `/product-category/super-oils/` etc. | Category pages (4-column classic grid) | OK | Rebuild, same URLs |
| `/shop/?filter_cat=<slug>` | Category links used by the home page tiles | OK | Redirect to `/product-category/<slug>/` |
| `/product/<slug>/` | 32 product pages (12 rich landing pages, 20 standard pages) | OK | Rebuild both templates, same URLs |
| `/shop/<product-slug>/` | Old-style product links used in the mobile menu (11 links, 4 are 404) | Partly broken | Redirect to `/product/<slug>/` |
| `/cart/` | Cart page with free-shipping progress bar | OK | Rebuild |
| `/checkout/` | Checkout (login box, coupon box, billing, ship-to-different, notes, order review, Razorpay) | OK | Rebuild |
| `/checkout/order-received/` | Thank-you page (standard WooCommerce) | Not viewable without an order | Rebuild standard layout |
| `/my-account/` | Login + Register (register needs only email, password link is emailed) | OK | Rebuild |
| `/my-account/lost-password/` | Password reset | OK | Rebuild |
| `/my-account/orders/`, `/addresses/`, `/edit-account/` | Account dashboard pages (standard WooCommerce) | Needs login | Rebuild standard layout |
| `/wishlist/` | Wishlist (XStore) | OK (empty state seen) | Rebuild |
| `/my-account/?et-compare-page` | Compare products (XStore) | OK | Rebuild as `/compare/` |
| `/track-order/` | Order tracking form (Order ID + billing email) | OK | Rebuild |
| `/faq/` | FAQ page | Overwritten by spam | Rebuild from the saved FAQ answers |
| `/contact-us/` | Contact page | Theme demo text ("30 South Avenue San Francisco", broken form) | Rebuild with Jivo's real contact details and a working form |
| `/about-us/` | About page | Overwritten by spam | Rebuild with Jivo's real brand text from the home page / jivo.in |
| `/blogs/` | Blog list | Shows spam posts mixed with 3 real posts | Rebuild with only the 3 real posts |
| `/health-benefits-of-canola-oil/` and 2 more | Real blog posts | OK | Migrate, same URLs |
| `/privacy-policy/` | WordPress sample text ("Suggested text: ...") | Placeholder | Rebuild using Jivo's real privacy policy (jivo.in/privacy-policy) |
| `/refund_returns/` | WordPress sample page ("This is a sample page") | Placeholder | Rebuild using the real policy from the FAQ (food items are non-refundable, replacement within 24-48 h) |
| Footer links to jivo.in/legal/* (refund, shipping, terms, disclaimer) | | All 404 on jivo.in | Point to the new shop's own policy pages |
| `/wp-sitemap.xml`, `/robots.txt` | SEO files | Full of spam | Generate clean sitemap and robots |

## 3. Shared parts (every page)

### 3.1 Header (dark green bar, sticky)
- Background `#0F4526`, white text, 3-column grid: left = mobile menu button (tablet/phone) + "About Us" and "Contact Us" links (desktop); centre = white Jivo logo (`jivo-logo-png-.png`, about 9vh tall); right = search icon (opens a full-width search popup), account icon (opens a sign-in side panel), cart icon with count badge (opens a cart side panel).
- A "Shop" item opens a mega menu with 8 oil tiles (Canola, Groundnut, Extra Virgin Olive, Sunflower, Extra Light Olive, Mustard, Jivo Pomace Olive, Sano Pomace Olive) and a banner "Deal Offer - Get Up To 55% Off - Shop Now" (`Jivo-Oils-Megamenu-banner-1.jpg`).
- Search popup: "What Are You Looking For?", category dropdown (All categories, Special Offers, Super Food, Super Juice, Super Oils), search box, "Trending searches: canola oil, organic ghee, olive oil, basmati rice", and 4 product shortcuts (Canola, Groundnut, Extra Virgin Olive, Sunflower).
- Account panel: Login (username or email, password, remember me, lost password) and Register (email only).
- Cart panel: items, subtotal, "View cart", "Checkout", free-shipping progress "Spend ₹999.00 to get free shipping".
- Mobile off-canvas menu: logo, search box, "Shop All", "Contact us", "Account", Login/Register, QUICK LINKS (Shop All, FAQ's, Contact Us, Blogs) and an "ALL PRODUCTS" accordion grouped as Oils (12 items with thumbnails), Juices (6), Foods (5), Combos (4).
- Mobile bottom bar (XStore mobile panel): Home, Shop, Wishlist, Sign in.
- Cookie notice at the bottom: "This website uses cookies to improve your experience. By using this website you agree to our Privacy Policy. Ok, I agree".
- Back-to-top button.

### 3.2 Footer (dark background)
1. Strip "Guaranteed Safe Checkout" with 6 payment logos (Visa, Mastercard, RuPay, UPI, Net banking, Easy EMI).
2. Four columns: (a) white logo + brand text "A health-conscious brand dedicated to promoting sustainable living..." + social icons (Facebook, Twitter, Instagram, Pinterest, LinkedIn, YouTube); (b) Quick Links: Why Jivo, Our Story, Core Values, Social Initiatives, Our Resources; (c) Useful Links: Refund Policy, Shipping Policy, Terms & Conditions, Privacy Policy, Disclaimer, Contact Us; (d) "Sign up to our newsletter" email form (Contact Form 7) + "Get in Touch": info@jivo.in, "For Purchase & Order tracking-related queries:" +91 8595 349 565, address "A-35/1, Industrial Area Phase 1, Mayapuri, New Delhi - 110064".
3. Bottom line "© 2025 Jivo Mart Pvt. Ltd. | All Rights Reserved".

## 4. Home page, section by section (top to bottom)

1. **Banner slider** - 5 full-width slides 1920x521 (Canola-Oil.webp, Olive-2.webp, Combo.webp, Comidity.webp, Punjabi-Jeera banner), autoplay 3 s, dots, loop.
2. **Marquee** - "LARGEST SELLER OF CANOLA OIL IN INDIA • MORE THAN 300 CERTIFICATIONS • 100+ AWARDS & RECOGNITIONS • Pure from Nature & Free from Chemicals".
3. **Three info tiles with Lottie animations** - Fast Shipping ("Free delivery above ₹499 All Over India"), Seamless Payments ("Super convenient order placement process"), Coupons ("Get Flat 200 Off on shopping above ₹5000/- Use Code - JIVO200").
4. **In The Spotlight** ("Explore the range of our top rated products") - 4 product cards with image, name, star rating + "4.58 | (238)", old price / new price, Add to cart or "This product is currently unavailable - Join waiting list".
5. **Trust icon carousel** - Trusted by 1 Lakh+ Families, Chemical Free Products, Secure Payments, 100% Natural & Organic, Quick Support (5 per view, autoplay).
6. **Our Range** ("Explore our top four categories") - 4 image tiles 500x480: Super Oils, Super Foods, Special Offers, Super Juices, each with text and "Shop Now".
7. **Building a healthy economy together!** - headline, text "By integrating expertise and skill to innovate products which make life a healthier place", "Find out how #HealthyInnovation", button "Our Story", illustration `healthy-economy-vector.png`.
8. **Punjabi Jeera banner + Deals Of The Week** - left column with background image and "Order Now!" button; right column "Deals Of The Week" product carousel (4 per view) showing the Canola 5L + Extra Virgin 1L combo.
9. **Marquee** - "Fresh Deliveries, Doorstep Convenience • Exclusive Deals, Popular Picks • Best Products, Best Prices • ...".
10. **Our Core Tenets** - 3 cards: "Intelligence is what we believe", "Every day, nutrition matters.", "By you, we mean everyone." (grid on desktop, carousel on phone).
11. **Testimonials** ("See what our esteemed customers have to say") - 3 per view, dots, 8 customer quotes with photos (Sunita Devi and others).
12. **In The News** - 5 press cards with logos (The Hindu, FnB News, NuFFooDS Spectrum, Business Standard, YourStory) and headlines, linking to the articles (carousel on phone).

## 5. Shop and category pages

- `/shop/` top: 2 banner carousels (1900x340 and 240x300), 3 category tiles (Super Oils, Super Foods, Special Offers).
- Toolbar: sorting (Default, popularity, average rating, latest, price low-high, price high-low), grid/list switch, "Show 12 / 24 / 36 / All" per page.
- Sidebar (off-canvas on phone): Categories filter, Product status filter (in stock / on sale), price slider, product search, attribute filters.
- Grid: 3 columns on `/shop/` (Elementor widget), 4 columns on category pages, 2 on phone. **Each pack size is shown as its own card** (for example "Jivo Cold Pressed Groundnut Oil - 1+1" at ₹420), with a square "Sale" badge, category label above the title, brand under it, old/new price, "Add to cart" (adds that pack size directly) and "Add to Compare". Hovering shows the next gallery image.
- Pagination: numbered pages (`/shop/page/2/`).
- Below the grid on `/shop/`: "Super Oils", "Super Foods", "Special Offers" headings with product carousels.
- Search results use the same page (`/shop/?s=...`).

## 6. Product pages

Two layouts exist.

**A. Rich landing page (12 products: all oils except coconut and yellow mustard, plus A2 Ghee and Kirpa Desi Ghee).** Breadcrumb; gallery (main image + thumbnails, zoom); tagline "80% users felt better heart health in 30 days"; title; stars + "235 Reviews | 1.1 Lakh+ Units Sold"; expandable description; 6 benefit bullets; 4 stat boxes (#1 Top seller in India, 1L+ Families Served, 213+ 5 Star Reviews, 100% Natural & Safe); "Select Pack" with image swatches; quantity; Add to cart. Then: "In The News" logo marquee; 5 video reels; 3 recipe videos; "Follow Your Heart to a Healthy Life" benefit carousel; "6 Reasons Why..." infographic; "Healthy Food With Great Taste!" image carousel; "Why We're The Best!" vs "Other Brands" comparison; marquee of claims; "Customer Stories" Google/Amazon review cards; big infographic; "Got questions? We've got answers" (4 topic tabs + accordion); "Customer Reviews" (star summary, filter, newest 10 reviews, "Add a review" form).

**B. Standard page (20 products).** Breadcrumb with "Return to previous page"; gallery; title; stars + "4.6 (Avg. Rating)"; "Add to Wishlist"; "🔥 6 items sold in last 3 hours"; "54 people are viewing this product right now"; "Estimated delivery: 1 - 5 days"; short description; Capacity swatches; quantity; "Add to cart" and "or Buy now"; divider "100% SAFE CHECKOUT"; 4 icon boxes (Free Delivery Above ₹499, Secure Transactions, Reliable Support, Premium Quality); marquee; sticky add-to-cart bar; "Frequently Bought Together" grid; "Customer Stories"; tabs Description / Additional information / Disclaimer; Customer Reviews; "Related Products" carousel. Out-of-stock products show "This product is currently out of stock and unavailable" and a "Join waiting list" email form.

## 7. Cart, checkout, payment, shipping (verified by walking the API)

- Cart: product list (image, name, pack, price, quantity box, remove), coupon box, totals, free-shipping progress bar. Empty state: "YOUR SHOPPING CART IS EMPTY - Return To Shop".
- Checkout: steps bar (Shopping cart - Checkout - Order status); "Returning customer? Click here to login"; "Have a coupon? Click here to enter"; Billing: Full Name, Company (optional), Country (India, fixed), Street address, Apartment (optional), Town/City, State (all 36 Indian states and territories), PIN Code, Phone, Email; "Create an account?"; "Ship to a different address?" with the same address fields; Order notes; "Your order" table; payment: Razorpay ("Credit Card/Debit Card/NetBanking"); CusRev consent checkbox; "Place order"; "Guaranteed Safe Checkout" strip.
- Shipping rules found: pincodes in Delhi NCR (110xxx, 122xxx, 201xxx) get **Flat rate ₹100**; carts above ₹999 get **Free shipping** (the mini cart text confirms the 999 limit). **Every other Indian state returned no shipping method at all**, which blocks checkout. The home page promises "Free delivery above ₹499 All Over India". The business must confirm the intended rules. The new site makes zones and rates editable in the admin.
- Coupons: JIVO200 (advertised: flat ₹200 off above ₹5000) and JIVO100 exist but are **expired** on the live site.
- Tax: none. Prices are final.

## 8. Accounts

- Registration asks only for an email; WooCommerce emails a link to set the password.
- Login by username or email + password, "Remember me".
- Account pages (standard WooCommerce): Dashboard, Orders, Downloads, Addresses, Account details, Logout, plus XStore Wishlist and Compare.

## 9. Design tokens (from the Elementor kit and theme CSS)

| Token | Value |
|---|---|
| Primary green | `#0F4526` (header, buttons, sticky header) |
| Accent yellow | `#FFCB42` |
| Blue | `#2E3A84`, Maroon `#761826`, Green translucent `#00BA05CC` |
| Text grey | `#7A7A7A`, secondary `#54595F`, dark `#222222`, light border `#e1e1e1` |
| Green (prices on product page) | `#1e8556`; theme green `#2e7d32`, red `#c62828`, orange `#f57f17`, yellow `#fdd835` |
| Headings font | Qanelas (Light, Regular, SemiBold, Bold, Black) - custom font files hosted on the site |
| Body font | Roboto (kit text), Lato (theme body), Inter (some templates), Leckerli One (script accents) |
| Base text | 16px, line-height 1.6 |
| Heading sizes seen | 26px uppercase (section titles), 18-20px, 14-15px small text |
| Buttons | solid, uppercase small labels, hover inverts to white background with black text in the header |

Note on fonts: Qanelas is a commercial font. The files are on Jivo's server, so Jivo already uses it under its own licence. The new site uses the same files; please keep the licence in mind if the site moves to another company.

## 10. SEO facts to preserve

- Title pattern: "Page name – Jivo Mart | Store". Home: "Jivo Mart | Store – Let Nature Reclaim You!".
- Canonical links present; product pages have BreadcrumbList structured data only (no Product schema). The new site adds Product + Offer + AggregateRating schema.
- Product URLs `/product/<slug>/`, category URLs `/product-category/<slug>/`, blog posts at `/<slug>/`.
- Sitemap and robots are polluted with spam; the new site publishes clean ones and answers spam URLs with 410 Gone.

## 11. Performance baseline of the old site (Lighthouse, mobile, home page)

| Metric | Old site |
|---|---|
| Performance | 17 / 100 |
| Accessibility | 83 |
| Best practices | 75 |
| SEO | 85 |
| First Contentful Paint | 5.3 s |
| Largest Contentful Paint | 25.2 s |
| Total Blocking Time | 6,400 ms |
| Cumulative Layout Shift | 0.194 |
| Page weight | 6.2 MB, 2,588 DOM elements, 112 stylesheets |

## 12. Things that could not be inspected (needs access)

| Item | Why blocked | What is needed |
|---|---|---|
| Customer accounts and order history | Private data | WordPress admin login or a database export (`wp_users`, `wp_usermeta`, `wc_orders`, `wc_order_*`, `wp_comments` for reviews) |
| Coupon rules (amount, min spend, expiry) | Admin only | Same as above, or WooCommerce > Coupons export |
| Full review history (only 10 per product are public) | Admin only | Same |
| Razorpay keys, webhook secret | Secret | Razorpay dashboard (use test keys first) |
| SMTP / email settings | Secret | Hostinger mail credentials |
| Logged-in account pages, thank-you page, waiting-list emails | Need an order or login | Standard WooCommerce layouts are used |
| Pixel-perfect screenshots at each viewport | No browser window was selected for this session | Choose a Chrome window next time; a comparison checklist is in `docs/08-comparison-report.md` |
