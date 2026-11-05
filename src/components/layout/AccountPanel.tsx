"use client";
/**
 * Header user icon + the "Sign In" side panel (right off-canvas, like ui-account-panel__desktop__01).
 *
 * Logged out: Login | Register tabs wired to the loginAction / registerAction server actions.
 * Logged in (useCart().cart.user): "Hello <name>", account links, Admin (for admins) and Log out.
 * Other parts of the header can open it on a given tab with openAccountPanel("register").
 */
import { useActionState, useId, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { loginAction, registerAction, type AuthState } from "@/lib/auth/actions";
import { routes } from "@/lib/routes";
import { CloseIcon, UserIcon } from "./icons";
import { LogoutForm } from "./LogoutForm";
import { useAccountPanelRequests, useAfterPending, type AccountTab } from "./panel-events";
import { closeOnLinkClick, useModalDialog } from "./useModalDialog";

const INPUT = "field h-[46px] !py-0 aria-[invalid=true]:border-danger";
const LABEL = "label";
const SUBMIT = "btn btn-primary h-[46px] w-full !py-0 disabled:opacity-60";

/** Keeps the visitor on the page they are on after logging in / registering. */
function setRedirect(e: React.FormEvent<HTMLFormElement>) {
  const field = e.currentTarget.elements.namedItem("redirect");
  if (field instanceof HTMLInputElement) field.value = window.location.pathname + window.location.search;
}

function FormError({ state, id }: { state: AuthState; id: string }) {
  return (
    <div id={id} role="alert" aria-live="assertive" className={state?.error ? "mb-[16px] rounded-[10px] border-l-4 border-danger bg-[#fdecea] px-[12px] py-[10px] text-[14px] text-danger" : "sr-only"}>
      {state?.error ?? ""}
    </div>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const id = useId();
  useAfterPending(pending, onDone);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} onSubmit={setRedirect} noValidate className="pt-[22px]">
      <FormError state={state} id={`${id}-err`} />
      <input type="hidden" name="redirect" defaultValue="/" />
      <div className="mb-[20px]">
        <label htmlFor={`${id}-user`} className={LABEL}>
          Username or email <span aria-hidden="true">*</span>
        </label>
        <input
          id={`${id}-user`}
          name="username"
          type="text"
          required
          autoComplete="username"
          maxLength={190}
          aria-invalid={fe.username ? true : undefined}
          aria-describedby={fe.username ? `${id}-user-err` : undefined}
          className={INPUT}
        />
        {fe.username && (
          <p id={`${id}-user-err`} className="mt-[4px] text-[13px] text-danger">
            {fe.username}
          </p>
        )}
      </div>
      <div className="mb-[20px]">
        <label htmlFor={`${id}-pass`} className={LABEL}>
          Password <span aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <input
            id={`${id}-pass`}
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            aria-invalid={fe.password ? true : undefined}
            aria-describedby={fe.password ? `${id}-pass-err` : undefined}
            className={`${INPUT} pr-[42px]`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-[2px] top-0 flex h-full w-[40px] items-center justify-center rounded-[9px] text-muted transition-colors hover:text-primary aria-pressed:text-primary"
          >
            <Icon name="eye" size={16} />
          </button>
        </div>
        {fe.password && (
          <p id={`${id}-pass-err`} className="mt-[4px] text-[13px] text-danger">
            {fe.password}
          </p>
        )}
      </div>
      <label className="mb-[22px] flex cursor-pointer items-center gap-[8px] text-[14px] text-body">
        <input type="checkbox" name="rememberme" value="forever" className="size-[14px] accent-primary" />
        Remember me
      </label>
      <button type="submit" disabled={pending} aria-busy={pending} className={SUBMIT}>
        {pending ? "Logging in…" : "Login"}
      </button>
      <p className="mt-[18px] text-center">
        <Link href={routes.lostPassword} className="text-[14px] font-medium !text-primary underline decoration-gold/60 underline-offset-[3px] transition-colors hover:!text-gold-dark">
          Lost your password?
        </Link>
      </p>
    </form>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const id = useId();
  useAfterPending(pending, onDone);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} onSubmit={setRedirect} noValidate className="pt-[22px]">
      <FormError state={state} id={`${id}-err`} />
      <input type="hidden" name="redirect" defaultValue="/" />
      {/* Honeypot for bots: hidden from people and screen readers, must stay empty. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <div className="mb-[16px]">
        <label htmlFor={`${id}-email`} className={LABEL}>
          Email address <span aria-hidden="true">*</span>
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={190}
          aria-invalid={fe.email ? true : undefined}
          aria-describedby={`${id}-note${fe.email ? ` ${id}-email-err` : ""}`}
          className={INPUT}
        />
        {fe.email && (
          <p id={`${id}-email-err`} className="mt-[4px] text-[13px] text-danger">
            {fe.email}
          </p>
        )}
      </div>
      <p id={`${id}-note`} className="mb-[22px] text-[14px] leading-[1.5] text-body">
        A link to set a new password will be sent to your email address.
      </p>
      <button type="submit" disabled={pending} aria-busy={pending} className={SUBMIT}>
        {pending ? "Registering…" : "Register"}
      </button>
    </form>
  );
}

export function AccountPanel({ buttonClassName = "" }: { buttonClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AccountTab>("login");
  const { cart, refresh } = useCart();
  const user = cart?.user ?? null;
  const close = () => setOpen(false);
  const dialogRef = useModalDialog(open, close);
  const ids = useId();
  const tabRefs = useRef<Record<AccountTab, HTMLButtonElement | null>>({ login: null, register: null });

  useAccountPanelRequests((t) => {
    setTab(t);
    setOpen(true);
  });

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: AccountTab = tab === "login" ? "register" : "login";
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const tabClass = (t: AccountTab) =>
    `-mb-px flex-1 border-b-2 pb-[11px] !text-[15px] font-semibold transition-colors ${tab === t ? "border-gold text-primary" : "border-transparent text-muted hover:text-primary"}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={user ? "My account" : "Sign in"}
        aria-haspopup="dialog"
        className={`flex size-[40px] items-center justify-center rounded-full text-primary transition-colors hover:bg-cream hover:text-gold-dark ${buttonClassName}`}
      >
        <UserIcon size={17} />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${ids}-title`}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(390px,85vw)] max-w-none overflow-visible bg-white p-0 text-body shadow-lift backdrop:bg-primary-dark/40 open:block open:animate-[slide-in-right_.25s_ease-out] motion-reduce:open:animate-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute -left-[52px] top-[20px] flex size-[38px] items-center justify-center rounded-full border border-line bg-white text-primary shadow-soft transition-colors hover:text-gold-dark"
        >
          <CloseIcon size={13} />
        </button>

        <div className="h-full overflow-y-auto px-[28px] pb-[30px] pt-[26px]" onClick={closeOnLinkClick(close)}>
          <div className="text-center">
            <span aria-hidden="true" className="mx-auto flex size-[46px] items-center justify-center rounded-full bg-cream text-gold-dark">
              <UserIcon size={19} />
            </span>
            <h2 id={`${ids}-title`} className="mt-[12px] font-heading text-[26px] font-semibold leading-[1.15] text-primary">
              {user ? "My Account" : "Sign In"}
            </h2>
            <span aria-hidden="true" className="gold-line mx-auto mt-[10px]" />
          </div>

          {user ? (
            <div className="pt-[22px]">
              <p className="text-[15px] text-ink">
                Hello <strong className="font-semibold text-primary">{user.name || user.email}</strong>
              </p>
              <nav aria-label="My account" className="mt-[16px]">
                <ul className="border-t border-line">
                  {[
                    { label: "Dashboard", href: routes.account },
                    { label: "Orders", href: routes.accountOrders },
                    { label: "Addresses", href: routes.accountAddresses },
                    { label: "Account details", href: routes.accountDetails },
                    { label: "Wishlist", href: routes.wishlist },
                    ...(user.role === "admin" ? [{ label: "Admin", href: routes.admin }] : []),
                  ].map((l) => (
                    <li key={l.href} className="border-b border-line">
                      <Link href={l.href} className="flex items-center justify-between py-[12px] text-[15px] font-medium !text-ink transition-colors hover:!text-gold-dark">
                        {l.label}
                        <Icon name="chevron-right" size={14} className="text-gold" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <LogoutForm className="mt-[24px]" buttonClassName={SUBMIT}>
                Log out
              </LogoutForm>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label="Sign in or register" className="mt-[18px] flex border-b border-line" onKeyDown={onTabKey}>
                {(["login", "register"] as const).map((t) => (
                  <button
                    key={t}
                    ref={(el) => {
                      tabRefs.current[t] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`${ids}-tab-${t}`}
                    aria-selected={tab === t}
                    aria-controls={`${ids}-panel-${t}`}
                    tabIndex={tab === t ? 0 : -1}
                    onClick={() => setTab(t)}
                    className={tabClass(t)}
                  >
                    {t === "login" ? "Login" : "Register"}
                  </button>
                ))}
              </div>
              <div role="tabpanel" id={`${ids}-panel-login`} aria-labelledby={`${ids}-tab-login`} hidden={tab !== "login"}>
                <LoginForm onDone={() => void refresh()} />
              </div>
              <div role="tabpanel" id={`${ids}-panel-register`} aria-labelledby={`${ids}-tab-register`} hidden={tab !== "register"}>
                <RegisterForm onDone={() => void refresh()} />
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
