"use client";
/**
 * Shared state for one product page: which pack size (variation) is selected and the quantity.
 * The gallery, swatches, price, buttons and the sticky add-to-cart bar all read it.
 *
 * The page itself is static (cached), so it is rendered with the default pack. The
 * ?attribute_<attr>=<value> link from shop cards is read here in the browser with
 * useSearchParams() inside <Suspense> (never on the server), and then selects that pack.
 */
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { VariationView } from "@/lib/types";

type PackContextValue = {
  productId: number;
  productName: string;
  variations: VariationView[];
  selected: VariationView | null;
  /** true once the visitor (or the URL) picked a pack; before that the gallery shows the main product photo */
  chosen: boolean;
  select: (variationId: number) => void;
  qty: number;
  setQty: (qty: number) => void;
};

const PackContext = createContext<PackContextValue | null>(null);

export const MAX_QTY = 99;

export function clampQty(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.round(n)));
}

/** Reads ?attribute_pa_capacity=5l (or any attribute) and selects the matching pack. */
function PackFromUrl() {
  const params = useSearchParams();
  const ctx = useContext(PackContext);
  const variations = ctx?.variations;
  const select = ctx?.select;
  useEffect(() => {
    if (!variations || !select) return;
    const match = variations.find((v) => params.get(`attribute_${v.attributeSlug}`) === v.valueSlug);
    if (match) select(match.id);
  }, [params, variations, select]);
  return null;
}

type ProviderProps = {
  productId: number;
  productName: string;
  variations: VariationView[];
  defaultVariationId: number | null;
  children: React.ReactNode;
};

export function ProductPackProvider({ productId, productName, variations, defaultVariationId, children }: ProviderProps) {
  const [selectedId, setSelectedId] = useState<number | null>(defaultVariationId);
  const [chosen, setChosen] = useState(false);
  const [qty, setQtyState] = useState(1);

  const select = useCallback((id: number) => {
    setSelectedId(id);
    setChosen(true);
  }, []);
  const setQty = useCallback((n: number) => setQtyState(clampQty(n)), []);

  const value = useMemo<PackContextValue>(
    () => ({
      productId,
      productName,
      variations,
      selected: variations.find((v) => v.id === selectedId) ?? null,
      chosen,
      select,
      qty,
      setQty,
    }),
    [productId, productName, variations, selectedId, chosen, select, qty, setQty],
  );

  return (
    <PackContext.Provider value={value}>
      {/* Fallback = nothing to do: the default pack is already rendered. */}
      <Suspense fallback={null}>
        <PackFromUrl />
      </Suspense>
      {children}
    </PackContext.Provider>
  );
}

export function usePack(): PackContextValue {
  const ctx = useContext(PackContext);
  if (!ctx) throw new Error("usePack must be used inside <ProductPackProvider>");
  return ctx;
}
