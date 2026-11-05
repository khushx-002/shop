"use client";
/**
 * Browser side of Razorpay: loads https://checkout.razorpay.com/v1/checkout.js only when needed
 * (checkout / pay-again buttons) and opens the payment popup.
 *
 *   const result = await openRazorpay(params);   // "paid" | "dismissed" (+ failure text if any)
 *   if (result.kind === "paid") await verifyPayment(params.orderNumber, result.response);
 */
import { api } from "@/lib/routes";
import type { PaymentParams, VerifyApiResponse } from "@/lib/checkout/types";

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: "payment.failed", cb: (resp: { error?: { description?: string } }) => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

let loading: Promise<RazorpayCtor> | null = null;

/** Adds the Razorpay script once; resolves with the Razorpay constructor. */
export function loadRazorpay(): Promise<RazorpayCtor> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay can only load in the browser."));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;
  loading = new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay did not load.")));
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error("Could not load the payment window. Please check your connection and try again."));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type RazorpayResult = { kind: "paid"; response: RazorpaySuccess } | { kind: "dismissed"; failure: string | null };

/** Opens the popup and waits until the customer pays or closes it. */
export async function openRazorpay(p: PaymentParams): Promise<RazorpayResult> {
  const Razorpay = await loadRazorpay();
  return new Promise<RazorpayResult>((resolve) => {
    let failure: string | null = null;
    const rzp = new Razorpay({
      key: p.keyId,
      amount: p.amount,
      currency: p.currency,
      name: "Jivo Mart",
      description: `Order #${p.orderNumber}`,
      order_id: p.razorpayOrderId,
      prefill: p.prefill,
      notes: { orderNumber: p.orderNumber },
      theme: { color: "#0F4526" },
      handler: (response: RazorpaySuccess) => resolve({ kind: "paid", response }),
      modal: { ondismiss: () => resolve({ kind: "dismissed", failure }), escape: true, confirm_close: true },
    });
    // Razorpay keeps its popup open after a failed attempt so the customer can try another method.
    rzp.on("payment.failed", (resp) => {
      failure = resp.error?.description ?? "The payment failed.";
    });
    rzp.open();
  });
}

/** Sends the popup result to the server, which checks it with Razorpay and marks the order paid. */
export async function verifyPayment(orderNumber: string, r: RazorpaySuccess): Promise<VerifyApiResponse> {
  try {
    const res = await fetch(api.checkoutVerify, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }),
    });
    return (await res.json()) as VerifyApiResponse;
  } catch {
    return { ok: false, error: "Network error while confirming your payment. If money was taken, your order will be confirmed automatically within a few minutes." };
  }
}

/** Runs the whole popup + verify step. Returns the thank-you URL, or an error message to show. */
export async function payWithRazorpay(p: PaymentParams): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
  let result: RazorpayResult;
  try {
    result = await openRazorpay(p);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not open the payment window." };
  }
  if (result.kind === "dismissed") {
    return { ok: false, error: `Payment was cancelled / failed. You can try again.${result.failure ? ` (${result.failure})` : ""}` };
  }
  const v = await verifyPayment(p.orderNumber, result.response);
  return v.ok ? { ok: true, redirect: v.redirect } : { ok: false, error: v.error };
}
