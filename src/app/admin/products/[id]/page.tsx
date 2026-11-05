import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getAdminProduct } from "@/lib/admin/queries";
import { paiseToInput } from "@/lib/admin/form";
import { notifyWaitlistAction, updateProductAction } from "@/lib/admin/actions/products";
import { routes } from "@/lib/routes";
import { ActionForm, FieldError, SubmitButton } from "@/components/admin/ActionForm";
import { Card, Check, Field, PageTitle, Pill } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Edit product" };

type Params = Promise<{ id: string }>;

export default async function AdminProductEdit({ params }: { params: Params }) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const data = await getAdminProduct(Number(id));
  if (!data) notFound();
  const { product: p, waiting } = data;
  const sellable = (v: (typeof p.variations)[number]) => v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0);
  const waitFor = (variationId: number | null) => waiting.find((w) => w.variationId === variationId)?.count ?? 0;
  const waitRows = [
    ...(waitFor(null) ? [{ variationId: null as number | null, label: "Any pack", count: waitFor(null), inStock: p.variations.some(sellable) }] : []),
    ...p.variations.filter((v) => waitFor(v.id) > 0).map((v) => ({ variationId: v.id as number | null, label: v.valueLabel, count: waitFor(v.id), inStock: sellable(v) })),
  ];

  return (
    <>
      <PageTitle title={p.name} back={{ href: "/admin/products/", label: "All products" }}>
        <a href={routes.product(p.slug)} target="_blank" rel="noopener" className="btn btn-outline !px-4 !py-2">
          View in shop ↗
        </a>
      </PageTitle>
      <p className="-mt-4 mb-6 text-[14px] text-muted">
        Template: <span className="capitalize">{p.template}</span> · Categories: {p.productCategories.map((pc) => pc.category.name).join(", ") || "none"} · URL /product/{p.slug}/
      </p>

      {waitRows.length > 0 && (
        <Card title="Customers waiting for this product" className="mb-6">
          <ul className="divide-y divide-line">
            {waitRows.map((w) => (
              <li key={w.variationId ?? "any"} className="flex flex-wrap items-center justify-between gap-3 py-2 text-[14px]">
                <span>
                  <strong>{w.label}</strong>: {w.count} waiting {w.inStock ? <Pill tone="green">In stock</Pill> : <Pill tone="red">Out of stock</Pill>}
                </span>
                {w.inStock ? (
                  <ActionForm action={notifyWaitlistAction} compact className="flex flex-wrap items-center justify-end gap-2">
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="variationId" value={w.variationId ?? ""} />
                    <SubmitButton className="btn btn-primary !px-4 !py-2" pendingText="Sending…">
                      Notify {w.count} waiting customer{w.count === 1 ? "" : "s"}
                    </SubmitButton>
                  </ActionForm>
                ) : (
                  <span className="text-[13px] text-muted">Put the pack back in stock to notify them.</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ActionForm action={updateProductAction} aria-label="Edit product">
        <input type="hidden" name="productId" value={p.id} />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <Card title="Product">
              <div className="space-y-4">
                <Field name="name" label="Name">
                  <input id="name" name="name" className="field" defaultValue={p.name} required maxLength={200} />
                </Field>
                <Field name="tagline" label="Tagline" hint="Short line under the product name (rich template).">
                  <input id="tagline" name="tagline" className="field" defaultValue={p.tagline ?? ""} maxLength={200} />
                </Field>
                <Field name="shortDescriptionHtml" label="Short description (HTML)">
                  <textarea id="shortDescriptionHtml" name="shortDescriptionHtml" rows={5} className="field font-mono !text-[13px]" defaultValue={p.shortDescriptionHtml ?? ""} />
                </Field>
                <Field name="descriptionHtml" label="Description (HTML)">
                  <textarea id="descriptionHtml" name="descriptionHtml" rows={12} className="field font-mono !text-[13px]" defaultValue={p.descriptionHtml ?? ""} />
                </Field>
                <Field name="disclaimerHtml" label="Disclaimer (HTML)">
                  <textarea id="disclaimerHtml" name="disclaimerHtml" rows={4} className="field font-mono !text-[13px]" defaultValue={p.disclaimerHtml ?? ""} />
                </Field>
                <p className="text-[13px] text-muted">HTML is shown as written. Scripts, iframes and event handlers are removed when the page is shown.</p>
              </div>
            </Card>

            <Card title="Packs (variations)">
              <p className="mb-3 text-[13px] text-muted">Prices in rupees. With “Manage stock” on, the pack is in stock while the quantity is above 0 (sales reduce it automatically).</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-[14px]">
                  <caption className="sr-only">Packs</caption>
                  <thead className="border-b border-line text-[12px] uppercase tracking-wide text-[#555]">
                    <tr>
                      <th scope="col" className="py-2 pr-2 font-semibold">Label</th>
                      <th scope="col" className="px-2 py-2 font-semibold">SKU</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Sale price ₹</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Regular price ₹</th>
                      <th scope="col" className="px-2 py-2 font-semibold">In stock</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Manage stock</th>
                      <th scope="col" className="py-2 pl-2 font-semibold">Stock qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.variations.map((v) => {
                      const n = (f: string) => `v.${v.id}.${f}`;
                      return (
                        <tr key={v.id} className="border-b border-line align-top">
                          <td className="py-2 pr-2">
                            <label htmlFor={n("label")} className="sr-only">Label</label>
                            <input id={n("label")} name={n("label")} className="field !px-2 !py-1.5 !text-[14px]" defaultValue={v.valueLabel} maxLength={120} />
                            <FieldError name={n("label")} />
                          </td>
                          <td className="px-2 py-2">
                            <label htmlFor={n("sku")} className="sr-only">SKU for {v.valueLabel}</label>
                            <input id={n("sku")} name={n("sku")} className="field !px-2 !py-1.5 !text-[14px]" defaultValue={v.sku ?? ""} maxLength={80} />
                            <FieldError name={n("sku")} />
                          </td>
                          <td className="px-2 py-2">
                            <label htmlFor={n("price")} className="sr-only">Sale price for {v.valueLabel}</label>
                            <input id={n("price")} name={n("price")} inputMode="decimal" className="field w-[110px] !px-2 !py-1.5 !text-[14px]" defaultValue={paiseToInput(v.pricePaise)} />
                            <FieldError name={n("price")} />
                          </td>
                          <td className="px-2 py-2">
                            <label htmlFor={n("regular")} className="sr-only">Regular price for {v.valueLabel}</label>
                            <input id={n("regular")} name={n("regular")} inputMode="decimal" className="field w-[110px] !px-2 !py-1.5 !text-[14px]" defaultValue={paiseToInput(v.regularPricePaise)} />
                            <FieldError name={n("regular")} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input type="checkbox" name={n("inStock")} defaultChecked={v.inStock} aria-label={`${v.valueLabel} in stock`} className="mt-2 h-4 w-4 accent-[#0f4526]" />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input type="checkbox" name={n("manageStock")} defaultChecked={v.manageStock} aria-label={`Manage stock for ${v.valueLabel}`} className="mt-2 h-4 w-4 accent-[#0f4526]" />
                          </td>
                          <td className="py-2 pl-2">
                            <label htmlFor={n("stockQty")} className="sr-only">Stock quantity for {v.valueLabel}</label>
                            <input id={n("stockQty")} name={n("stockQty")} inputMode="numeric" className="field w-[90px] !px-2 !py-1.5 !text-[14px]" defaultValue={v.stockQty ?? ""} />
                            <FieldError name={n("stockQty")} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {p.variations.length === 0 && <p className="text-[14px] text-muted">This product has no packs.</p>}
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Publish">
              <div className="space-y-3">
                <Check name="visible" label="Show in shop" defaultChecked={p.visible} hint="Hidden products stay reachable by their link but are not listed in the shop or search." />
                <Check name="featured" label="Featured" defaultChecked={p.featured} />
                <Field name="estimatedDelivery" label="Estimated delivery" hint="e.g. 1 - 5 days (empty = store default)">
                  <input id="estimatedDelivery" name="estimatedDelivery" className="field" defaultValue={p.estimatedDelivery ?? ""} maxLength={60} />
                </Field>
                <SubmitButton className="btn btn-primary w-full">Save product</SubmitButton>
              </div>
            </Card>
            <Card title="SEO">
              <div className="space-y-3">
                <Field name="seoTitle" label="SEO title" hint="Empty = product name.">
                  <input id="seoTitle" name="seoTitle" className="field" defaultValue={p.seoTitle ?? ""} maxLength={200} />
                </Field>
                <Field name="seoDescription" label="SEO description" hint="About 150–160 characters.">
                  <textarea id="seoDescription" name="seoDescription" rows={4} className="field" defaultValue={p.seoDescription ?? ""} maxLength={320} />
                </Field>
              </div>
            </Card>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <SubmitButton className="btn btn-primary">Save product</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
