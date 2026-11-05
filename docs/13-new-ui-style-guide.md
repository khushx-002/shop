# 13 – New UI style guide (used by the redesign in this folder)

The redesign plan is in `docs/12-ui-redesign-plan.md`. This file lists the exact styles to use.
Look and feel: calm, premium, "heritage" – deep green, gold details, cream backgrounds, elegant serif headings.

Choices taken (recommended options from the plan, section 6):
Jivo green stays the main color + gold and cream are added · Playfair Display + DM Sans · second yellow marquee removed.

## 1. Colors (Tailwind tokens in `src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `primary` | `#0F4526` | Jivo green: headings, main buttons, header button, top bar, links |
| `primary-dark` | `#0A2F1A` | Footer, button hover |
| `gold` | `#B68A2A` | Lines, icons, borders, big text only (contrast 3.1 : 1 – never small text on white) |
| `gold-dark` | `#86651D` | Small gold text on white/cream (eyebrow labels, hover links) – 5.4 : 1 on white, 4.8 : 1 on cream |
| `gold-light` | `#F3DBA1` | Gold text on green backgrounds (top bar, footer headings) |
| `cream` | `#F7F2E8` | Section and page-hero backgrounds |
| `cream-light` | `#FBF6EB` | Soft section backgrounds, product picture boxes |
| `sage` | `#E9ECD8` | Benefits bar |
| `brown` | `#684C32` | Badges (on `#EEE4D1`) |
| `ink` | `#1F2A26` | Dark text (was `#222`) |
| `body` | `#4D5A54` | Normal text (was `#555`) |
| `muted` | `#65716C` | Small grey text, sub-titles |
| `line` | `#E6DFD1` | Card borders, dividers |
| `surface` | `#F7F2E8` | Image placeholders, light boxes |
| `active` | `#86651D` | Hover / active color (was magenta) |

Gold borders: `border-gold/25` (cards), `border-gold/45` (hover). Soft shadow: `shadow-soft`; card hover: `shadow-lift`.

## 2. Fonts

- Headings: **Playfair Display** (`font-heading`), weight 600–700, **not uppercase**, `leading-[1.15]`.
  Highlight one or two words in a heading with `<em className="text-gold-dark italic">…</em>` where it reads well.
  Sizes: page H1 `text-[clamp(34px,5vw,56px)]`, section H2 `text-[clamp(28px,3.4vw,42px)]`, card H3 20–24px.
- Text, buttons, menus, prices, forms: **DM Sans** (`font-sans`, default). Line height 1.65.
- `font-robo` and `font-script` now point to DM Sans / Playfair italic, so old code still works.

## 3. Building blocks (classes in `globals.css`)

| Class | Look |
|---|---|
| `.btn` + `.btn-primary` | Green, white text, 10px corners, 14px × 22px padding, DM Sans bold 14px, normal case |
| `.btn-outline` | Green border + green text, fills green on hover |
| `.btn-gold` | Dark gold, white text |
| `.btn-pill` | Fully round ends (header cart button, small chips) |
| `.eyebrow` | 12px, bold, UPPERCASE, letter-spacing .18em, `gold-dark` – sits above section headings |
| `.gold-line` | 45 × 2px gold line under a heading |
| `.card-soft` | White, 1px `line` border, 16px corners |
| `.section` | 72px top/bottom padding (48px on phones) |
| `.page-hero` | Cream band with gradient + soft gold/green glow; holds breadcrumbs + H1 + short text |
| `.field` / `.label` | Inputs: 9px corners, warm grey border `#D9D2C4`, green focus ring |
| `.badge` | Small brown-on-cream pill |
| `.section-title` / `.section-subtitle` | Serif title + italic serif sub-title |

## 4. Patterns per area

- **Top bar:** green, 34px high, 12px text, `gold-light` links.
- **Header:** white (96% + blur), sticky, thin bottom border `primary/8`. Menu links green, gold line slides in on hover.
  Cart button = green pill with count.
- **Footer:** `primary-dark` background, headings in `gold-light` serif, links `#D7E0DC`, bottom strip darker with a top line `white/15`.
- **Product card:** white, 20px corners, `border-gold/25`, soft shadow; lifts 4px on hover with `border-gold/45`.
  Picture box: cream gradient (`from-cream-light to-[#F0E5D0]`) with an inner thin gold frame (12px inset, 13px corners).
  Title in Playfair 18–22px green; price DM Sans bold green; button full width green, 10px corners.
- **Section heads:** eyebrow → serif H2 → muted text (max ~560px); optional "View all" link right-aligned on desktop.
- **Cards for trust / values / steps:** `.card-soft`, gold icon or gold serif number (01, 02, 03) on top.
- **Page heroes (shop, category, content, account):** `.page-hero` instead of grey/flat banners.
- **Forms:** `.field` + `.label`; form boxes on cream (`bg-cream rounded-[22px] p-8`).
- **Movement:** only soft fades, 4–5px lifts, underline slides; always add `motion-reduce:` fallbacks.

## 5. Rules

1. Style only: do not change logic, data loading, routes, form names, `aria-*`, `data-*`, `id`s or visible button texts used by tests.
2. Use the tokens above; avoid new raw hex colors.
3. Keep accessibility: contrast 4.5 : 1 for small text, focus rings, one H1 per page.
4. Check each change at desktop (1440px) and phone (390px).
5. Admin (`/admin`) is not part of the redesign.
