import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getCoupon } from "@/lib/admin/queries";
import { CouponForm } from "@/components/admin/CouponForm";
import { PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Edit coupon" };

export default async function EditCoupon({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const coupon = await getCoupon(Number(id));
  if (!coupon) notFound();
  return (
    <>
      <PageTitle title={`Coupon ${coupon.code}`} back={{ href: "/admin/coupons/", label: "All coupons" }} />
      <CouponForm coupon={coupon} />
    </>
  );
}
