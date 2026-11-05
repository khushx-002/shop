/**
 * Full checkout + payment with a FAKE Razorpay (runs only when E2E_RAZORPAY_MOCK=1).
 *
 * Setup (the server under test must talk to the mock, so start a separate server for this):
 *   RAZORPAY_API_BASE=http://127.0.0.1:3199 NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_e2e RAZORPAY_KEY_SECRET=e2e_secret <start the site>
 *   E2E_RAZORPAY_MOCK=1 E2E_RAZORPAY_KEY_SECRET=e2e_secret E2E_BASE_URL=<that site> npx playwright test payment
 *
 * The browser never loads the real checkout.js: it is replaced by a stub that "pays" through the mock
 * and returns a correctly signed response, exactly what the real popup gives the page.
 */
import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { startMockRazorpay } from "../helpers/mock-razorpay";
import { addProductToCart, randomEmail } from "../helpers/e2e";

const ENABLED = process.env.E2E_RAZORPAY_MOCK === "1";
const SECRET = process.env.E2E_RAZORPAY_KEY_SECRET || "e2e_secret";
const PORT = Number(process.env.E2E_RAZORPAY_MOCK_PORT || 3199);

test.describe("checkout with payment (mock Razorpay)", () => {
  test.skip(!ENABLED, "Set E2E_RAZORPAY_MOCK=1 (and start the site against the mock) to run this test.");
  test.describe.configure({ mode: "serial" });

  let mock: Awaited<ReturnType<typeof startMockRazorpay>>;
  test.beforeAll(async () => {
    mock = await startMockRazorpay(PORT);
  });
  test.afterAll(async () => {
    await mock?.close();
  });

  test("guest pays and lands on the order-received page", async ({ page }) => {
    await page.exposeFunction("__e2ePay", (orderId: string, amount: number) => {
      const id = `pay_${Math.random().toString(36).slice(2, 16)}`;
      mock.addPayment({ id, order_id: orderId, amount, currency: "INR", status: "captured" });
      return { razorpay_payment_id: id, razorpay_order_id: orderId, razorpay_signature: createHmac("sha256", SECRET).update(`${orderId}|${id}`).digest("hex") };
    });
    await page.route("https://checkout.razorpay.com/v1/checkout.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `window.Razorpay = function (opts) {
          this.on = function () {};
          this.open = async function () { opts.handler(await window.__e2ePay(opts.order_id, opts.amount)); };
        };`,
      }),
    );

    await addProductToCart(page, "jivo-rice-bran-oil");
    await page.goto("/checkout/");
    const billing = page.getByRole("region", { name: "Billing details" });
    await billing.getByLabel(/^Full Name/).fill("E2E Test Buyer");
    await billing.getByLabel(/^Street address/).fill("A-35/1, Industrial Area Phase 1");
    await billing.getByLabel(/^Town \/ City/).fill("New Delhi");
    await billing.getByLabel(/^State/).selectOption("DL");
    await billing.getByLabel(/^PIN Code/).fill("110064");
    await billing.getByLabel(/^Phone/).fill("9876543210");
    await billing.getByLabel(/^Email Address/).fill(randomEmail("pay"));
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page).toHaveURL(/\/checkout\/order-received\/[A-Za-z0-9-]+\/\?key=/, { timeout: 60_000 });
    await expect(page.getByText("Thank you. Your order has been received.")).toBeVisible();
    expect(mock.orders.size).toBeGreaterThan(0);
  });
});
