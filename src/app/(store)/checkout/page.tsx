/**
 * /checkout/ – billing/shipping form, order review and Razorpay payment.
 * Dynamic (reads the cart and session cookies), never indexed. An empty cart goes back to /cart/.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { getSessionUser } from "@/lib/auth/session";
import { computeReview, loadPrefill, NOT_CONFIGURED_MESSAGE } from "@/lib/checkout/orders";
import { isCompleteDestination } from "@/lib/checkout/validation";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { pageMetadata } from "@/lib/seo";
import { routes } from "@/lib/routes";

export const metadata: Metadata = pageMetadata({ title: "Checkout", path: routes.checkout, noindex: true });

export default async function CheckoutPage() {
  const user = await getSessionUser();
  const prefill = await loadPrefill(user);
  // Saved address of a logged-in customer first, otherwise the cart's shipping calculator destination.
  const saved = prefill.billing.state && prefill.billing.postcode ? { state: prefill.billing.state, postcode: prefill.billing.postcode } : null;
  const review = await computeReview(user, saved && isCompleteDestination(saved) ? saved : null, prefill.billing.email || null);
  if (!review.lines.length) redirect(routes.cart);
  // Like WooCommerce: the state/PIN typed in the cart's shipping calculator pre-fills the billing address.
  if (!prefill.billing.state && !prefill.billing.postcode && review.destination && isCompleteDestination(review.destination)) {
    prefill.billing = { ...prefill.billing, state: review.destination.state, postcode: review.destination.postcode };
  }

  return (
    <>
      <CheckoutHeader active={2} />
      <CheckoutForm initialReview={review} prefill={prefill} loggedIn={!!user} paymentsEnabled={isRazorpayConfigured()} notConfiguredMessage={NOT_CONFIGURED_MESSAGE} />
    </>
  );
}
