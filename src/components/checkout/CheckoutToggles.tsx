"use client";
/**
 * The two centred links above the checkout form:
 *  - "Returning customer? Click here to login"  -> login form (loginAction, comes back to /checkout/)
 *  - "Have a coupon? Click here to enter"        -> coupon form (useCart().applyCoupon)
 * Heritage look: each line sits in a light-cream rounded bar; the opened form is a soft card.
 */
import { useActionState, useId, useRef, useState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/lib/auth/actions";
import { useCart } from "@/components/cart/CartProvider";
import { routes } from "@/lib/routes";

const box = "card-soft mx-auto mt-[14px] max-w-[760px] p-[20px] text-left shadow-soft min-[600px]:p-[28px]";
const input = "field leading-[1.4] placeholder:text-muted";
const toggleLink = "font-bold text-primary underline decoration-gold underline-offset-4 transition-colors hover:text-gold-dark";
const bar = "rounded-[14px] border border-line bg-cream-light px-[16px] py-[13px]";
const label = "label";
const btn = "btn btn-primary h-[46px] px-[28px] py-0 disabled:opacity-60";

export function LoginToggle() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, null);
  const id = useId();
  const userRef = useRef<HTMLInputElement>(null);
  return (
    <div className="text-center text-[15px] text-ink">
      <p className={bar}>
        Returning customer?{" "}
        <button
          type="button"
          className={toggleLink}
          aria-expanded={open}
          aria-controls={`${id}-form`}
          onClick={() => {
            setOpen((o) => !o);
            window.setTimeout(() => userRef.current?.focus(), 0);
          }}
        >
          Click here to login
        </button>
      </p>
      {open && (
        <form id={`${id}-form`} action={action} className={box} noValidate>
          <p className="mb-[18px] text-[15px] leading-[1.6] text-body">If you have shopped with us before, please enter your details below. If you are a new customer, please proceed to the Billing section.</p>
          {state?.error && (
            <p role="alert" className="mb-[16px] rounded-[10px] border-l-4 border-danger bg-[#fdecea] px-[14px] py-[10px] text-[14px] text-[#8e1c1c]">
              {state.error}
            </p>
          )}
          <div className="grid gap-[16px] min-[600px]:grid-cols-2">
            <p>
              <label htmlFor={`${id}-user`} className={label}>
                Username or email <abbr title="required" className="text-danger no-underline">*</abbr>
              </label>
              <input ref={userRef} id={`${id}-user`} name="username" type="text" autoComplete="username" required className={input} aria-invalid={state?.fieldErrors?.username ? true : undefined} />
            </p>
            <p>
              <label htmlFor={`${id}-pass`} className={label}>
                Password <abbr title="required" className="text-danger no-underline">*</abbr>
              </label>
              <input id={`${id}-pass`} name="password" type="password" autoComplete="current-password" required className={input} aria-invalid={state?.fieldErrors?.password ? true : undefined} />
            </p>
          </div>
          <input type="hidden" name="redirect" value={routes.checkout} />
          <div className="mt-[16px] flex flex-wrap items-center gap-[16px]">
            <button type="submit" disabled={pending} className={btn}>
              {pending ? "Logging in…" : "Login"}
            </button>
            <label className="flex items-center gap-[8px] text-[14px] text-ink">
              <input type="checkbox" name="rememberme" value="forever" className="size-[16px] accent-primary" /> Remember me
            </label>
          </div>
          <p className="mt-[12px] text-[14px]">
            <Link href={routes.lostPassword} className={toggleLink}>
              Lost your password?
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export function CouponToggle({ onApplied }: { onApplied: (message: { kind: "success" | "error"; text: string }) => void }) {
  const { applyCoupon, busy } = useCart();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return onApplied({ kind: "error", text: "Please enter a coupon code." });
    const r = await applyCoupon(code.trim());
    if (r.ok) {
      setCode("");
      setOpen(false);
      onApplied({ kind: "success", text: r.message ?? "Coupon code applied successfully." });
    } else onApplied({ kind: "error", text: r.error ?? "Could not apply the coupon." });
  };
  return (
    <div className="text-center text-[15px] text-ink">
      <p className={bar}>
        Have a coupon?{" "}
        <button
          type="button"
          className={toggleLink}
          aria-expanded={open}
          aria-controls={`${id}-form`}
          onClick={() => {
            setOpen((o) => !o);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          Click here to enter
        </button>
      </p>
      {open && (
        <form id={`${id}-form`} onSubmit={submit} className={`${box} text-center`} noValidate>
          <p className="mb-[14px] text-[15px] text-body">If you have a coupon code, please apply it below.</p>
          <div className="mx-auto flex max-w-[460px] gap-[10px]">
            <label htmlFor={`${id}-code`} className="sr-only">
              Coupon:
            </label>
            <input ref={inputRef} id={`${id}-code`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" autoComplete="off" maxLength={40} className={input} />
            <button type="submit" disabled={busy} className={`${btn} shrink-0 px-[20px]`}>
              Apply coupon
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
