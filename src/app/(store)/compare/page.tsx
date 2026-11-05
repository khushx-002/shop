/** /compare/ – compare up to 4 products (list kept in the browser). */
import { CompareView } from "@/components/account/CompareView";
import { PageBanner } from "@/components/account/PageBanner";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Compare", path: routes.compare, noindex: true });

export default function ComparePage() {
  return (
    <>
      <PageBanner title="Compare" icon="compare" eyebrow="Side by side" />
      <CompareView />
    </>
  );
}
