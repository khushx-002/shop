import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listProducts, pageParam, textParam } from "@/lib/admin/queries";
import { formatPaise } from "@/lib/pricing";
import { EmptyRow, hrefWith, PageTitle, Pagination, Pill, SearchBox, Table } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Products" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminProducts({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = textParam(sp.q);
  const page = pageParam(sp.page);
  const data = await listProducts({ q, page });
  const base = "/admin/products/";

  return (
    <>
      <PageTitle title="Products" />
      <p className="-mt-3 mb-4 text-[14px] text-muted">Edit texts, prices and stock. New products and images are added by the developer (they need image files and page content).</p>
      <SearchBox action={base} q={q} placeholder="Search products" />
      <Table head={["", "Name", "Template", "Visible", "Packs in stock", "Price", "Featured"]} caption="Products">
        {data.rows.length === 0 && <EmptyRow cols={7} text={q ? `No products match “${q}”.` : "No products."} />}
        {data.rows.map((p) => (
          <tr key={p.id} className="hover:bg-[#fafaf8]">
            <td className="w-[64px]">
              {p.image?.startsWith("/") ? (
                <Image src={p.image} alt="" width={48} height={48} className="h-12 w-12 rounded border border-line object-contain" />
              ) : (
                <span className="block h-12 w-12 rounded border border-line bg-surface" aria-hidden="true" />
              )}
            </td>
            <td>
              <Link href={`${base}${p.id}/`} className="font-semibold text-primary hover:underline">
                {p.name}
              </Link>
              {p.status !== "publish" && (
                <span className="ml-2">
                  <Pill tone="grey">Draft</Pill>
                </span>
              )}
              <span className="block text-[12px] text-muted">/{p.slug}/</span>
            </td>
            <td className="capitalize">{p.template}</td>
            <td>{p.visible ? <Pill tone="green">Shown</Pill> : <Pill tone="grey">Hidden</Pill>}</td>
            <td>
              {p.packsTotal === 0 ? (
                "–"
              ) : (
                <Pill tone={p.packsInStock === 0 ? "red" : p.packsInStock < p.packsTotal ? "yellow" : "green"}>
                  {p.packsInStock} / {p.packsTotal}
                </Pill>
              )}
            </td>
            <td className="whitespace-nowrap">
              {p.minPaise == null ? "–" : p.minPaise === p.maxPaise ? formatPaise(p.minPaise) : `${formatPaise(p.minPaise)} – ${formatPaise(p.maxPaise ?? p.minPaise)}`}
            </td>
            <td>{p.featured ? <Pill tone="yellow">★ Featured</Pill> : <span className="text-muted">–</span>}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} href={(p) => hrefWith(base, { q, page: p })} />
    </>
  );
}
