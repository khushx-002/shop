"use client";
/**
 * Shared pieces for the wishlist and compare pages:
 *  - useSavedProducts(ids): loads product data for ids kept in the browser (GET /api/products/?ids=)
 *  - useHydrated(): false during server render / first paint (localStorage is not readable yet)
 *  - PackAddToCart: pack-size select + "Add to cart" (or "Select options"/"Read more")
 */
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { formatPaise } from "@/lib/pricing";
import type { CategoryRef, ProductCardData } from "@/lib/types";

export type SavedPack = { variationId: number; label: string; pricePaise: number; regularPricePaise: number; inStock: boolean };
export type SavedProduct = { card: ProductCardData; packs: SavedPack[]; attributeName: string; shortDescription: string; categories: CategoryRef[] };

const noop = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Product data for the given ids, in the same order. `loading` is true until the first answer. */
export function useSavedProducts(ids: number[]) {
  const [byId, setById] = useState<Record<number, SavedProduct>>({});
  const [missing, setMissing] = useState<Set<number>>(new Set());
  const [error, setError] = useState(false);
  const toLoad = ids.filter((id) => !byId[id] && !missing.has(id));
  const key = toLoad.join(",");

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch(`/api/products/?ids=${key}`, { signal: ctrl.signal, credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ ok: boolean; products: SavedProduct[] }>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        const got: Record<number, SavedProduct> = {};
        for (const p of data.products ?? []) got[p.card.productId] = p;
        setById((cur) => ({ ...cur, ...got }));
        // Ids the shop no longer has (deleted products) are remembered so we do not ask again.
        setMissing((cur) => new Set([...cur, ...key.split(",").map(Number).filter((id) => !got[id])]));
        setError(false);
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) setError(true);
      });
    return () => ctrl.abort();
  }, [key]);

  const products = ids.map((id) => byId[id]).filter((p): p is SavedProduct => !!p);
  return { products, loading: toLoad.length > 0 && !error, error };
}

/** Pack picker + add to cart. One in-stock pack: just the button. Several: a select first. */
export function PackAddToCart({ product, buttonClassName }: { product: SavedProduct; buttonClassName: string }) {
  const id = useId();
  const sellable = product.packs.filter((p) => p.inStock);
  const { card } = product;
  // Start on the pack whose price is shown in the row (the cheapest one), like the product card.
  const [variationId, setVariationId] = useState<number | null>((sellable.find((p) => p.pricePaise === card.pricePaise) ?? sellable[0])?.variationId ?? null);
  if (sellable.length <= 1) {
    return <AddToCartButton variationId={sellable[0]?.variationId ?? null} href={card.href} inStock={sellable.length > 0} productName={card.name} className={buttonClassName} />;
  }
  return (
    <div className="flex flex-col gap-[8px]">
      <label htmlFor={`${id}-pack`} className="sr-only">
        {product.attributeName} for {card.name}
      </label>
      <select
        id={`${id}-pack`}
        value={variationId ?? ""}
        onChange={(e) => setVariationId(Number(e.target.value))}
        className="field h-[42px] py-0 text-[14px]"
      >
        {sellable.map((p) => (
          <option key={p.variationId} value={p.variationId}>
            {p.label} – {formatPaise(p.pricePaise)}
          </option>
        ))}
      </select>
      <AddToCartButton variationId={variationId} href={card.href} inStock productName={card.name} className={buttonClassName} />
    </div>
  );
}
