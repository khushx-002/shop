/**
 * /track-order/ – customers look up an order with its number and billing email.
 * Heritage layout: cream page hero, then the form in a cream card (like the contact form).
 * Static page (no cookies); the lookup happens in the browser through POST /api/track-order/.
 */
import { PageHeader } from "@/components/content/PageHeader";
import { TrackOrderForm } from "@/components/account/TrackOrderForm";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Track Order",
  description: "Track your Jivo Mart order: enter the order ID from your confirmation email and your billing email to see the order status.",
  path: routes.trackOrder,
});

export default function TrackOrderPage() {
  return (
    <>
      <PageHeader eyebrow="Track order" title="Be always up to date with your order" crumbs={[{ label: "Home", href: routes.home }, { label: "Track Order" }]} />
      <div className="site-container pb-[64px] pt-[36px] md:pb-[88px] md:pt-[52px]">
        <TrackOrderForm />
      </div>
    </>
  );
}
