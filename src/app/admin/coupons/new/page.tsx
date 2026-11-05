import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";
import { CouponForm } from "@/components/admin/CouponForm";
import { PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "New coupon" };

export default async function NewCoupon() {
  await requireAdminPage();
  return (
    <>
      <PageTitle title="New coupon" back={{ href: "/admin/coupons/", label: "All coupons" }} />
      <CouponForm />
    </>
  );
}
