/** /wishlist/ – saved products (kept in the browser, synced to the account when logged in). */
import { PageBanner } from "@/components/account/PageBanner";
import { WishlistView } from "@/components/account/WishlistView";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Wishlist", path: routes.wishlist, noindex: true });

export default function WishlistPage() {
  return (
    <>
      <PageBanner title="Wishlist" icon="heart" eyebrow="Saved for later" />
      <WishlistView />
    </>
  );
}
