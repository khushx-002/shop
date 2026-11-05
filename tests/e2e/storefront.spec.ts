/** Home, shop, category, search and product page. */
import { expect, test } from "@playwright/test";
import { addProductToCart, cartButton, clickUntil, currentPrice, gridCards, miniCart } from "../helpers/e2e";

test.describe("home page", () => {
  test("loads with header, hero slider and footer", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Jivo Mart/);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Jivo Mart home" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Featured offers" })).toBeVisible();
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("info@jivo.in");
    await expect(footer).toContainText("All Rights Reserved");
  });

  test("the Products link leads to the shop page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Products", exact: true }).click();
    await expect(page).toHaveURL(/\/shop\/$/);
    await expect(gridCards(page).first()).toBeVisible();
  });
});

test.describe("shop and categories", () => {
  test("shop grid shows 12 cards and 'Showing 12 of 37 items'", async ({ page }) => {
    await page.goto("/shop/");
    await expect(gridCards(page)).toHaveCount(12);
    await expect(page.getByText("Showing 12 of 37 items")).toBeVisible();
  });

  test("sorting by price changes the first card and orders by price", async ({ page }) => {
    await page.goto("/shop/");
    const firstBefore = await gridCards(page).first().getByRole("heading").innerText();
    const sort = page.getByLabel("Shop order").filter({ visible: true }).first();
    await expect(async () => {
      await sort.selectOption("price");
      await expect(page).toHaveURL(/orderby=price/, { timeout: 3_000 });
    }).toPass({ timeout: 60_000 });
    await expect(gridCards(page).first().getByRole("heading")).not.toHaveText(firstBefore);
    const first = await currentPrice(gridCards(page).nth(0));
    const second = await currentPrice(gridCards(page).nth(1));
    const last = await currentPrice(gridCards(page).nth(11));
    expect(first).toBeLessThanOrEqual(second);
    expect(second).toBeLessThanOrEqual(last);
  });

  test("category super-oils shows 12 cards and pagination to page 2", async ({ page }) => {
    const res = await page.goto("/product-category/super-oils/");
    expect(res?.status()).toBe(200);
    await expect(gridCards(page)).toHaveCount(12);
    const pagination = page.getByRole("navigation", { name: "Product pagination" });
    await expect(pagination).toBeVisible();
    await pagination.getByRole("link", { name: "Page 2" }).click();
    await expect(page).toHaveURL(/\/product-category\/super-oils\/page\/2\/$/);
    await expect(gridCards(page).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Product pagination" }).locator("[aria-current=page]")).toContainText("2");
  });

  test("search for 'canola' finds canola products", async ({ page }) => {
    const res = await page.goto("/shop/?s=canola");
    expect(res?.status()).toBe(200);
    const cards = gridCards(page);
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) await expect(cards.nth(i)).toContainText(/canola/i);
  });
});

test.describe("product page", () => {
  test("switching the pack size updates the price", async ({ page }) => {
    await page.goto("/product/jivo-rice-bran-oil/");
    const packs = page.getByRole("radiogroup").first();
    const oneLitre = packs.getByRole("radio", { name: /^1 Litre,/ });
    const fiveLitres = packs.getByRole("radio", { name: /^5 Litres,/ });
    await expect(oneLitre).toHaveAttribute("aria-checked", "true");
    // Like the old site, the price is drawn inside the pack picture; the button's name carries it as text.
    await expect(oneLitre).toHaveAccessibleName(/₹189(?!\d)/);
    await expect(fiveLitres).toHaveAccessibleName(/₹949(?!\d)/);
    await clickUntil(fiveLitres, () => expect(fiveLitres).toHaveAttribute("aria-checked", "true", { timeout: 3_000 }));
    await expect(oneLitre).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("button", { name: /add to cart/i }).first()).toBeEnabled();
  });

  test("add to cart opens the mini cart with the item and updates the badge", async ({ page }) => {
    await page.goto("/");
    await expect(cartButton(page)).toHaveAccessibleName("Shopping cart, 0 items");
    await addProductToCart(page, "jivo-rice-bran-oil");
    await expect(miniCart(page)).toContainText("Jivo Rice Bran Oil");
    await expect(miniCart(page)).toContainText("₹189.00");
    await expect(cartButton(page)).toHaveAccessibleName("Shopping cart, 1 item");
    // Esc closes the drawer
    await page.keyboard.press("Escape");
    await expect(miniCart(page)).toBeHidden();
  });
});
