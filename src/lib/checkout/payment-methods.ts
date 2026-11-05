/**
 * The payment methods of the checkout, with the same titles and texts as the old shop.jivo.in
 * (WooCommerce "Cash on delivery" + the Razorpay plugin), copied word for word on 2026-10-16.
 * Cash on delivery is offered only in shipping zones that allow it (shipping_zones.cod_enabled).
 * Safe for the browser: no secrets here.
 */
export const PAYMENT_METHOD_IDS = ["cod", "razorpay"] as const;
export type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number];

export const PAYMENT_METHODS: Record<PaymentMethodId, { title: string; description: string }> = {
  cod: { title: "Cash on delivery", description: "Pay with cash upon delivery. You Order may take 3-6 days for Delhi NCR" },
  razorpay: { title: "Credit Card/Debit Card/NetBanking", description: "Pay securely by Credit or Debit card or Internet Banking through Razorpay." },
};

/** Logo the Razorpay plugin shows next to its title (the old site loads it from Razorpay's CDN too). */
export const RAZORPAY_LOGO_URL = "https://cdn.razorpay.com/static/assets/logo/rzp_payment_icon.svg";

/** Customer-facing name of an order's payment method ("razorpay" / "cod" in orders.payment_provider). */
export function paymentMethodTitle(provider: string): string {
  return provider === "cod" || provider === "razorpay" ? PAYMENT_METHODS[provider].title : provider;
}
