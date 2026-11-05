"use client";
/**
 * "Log out" button used in the header panels. Posts to the logoutAction server action
 * (which clears the session cookie and redirects to /my-account/), then reloads the cart so
 * the header forgets the user even if the redirect lands on the same URL.
 */
import { useFormStatus } from "react-dom";
import { useCart } from "@/components/cart/CartProvider";
import { logoutAction } from "@/lib/auth/actions";
import { useAfterPending } from "./panel-events";

function SubmitButton({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const { refresh } = useCart();
  useAfterPending(pending, () => void refresh());
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {children}
    </button>
  );
}

export function LogoutForm({ className, buttonClassName, children }: { className?: string; buttonClassName: string; children: React.ReactNode }) {
  return (
    <form action={logoutAction} className={className}>
      <SubmitButton className={buttonClassName}>{children}</SubmitButton>
    </form>
  );
}
