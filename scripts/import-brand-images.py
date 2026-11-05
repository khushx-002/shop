"""
Brand photo import: sharper copies of the product photos the shop already shows.

Source: the brand zip unpacked into assets-incoming/ (JPG/PNG only, see .gitignore).
Nothing is downloaded and nothing in assets-incoming/ is executed.

  python -X utf8 scripts/import-brand-images.py analyze   # fingerprints + matches -> .data/brand-images/matches.json
  python -X utf8 scripts/import-brand-images.py apply     # writes public/images/products/hd/*.webp, updates
                                                          # src/content/products.json + image-sizes.json,
                                                          # writes docs/11-image-mapping.md

"Same picture" is decided with a perceptual fingerprint (difference hash, 256 bits): a sharper copy of
a current image is only used when the fingerprints are close (see SAME_PICTURE), and every pair in
SAME_PICTURES was checked by eye. The shop shows exactly the same pictures as shop.jivo.in, only sharper.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INCOMING = ROOT / "assets-incoming" / "JIVO"
PUBLIC = ROOT / "public"
HD_DIR = PUBLIC / "images" / "products" / "hd"
PRODUCTS_JSON = ROOT / "src" / "content" / "products.json"
SIZES_JSON = ROOT / "src" / "content" / "image-sizes.json"
WORK = ROOT / ".data" / "brand-images"
REPORT = ROOT / "docs" / "11-image-mapping.md"

HASH_SIZE = 16  # 16x16 difference hash = 256 bits
SAME_PICTURE = 40  # max differing bits (of 256) in the black-and-white fingerprint
SAME_COLOUR = 12.0  # max mean RGB difference (0-255) of the 48x48 colour thumbnails
SAME_ASPECT = 0.03  # max relative difference of the outline's width/height
MAX_SIDE = 2000
WEBP_QUALITY = 85
PHOTO_EXT = (".jpg", ".jpeg", ".png")

# Sharper copies of CURRENT site images: site URL -> photo in the zip. Every pair was suggested by `analyze`
# (fingerprint + colour + outline) and then checked by eye on contact sheets (2026-10-15). Pairs that looked
# alike but were a different pack size, a back instead of a front, other text, or NEW artwork (green rice bran
# label, new coconut label, new A2 ghee jar) are NOT here; they are listed in docs/11-image-mapping.md.
SAME_PICTURES: dict[str, str] = {
    "/images/products/1-3.jpg": "Foods/Ghee/Jivo/1L/1.jpg",
    "/images/products/1L-CP-Canola-Oil-Front-1.jpg": "Oil_s/Canola Oil/1L/1L CP Canola Oil Front.jpg",
    "/images/products/1L-Desi-Ghee-Front-1.jpg": "Foods/Ghee/Jivo/1L/1L Desi Ghee Front.jpg",
    "/images/products/1L-Desi-Ghee-Front-2.jpg": "Foods/Ghee/Jivo/1L/1L Desi Ghee Front.jpg",
    "/images/products/1L-Extra-Light-Olive-oil-Front.jpg": "Oil_s/Extra Light Olive Oil/1L/1L Extra Light Olive oil Front.jpg",
    "/images/products/1L-First-Pressed-Yellow-Mustard-oil-Front.jpg": "Oil_s/Yellow Mustard/1L/1L First Pressed Yellow Mustard oil Front.jpg",
    "/images/products/1L-Sunflower-Oil-2026-Front.webp": "Oil_s/Sunflower Oil/1L/1L Sunflower Oil 2026 Front.jpg",
    "/images/products/5L-Canola-Oil-2025-Front.jpg": "Oil_s/Canola Oil/5L/5L Canola Oil 2026 front.jpg",
    "/images/products/5L-Canola-Oil-2026-front-1.jpg": "Oil_s/Canola Oil/5L/5L Canola Oil 2026 front.jpg",
    "/images/products/5L-Extra-Light-Olive-Oil-Frot.jpg": "Oil_s/Extra Light Olive Oil/5L/5L Extra Light Olive Oil Frot.jpg",
    "/images/products/5L-Extra-Light-Olive-Oil-Side-2.jpg": "Oil_s/Extra Light Olive Oil/5L/5L Extra Light Olive Oil Side 2.jpg",
    "/images/products/5L-Jivo-Gold-Oil-Back.webp": "Oil_s/Jivo Gold/5L/5L Jivo Gold Oil Back.jpg",
    "/images/products/5L-Jivo-Gold-Oil-Front.webp": "Oil_s/Jivo Gold/5L/5L Jivo Gold Oil Front.jpg",
    "/images/products/5L-Pomace-Olive-Oil-Front.jpg": "Oil_s/Pomace Olive Oil/5L/5L Pomace Olive Oil Front.jpg",
    "/images/products/5L-Soyabean-Oil-BAck.webp": "Oil_s/Soyabean Oil/5L/5L Soyabean Oil BAck.jpg",
    "/images/products/5L-Soyabena-new-old.webp": "Oil_s/Soyabean Oil/5L/5L Soyabena new old.jpg",
    "/images/products/Apple-Sugar-Free-Back.jpeg": "Beverages/Wheatgrass/Sugar Free/Apple/Back.png",
    "/images/products/Artboard-1.webp": "Oil_s/Sunflower Oil/3L/Lifestyle/Artboard 1.jpg",
    "/images/products/Artboard-2-1-1.webp": "Oil_s/Soyabean Oil/5L/Lifestyle/Artboard 2-1.jpg",
    "/images/products/Artboard-2-3.webp": "Oil_s/Soyabean Oil/5L/Lifestyle/Artboard 2.jpg",
    "/images/products/Artboard-2.webp": "Oil_s/Sunflower Oil/3L/Lifestyle/Artboard 2.jpg",
    "/images/products/Artboard-3-3.webp": "Oil_s/Soyabean Oil/1L/lifestyle/Artboard 3.jpg",
    "/images/products/Artboard-3.webp": "Oil_s/Sunflower Oil/3L/Lifestyle/Artboard 3.jpg",
    "/images/products/Artboard-4-3.webp": "Oil_s/Soyabean Oil/5L/Lifestyle/Artboard 4.jpg",
    "/images/products/Artboard-4.webp": "Oil_s/Sunflower Oil/5L/Lifestyle/Artboard 4.jpg",
    "/images/products/Artboard-5-7.webp": "Oil_s/Soyabean Oil/5L/Lifestyle/Artboard 5.jpg",
    "/images/products/Artboard-5.webp": "Oil_s/Sunflower Oil/3L/Lifestyle/Artboard 5.jpg",
    "/images/products/Back-3.webp": "Beverages/Wheatgrass/Mango 500ML/Back.jpg",
    "/images/products/Blueberry.jpg": "Beverages/Wheatgrass/Blueberry 200ml/front.jpg",
    "/images/products/Buleberry-sugar-free.png": "Beverages/Wheatgrass/50_ less Suger/Blueberry 250ml/1.png",
    "/images/products/Extra-Light-1L-1L-Front.jpg": "Combo Images/Amazon/Extra Light 1L + 1L Front.jpg",
    "/images/products/Ginger-ale-sugar-free.jpg": "Beverages/Wheatgrass/Sugar Free/Ginger/front.jpg",
    "/images/products/L2.webp": "Oil_s/Extra Virgin Olive Oil/5L/Lifestyle/Lifestyle 2.png",
    "/images/products/L3.webp": "Oil_s/Extra Virgin Olive Oil/200ml/Lifestyle/Lifestyle 3.png",
    "/images/products/L4.png": "Oil_s/Extra Virgin Olive Oil/1L/Lifestyle/Lifestyle 4.png",
    "/images/products/L5.png": "Oil_s/Extra Virgin Olive Oil/1L/Lifestyle/Lifestyle 5.png",
    "/images/products/Lifestyle-1-1-3.jpg": "Oil_s/Mustard Oil/5L/Lifestyle/Lifestyle 1.jpg",
    "/images/products/Lifestyle-1-1-6.jpg": "Oil_s/Canola Oil/3L/Lifestyle/Lifestyle 1.jpg",
    "/images/products/Lifestyle-1-1-8.jpg": "Oil_s/Pomace Olive Oil/5L/Lifestyle/Lifestyle 1.jpg",
    "/images/products/Lifestyle-1-1.jpg": "Oil_s/GroundNut Oil/5L/Lifestyle/Lifestyle 1.jpg",
    "/images/products/Lifestyle-2-1-3.jpg": "Oil_s/Mustard Oil/3L/LIfestyle/Lifestyle 2.jpg",
    "/images/products/Lifestyle-2-1-4.jpg": "Oil_s/Canola Oil/3L/Lifestyle/Lifestyle 2.jpg",
    "/images/products/Lifestyle-2-1-6.jpg": "Oil_s/Pomace Olive Oil/3L/LIfestyle Image/Lifestyle 2.jpg",
    "/images/products/Lifestyle-2-1.jpg": "Oil_s/GroundNut Oil/1L/Lifetyle/Lifestyle 2.jpg",
    "/images/products/Lifestyle-2-4.webp": "Beverages/Wheatgrass/Mango 500ML/Lifestyle/Lifestyle 2.jpg",
    "/images/products/Lifestyle-3-1-3.jpg": "Oil_s/Mustard Oil/3L/LIfestyle/Lifestyle 3.jpg",
    "/images/products/Lifestyle-3-1-4.jpg": "Oil_s/Canola Oil/4L/Lifestyle/Lifestyle 3.jpg",
    "/images/products/Lifestyle-3-1-8.jpg": "Oil_s/Extra Light Olive Oil/2L/Lifestyle/Lifestyle 3.jpg",
    "/images/products/Lifestyle-3-1.jpg": "Oil_s/GroundNut Oil/5L/Lifestyle/Lifestyle 3.jpg",
    "/images/products/Lifestyle-3-2-1.webp": "Oil_s/Canola Oil/1L/Lifestyle/Lifestyle 3-2.jpg",
    "/images/products/Lifestyle-3-4.webp": "Beverages/Wheatgrass/Mango 500ML/Lifestyle/Lifestyle 3.jpg",
    "/images/products/Lifestyle-4-1-1.webp": "Beverages/Wheatgrass/Mango 500ML/Lifestyle/Lifestyle 4-1.jpg",
    "/images/products/Lifestyle-4-1-3.jpg": "Oil_s/Mustard Oil/3L/LIfestyle/Lifestyle 4.jpg",
    "/images/products/Lifestyle-4-1-4.jpg": "Oil_s/Canola Oil/1L/Lifestyle/Lifestyle 4.jpg",
    "/images/products/Lifestyle-4-1-6.jpg": "Oil_s/Pomace Olive Oil/5L/Lifestyle/Lifestyle 4.jpg",
    "/images/products/Lifestyle-4-1-8.jpg": "Oil_s/Extra Light Olive Oil/5L/Lifestyle Image/Lifestyle 4.jpg",
    "/images/products/Lifestyle-4-2.jpg": "Oil_s/Canola Oil/3L/Lifestyle/Lifestyle 4-2.jpg",
    "/images/products/Lifestyle-4-4.webp": "Beverages/Wheatgrass/Mango 500ML/Lifestyle/Lifestyle 4.jpg",
    "/images/products/Lifestyle-5-1-3.jpg": "Oil_s/Mustard Oil/4L/LIfestyle/Lifestyle 5.jpg",
    "/images/products/Lifestyle-5-1-4.jpg": "Oil_s/Pomace Olive Oil/1L/Lifestyle/Lifestyle 5.jpg",
    "/images/products/Lifestyle-5-1-6.jpg": "Oil_s/Extra Light Olive Oil/1L/Lifestyle/Lifestyle 5.jpg",
    "/images/products/Lifestyle-5-1.jpg": "Oil_s/GroundNut Oil/1L/Lifetyle/Lifestyle 5.jpg",
    "/images/products/Lifestyle-6-4.jpg": "Oil_s/Canola Oil/4L/Lifestyle/4L Canola Table.jpg",
    "/images/products/Lifestyle-6-6.jpg": "Oil_s/Pomace Olive Oil/1L/Lifestyle/Lifestyle 6.jpg",
    "/images/products/Lifestyle-6-8.jpg": "Oil_s/Extra Light Olive Oil/1L/Lifestyle/Lifestyle 6.jpg",
    "/images/products/Lifestyle-6.jpg": "Oil_s/GroundNut Oil/5L/Lifestyle/Lifestyle 6.jpg",
    "/images/products/Side.webp": "Beverages/Wheatgrass/Mango 500ML/Side.jpg",
    "/images/products/Wheatgrass-Apple-5.webp": "Beverages/Wheatgrass/Apple 200Ml/Artboard 4.png",
    "/images/products/Wheatgrass-Blueberry-4.webp": "Beverages/Wheatgrass/Blueberry 200ml/Artboard 2.png",
    "/images/products/Wheatgrass-Mojito-4.webp": "Beverages/Wheatgrass/Mojito 200ml/Artboard 2.png",
    "/images/products/Yellow-Mustard-1L-Back.jpg": "Oil_s/Yellow Mustard/1L/1L First Pressed Yellow Mustard oil Back.jpg",
    "/images/products/Yellow-Mustard-2.jpg": "Oil_s/Yellow Mustard/1L/Lifestyle/Lifestyle 2.jpg",
    "/images/products/Yellow-Mustard-3.jpg": "Oil_s/Yellow Mustard/1L/New Bottle/Lifestyle/Lifestyle 3.jpg",
    "/images/products/Yellow-Mustard-4.jpg": "Oil_s/Yellow Mustard/1L/Lifestyle/Lifestyle 4.jpg",
    "/images/products/chart.webp": "Beverages/Wheatgrass/Mango 500ML/chart.png",
    "/images/products/soyabean-1l-front.webp": "Oil_s/Soyabean Oil/1L/Front.jpg",
    # Home page pictures (found with `analyze-all`, checked by eye 2026-10-15). Rejected there: the Kachi Ghani and
    # Extra Light 5 L pictures, because the zip copies have a different label ("5L (4.550kg)" is missing).
    "/images/home/1L-Desi-Ghee-Front-1.jpg": "Foods/Ghee/Jivo/1L/1L Desi Ghee Front.jpg",
    "/images/home/Extra-Virgin-olive-oil-front.jpg": "Oil_s/Extra Virgin Olive Oil/5L/5L Extra Virgin Olive Oil Front.jpg",
}

# ---------------------------------------------------------------- fingerprints


def open_rgb(path: Path, max_side: int | None = None) -> Image.Image:
    """Open an image upright, with transparent areas on white (the site shows products on white)."""
    im = Image.open(path)
    if max_side and im.format == "JPEG":
        im.draft("RGB", (max_side, max_side))  # fast JPEG decode at reduced size
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bg, im)
    return im.convert("RGB")


def trimmed(im: Image.Image) -> Image.Image:
    """Cut away the white margin, so the same pack photographed with more or less margin still matches."""
    gray = ImageOps.invert(im.convert("L"))
    box = gray.point(lambda v: 255 if v > 12 else 0).getbbox()
    return im.crop(box) if box else im


def dhash(path: Path) -> str:
    im = trimmed(open_rgb(path, 512)).convert("L").resize((HASH_SIZE + 1, HASH_SIZE), Image.Resampling.LANCZOS)
    px = list(im.tobytes())  # one byte per pixel ("L" mode)
    bits = []
    for y in range(HASH_SIZE):
        row = px[y * (HASH_SIZE + 1) : (y + 1) * (HASH_SIZE + 1)]
        bits.extend("1" if row[x] > row[x + 1] else "0" for x in range(HASH_SIZE))
    return f"{int(''.join(bits), 2):064x}"


def distance(a: str, b: str) -> int:
    return bin(int(a, 16) ^ int(b, 16)).count("1")


THUMB = 48  # colour check: 48x48 RGB of the trimmed picture


def colour_print(path: Path) -> dict:
    """Second check for "same picture": the fingerprint is black-and-white and packs of one range share the
    bottle shape and label layout, so a 1L groundnut bottle can look like a 1L olive bottle. The colour
    thumbnail and the outline's aspect ratio tell them (and a 3L can from a 5L can) apart."""
    im = trimmed(open_rgb(path, 512))
    w, h = im.size
    thumb = im.resize((THUMB, THUMB), Image.Resampling.LANCZOS).tobytes()
    return {"aspect": round(w / h, 4), "thumb": thumb.hex()}


def colour_diff(a: dict, b: dict) -> tuple[float, float]:
    """(mean absolute RGB difference 0-255, relative aspect-ratio difference)."""
    ta, tb = bytes.fromhex(a["thumb"]), bytes.fromhex(b["thumb"])
    mad = sum(abs(x - y) for x, y in zip(ta, tb)) / len(ta)
    return round(mad, 1), round(abs(a["aspect"] - b["aspect"]) / max(a["aspect"], b["aspect"]), 3)


# ---------------------------------------------------------------- data


def load_products() -> list[dict]:
    data = json.loads(PRODUCTS_JSON.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else data["products"]


def current_images(products: list[dict]) -> dict[str, list[str]]:
    """Image URL -> where it is used ("slug: gallery" / "slug: pack 1 Litre"). Swatches are left out: they are
    designed tiles with price text, not product photos."""
    used: dict[str, list[str]] = {}
    for p in products:
        for img in p.get("images", []):
            url = img["url"] if isinstance(img, dict) else img
            used.setdefault(url, []).append(f"{p['slug']}: gallery")
        for v in p.get("variations", []):
            if v.get("image"):
                used.setdefault(v["image"], []).append(f"{p['slug']}: pack {v['valueLabel']}")
    return used


def incoming_photos() -> list[Path]:
    out = []
    for dp, _dn, fn in os.walk(INCOMING):
        for f in fn:
            if f.startswith("._") or not f.lower().endswith(PHOTO_EXT):
                continue  # "._x.png" files are macOS metadata, not pictures
            out.append(Path(dp) / f)
    return sorted(out)


def rel(path: Path) -> str:
    return path.relative_to(INCOMING).as_posix()


# ---------------------------------------------------------------- analyze


def analyze() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    cache_file = WORK / "hashes.json"
    cache: dict[str, str] = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else {}

    def cached_hash(path: Path, key: str) -> str | None:
        stamp = f"{key}|{path.stat().st_size}|{int(path.stat().st_mtime)}"
        if stamp not in cache:
            try:
                cache[stamp] = dhash(path)
            except Exception as err:  # broken or unsupported file: report, do not stop
                print(f"  cannot read {key}: {err}")
                return None
        return cache[stamp]

    products = load_products()
    used = current_images(products)
    photos = incoming_photos()
    print(f"{len(used)} current images, {len(photos)} incoming photos")

    incoming_hashes: list[tuple[str, str, tuple[int, int]]] = []
    for i, path in enumerate(photos, 1):
        h = cached_hash(path, "in:" + rel(path))
        if h:
            with Image.open(path) as im:
                incoming_hashes.append((rel(path), h, im.size))
        if i % 100 == 0:
            print(f"  fingerprinted {i}/{len(photos)} incoming")
            cache_file.write_text(json.dumps(cache), encoding="utf-8")

    colour_cache_file = WORK / "colour.json"
    colour_cache: dict[str, dict] = json.loads(colour_cache_file.read_text(encoding="utf-8")) if colour_cache_file.exists() else {}

    def cached_colour(path: Path, key: str) -> dict:
        if key not in colour_cache:
            colour_cache[key] = colour_print(path)
        return colour_cache[key]

    matches = []
    for url, where in sorted(used.items()):
        local = PUBLIC / url.lstrip("/")
        if not local.exists():
            matches.append({"url": url, "usedBy": where, "status": "missing-locally"})
            continue
        h = cached_hash(local, "cur:" + url)
        if not h:
            continue
        with Image.open(local) as im:
            cur_size = im.size
        cur_colour = cached_colour(local, "cur:" + url)
        ranked = sorted(((distance(h, ih), r, size) for r, ih, size in incoming_hashes), key=lambda t: t[0])[:5]
        candidates = []
        for d, r, size in ranked:
            mad, aspect = colour_diff(cur_colour, cached_colour(INCOMING / r, "in:" + r))
            same = d <= SAME_PICTURE and mad <= SAME_COLOUR and aspect <= SAME_ASPECT
            candidates.append({"file": r, "distance": d, "colour": mad, "aspect": aspect, "size": size, "same": same})
        candidates.sort(key=lambda c: (not c["same"], c["colour"]))
        matches.append({"url": url, "usedBy": where, "currentSize": cur_size, "candidates": candidates})
    cache_file.write_text(json.dumps(cache), encoding="utf-8")
    colour_cache_file.write_text(json.dumps(colour_cache), encoding="utf-8")
    (WORK / "matches.json").write_text(json.dumps(matches, indent=1, ensure_ascii=False), encoding="utf-8")

    same = [m for m in matches if m.get("candidates") and m["candidates"][0]["same"]]
    print(f"\n{len(same)} of {len(matches)} current images have the same picture in the zip:")
    for m in matches:
        if not m.get("candidates"):
            print(f"  {m['status']:16} {m['url']}")
            continue
        best = m["candidates"][0]
        flag = "SAME " if best["same"] else "     "
        print(
            f"  {flag}d={best['distance']:3} c={best['colour']:5} a={best['aspect']:.3f}  {m['url']}  <-  {best['file']}  {best['size']}  (now {m['currentSize']})"
        )


# Greedy, so double extensions like "5L-Canola-1L-Ghee.jpg.jpeg" are read whole.
SITE_IMAGE = re.compile(r"/images/[A-Za-z0-9._/%+-]+\.(?:jpe?g|png|webp)(?![A-Za-z0-9])", re.IGNORECASE)


def site_images() -> dict[str, list[str]]:
    """Every raster picture the site uses anywhere (content files and page code) -> files that use it."""
    used: dict[str, list[str]] = {}
    sources = [f for f in (ROOT / "src" / "content").glob("*.json") if f.name != "image-sizes.json"]
    sources += [f for f in (ROOT / "src").rglob("*") if f.suffix in (".ts", ".tsx", ".css")]
    for f in sources:
        for url in set(SITE_IMAGE.findall(f.read_text(encoding="utf-8"))):
            used.setdefault(url, []).append(f.relative_to(ROOT).as_posix())
    return used


def analyze_all() -> None:
    """Like analyze, for every picture on the site (not only product photos). Writes matches_all.json and lists
    the pairs worth checking by eye: same picture by the numbers AND the zip copy is clearly sharper."""
    WORK.mkdir(parents=True, exist_ok=True)
    cache_file, colour_file = WORK / "hashes.json", WORK / "colour.json"
    cache = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else {}
    colours = json.loads(colour_file.read_text(encoding="utf-8")) if colour_file.exists() else {}

    def h_of(path: Path, key: str):
        stamp = f"{key}|{path.stat().st_size}|{int(path.stat().st_mtime)}"
        if stamp not in cache:
            try:
                cache[stamp] = dhash(path)
            except Exception as err:
                print(f"  cannot read {key}: {err}")
                return None
        return cache[stamp]

    def c_of(path: Path, key: str):
        if key not in colours:
            colours[key] = colour_print(path)
        return colours[key]

    incoming = []
    for path in incoming_photos():
        h = h_of(path, "in:" + rel(path))
        if h:
            with Image.open(path) as im:
                incoming.append((rel(path), h, im.size))
    used = site_images()
    todo = sorted(u for u in used if "/hd/" not in u and (PUBLIC / u.lstrip("/")).exists())
    missing = sorted(u for u in used if "/hd/" not in u and not (PUBLIC / u.lstrip("/")).exists())
    print(f"{len(used)} pictures used on the site, {len(todo)} to check ({len(missing)} referenced but not on disk), {len(incoming)} zip photos")
    matches = []
    for i, url in enumerate(todo, 1):
        local = PUBLIC / url.lstrip("/")
        h = h_of(local, "cur:" + url)
        if not h:
            continue
        with Image.open(local) as im:
            cur_size = im.size
        cur_c = c_of(local, "cur:" + url)
        ranked = sorted(((distance(h, ih), r, size) for r, ih, size in incoming), key=lambda t: t[0])[:5]
        cands = []
        for d, r, size in ranked:
            mad, aspect = colour_diff(cur_c, c_of(INCOMING / r, "in:" + r))
            gain = max(size) / max(cur_size)
            cands.append({"file": r, "distance": d, "colour": mad, "aspect": aspect, "size": size, "gain": round(gain, 2)})
        cands.sort(key=lambda c: (c["distance"] > 45 or c["colour"] > 14 or c["aspect"] > 0.04, c["colour"]))
        matches.append({"url": url, "usedBy": used[url], "currentSize": cur_size, "candidates": cands})
        if i % 50 == 0:
            print(f"  checked {i}/{len(todo)}")
            cache_file.write_text(json.dumps(cache), encoding="utf-8")
            colour_file.write_text(json.dumps(colours), encoding="utf-8")
    cache_file.write_text(json.dumps(cache), encoding="utf-8")
    colour_file.write_text(json.dumps(colours), encoding="utf-8")
    (WORK / "matches_all.json").write_text(json.dumps(matches, indent=1, ensure_ascii=False), encoding="utf-8")
    worth = [m for m in matches if (c := m["candidates"][0])["distance"] <= 45 and c["colour"] <= 14 and c["aspect"] <= 0.04 and c["gain"] >= 1.3]
    print(f"\n{len(worth)} pictures have a possible sharper copy in the zip (to check by eye):")
    for m in worth:
        c = m["candidates"][0]
        print(f"  d={c['distance']:3} c={c['colour']:5} gain x{c['gain']:<4} {m['url']}  <-  {c['file']}  {c['size']} (now {m['currentSize']})")


# ---------------------------------------------------------------- apply


# Seen in the zip, not used: NEW artwork that differs from the live site (needs the owner's OK first).
NEW_ARTWORK = [
    ("Rice Bran Oil 1 L and 5 L", "Oil_s/Rice Bran Oil/1L/NEw/, Oil_s/Rice Bran Oil/5L/New/ and the rice bran lifestyle pictures", "green label; the site shows the red label"),
    ("Extra Virgin Coconut Oil", "Oil_s/Coconut oil/1L/New Coconut Label/, 500ML/…New 2026…", "new label; the site shows the older label"),
    ("A2 Cow Ghee", "Foods/Ghee/A2/1L/A2 Ghee New Front.jpg", "new jar and label"),
    ("Kachi Ghani Mustard Oil 1 L", "Oil_s/Mustard Oil/1L/square Bottle NEW/", "new square bottle; the site shows the round bottle"),
    ("Jivo Gold 1 L", "Oil_s/Jivo Gold/1L/New Round Bottle/", "new round bottle"),
    ("Yellow Mustard 1 L", "Oil_s/Yellow Mustard/1L/New Bottle/", "new bottle"),
]
# Zip folders for products the shop does not sell (listed only; no products were added).
NOT_ON_SITE = [
    "Beverages/Water", "Beverages/Wheatgrass/160ml wheatgrass (Shikanji / Jeera PET)", "Beverages/Wheatgrass/50% less sugar (Blueberry 250ml, Cola Run, Mojito 250ml)",
    "Beverages/Wheatgrass/Energy Drink", "Beverages/Wheatgrass/Zero Sugar (Blueberry, Ginger ale, Healthy Cola, Jeera, Mango)", "Beverages/Wheatgrass/Punjabi Shikanji",
    "Foods/Coffee", "Oil_s/15L CP Mustard Oil", "Oil_s/15L Refined Soyabean Oil", "Oil_s/15ltr Refined Canola Tin", "Oil_s/Sesame oil",
    "Oil_s/So Olive", "Oil_s/Premum Olive Oil", "Oil_s/Extra Virgin Canola oil", "Oil_s/pouch/Mustard Pouch",
    "Pack sizes the shop does not sell: 200 ml / 250 ml / 500 ml / 2 L / 3 L / 4 L bottles and cans of several oils",
]


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def hd_name_for_site_url(url: str) -> str:
    """'/images/products/Front-1.jpg' -> 'front-1-jpg.webp' (the old extension stays in the name, because the site
    has both Front-1.jpg and Front-1.webp, and Windows file names ignore capital letters). Pictures from other
    folders get the folder in front ('/images/home/front.webp' -> 'home-front-webp.webp')."""
    folder = os.path.dirname(url)
    stem, ext = os.path.splitext(os.path.basename(url))
    prefix = "" if folder == "/images/products" else slugify(folder.replace("/images/", "", 1)) + "-"
    return f"{prefix}{slugify(stem)}-{ext.lstrip('.').lower()}.webp"


def write_webp(src: Path, dest: Path) -> tuple[int, int]:
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    im = im.convert("RGBA" if has_alpha else "RGB")
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=WEBP_QUALITY, method=6)  # no exif/icc passed = metadata stripped
    return im.size


def replace_urls(value, mapping: dict[str, str]):
    """Exact-match replace of image URLs anywhere inside the JSON (gallery, pack image, rich-page sections)."""
    if isinstance(value, str):
        return mapping.get(value, value)
    if isinstance(value, list):
        return [replace_urls(v, mapping) for v in value]
    if isinstance(value, dict):
        return {k: replace_urls(v, mapping) for k, v in value.items()}
    return value


def apply() -> None:
    raw = json.loads(PRODUCTS_JSON.read_text(encoding="utf-8"))
    products = raw if isinstance(raw, list) else raw["products"]
    sizes: dict[str, list[int]] = json.loads(SIZES_JSON.read_text(encoding="utf-8"))
    names_used: dict[str, str] = {}

    def claim(name: str, owner: str) -> None:
        key = name.lower()
        if key in names_used and names_used[key] != owner:
            raise SystemExit(f"File name clash: {name} ({owner} and {names_used[key]})")
        names_used[key] = owner

    # 1. sharper copies of current pictures
    swapped: dict[str, str] = {}
    for url, zip_file in sorted(SAME_PICTURES.items()):
        src = INCOMING / zip_file
        if not src.exists():
            raise SystemExit(f"Missing in assets-incoming: {zip_file}")
        name = hd_name_for_site_url(url)
        claim(name, url)
        new_url = f"/images/products/hd/{name}"
        sizes[new_url] = list(write_webp(src, HD_DIR / name))
        swapped[url] = new_url
    print(f"wrote {len(swapped)} sharper images")

    raw = replace_urls(raw, swapped)
    products = raw if isinstance(raw, list) else raw["products"]

    # Same layout as the existing files (1-space indent, no newline at the end), so the diff stays small.
    PRODUCTS_JSON.write_text(json.dumps(raw, indent=1, ensure_ascii=False), encoding="utf-8")
    SIZES_JSON.write_text(json.dumps(sizes, indent=1, ensure_ascii=False), encoding="utf-8")

    # other content files can show the same pictures (home page, categories)
    for f in sorted((ROOT / "src" / "content").glob("*.json")):
        if f in (PRODUCTS_JSON, SIZES_JSON):
            continue
        text = f.read_text(encoding="utf-8")
        new = replace_urls(json.loads(text), swapped)
        if new != json.loads(text):
            f.write_text(json.dumps(new, indent=1, ensure_ascii=False), encoding="utf-8")
            print(f"updated {f.name}")

    write_report(products, swapped)


def write_report(products: list[dict], swapped: dict[str, str]) -> None:
    lines = [
        "# 11 – Brand photo import (sharper product photos)",
        "",
        "Made by `scripts/import-brand-images.py apply` from the brand zip `JIVO-20261014T125013Z-1-001.zip`",
        "(unpacked into `assets-incoming/`, not part of the website). New files are in `public/images/products/hd/`",
        "(WebP, longest side 2000px, quality 85, metadata removed). The old files are still there.",
        "",
        "## How pictures were matched",
        "",
        "1. The script compares every picture the site uses with all 668 photos in the zip (a black-and-white",
        "   fingerprint, a colour thumbnail and the outline shape).",
        "2. Every suggested pair was then checked by eye. Only the **same picture** (sharper) was swapped in.",
        "   Look-alikes that were a different pack size (3L/4L can instead of 5L), a back instead of a front,",
        "   different text, or new artwork were rejected.",
        "",
        f"## Sharper images swapped in ({len(swapped)})",
        "",
        "| Site picture (old) | New file | From the zip |",
        "|---|---|---|",
    ]
    for old, new in sorted(swapped.items()):
        lines.append(f"| `{old}` | `{new}` | `{SAME_PICTURES[old]}` |")

    used = current_images(products)
    still_old = sorted(u for u in used if not u.startswith("/images/products/hd/"))
    visible = {p["slug"] for p in products if p.get("visible")}
    lines += [
        "",
        f"## Pictures without a sharper copy in the zip ({len(still_old)})",
        "",
        "These stay as they are (1024px or smaller). **Bold** = used by a product shown in the shop.",
        "",
    ]
    for u in still_old:
        who = sorted({w.split(":")[0] for w in used[u]})
        shown = any(w in visible for w in who)
        lines.append(f"- {'**' if shown else ''}`{u}`{'**' if shown else ''} ({', '.join(who)})")

    lines += ["", "## New artwork in the zip – needs your OK before use", "", "| Product | Where in the zip | What is different |", "|---|---|---|"]
    lines += [f"| {a} | `{b}` | {c} |" for a, b, c in NEW_ARTWORK]
    lines += ["", "## In the zip, not used in this task", "", "- **A+ banners** (desktop + mobile) for most oils, Mango juice and Coffee.",
              "- **Combo Images/Amazon**: 141 combo pictures. Only one (Extra Light 1 L + 1 L front) is the same picture as on the site.",
              "- **Videos** (Canola ad, A2 ghee, Coconut render) and 2 print TIF files: not unpacked.", "",
              "## Zip folders with no product in the shop (no products were added)", ""]
    lines += [f"- {n}" for n in NOT_ON_SITE]
    lines += ["", "## Missing photos that would help", "",
              "- A sharp front photo of the 5 L Kachi Ghani Mustard can (the zip only has 3 L/4 L cans).", ""]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "analyze":
        analyze()
    elif cmd == "analyze-all":
        analyze_all()
    elif cmd == "apply":
        apply()
    else:
        print(__doc__)
        sys.exit(1)
