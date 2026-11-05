/** /my-account/lost-password/ – asks for the username or email and emails a reset link. */
import { LostPasswordForm } from "@/components/account/PasswordForms";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Lost password", path: routes.lostPassword, noindex: true });

export default function LostPasswordPage() {
  return (
    <div className="site-container pb-[64px] pt-[36px] md:pb-[88px] md:pt-[52px]">
      <LostPasswordForm />
    </div>
  );
}
