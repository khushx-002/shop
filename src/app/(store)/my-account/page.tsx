/**
 * /my-account/
 *  - logged out: Login + Register boxes
 *  - logged in: WooCommerce dashboard ("Hello <name> (not <name>? Log out)")
 */
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import { LoginRegister } from "@/components/account/LoginRegister";
import { Notice } from "@/components/checkout/Notice";
import { LogoutForm } from "@/components/layout/LogoutForm";
import { getSessionUser } from "@/lib/auth/session";
import { redirectParam } from "@/lib/account/session";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "My account", path: routes.account, noindex: true });

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MyAccountPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const passwordReset = sp["password-reset"] === "true";

  if (!user) {
    return (
      <div className="site-container pb-[64px] pt-[36px] md:pb-[88px] md:pt-[52px]">
        <div className="mx-auto max-w-[1120px]">
          {passwordReset && (
            <Notice kind="success" className="mb-[30px]">
              Your password has been reset successfully.
            </Notice>
          )}
          <LoginRegister redirectTo={redirectParam(sp.redirect)} initialTab={sp["account-active-tab"] === "register" ? "register" : "login"} />
        </div>
      </div>
    );
  }

  const name = user.name || user.email;
  const link = "font-semibold text-primary underline decoration-gold underline-offset-4 transition-colors hover:text-gold-dark";
  return (
    <AccountShell active="dashboard" isAdmin={user.role === "admin"}>
      {passwordReset && (
        <Notice kind="success" className="mb-[24px]">
          Your password has been reset successfully.
        </Notice>
      )}
      {sp.registered === "1" && (
        <Notice kind="success" className="mb-[24px]">
          Your account was created. We have emailed you a link to set your password.
        </Notice>
      )}
      <div className="rounded-[20px] border border-line bg-cream p-[22px] text-[16px] leading-[1.7] md:p-[30px]">
        {/* div, not p: a <form> may not sit inside a paragraph */}
        <div className="mb-[14px] text-ink">
          Hello <strong className="text-ink">{name}</strong> (not <strong className="text-ink">{name}</strong>?{" "}
          <LogoutForm className="inline" buttonClassName={`${link} inline p-0`}>
            Log out
          </LogoutForm>
          )
        </div>
        <p>
          From your account dashboard you can view your{" "}
          <Link href={routes.accountOrders} className={link}>
            recent orders
          </Link>
          , manage your{" "}
          <Link href={routes.accountAddresses} className={link}>
            shipping and billing addresses
          </Link>
          , and{" "}
          <Link href={routes.accountDetails} className={link}>
            edit your password and account details
          </Link>
          .
        </p>
      </div>
    </AccountShell>
  );
}
