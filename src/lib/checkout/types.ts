/**
 * Plain JSON types shared by the checkout page (browser) and the checkout API (server).
 * Money is always in paise.
 */
import type { PaymentMethodId } from "./payment-methods";

/** One address as typed in the checkout form (all strings, before normalisation). */
export type AddressInput = {
  fullName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  phone: string;
  email: string;
};

/** Body of POST /api/checkout/ (and the form state on the checkout page). */
export type CheckoutInput = {
  billing: AddressInput;
  shipToDifferent: boolean;
  shipping: AddressInput; // phone/email are ignored for the shipping address
  createAccount: boolean;
  orderNotes: string;
  reviewConsent: boolean;
  /** "razorpay" (pay online now) or "cod" (cash on delivery, only where the zone allows it). */
  paymentMethod: PaymentMethodId;
  /** What the customer saw when they clicked "Place order" (server refuses if it changed). */
  expected: { lines: { variationId: number; qty: number; unitPricePaise: number }[]; totalPaise: number };
};

/** "billing.fullName" -> "Please enter your full name." */
export type FieldErrors = Record<string, string>;

export type ReviewLine = {
  variationId: number;
  name: string;
  variationLabel: string;
  attributeName: string;
  href: string;
  image: string | null;
  qty: number;
  /** most the customer may order of this pack (stock / per-line limit) */
  maxQty: number;
  unitPricePaise: number;
  lineTotalPaise: number;
};

/** The "Your order" box: everything is computed on the server by getCartTotals(). */
export type CheckoutReview = {
  lines: ReviewLine[];
  subtotalPaise: number;
  discountPaise: number;
  coupon: { code: string; description: string | null; freeShipping: boolean } | null;
  shipping: { label: string; costPaise: number } | null;
  shippingAvailable: boolean;
  /** state + PIN the shipping was calculated for (null = estimate without an address) */
  destination: { state: string; postcode: string } | null;
  totalPaise: number;
  notices: string[];
  /** Cash on delivery for this address: can it be chosen, and the zone's "Sorry! COD ..." text when not. */
  payment: { cod: boolean; codNotice: string | null };
};

/** What the browser needs to open the Razorpay popup. The key secret is never sent. */
export type PaymentParams = {
  orderNumber: string;
  razorpayOrderId: string;
  keyId: string;
  amount: number; // paise
  currency: "INR";
  prefill: { name: string; email: string; contact: string };
};

export type CheckoutApiResponse =
  | { ok: true; payment: PaymentParams; redirect?: undefined }
  /** cash on delivery: the order is placed, go to the thank-you page */
  | { ok: true; redirect: string; payment?: undefined }
  | { ok: false; error: string; code?: "validation" | "changed" | "empty" | "shipping" | "payment_method" | "not_configured" | "payment_provider" | "account_exists" | "rate_limited"; fieldErrors?: FieldErrors; review?: CheckoutReview };

export type TotalsApiResponse = { ok: true; review: CheckoutReview } | { ok: false; error: string; review?: CheckoutReview };

export type VerifyApiResponse = { ok: true; redirect: string } | { ok: false; error: string };
