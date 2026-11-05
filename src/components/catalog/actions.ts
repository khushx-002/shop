"use server";
/**
 * Server action behind the /shop/ "Load More" button: returns the cards of the next page
 * for the same filters. Read-only (no cookies, no writes), input validated with zod.
 */
import { z } from "zod";
import { getListing, type Descriptions } from "@/components/catalog/data";
import { parseListingParams } from "@/components/catalog/params";
import type { ProductCardData } from "@/lib/types";

const inputSchema = z.object({
  query: z.string().max(600),
  page: z.number().int().min(2).max(500),
});

export type LoadMoreResult =
  | { ok: true; cards: ProductCardData[]; descriptions: Descriptions; page: number; totalPages: number; total: number }
  | { ok: false; error: string };

export async function loadMoreCards(input: { query: string; page: number }): Promise<LoadMoreResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Could not load more products." };
  const listing = parseListingParams(new URLSearchParams(parsed.data.query));
  const { result, descriptions } = await getListing({ ...listing.query, page: parsed.data.page }, listing.view === "list");
  // listShopCards clamps the page; a request past the end returns nothing new.
  if (result.page !== parsed.data.page) return { ok: true, cards: [], descriptions: {}, page: result.page, totalPages: result.totalPages, total: result.total };
  return { ok: true, cards: result.cards, descriptions, page: result.page, totalPages: result.totalPages, total: result.total };
}
