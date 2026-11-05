/** 404 page, robots.txt and sitemap.xml. */
import { expect, test } from "@playwright/test";

test("unknown URLs show the 404 page with status 404", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist-e2e/");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/can.t be found/i);
  await expect(page.getByRole("banner")).toBeVisible(); // still inside the site layout
});

test("robots.txt responds (blocks everything unless indexing is switched on)", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/User-Agent:\s*\*/i);
  if (/^Allow:\s*\/\s*$/im.test(body)) {
    // production mode (ALLOW_INDEXING=true): private pages blocked, sitemap advertised
    expect(body).toMatch(/Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/i);
    for (const path of ["/cart/", "/checkout/", "/my-account/", "/admin/"]) expect(body).toContain(`Disallow: ${path}`);
  } else {
    // local / staging (ALLOW_INDEXING not "true"): the whole site is blocked
    expect(body).toMatch(/^Disallow:\s*\/\s*$/im);
  }
});

test("sitemap.xml lists the shop, a category and a product with trailing slashes", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/xml/);
  const body = await res.text();
  expect(body).toContain("<urlset");
  expect(body).toMatch(/<loc>[^<]*\/shop\/<\/loc>/);
  expect(body).toMatch(/<loc>[^<]*\/product-category\/super-oils\/<\/loc>/);
  expect(body).toMatch(/<loc>[^<]*\/product\/jivo-rice-bran-oil\/<\/loc>/);
  // no private pages
  expect(body).not.toMatch(/<loc>[^<]*\/(cart|checkout|my-account|admin)\//);
});
