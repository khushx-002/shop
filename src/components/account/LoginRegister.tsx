"use client";
/**
 * Logged-out /my-account/: "Login" and "Register" boxes side by side (stacked on phones), as two
 * soft cards with Playfair titles. Like the XStore "sales booster" account tabs: one box shows its
 * form, the other shows a short text and an outline button that switches the forms.
 * Wired to loginAction / registerAction.
 */
import { useActionState, useId, useRef, useState } from "react";
import Link from "next/link";
import { Notice } from "@/components/checkout/Notice";
import { loginAction, registerAction, type AuthState } from "@/lib/auth/actions";
import { routes } from "@/lib/routes";
import { PasswordInput } from "./PasswordInput";
import { BTN_DARK, BTN_GREY, FIELD_ERROR, INPUT, LABEL } from "./form-styles";

type Tab = "login" | "register";

const BOX = "card-soft px-[22px] py-[28px] shadow-soft min-[360px]:px-[28px] min-[768px]:px-[38px] min-[768px]:py-[38px]";
const H2 = "font-heading text-[28px] font-bold leading-[1.2] text-primary md:text-[32px]";
const EYEBROW = "eyebrow mb-[8px]";
/** Gold line under the box title. */
function TitleLine() {
  return <span aria-hidden="true" className="gold-line mb-[24px] mt-[14px]" />;
}
const LINK = "text-[14px] font-semibold text-primary underline decoration-gold underline-offset-4 transition-colors hover:text-gold-dark";

function Required() {
  return (
    <>
      &nbsp;<span aria-hidden="true">*</span>
      <span className="sr-only">Required</span>
    </>
  );
}

function FormError({ state }: { state: AuthState }) {
  return (
    <div aria-live="assertive">
      {state?.error && (
        <Notice kind="error" className="mb-[20px]">
          {state.error.endsWith("Lost your password?") ? (
            <>
              {state.error.replace(/Lost your password\?$/, "")}
              <Link href={routes.lostPassword}>Lost your password?</Link>
            </>
          ) : (
            state.error
          )}
        </Notice>
      )}
    </div>
  );
}

function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [username, setUsername] = useState("");
  const id = useId();
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate>
      <FormError state={state} />
      <input type="hidden" name="redirect" value={redirectTo} />
      <p className="mb-[20px]">
        <label htmlFor={`${id}-username`} className={LABEL}>
          Username or email address
          <Required />
        </label>
        <input
          id={`${id}-username`}
          name="username"
          type="text"
          required
          autoComplete="username"
          maxLength={190}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-invalid={fe.username ? true : undefined}
          aria-describedby={fe.username ? `${id}-username-error` : undefined}
          className={INPUT}
        />
        {fe.username && (
          <span id={`${id}-username-error`} className={FIELD_ERROR}>
            {fe.username}
          </span>
        )}
      </p>
      <p className="mb-[20px]">
        <label htmlFor={`${id}-password`} className={LABEL}>
          Password
          <Required />
        </label>
        <PasswordInput id={`${id}-password`} name="password" autoComplete="current-password" required error={fe.password} />
        {fe.password && (
          <span id={`${id}-password-error`} className={FIELD_ERROR}>
            {fe.password}
          </span>
        )}
      </p>
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-[10px]">
        <label className="flex cursor-pointer items-center gap-[8px] text-[14px] text-body">
          <input type="checkbox" name="rememberme" value="forever" className="size-[16px] accent-primary" />
          Remember me
        </label>
        <Link href={routes.lostPassword} className={`hidden ${LINK} min-[768px]:inline`}>
          Lost your password?
        </Link>
      </div>
      <button type="submit" disabled={pending} aria-busy={pending} className={BTN_DARK}>
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p className="mt-[20px] text-center min-[768px]:hidden">
        <Link href={routes.lostPassword} className={LINK}>
          Lost your password?
        </Link>
      </p>
    </form>
  );
}

function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const [email, setEmail] = useState("");
  const id = useId();
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate>
      <FormError state={state} />
      <input type="hidden" name="redirect" value={redirectTo || `${routes.account}?registered=1`} />
      {/* Honeypot for bots: invisible to people and screen readers, must stay empty. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <p className="mb-[20px]">
        <label htmlFor={`${id}-email`} className={LABEL}>
          Email address
          <Required />
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={190}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={fe.email ? true : undefined}
          aria-describedby={`${id}-note${fe.email ? ` ${id}-email-error` : ""}`}
          className={INPUT}
        />
        {fe.email && (
          <span id={`${id}-email-error`} className={FIELD_ERROR}>
            {fe.email}
          </span>
        )}
      </p>
      <p id={`${id}-note`} className="mb-[22px] text-[14px] leading-[1.55] text-muted">
        A link to set a new password will be sent to your email address.
      </p>
      <button type="submit" disabled={pending} aria-busy={pending} className={BTN_DARK}>
        {pending ? "Registering…" : "Register"}
      </button>
    </form>
  );
}

export function LoginRegister({ redirectTo, initialTab = "login" }: { redirectTo: string; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const boxes = useRef<Record<Tab, HTMLDivElement | null>>({ login: null, register: null });

  /** Switch forms and move keyboard focus to the first field of the newly shown form. */
  const show = (next: Tab) => {
    setTab(next);
    window.setTimeout(() => boxes.current[next]?.querySelector<HTMLInputElement>("input:not([type=hidden]):not([tabindex='-1'])")?.focus(), 0);
  };

  return (
    <div className="grid gap-[24px] min-[768px]:grid-cols-2 min-[768px]:gap-[32px]">
      <div
        ref={(el) => {
          boxes.current.login = el;
        }}
        className={`${BOX} self-start`}
      >
        <span className={EYEBROW}>Welcome back</span>
        <h2 className={H2}>Login</h2>
        <TitleLine />
        {tab === "login" ? (
          <LoginForm redirectTo={redirectTo} />
        ) : (
          <div>
            <p className="mb-[22px] text-[15px] leading-[1.6] text-body">Please log in to your account below in order to continue shopping.</p>
            <button type="button" onClick={() => show("login")} className={`${BTN_GREY} w-full`}>
              Login
            </button>
          </div>
        )}
      </div>
      <div
        ref={(el) => {
          boxes.current.register = el;
        }}
        className={`${BOX} self-start`}
      >
        <span className={EYEBROW}>New to Jivo Mart?</span>
        <h2 className={H2}>Register</h2>
        <TitleLine />
        {tab === "register" ? (
          <RegisterForm redirectTo={redirectTo} />
        ) : (
          <div>
            <p className="mb-[22px] text-[15px] leading-[1.6] text-body">
              Registering for this site will give you access to your order status, history, coupons and more. Please fill in the fields below and we will quickly set up a new
              account for you. We will only ask you for information that is necessary to make the purchasing process faster and easier.
            </p>
            <button type="button" onClick={() => show("register")} className={`${BTN_GREY} w-full`}>
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
