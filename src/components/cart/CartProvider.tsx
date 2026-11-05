"use client";
/**
 * Browser-side cart state shared by the header badge, mini-cart drawer, product pages and cart page.
 * Talks to the /api/cart/* route handlers. Also exposes who is logged in (cart.user).
 *
 *   const { cart, addItem, drawerOpen, openDrawer } = useCart();
 *   await addItem(variationId, 2, { openDrawer: true });
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/routes";
import type { CartApiResponse, CartView } from "@/lib/types";

type Toast = { id: number; kind: "success" | "error" | "info"; text: string };

type CartContextValue = {
  cart: CartView | null;
  loading: boolean;
  busy: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  refresh: () => Promise<void>;
  addItem: (variationId: number, qty?: number, opts?: { openDrawer?: boolean }) => Promise<{ ok: boolean; error?: string }>;
  updateItem: (variationId: number, qty: number) => Promise<{ ok: boolean; error?: string }>;
  removeItem: (variationId: number) => Promise<{ ok: boolean; error?: string }>;
  applyCoupon: (code: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  removeCoupon: () => Promise<{ ok: boolean; error?: string }>;
  setShipping: (state: string, postcode: string) => Promise<{ ok: boolean; error?: string }>;
  toasts: Toast[];
  notify: (kind: Toast["kind"], text: string) => void;
  dismissToast: (id: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

async function call(url: string, method: string, body?: unknown): Promise<CartApiResponse> {
  try {
    const res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = (await res.json()) as CartApiResponse;
    return data;
  } catch {
    return { ok: false, error: "Network error. Please check your connection and try again.", cart: null };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const requestSeq = useRef(0);

  const notify = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const refresh = useCallback(async () => {
    const data = await call(api.cart, "GET");
    if (data.cart) setCart(data.cart);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    // First load. setState happens in the promise callback (after the network request).
    call(api.cart, "GET").then((data) => {
      if (!active) return;
      if (data.cart) setCart(data.cart);
      setLoading(false);
    });
    // Keep tabs in sync: when the cart changes in another tab, reload it here.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "jm-cart-changed") void refresh();
    };
    const onFocus = () => void refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Login/logout end with a redirect that keeps this provider mounted, so reload the cart
  // (and who is logged in) whenever the page changes.
  const pathname = usePathname();
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    let active = true;
    call(api.cart, "GET").then((data) => {
      if (active && data.cart) setCart(data.cart);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const mutate = useCallback(
    async (url: string, method: string, body?: unknown) => {
      const seq = ++requestSeq.current;
      setBusy(true);
      const data = await call(url, method, body);
      if (seq === requestSeq.current) {
        // only the newest answer updates the screen (fast clicks can return out of order)
        setBusy(false);
        if (data.cart) setCart(data.cart);
      }
      try {
        localStorage.setItem("jm-cart-changed", String(Date.now()));
      } catch {
        /* private mode */
      }
      return data;
    },
    [],
  );

  const addItem = useCallback<CartContextValue["addItem"]>(
    async (variationId, qty = 1, opts) => {
      const data = await mutate(api.cartItems, "POST", { variationId, qty });
      if (data.ok) {
        if (opts?.openDrawer ?? true) setDrawerOpen(true);
        return { ok: true };
      }
      notify("error", data.error);
      return { ok: false, error: data.error };
    },
    [mutate, notify],
  );

  const updateItem = useCallback<CartContextValue["updateItem"]>(
    async (variationId, qty) => {
      const data = await mutate(api.cartItems, "PATCH", { variationId, qty });
      if (!data.ok) notify("error", data.error);
      return data.ok ? { ok: true } : { ok: false, error: data.error };
    },
    [mutate, notify],
  );

  const removeItem = useCallback<CartContextValue["removeItem"]>(
    async (variationId) => {
      const data = await mutate(api.cartItems, "DELETE", { variationId });
      if (!data.ok) notify("error", data.error);
      return data.ok ? { ok: true } : { ok: false, error: data.error };
    },
    [mutate, notify],
  );

  const applyCoupon = useCallback<CartContextValue["applyCoupon"]>(
    async (code) => {
      const data = await mutate(api.cartCoupon, "POST", { code });
      return data.ok ? { ok: true, message: data.message } : { ok: false, error: data.error };
    },
    [mutate],
  );

  const removeCoupon = useCallback<CartContextValue["removeCoupon"]>(async () => {
    const data = await mutate(api.cartCoupon, "DELETE");
    return data.ok ? { ok: true } : { ok: false, error: data.error };
  }, [mutate]);

  const setShipping = useCallback<CartContextValue["setShipping"]>(
    async (state, postcode) => {
      const data = await mutate(api.cartShipping, "PUT", { state, postcode });
      return data.ok ? { ok: true } : { ok: false, error: data.error };
    },
    [mutate],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      busy,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      refresh,
      addItem,
      updateItem,
      removeItem,
      applyCoupon,
      removeCoupon,
      setShipping,
      toasts,
      notify,
      dismissToast,
    }),
    [cart, loading, busy, drawerOpen, refresh, addItem, updateItem, removeItem, applyCoupon, removeCoupon, setShipping, toasts, notify, dismissToast],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
