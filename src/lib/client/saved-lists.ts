"use client";
/**
 * Wishlist and compare lists kept in the browser (localStorage), like the old XStore theme.
 * When the customer is logged in, the wishlist is also saved to their account (/api/wishlist/).
 *
 *   const wishlist = useWishlist();   wishlist.has(id), wishlist.toggle(id), wishlist.ids
 *   const compare = useCompare();     same API, max 4 products
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/routes";

type ListName = "wishlist" | "compare";
const KEYS: Record<ListName, string> = { wishlist: "jm-wishlist", compare: "jm-compare" };
const LIMITS: Record<ListName, number> = { wishlist: 100, compare: 4 };
const listeners: Record<ListName, Set<() => void>> = { wishlist: new Set(), compare: new Set() };
const cache: Record<ListName, number[] | null> = { wishlist: null, compare: null };
const EMPTY: number[] = [];

function read(name: ListName): number[] {
  if (cache[name]) return cache[name]!;
  try {
    const raw = JSON.parse(localStorage.getItem(KEYS[name]) || "[]");
    cache[name] = Array.isArray(raw) ? raw.filter((x) => Number.isInteger(x) && x > 0) : [];
  } catch {
    cache[name] = [];
  }
  return cache[name]!;
}

function write(name: ListName, ids: number[]) {
  cache[name] = ids;
  try {
    localStorage.setItem(KEYS[name], JSON.stringify(ids));
  } catch {
    /* storage full or blocked */
  }
  listeners[name].forEach((l) => l());
}

function subscribe(name: ListName) {
  return (cb: () => void) => {
    listeners[name].add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS[name]) {
        cache[name] = null;
        cb();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners[name].delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  };
}

const subs = { wishlist: subscribe("wishlist"), compare: subscribe("compare") };

function useList(name: ListName) {
  const ids = useSyncExternalStore(subs[name], () => read(name), () => EMPTY);
  const has = useCallback((id: number) => ids.includes(id), [ids]);
  const add = useCallback(
    (id: number) => {
      const cur = read(name);
      if (cur.includes(id)) return true;
      if (cur.length >= LIMITS[name]) return false;
      write(name, [...cur, id]);
      return true;
    },
    [name],
  );
  const remove = useCallback((id: number) => write(name, read(name).filter((x) => x !== id)), [name]);
  const toggle = useCallback((id: number) => (read(name).includes(id) ? (remove(id), false) : add(id)), [add, remove, name]);
  const clear = useCallback(() => write(name, []), [name]);
  return { ids, has, add, remove, toggle, clear, limit: LIMITS[name] };
}

/* ---- Account sync for the wishlist (one shared sync for the whole page, not one per heart button) ---- */
const sync: { readyUser: number | null; pendingUser: number | null; timer: number | null } = { readyUser: null, pendingUser: null, timer: null };

function pushWishlist() {
  if (!sync.readyUser) return;
  if (sync.timer) window.clearTimeout(sync.timer);
  sync.timer = window.setTimeout(() => {
    sync.timer = null;
    void fetch(api.wishlist, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: read("wishlist") }) }).catch(() => {});
  }, 400);
}
listeners.wishlist.add(pushWishlist);

/** First time a logged-in user is seen: merge the saved (server) list with the local one. */
async function ensureSynced(userId: number) {
  if (sync.readyUser === userId || sync.pendingUser === userId) return;
  sync.pendingUser = userId;
  try {
    const res = await fetch(api.wishlist, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) throw new Error("wishlist load failed");
    const data = (await res.json()) as { productIds?: number[] };
    const merged = [...new Set([...(data.productIds ?? []), ...read("wishlist")])].slice(0, LIMITS.wishlist);
    sync.readyUser = userId; // only now may we push (never push before the merge succeeded)
    write("wishlist", merged); // triggers one debounced PUT with the merged list
  } catch {
    /* offline or server error: keep the local list, try again on the next page load */
  } finally {
    sync.pendingUser = null;
  }
}

/** Wishlist (heart). Pass the logged-in user id (from useCart().cart?.user?.id) to sync with the account. */
export function useWishlist(userId?: number | null) {
  const list = useList("wishlist");
  useEffect(() => {
    if (userId) void ensureSynced(userId);
    else if (sync.readyUser) sync.readyUser = null; // logged out: stop syncing
  }, [userId]);
  return list;
}

/** Compare list (max 4 products), browser only. */
export function useCompare() {
  return useList("compare");
}
