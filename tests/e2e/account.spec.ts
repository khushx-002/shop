/**
 * Account flows: register -> dashboard -> log out, lost password, track order.
 * Note: registration is rate limited to 5 per hour per IP address by the site, and each run
 * creates one throwaway customer (…@example.com) in the database it runs against.
 */
import { expect, test } from "@playwright/test";
import { clickUntil, randomEmail } from "../helpers/e2e";

test.describe("my account", () => {
  test("register with a new email, see the dashboard, then log out", async ({ page }) => {
    const email = randomEmail("register");
    await page.goto("/my-account/");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Register" })).toBeVisible();
    // The Register box shows a grey "Register" button first; it switches to the form (like the old site's tabs).
    const emailField = main.getByLabel(/^Email address/);
    await clickUntil(main.getByRole("button", { name: "Register", exact: true }), () => expect(emailField).toBeVisible({ timeout: 3_000 }));
    await emailField.fill(email);
    await main.getByRole("button", { name: "Register", exact: true }).click();

    await expect(page).toHaveURL(/\/my-account\/(\?registered=1)?$/);
    await expect(main.getByText("Hello")).toBeVisible();
    await expect(main.getByText(email).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Account pages" })).toBeVisible();

    await main.getByRole("button", { name: "Log out" }).first().click();
    await expect(main.getByRole("heading", { name: "Login" })).toBeVisible();
    await expect(main.getByLabel(/^Username or email address/)).toBeVisible();
    await expect(main.getByText(email)).toHaveCount(0);
  });

  test("lost password shows the confirmation message (same text for unknown emails)", async ({ page }) => {
    const res = await page.goto("/my-account/lost-password/");
    expect(res?.status()).toBe(200);
    const main = page.getByRole("main");
    await main.getByLabel(/^Username or email/).fill(randomEmail("nobody"));
    await main.getByRole("button", { name: "Reset password" }).click();
    await expect(main.getByText(/Password reset email has been sent/)).toBeVisible();
  });

  test("wrong login shows an error and keeps the visitor logged out", async ({ page }) => {
    await page.goto("/my-account/");
    const main = page.getByRole("main");
    await main.getByLabel(/^Username or email address/).fill(randomEmail("nologin"));
    await main.getByLabel(/^Password/).fill("WrongPass123");
    await main.getByRole("button", { name: "Log in" }).click();
    await expect(main.getByText(/The username or password you entered is incorrect/)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Account pages" })).toHaveCount(0);
  });
});

test.describe("track order", () => {
  test("a wrong order id shows the generic error", async ({ page }) => {
    const res = await page.goto("/track-order/");
    expect(res?.status()).toBe(200);
    await page.getByLabel("Order ID").fill("JM00000000");
    await page.getByLabel("Billing email").fill(randomEmail("track"));
    await page.getByRole("button", { name: "Track" }).click();
    await expect(page.getByText("Sorry, the order could not be found. Please contact us if you are having difficulty finding your order details.")).toBeVisible();
  });
});
