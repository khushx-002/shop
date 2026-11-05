/** Cart page (quantity, coupons) and checkout validation. Each test starts with an empty cart (new browser context). */
import { expect, test } from "@playwright/test";
import { addProductToCart, randomEmail } from "../helpers/e2e";

test.describe("cart page", () => {
  test.beforeEach(async ({ page }) => {
    await addProductToCart(page, "jivo-rice-bran-oil"); // 1 Litre, ₹189.00
    await page.goto("/cart/");
    await expect(page.getByRole("table", { name: "Products in your cart" })).toContainText("Jivo Rice Bran Oil");
  });

  test("changing the quantity updates the totals", async ({ page }) => {
    const totals = page.getByRole("region", { name: "Cart totals" });
    await expect(totals).toContainText("₹189.00");
    await page.getByRole("button", { name: /^Increase quantity of Jivo Rice Bran Oil/ }).filter({ visible: true }).first().click();
    await expect(totals).toContainText("₹378.00");
    await expect(page.getByRole("spinbutton", { name: /^Quantity of Jivo Rice Bran Oil/ }).filter({ visible: true }).first()).toHaveValue("2");
  });

  test("an invalid coupon shows an error", async ({ page }) => {
    await page.getByLabel("Coupon code").fill("NOTACODE");
    await page.getByRole("button", { name: "Apply coupon" }).click();
    await expect(page.getByText('Coupon "NOTACODE" does not exist!')).toBeVisible();
    await expect(page.getByRole("region", { name: "Cart totals" })).not.toContainText("Coupon:");
  });

  test("JIVO200 below ₹5000 shows the minimum-spend message", async ({ page }) => {
    await page.getByLabel("Coupon code").fill("JIVO200");
    await page.getByRole("button", { name: "Apply coupon" }).click();
    await expect(page.getByText("The minimum spend for this coupon is ₹5000.00.")).toBeVisible();
  });
});

test.describe("checkout", () => {
  test("an empty cart goes back to the cart page", async ({ page }) => {
    await page.goto("/checkout/");
    await expect(page).toHaveURL(/\/cart\/$/);
    await expect(page.getByRole("heading", { name: /your shopping cart is empty/i })).toBeVisible();
  });

  test("submitting the empty form shows validation errors", async ({ page }) => {
    await addProductToCart(page, "jivo-rice-bran-oil");
    await page.goto("/checkout/");
    await expect(page.getByRole("heading", { name: "Billing details" })).toBeVisible();
    const place = page.getByRole("button", { name: "Place order" });
    await expect(place).toBeVisible();
    // Without Razorpay keys the site shows an honest "payment not configured" message and disables the button.
    test.skip(await place.isDisabled(), "Place order is disabled because Razorpay keys are not configured on this server.");
    await place.click();
    await expect(page.getByText("Please correct the following:")).toBeVisible();
    await expect(page.getByText("Billing Full Name is a required field.").first()).toBeVisible();
    await expect(page.getByText("Billing Email Address is a required field.").first()).toBeVisible();
    await expect(page.getByLabel(/^Full Name/).first()).toHaveAttribute("aria-invalid", "true");
  });

  test("cash on delivery: offered in Delhi NCR (order placed), Punjab shows the 'Sorry! COD' box", async ({ page }) => {
    await addProductToCart(page, "jivo-rice-bran-oil"); // ₹189: Delhi NCR adds the ₹100 flat rate
    await page.goto("/checkout/");
    const billing = page.getByRole("region", { name: "Billing details" });
    const order = page.getByRole("complementary", { name: "Your order" });
    const payment = order.getByRole("group", { name: "Payment method" });

    await billing.getByLabel(/^State/).selectOption("PB");
    await billing.getByLabel(/^PIN Code/).fill("151301");
    await expect(order.getByText("Sorry! COD (Cash On Delivery) is not available at the moment.")).toBeVisible();
    await expect(payment.getByRole("radio", { name: "Cash on delivery" })).toHaveCount(0);

    await billing.getByLabel(/^Full Name/).fill("E2E COD Buyer");
    await billing.getByLabel(/^Street address/).fill("A-35/1, Industrial Area Phase 1");
    await billing.getByLabel(/^Town \/ City/).fill("New Delhi");
    await billing.getByLabel(/^State/).selectOption("DL");
    await billing.getByLabel(/^PIN Code/).fill("110064");
    await billing.getByLabel(/^Phone/).fill("9876543210");
    await billing.getByLabel(/^Email Address/).fill(randomEmail("cod"));
    await expect(order.getByText("Sorry! COD")).toHaveCount(0);
    await payment.getByText("Cash on delivery").click();
    await expect(order.getByText("Pay with cash upon delivery. You Order may take 3-6 days for Delhi NCR")).toBeVisible();
    await expect(order).toContainText("₹289.00");
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page).toHaveURL(/\/checkout\/order-received\/[A-Za-z0-9-]+\/\?key=/, { timeout: 60_000 });
    await expect(page.getByText("Thank you. Your order has been received.")).toBeVisible();
    await expect(page.getByText("Cash on delivery").first()).toBeVisible();
  });

  test("shows an honest message when online payment is not configured", async ({ page }) => {
    await addProductToCart(page, "jivo-rice-bran-oil");
    await page.goto("/checkout/");
    const place = page.getByRole("button", { name: "Place order" });
    await expect(place).toBeVisible();
    test.skip(await place.isEnabled(), "Razorpay is configured on this server.");
    await expect(page.getByRole("form", { name: "Checkout" }).getByRole("status").filter({ hasText: /Online payment is not configured yet/ })).toBeVisible();
  });
});
