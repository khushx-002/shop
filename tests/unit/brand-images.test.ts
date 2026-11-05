import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import products from "@/content/products.json";
import sizes from "@/content/image-sizes.json";

/** Checks the sharper product photos written by scripts/import-brand-images.py (same pictures, higher resolution). */
describe("sharper product photos", () => {
  const sizeMap = sizes as Record<string, number[]>;
  const exists = (url: string) => fs.existsSync(path.join(process.cwd(), "public", url));

  it("every sharper image the products point to exists and has a size", () => {
    const urls = new Set(JSON.stringify(products).match(/\/images\/products\/hd\/[^"]+/g) ?? []);
    expect(urls.size).toBeGreaterThan(50);
    for (const url of urls) {
      expect(exists(url), url).toBe(true);
      expect(sizeMap[url], `size of ${url}`).toHaveLength(2);
    }
  });

  it("new file names are lowercase and never clash on Windows (case-insensitive)", () => {
    const dir = path.join(process.cwd(), "public/images/products/hd");
    const names = fs.readdirSync(dir);
    expect(names.every((n) => n === n.toLowerCase() && /^[a-z0-9-]+\.webp$/.test(n))).toBe(true);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
  });

  it("products have no extra 3D or turn-the-pack data (the shop matches shop.jivo.in)", () => {
    const text = JSON.stringify(products);
    expect(text).not.toContain('"views"');
    expect(text).not.toContain('"model3d"');
  });
});
