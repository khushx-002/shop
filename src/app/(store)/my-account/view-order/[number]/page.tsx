/** /my-account/view-order/<number>/ – one order of the logged-in customer (404 for anyone else). */
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { OrderDetails } from "@/components/account/OrderDetails";
import { formatOrderDate } from "@/lib/account/format";
import { getCustomerOrder } from "@/lib/account/orders";
import { requireAccountUser } from "@/lib/account/session";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

type Params = Promise<{ number: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { number } = await params;
  return pageMetadata({ title: `Order #${decodeURIComponent(number).slice(0, 40)}`, path: routes.accountOrders, noindex: true });
}

export default async function ViewOrderPage({ params }: { params: Params }) {
  const number = decodeURIComponent((await params).number);
  const user = await requireAccountUser(routes.accountOrder(number));
  const order = await getCustomerOrder(user.id, number);
  if (!order) notFound();
  return (
    <AccountShell active="orders" isAdmin={user.role === "admin"}>
      <p className="mb-[28px] rounded-[14px] border border-line bg-cream-light px-[18px] py-[14px] text-[15px] leading-[1.6]">
        Order #<mark className="bg-transparent font-bold text-ink">{order.number}</mark> was placed on{" "}
        <mark className="bg-transparent font-bold text-ink">{formatOrderDate(order.createdAt)}</mark> and is currently{" "}
        <mark className="bg-transparent font-bold text-ink">{order.statusLabel}</mark>.
      </p>
      <OrderDetails order={order} />
    </AccountShell>
  );
}
