"use client";
/**
 * /shop/ product grid (Elementor product grid look) with the "Showing 12 of 37 items" bar
 * and the green outline "Load More" button. Load More fetches the next page with a server action and
 * appends the cards. Without JavaScript the button is a normal link to /shop/page/N/.
 */
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { ListCard } from "@/components/catalog/ListCard";
import { loadMoreCards } from "@/components/catalog/actions";
import type { Descriptions } from "@/components/catalog/data";
import type { ViewMode } from "@/components/catalog/params";
import { routes } from "@/lib/routes";
import type { ProductCardData } from "@/lib/types";

type Props = {
  cards: ProductCardData[];
  descriptions: Descriptions;
  total: number;
  page: number;
  perPage: number; // -1 = all
  totalPages: number;
  query: string; // "?a=b" or ""
  view: ViewMode;
};

export function ShopGrid(props: Props) {
  const { total, perPage, query, view } = props;
  const [cards, setCards] = useState(props.cards);
  const [descriptions, setDescriptions] = useState(props.descriptions);
  const [page, setPage] = useState(props.page);
  const [totalPages, setTotalPages] = useState(props.totalPages);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const listRef = useRef<HTMLUListElement>(null);

  const shown = perPage === -1 ? total : Math.min(total, page * perPage);
  const hasMore = page < totalPages;
  const nextHref = routes.shopPage(page + 1) + query;

  const loadMore = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const firstNew = cards.length;
    startLoading(async () => {
      const res = await loadMoreCards({ query: query.replace(/^\?/, ""), page: page + 1 });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCards((prev) => {
        const seen = new Set(prev.map((c) => c.key));
        return [...prev, ...res.cards.filter((c) => !seen.has(c.key))];
      });
      setDescriptions((prev) => ({ ...prev, ...res.descriptions }));
      setPage(res.cards.length ? res.page : totalPages);
      setTotalPages(res.totalPages);
      // keyboard users continue from the first new product
      requestAnimationFrame(() => listRef.current?.children[firstNew]?.querySelector<HTMLAnchorElement>("h2 a")?.focus());
    });
  };

  return (
    <div>
      {view === "list" ? (
        <ul ref={listRef} className="flex flex-col gap-[20px] md:gap-[24px]">
          {cards.map((card) => (
            <li key={card.key}>
              <ListCard card={card} description={descriptions[card.productId]} titleMode="product" />
            </li>
          ))}
        </ul>
      ) : (
        <ul ref={listRef} className="grid grid-cols-2 gap-x-[14px] gap-y-[18px] md:gap-x-[24px] md:gap-y-[28px] min-[64.0625rem]:grid-cols-3">
          {cards.map((card) => (
            <li key={card.key}>
              <ProductCard card={card} variant="shop" sizes="(max-width: 1024px) 48vw, 262px" />
            </li>
          ))}
        </ul>
      )}

      {total > 0 && (
        <div className="mt-[45px] flex flex-col items-center">
          <p className="text-[14px] text-muted" aria-live="polite">
            Showing {shown} of {total} items
          </p>
          <span className="mt-[12px] block h-[4px] w-full max-w-[350px] overflow-hidden rounded-full bg-line" aria-hidden="true">
            <span className="block h-full rounded-full bg-gold transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${total ? (shown / total) * 100 : 0}%` }} />
          </span>
          {hasMore && (
            <Link
              href={nextHref}
              onClick={loadMore}
              aria-busy={loading}
              className="btn btn-outline mt-[22px] min-h-[46px] min-w-[150px] aria-busy:opacity-70"
            >
              {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
              {loading ? "Loading…" : "Load More"}
            </Link>
          )}
          {error && (
            <p role="alert" className="mt-3 text-[14px] text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
