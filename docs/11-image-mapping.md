# 11 – Brand photo import (sharper product photos)

Made by `scripts/import-brand-images.py apply` from the brand zip `JIVO-20261014T125013Z-1-001.zip`
(unpacked into `assets-incoming/`, not part of the website). New files are in `public/images/products/hd/`
(WebP, longest side 2000px, quality 85, metadata removed). The old files are still there.

## How pictures were matched

1. The script compares every picture the site uses with all 668 photos in the zip (a black-and-white
   fingerprint, a colour thumbnail and the outline shape).
2. Every suggested pair was then checked by eye. Only the **same picture** (sharper) was swapped in.
   Look-alikes that were a different pack size (3L/4L can instead of 5L), a back instead of a front,
   different text, or new artwork were rejected.

## Sharper images swapped in (78)

| Site picture (old) | New file | From the zip |
|---|---|---|
| `/images/home/1L-Desi-Ghee-Front-1.jpg` | `/images/products/hd/home-1l-desi-ghee-front-1-jpg.webp` | `Foods/Ghee/Jivo/1L/1L Desi Ghee Front.jpg` |
| `/images/home/Extra-Virgin-olive-oil-front.jpg` | `/images/products/hd/home-extra-virgin-olive-oil-front-jpg.webp` | `Oil_s/Extra Virgin Olive Oil/5L/5L Extra Virgin Olive Oil Front.jpg` |
| `/images/products/1-3.jpg` | `/images/products/hd/1-3-jpg.webp` | `Foods/Ghee/Jivo/1L/1.jpg` |
| `/images/products/1L-CP-Canola-Oil-Front-1.jpg` | `/images/products/hd/1l-cp-canola-oil-front-1-jpg.webp` | `Oil_s/Canola Oil/1L/1L CP Canola Oil Front.jpg` |
| `/images/products/1L-Desi-Ghee-Front-1.jpg` | `/images/products/hd/1l-desi-ghee-front-1-jpg.webp` | `Foods/Ghee/Jivo/1L/1L Desi Ghee Front.jpg` |
| `/images/products/1L-Desi-Ghee-Front-2.jpg` | `/images/products/hd/1l-desi-ghee-front-2-jpg.webp` | `Foods/Ghee/Jivo/1L/1L Desi Ghee Front.jpg` |
| `/images/products/1L-Extra-Light-Olive-oil-Front.jpg` | `/images/products/hd/1l-extra-light-olive-oil-front-jpg.webp` | `Oil_s/Extra Light Olive Oil/1L/1L Extra Light Olive oil Front.jpg` |
| `/images/products/1L-First-Pressed-Yellow-Mustard-oil-Front.jpg` | `/images/products/hd/1l-first-pressed-yellow-mustard-oil-front-jpg.webp` | `Oil_s/Yellow Mustard/1L/1L First Pressed Yellow Mustard oil Front.jpg` |
| `/images/products/1L-Sunflower-Oil-2026-Front.webp` | `/images/products/hd/1l-sunflower-oil-2026-front-webp.webp` | `Oil_s/Sunflower Oil/1L/1L Sunflower Oil 2026 Front.jpg` |
| `/images/products/5L-Canola-Oil-2025-Front.jpg` | `/images/products/hd/5l-canola-oil-2025-front-jpg.webp` | `Oil_s/Canola Oil/5L/5L Canola Oil 2026 front.jpg` |
| `/images/products/5L-Canola-Oil-2026-front-1.jpg` | `/images/products/hd/5l-canola-oil-2026-front-1-jpg.webp` | `Oil_s/Canola Oil/5L/5L Canola Oil 2026 front.jpg` |
| `/images/products/5L-Extra-Light-Olive-Oil-Frot.jpg` | `/images/products/hd/5l-extra-light-olive-oil-frot-jpg.webp` | `Oil_s/Extra Light Olive Oil/5L/5L Extra Light Olive Oil Frot.jpg` |
| `/images/products/5L-Extra-Light-Olive-Oil-Side-2.jpg` | `/images/products/hd/5l-extra-light-olive-oil-side-2-jpg.webp` | `Oil_s/Extra Light Olive Oil/5L/5L Extra Light Olive Oil Side 2.jpg` |
| `/images/products/5L-Jivo-Gold-Oil-Back.webp` | `/images/products/hd/5l-jivo-gold-oil-back-webp.webp` | `Oil_s/Jivo Gold/5L/5L Jivo Gold Oil Back.jpg` |
| `/images/products/5L-Jivo-Gold-Oil-Front.webp` | `/images/products/hd/5l-jivo-gold-oil-front-webp.webp` | `Oil_s/Jivo Gold/5L/5L Jivo Gold Oil Front.jpg` |
| `/images/products/5L-Pomace-Olive-Oil-Front.jpg` | `/images/products/hd/5l-pomace-olive-oil-front-jpg.webp` | `Oil_s/Pomace Olive Oil/5L/5L Pomace Olive Oil Front.jpg` |
| `/images/products/5L-Soyabean-Oil-BAck.webp` | `/images/products/hd/5l-soyabean-oil-back-webp.webp` | `Oil_s/Soyabean Oil/5L/5L Soyabean Oil BAck.jpg` |
| `/images/products/5L-Soyabena-new-old.webp` | `/images/products/hd/5l-soyabena-new-old-webp.webp` | `Oil_s/Soyabean Oil/5L/5L Soyabena new old.jpg` |
| `/images/products/Apple-Sugar-Free-Back.jpeg` | `/images/products/hd/apple-sugar-free-back-jpeg.webp` | `Beverages/Wheatgrass/Sugar Free/Apple/Back.png` |
| `/images/products/Artboard-1.webp` | `/images/products/hd/artboard-1-webp.webp` | `Oil_s/Sunflower Oil/3L/Lifestyle/Artboard 1.jpg` |
| `/images/products/Artboard-2-1-1.webp` | `/images/products/hd/artboard-2-1-1-webp.webp` | `Oil_s/Soyabean Oil/5L/Lifestyle/Artboard 2-1.jpg` |
| `/images/products/Artboard-2-3.webp` | `/images/products/hd/artboard-2-3-webp.webp` | `Oil_s/Soyabean Oil/5L/Lifestyle/Artboard 2.jpg` |
| `/images/products/Artboard-2.webp` | `/images/products/hd/artboard-2-webp.webp` | `Oil_s/Sunflower Oil/3L/Lifestyle/Artboard 2.jpg` |
| `/images/products/Artboard-3-3.webp` | `/images/products/hd/artboard-3-3-webp.webp` | `Oil_s/Soyabean Oil/1L/lifestyle/Artboard 3.jpg` |
| `/images/products/Artboard-3.webp` | `/images/products/hd/artboard-3-webp.webp` | `Oil_s/Sunflower Oil/3L/Lifestyle/Artboard 3.jpg` |
| `/images/products/Artboard-4-3.webp` | `/images/products/hd/artboard-4-3-webp.webp` | `Oil_s/Soyabean Oil/5L/Lifestyle/Artboard 4.jpg` |
| `/images/products/Artboard-4.webp` | `/images/products/hd/artboard-4-webp.webp` | `Oil_s/Sunflower Oil/5L/Lifestyle/Artboard 4.jpg` |
| `/images/products/Artboard-5-7.webp` | `/images/products/hd/artboard-5-7-webp.webp` | `Oil_s/Soyabean Oil/5L/Lifestyle/Artboard 5.jpg` |
| `/images/products/Artboard-5.webp` | `/images/products/hd/artboard-5-webp.webp` | `Oil_s/Sunflower Oil/3L/Lifestyle/Artboard 5.jpg` |
| `/images/products/Back-3.webp` | `/images/products/hd/back-3-webp.webp` | `Beverages/Wheatgrass/Mango 500ML/Back.jpg` |
| `/images/products/Blueberry.jpg` | `/images/products/hd/blueberry-jpg.webp` | `Beverages/Wheatgrass/Blueberry 200ml/front.jpg` |
| `/images/products/Buleberry-sugar-free.png` | `/images/products/hd/buleberry-sugar-free-png.webp` | `Beverages/Wheatgrass/50_ less Suger/Blueberry 250ml/1.png` |
| `/images/products/Extra-Light-1L-1L-Front.jpg` | `/images/products/hd/extra-light-1l-1l-front-jpg.webp` | `Combo Images/Amazon/Extra Light 1L + 1L Front.jpg` |
| `/images/products/Ginger-ale-sugar-free.jpg` | `/images/products/hd/ginger-ale-sugar-free-jpg.webp` | `Beverages/Wheatgrass/Sugar Free/Ginger/front.jpg` |
| `/images/products/L2.webp` | `/images/products/hd/l2-webp.webp` | `Oil_s/Extra Virgin Olive Oil/5L/Lifestyle/Lifestyle 2.png` |
| `/images/products/L3.webp` | `/images/products/hd/l3-webp.webp` | `Oil_s/Extra Virgin Olive Oil/200ml/Lifestyle/Lifestyle 3.png` |
| `/images/products/L4.png` | `/images/products/hd/l4-png.webp` | `Oil_s/Extra Virgin Olive Oil/1L/Lifestyle/Lifestyle 4.png` |
| `/images/products/L5.png` | `/images/products/hd/l5-png.webp` | `Oil_s/Extra Virgin Olive Oil/1L/Lifestyle/Lifestyle 5.png` |
| `/images/products/Lifestyle-1-1-3.jpg` | `/images/products/hd/lifestyle-1-1-3-jpg.webp` | `Oil_s/Mustard Oil/5L/Lifestyle/Lifestyle 1.jpg` |
| `/images/products/Lifestyle-1-1-6.jpg` | `/images/products/hd/lifestyle-1-1-6-jpg.webp` | `Oil_s/Canola Oil/3L/Lifestyle/Lifestyle 1.jpg` |
| `/images/products/Lifestyle-1-1-8.jpg` | `/images/products/hd/lifestyle-1-1-8-jpg.webp` | `Oil_s/Pomace Olive Oil/5L/Lifestyle/Lifestyle 1.jpg` |
| `/images/products/Lifestyle-1-1.jpg` | `/images/products/hd/lifestyle-1-1-jpg.webp` | `Oil_s/GroundNut Oil/5L/Lifestyle/Lifestyle 1.jpg` |
| `/images/products/Lifestyle-2-1-3.jpg` | `/images/products/hd/lifestyle-2-1-3-jpg.webp` | `Oil_s/Mustard Oil/3L/LIfestyle/Lifestyle 2.jpg` |
| `/images/products/Lifestyle-2-1-4.jpg` | `/images/products/hd/lifestyle-2-1-4-jpg.webp` | `Oil_s/Canola Oil/3L/Lifestyle/Lifestyle 2.jpg` |
| `/images/products/Lifestyle-2-1-6.jpg` | `/images/products/hd/lifestyle-2-1-6-jpg.webp` | `Oil_s/Pomace Olive Oil/3L/LIfestyle Image/Lifestyle 2.jpg` |
| `/images/products/Lifestyle-2-1.jpg` | `/images/products/hd/lifestyle-2-1-jpg.webp` | `Oil_s/GroundNut Oil/1L/Lifetyle/Lifestyle 2.jpg` |
| `/images/products/Lifestyle-2-4.webp` | `/images/products/hd/lifestyle-2-4-webp.webp` | `Beverages/Wheatgrass/Mango 500ML/Lifestyle/Lifestyle 2.jpg` |
| `/images/products/Lifestyle-3-1-3.jpg` | `/images/products/hd/lifestyle-3-1-3-jpg.webp` | `Oil_s/Mustard Oil/3L/LIfestyle/Lifestyle 3.jpg` |
| `/images/products/Lifestyle-3-1-4.jpg` | `/images/products/hd/lifestyle-3-1-4-jpg.webp` | `Oil_s/Canola Oil/4L/Lifestyle/Lifestyle 3.jpg` |
| `/images/products/Lifestyle-3-1-8.jpg` | `/images/products/hd/lifestyle-3-1-8-jpg.webp` | `Oil_s/Extra Light Olive Oil/2L/Lifestyle/Lifestyle 3.jpg` |
| `/images/products/Lifestyle-3-1.jpg` | `/images/products/hd/lifestyle-3-1-jpg.webp` | `Oil_s/GroundNut Oil/5L/Lifestyle/Lifestyle 3.jpg` |
| `/images/products/Lifestyle-3-2-1.webp` | `/images/products/hd/lifestyle-3-2-1-webp.webp` | `Oil_s/Canola Oil/1L/Lifestyle/Lifestyle 3-2.jpg` |
| `/images/products/Lifestyle-3-4.webp` | `/images/products/hd/lifestyle-3-4-webp.webp` | `Beverages/Wheatgrass/Mango 500ML/Lifestyle/Lifestyle 3.jpg` |
| `/images/products/Lifestyle-4-1-1.webp` | `/images/products/hd/lifestyle-4-1-1-webp.webp` | `Beverages/Wheatgrass/Mango 500ML/Lifestyle/Lifestyle 4-1.jpg` |
| `/images/products/Lifestyle-4-1-3.jpg` | `/images/products/hd/lifestyle-4-1-3-jpg.webp` | `Oil_s/Mustard Oil/3L/LIfestyle/Lifestyle 4.jpg` |
| `/images/products/Lifestyle-4-1-4.jpg` | `/images/products/hd/lifestyle-4-1-4-jpg.webp` | `Oil_s/Canola Oil/1L/Lifestyle/Lifestyle 4.jpg` |
| `/images/products/Lifestyle-4-1-6.jpg` | `/images/products/hd/lifestyle-4-1-6-jpg.webp` | `Oil_s/Pomace Olive Oil/5L/Lifestyle/Lifestyle 4.jpg` |
| `/images/products/Lifestyle-4-1-8.jpg` | `/images/products/hd/lifestyle-4-1-8-jpg.webp` | `Oil_s/Extra Light Olive Oil/5L/Lifestyle Image/Lifestyle 4.jpg` |
| `/images/products/Lifestyle-4-2.jpg` | `/images/products/hd/lifestyle-4-2-jpg.webp` | `Oil_s/Canola Oil/3L/Lifestyle/Lifestyle 4-2.jpg` |
| `/images/products/Lifestyle-4-4.webp` | `/images/products/hd/lifestyle-4-4-webp.webp` | `Beverages/Wheatgrass/Mango 500ML/Lifestyle/Lifestyle 4.jpg` |
| `/images/products/Lifestyle-5-1-3.jpg` | `/images/products/hd/lifestyle-5-1-3-jpg.webp` | `Oil_s/Mustard Oil/4L/LIfestyle/Lifestyle 5.jpg` |
| `/images/products/Lifestyle-5-1-4.jpg` | `/images/products/hd/lifestyle-5-1-4-jpg.webp` | `Oil_s/Pomace Olive Oil/1L/Lifestyle/Lifestyle 5.jpg` |
| `/images/products/Lifestyle-5-1-6.jpg` | `/images/products/hd/lifestyle-5-1-6-jpg.webp` | `Oil_s/Extra Light Olive Oil/1L/Lifestyle/Lifestyle 5.jpg` |
| `/images/products/Lifestyle-5-1.jpg` | `/images/products/hd/lifestyle-5-1-jpg.webp` | `Oil_s/GroundNut Oil/1L/Lifetyle/Lifestyle 5.jpg` |
| `/images/products/Lifestyle-6-4.jpg` | `/images/products/hd/lifestyle-6-4-jpg.webp` | `Oil_s/Canola Oil/4L/Lifestyle/4L Canola Table.jpg` |
| `/images/products/Lifestyle-6-6.jpg` | `/images/products/hd/lifestyle-6-6-jpg.webp` | `Oil_s/Pomace Olive Oil/1L/Lifestyle/Lifestyle 6.jpg` |
| `/images/products/Lifestyle-6-8.jpg` | `/images/products/hd/lifestyle-6-8-jpg.webp` | `Oil_s/Extra Light Olive Oil/1L/Lifestyle/Lifestyle 6.jpg` |
| `/images/products/Lifestyle-6.jpg` | `/images/products/hd/lifestyle-6-jpg.webp` | `Oil_s/GroundNut Oil/5L/Lifestyle/Lifestyle 6.jpg` |
| `/images/products/Side.webp` | `/images/products/hd/side-webp.webp` | `Beverages/Wheatgrass/Mango 500ML/Side.jpg` |
| `/images/products/Wheatgrass-Apple-5.webp` | `/images/products/hd/wheatgrass-apple-5-webp.webp` | `Beverages/Wheatgrass/Apple 200Ml/Artboard 4.png` |
| `/images/products/Wheatgrass-Blueberry-4.webp` | `/images/products/hd/wheatgrass-blueberry-4-webp.webp` | `Beverages/Wheatgrass/Blueberry 200ml/Artboard 2.png` |
| `/images/products/Wheatgrass-Mojito-4.webp` | `/images/products/hd/wheatgrass-mojito-4-webp.webp` | `Beverages/Wheatgrass/Mojito 200ml/Artboard 2.png` |
| `/images/products/Yellow-Mustard-1L-Back.jpg` | `/images/products/hd/yellow-mustard-1l-back-jpg.webp` | `Oil_s/Yellow Mustard/1L/1L First Pressed Yellow Mustard oil Back.jpg` |
| `/images/products/Yellow-Mustard-2.jpg` | `/images/products/hd/yellow-mustard-2-jpg.webp` | `Oil_s/Yellow Mustard/1L/Lifestyle/Lifestyle 2.jpg` |
| `/images/products/Yellow-Mustard-3.jpg` | `/images/products/hd/yellow-mustard-3-jpg.webp` | `Oil_s/Yellow Mustard/1L/New Bottle/Lifestyle/Lifestyle 3.jpg` |
| `/images/products/Yellow-Mustard-4.jpg` | `/images/products/hd/yellow-mustard-4-jpg.webp` | `Oil_s/Yellow Mustard/1L/Lifestyle/Lifestyle 4.jpg` |
| `/images/products/chart.webp` | `/images/products/hd/chart-webp.webp` | `Beverages/Wheatgrass/Mango 500ML/chart.png` |
| `/images/products/soyabean-1l-front.webp` | `/images/products/hd/soyabean-1l-front-webp.webp` | `Oil_s/Soyabean Oil/1L/Front.jpg` |

## Pictures without a sharper copy in the zip (101)

These stay as they are (1024px or smaller). **Bold** = used by a product shown in the shop.

- **`/images/products/1L-Groundnut-oil-Front.jpg`** (jivo-cold-press-groundnut-oil)
- **`/images/products/1L-Pomace-Olive-oil-Front-2.jpg`** (jivo-pomace-olive-oil)
- **`/images/products/1L-RiceBran-oil-Front.webp`** (jivo-rice-bran-oil)
- **`/images/products/1X5-Canola-Front.jpg`** (jivo-cold-press-canola-oil)
- `/images/products/2-3.jpg` (kirpa-desi-ghee)
- **`/images/products/2L-Extra-Light-Olive-Oil-Front.jpg`** (jivo-extra-light-olive-oil)
- `/images/products/3-5.jpg` (kirpa-desi-ghee)
- `/images/products/3-7.jpg` (canola-5l-and-kirpa-desi-ghee-1kg)
- `/images/products/5L-Canola-1L-Ghee-Back.jpg.jpeg` (canola-5l-and-kirpa-desi-ghee-1kg)
- `/images/products/5L-Canola-1L-Ghee.jpg.jpeg` (canola-5l-and-kirpa-desi-ghee-1kg)
- `/images/products/5L-Canola-500gm-Desi-Ghee_.jpg` (jivo-cold-press-canola-oil-5l-with-jivo-desi-ghee-500-ml)
- **`/images/products/5L-Canola-Oil-2025-Back.jpg`** (canola-5l-and-kirpa-desi-ghee-1kg, canola-oil-5-l-extra-light-olive-oil-1l, jivo-canola-oil-5l-and-jivo-extra-virgin-olive-oil-1l-combo)
- `/images/products/5L-Canola-tea-Front.jpg-2.jpeg` (canola-5l-with-jivo-premium-tea-leaves-250g)
- **`/images/products/5L-Extra-Light-Olive-Oil-Side-1.jpg`** (jivo-extra-light-olive-oil)
- **`/images/products/5L-Groundnut-Oil-Front.jpg`** (jivo-cold-press-groundnut-oil)
- **`/images/products/5L-Mustard-Oil-Front-1.jpg`** (jivo-kachi-ghani-mustard-oil)
- **`/images/products/5L-Rice-bran-Oil-Front.webp`** (jivo-rice-bran-oil)
- **`/images/products/5L-Soyabean-Oil-Front-1.jpg`** (jivo-soyabean-oil)
- **`/images/products/5L-Soyabean-Oil-Front-Copy.webp`** (jivo-soyabean-oil)
- **`/images/products/5L-Soyabean-Oil-Front.webp`** (jivo-soyabean-oil)
- **`/images/products/5L-Sunflower-Oil-2026-front.webp`** (jivo-cold-press-sunflower-oil)
- `/images/products/61T-7qDTmqL._SL1500_.webp` (jivo-a2-cow-ghee)
- `/images/products/71A23Ido9CL._SL1500_-1-1.jpg` (jivo-cold-press-canola-oil-5l-with-jivo-desi-ghee-500-ml)
- `/images/products/71GqkbpDCdL._SL1500_.webp` (jivo-a2-cow-ghee)
- `/images/products/81vJJ213GL._SL1500_.webp` (jivo-a2-cow-ghee)
- `/images/products/Apple-Sugar-Free.jpeg` (jivo-apple-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles-sugar-free)
- `/images/products/Apple.jpg` (jivo-apple-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- **`/images/products/Artboard-1-3.webp`** (jivo-soyabean-oil)
- **`/images/products/Artboard-1-4.webp`** (jivo-rice-bran-oil)
- `/images/products/Artboard-1_1-1.webp` (jivo-gold-refined-oil)
- **`/images/products/Artboard-2-5.webp`** (jivo-rice-bran-oil)
- **`/images/products/Artboard-3-5.webp`** (jivo-rice-bran-oil)
- `/images/products/Artboard-3_1.webp` (jivo-gold-refined-oil)
- **`/images/products/Artboard-4-5.webp`** (jivo-rice-bran-oil)
- `/images/products/Artboard-4_1.webp` (jivo-gold-refined-oil)
- `/images/products/Artboard-5-3.webp` (jivo-gold-refined-oil)
- **`/images/products/Artboard-5-4.webp`** (jivo-rice-bran-oil)
- `/images/products/BAck-7.webp` (jivo-rose-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/Back-4.webp` (jivo-blueberry-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles-sugar-free)
- `/images/products/Back-6.webp` (jivo-ginger-ale-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles-sugar-free)
- **`/images/products/Canola-1L1L-Front.jpg`** (jivo-cold-press-canola-oil)
- **`/images/products/Canola-51-front.webp`** (jivo-cold-press-canola-oil)
- **`/images/products/Canola-5L-Extra-Virgin-1L-Back.jpg.jpeg`** (jivo-canola-oil-5l-and-jivo-extra-virgin-olive-oil-1l-combo)
- **`/images/products/Canola-5L-Extra-Virgin-1L-Front.jpg.jpeg`** (jivo-canola-oil-5l-and-jivo-extra-virgin-olive-oil-1l-combo)
- `/images/products/Canola-5L-Extra-light-1L-Front.jpg.jpeg` (canola-oil-5-l-extra-light-olive-oil-1l)
- `/images/products/Canola-5L-Extra-light-1L-back.jpg.jpeg` (canola-oil-5-l-extra-light-olive-oil-1l)
- **`/images/products/Canola-5L5L-Front.jpg`** (jivo-cold-press-canola-oil)
- **`/images/products/Coconut-1L-1.jpg`** (jivo-extra-virgin-coconut-oil)
- **`/images/products/Coconut-1L-2.jpg`** (jivo-extra-virgin-coconut-oil)
- **`/images/products/Coconut-1L-3.jpg`** (jivo-extra-virgin-coconut-oil)
- **`/images/products/Coconut-1L-4.jpg`** (jivo-extra-virgin-coconut-oil)
- **`/images/products/Coconut-1L.jpg`** (jivo-extra-virgin-coconut-oil)
- **`/images/products/Coconut-500ML.jpg`** (jivo-extra-virgin-coconut-oil)
- `/images/products/Desi-Ghee-500G-Updated.png` (jivo-cold-press-canola-oil-5l-with-jivo-desi-ghee-500-ml)
- **`/images/products/EV-11-front.png`** (jivo-extra-virgin-olive-oil)
- **`/images/products/Extra-Light-5L-1L-Front.jpg`** (jivo-extra-light-olive-oil)
- **`/images/products/Extra-Virgin-1x5L.jpg`** (jivo-extra-virgin-olive-oil)
- **`/images/products/Extra-virgin-1L.jpg`** (jivo-canola-oil-5l-and-jivo-extra-virgin-olive-oil-1l-combo)
- **`/images/products/Front-1.jpg`** (jivo-kachi-ghani-mustard-oil)
- `/images/products/Front-1.webp` (jivo-mango-healthy-wheatgrass-juice-pack-of-18-500ml)
- **`/images/products/Ground-Nut-1L1L-Front.jpg`** (jivo-cold-press-groundnut-oil)
- **`/images/products/Groundnut-51-front.webp`** (jivo-cold-press-groundnut-oil)
- **`/images/products/Ingredients-1.jpg`** (jivo-kachi-ghani-mustard-oil)
- `/images/products/Jivo-tea-Back.jpg.jpeg` (jivo-premium-tea-leaves-250g)
- `/images/products/Jivo-tea-Front.jpg.jpeg` (jivo-premium-tea-leaves-250g)
- **`/images/products/L1.webp`** (jivo-extra-virgin-olive-oil)
- **`/images/products/Lifestyle-1-1-10.jpg`** (jivo-extra-light-olive-oil)
- `/images/products/Lifestyle-1-4.webp` (jivo-mango-healthy-wheatgrass-juice-pack-of-18-500ml)
- **`/images/products/Lifestyle-2-1-8.jpg`** (jivo-extra-light-olive-oil)
- **`/images/products/Lifestyle-3-1-6.jpg`** (jivo-pomace-olive-oil)
- **`/images/products/Lifestyle-4-1.jpg`** (jivo-cold-press-groundnut-oil)
- `/images/products/Mango.jpg` (jivo-mango-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/Mojito-Sugar-Free.jpg` (jivo-mojito-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles-sugar-free)
- `/images/products/Pack-of-24.webp` (jivo-wheatgrass-punjabi-jeera-juice-pack-of-24-160ml-pet-bottles)
- `/images/products/Punjabi-jeera-1-1.webp` (jivo-wheatgrass-punjabi-jeera-juice-pack-of-24-160ml-pet-bottles)
- `/images/products/Punjabi-jeera-1.webp` (jivo-wheatgrass-punjabi-jeera-juice-pack-of-24-160ml-pet-bottles)
- `/images/products/Punjabi-jeera-2.webp` (jivo-wheatgrass-punjabi-jeera-juice-pack-of-24-160ml-pet-bottles)
- `/images/products/Punjabi-jeera-3.webp` (jivo-wheatgrass-punjabi-jeera-juice-pack-of-24-160ml-pet-bottles)
- `/images/products/Rose.jpg` (jivo-rose-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- **`/images/products/Sano-Pomace-1L.png`** (sano-pomace-olive-oil)
- **`/images/products/Sano-Pomace-5L-1.jpg`** (sano-pomace-olive-oil)
- `/images/products/Wheatgrass-Apple-4.webp` (jivo-apple-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/Wheatgrass-Apple.webp` (jivo-apple-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/Wheatgrass-Blueberry-2.webp` (jivo-blueberry-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/Wheatgrass-Blueberry-3.webp` (jivo-blueberry-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/Wheatgrass-Mango-3.webp` (jivo-mango-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/Wheatgrass-Mango-4.webp` (jivo-mango-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/Wheatgrass-Mango.webp` (jivo-mango-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/Wheatgrass-Mojito-3.webp` (jivo-mojito-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles-sugar-free)
- **`/images/products/Yellow-Mustard-1.jpg`** (jivo-first-pressed-yellow-mustard-oil)
- `/images/products/extra-virgin-200ml-back.jpeg` (jivo-extra-virgin-oil-combo-pack-200ml200ml)
- `/images/products/extra-virgin-200ml-front-1.jpeg` (jivo-extra-virgin-oil-combo-pack-200ml200ml)
- `/images/products/extra-virgin-200ml-front.jpeg` (jivo-extra-virgin-oil-combo-pack-200ml200ml)
- `/images/products/front-5.webp` (jivo-blueberry-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles-sugar-free)
- `/images/products/front-7.webp` (jivo-ginger-ale-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles-sugar-free)
- `/images/products/mojito-front.webp` (jivo-mojito-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles-sugar-free)
- `/images/products/rose-1.webp` (jivo-rose-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/rose-2.webp` (jivo-rose-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- `/images/products/rose-3.png` (jivo-rose-healthy-wheatgrass-juice-pack-of-12-200ml-glass-bottles)
- **`/images/products/sano-pomace-5-l-front.webp`** (sano-pomace-olive-oil)
- **`/images/products/yellow-mustard-11-front.png`** (jivo-first-pressed-yellow-mustard-oil)

## New artwork in the zip – needs your OK before use

| Product | Where in the zip | What is different |
|---|---|---|
| Rice Bran Oil 1 L and 5 L | `Oil_s/Rice Bran Oil/1L/NEw/, Oil_s/Rice Bran Oil/5L/New/ and the rice bran lifestyle pictures` | green label; the site shows the red label |
| Extra Virgin Coconut Oil | `Oil_s/Coconut oil/1L/New Coconut Label/, 500ML/…New 2026…` | new label; the site shows the older label |
| A2 Cow Ghee | `Foods/Ghee/A2/1L/A2 Ghee New Front.jpg` | new jar and label |
| Kachi Ghani Mustard Oil 1 L | `Oil_s/Mustard Oil/1L/square Bottle NEW/` | new square bottle; the site shows the round bottle |
| Jivo Gold 1 L | `Oil_s/Jivo Gold/1L/New Round Bottle/` | new round bottle |
| Yellow Mustard 1 L | `Oil_s/Yellow Mustard/1L/New Bottle/` | new bottle |

## In the zip, not used in this task

- **A+ banners** (desktop + mobile) for most oils, Mango juice and Coffee.
- **Combo Images/Amazon**: 141 combo pictures. Only one (Extra Light 1 L + 1 L front) is the same picture as on the site.
- **Videos** (Canola ad, A2 ghee, Coconut render) and 2 print TIF files: not unpacked.

## Zip folders with no product in the shop (no products were added)

- Beverages/Water
- Beverages/Wheatgrass/160ml wheatgrass (Shikanji / Jeera PET)
- Beverages/Wheatgrass/50% less sugar (Blueberry 250ml, Cola Run, Mojito 250ml)
- Beverages/Wheatgrass/Energy Drink
- Beverages/Wheatgrass/Zero Sugar (Blueberry, Ginger ale, Healthy Cola, Jeera, Mango)
- Beverages/Wheatgrass/Punjabi Shikanji
- Foods/Coffee
- Oil_s/15L CP Mustard Oil
- Oil_s/15L Refined Soyabean Oil
- Oil_s/15ltr Refined Canola Tin
- Oil_s/Sesame oil
- Oil_s/So Olive
- Oil_s/Premum Olive Oil
- Oil_s/Extra Virgin Canola oil
- Oil_s/pouch/Mustard Pouch
- Pack sizes the shop does not sell: 200 ml / 250 ml / 500 ml / 2 L / 3 L / 4 L bottles and cans of several oils

## Missing photos that would help

- A sharp front photo of the 5 L Kachi Ghani Mustard can (the zip only has 3 L/4 L cans).
