"""
Unit tests for scripts/import-brand-images.py (fingerprints, colour check, file names).
Run:  python -m unittest discover -s tests/unit -p "test_*.py"
Uses only small pictures made in memory; does not need assets-incoming/.
"""
import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("ibi", ROOT / "scripts" / "import-brand-images.py")
ibi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ibi)


def bottle(path: Path, label_colour, size=(400, 400), height=0.8, margin=40):
    """A simple 'pack photo': a bottle-shaped shape with a coloured label on white."""
    im = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(im)
    w, h = size
    top = int(h * (1 - height))
    d.rectangle([w // 2 - 60, top, w // 2 + 60, h - margin], fill=(240, 200, 60))
    d.rectangle([w // 2 - 60, (top + h) // 2 - 40, w // 2 + 60, (top + h) // 2 + 40], fill=label_colour)
    im.save(path)
    return path


class FingerprintTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def test_same_picture_at_another_size_matches(self):
        a = bottle(self.tmp / "a.png", (200, 30, 30))
        b = self.tmp / "b.jpg"  # the same picture, 3x larger and saved as JPEG (like the brand originals)
        Image.open(a).resize((1200, 1200), Image.Resampling.LANCZOS).save(b, quality=90)
        self.assertLessEqual(ibi.distance(ibi.dhash(a), ibi.dhash(b)), ibi.SAME_PICTURE)
        colour, aspect = ibi.colour_diff(ibi.colour_print(a), ibi.colour_print(b))
        self.assertLessEqual(colour, ibi.SAME_COLOUR)
        self.assertLessEqual(aspect, ibi.SAME_ASPECT)

    def test_same_bottle_with_another_label_colour_is_rejected_by_the_colour_check(self):
        a = bottle(self.tmp / "a.png", (200, 30, 30))
        b = bottle(self.tmp / "b.png", (30, 120, 60))
        colour, _ = ibi.colour_diff(ibi.colour_print(a), ibi.colour_print(b))
        self.assertGreater(colour, ibi.SAME_COLOUR)

    def test_taller_pack_is_rejected_by_the_outline_check(self):
        a = bottle(self.tmp / "a.png", (200, 30, 30), height=0.8)
        b = bottle(self.tmp / "b.png", (200, 30, 30), height=0.5)
        _, aspect = ibi.colour_diff(ibi.colour_print(a), ibi.colour_print(b))
        self.assertGreater(aspect, ibi.SAME_ASPECT)

    def test_white_margin_does_not_matter(self):
        a = bottle(self.tmp / "a.png", (200, 30, 30), margin=20)
        b = bottle(self.tmp / "b.png", (200, 30, 30), margin=20)
        im = Image.open(b)
        padded = Image.new("RGB", (600, 600), "white")
        padded.paste(im, (100, 100))
        padded.save(self.tmp / "c.png")
        self.assertLessEqual(ibi.distance(ibi.dhash(a), ibi.dhash(self.tmp / "c.png")), ibi.SAME_PICTURE)


class NamingTests(unittest.TestCase):
    def test_hd_names_keep_the_old_extension_so_names_never_clash(self):
        self.assertEqual(ibi.hd_name_for_site_url("/images/products/Front-1.jpg"), "front-1-jpg.webp")
        self.assertEqual(ibi.hd_name_for_site_url("/images/products/Front-1.webp"), "front-1-webp.webp")
        self.assertEqual(ibi.hd_name_for_site_url("/images/products/5L-Canola-1L-Ghee.jpg.jpeg"), "5l-canola-1l-ghee-jpg-jpeg.webp")
        # pictures from other folders carry the folder name, so /images/home/x and /images/products/x never clash
        self.assertEqual(ibi.hd_name_for_site_url("/images/home/1L-Desi-Ghee-Front-1.jpg"), "home-1l-desi-ghee-front-1-jpg.webp")

    def test_site_image_pattern_reads_double_extensions_whole(self):
        text = '{"a": "/images/products/5L-Canola-1L-Ghee.jpg.jpeg", "b": "/images/home/x.png"}'
        self.assertEqual(ibi.SITE_IMAGE.findall(text), ["/images/products/5L-Canola-1L-Ghee.jpg.jpeg", "/images/home/x.png"])

    def test_slugify(self):
        self.assertEqual(ibi.slugify("5+1 (6 Litres)"), "5-1-6-litres")
        self.assertEqual(ibi.slugify("  1L CP Canola Oil Front "), "1l-cp-canola-oil-front")

    def test_replace_urls_only_replaces_exact_matches(self):
        data = {"images": [{"url": "/a.jpg"}, {"url": "/a.jpg.bak"}], "image": "/a.jpg", "n": 3}
        out = ibi.replace_urls(data, {"/a.jpg": "/hd/a.webp"})
        self.assertEqual(out, {"images": [{"url": "/hd/a.webp"}, {"url": "/a.jpg.bak"}], "image": "/hd/a.webp", "n": 3})


class TableTests(unittest.TestCase):
    def test_same_pictures_only_swap_site_pictures(self):
        for url in ibi.SAME_PICTURES:
            self.assertRegex(url, r"^/images/(products|home)/", url)  # product photos and home page pictures
            self.assertNotIn("/hd/", url)


if __name__ == "__main__":
    unittest.main()
