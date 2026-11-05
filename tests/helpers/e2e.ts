/** Small helpers shared by the Playwright specs (role/label selectors only, no CSS classes). */
import { expect, type Locator, type Page } from "@playwright/test";

/** Product cards of the main grid (shop / category / search): articles inside list items (carousel slides are not list items). */
export function gridCards(page: Page): Locator {
  return page.getByRole("main").getByRole("listitem").getByRole("article");
}

/** Current (last shown) price of a card or block, in rupees. */
export async function currentPrice(scope: Locator): Promise<number> {
  const text = (await scope.innerText()).replace(/\s+/g, " ");
  const all = [...text.matchAll(/₹\s?([\d,]+(?:\.\d{2})?)/g)].map((m) => Number(m[1].replace(/,/g, "")));
  if (!all.length) throw new Error(`No price found in: ${text.slice(0, 200)}`);
  return all[all.length - 1];
}

/** The header cart button ("Shopping cart, N items"). */
export function cartButton(page: Page): Locator {
  return page.getByRole("button", { name: /^Shopping cart, \d+ items?$/ }).first();
}

/** Opens a product page and adds the selected (default) pack to the cart; waits for the mini cart. */
export async function addProductToCart(page: Page, slug: string, packLabel?: string): Promise<void> {
  await page.goto(`/product/${slug}/`);
  if (packLabel) {
    const radio = page.getByRole("radio", { name: packLabel, exact: true }).filter({ visible: true }).first();
    await clickUntil(radio, () => expect(radio).toHaveAttribute("aria-checked", "true", { timeout: 3_000 }));
  }
  const add = page.getByRole("button", { name: /^add to cart$/i }).filter({ visible: true }).first();
  // A click that lands before React has hydrated the page does nothing, so retry until the drawer opens.
  await clickUntil(add, () => expect(miniCart(page)).toBeVisible({ timeout: 5_000 }));
}

/**
 * Clicks, then checks the expected result; repeats while the page is still hydrating
 * (server-rendered buttons are visible before their click handlers are attached).
 */
export async function clickUntil(target: Locator, check: () => Promise<void>, timeout = 60_000): Promise<void> {
  let clicked = false;
  await expect(async () => {
    if (clicked) {
      try {
        await check();
        return;
      } catch {
        /* not there yet: click again */
      }
    }
    await target.click();
    clicked = true;
    await check();
  }).toPass({ timeout, intervals: [500, 1_000, 2_000] });
}

export function miniCart(page: Page): Locator {
  return page.getByRole("dialog", { name: /shopping cart/i });
}

/** Unique throwaway email on the reserved example.com domain (never delivered). */
export function randomEmail(tag = "e2e"): string {
  return `${tag}+${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}@example.com`;
}
