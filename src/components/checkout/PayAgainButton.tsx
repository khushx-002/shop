"use client";
/**
 * "Pay now" on the thank-you page of an order that is still waiting for payment.
 * Gets the Razorpay parameters for that order (POST /api/checkout/pay/), opens the popup,
 * verifies the payment and reloads the page.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentParams } from "@/lib/checkout/types";
import { payWithRazorpay } from "./razorpay-client";

export function PayAgainButton({ orderNumber, accessKey }: { orderNumber: string; accessKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    let data: { ok: true; payment: PaymentParams } | { ok: false; error: string } | null = null;
    try {
      const res = await fetch("/api/checkout/pay/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, key: accessKey }),
      });
      data = await res.json();
    } catch {
      data = null;
    }
    if (!data || !data.ok) {
      setBusy(false);
      setError(data && !data.ok ? data.error : "Network error. Please try again.");
      return;
    }
    const result = await payWithRazorpay(data.payment);
    setBusy(false);
    if (result.ok) {
      router.replace(result.redirect);
      router.refresh();
    } else setError(result.error);
  };

  return (
    <div className="mt-[16px]">
      <button type="button" onClick={start} disabled={busy} className="btn btn-primary h-[46px] px-[30px] py-0 disabled:opacity-60">
        {busy ? "Please wait…" : "Pay now"}
      </button>
      <p aria-live="polite" className="mt-[10px] text-[14px] text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
