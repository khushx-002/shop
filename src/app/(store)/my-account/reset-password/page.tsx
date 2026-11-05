/**
 * /my-account/reset-password/?token=...  – link from the "set password" / "reset password" emails.
 * The token is checked here (to show a friendly message) and again by resetPasswordAction.
 */
import Link from "next/link";
import { ResetPasswordForm } from "@/components/account/PasswordForms";
import { Notice } from "@/components/checkout/Notice";
import { findValidToken } from "@/lib/auth/tokens";
import { getDb } from "@/lib/db";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = { ...pageMetadata({ title: "Reset password", path: "/my-account/reset-password/", noindex: true }), referrer: "no-referrer" as const };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token.slice(0, 200) : "";
  const valid = token ? !!(await findValidToken(await getDb(), token)) : false;
  return (
    <div className="site-container pb-[64px] pt-[36px] md:pb-[88px] md:pt-[52px]">
      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="mx-auto max-w-[500px]">
          <Notice kind="error">
            This password reset link is invalid or has expired. Please{" "}
            <Link href={routes.lostPassword}>request a new link</Link>.
          </Notice>
        </div>
      )}
    </div>
  );
}
