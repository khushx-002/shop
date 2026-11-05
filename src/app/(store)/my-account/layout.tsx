/**
 * Every /my-account/... page starts with the cream "My Account" title band (heritage page hero).
 * The pages themselves read the session cookie, so they are always rendered per request.
 */
import { PageBanner } from "@/components/account/PageBanner";

export default function MyAccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageBanner title="My Account" icon="user" eyebrow="Your account" />
      {children}
    </>
  );
}
