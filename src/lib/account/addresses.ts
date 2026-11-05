/**
 * Saved billing / shipping addresses of a customer (one default per type, same table the checkout
 * reads for pre-filling). Server only.
 */
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { AddressInput } from "@/lib/checkout/types";

export type AddressType = "billing" | "shipping";
export const ADDRESS_TYPES: AddressType[] = ["billing", "shipping"];

type AddressRow = typeof schema.addresses.$inferSelect;

/** The default (or newest) address of each type. */
export async function getSavedAddresses(userId: number): Promise<Record<AddressType, AddressRow | null>> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.addresses)
    .where(eq(schema.addresses.userId, userId))
    .orderBy(desc(schema.addresses.isDefault), desc(schema.addresses.updatedAt));
  return { billing: rows.find((r) => r.type === "billing") ?? null, shipping: rows.find((r) => r.type === "shipping") ?? null };
}

/** Address row -> form values (empty strings for missing fields). */
export function toAddressInput(row: AddressRow | null, fallback: Partial<AddressInput> = {}): AddressInput {
  return {
    fullName: row?.fullName ?? fallback.fullName ?? "",
    company: row?.company ?? "",
    address1: row?.address1 ?? "",
    address2: row?.address2 ?? "",
    city: row?.city ?? "",
    state: row?.state ?? "",
    postcode: row?.postcode ?? "",
    phone: row?.phone ?? fallback.phone ?? "",
    email: row?.email ?? fallback.email ?? "",
  };
}

/** Saves the address as the one default address of this type (updates the existing row when there is one). */
export async function saveDefaultAddress(userId: number, type: AddressType, values: Omit<typeof schema.addresses.$inferInsert, "userId" | "type" | "isDefault">) {
  const db = await getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: schema.addresses.id })
      .from(schema.addresses)
      .where(and(eq(schema.addresses.userId, userId), eq(schema.addresses.type, type)))
      .orderBy(desc(schema.addresses.isDefault), desc(schema.addresses.updatedAt))
      .limit(1);
    // Only one default per type: clear the flag everywhere, then set it on the saved row.
    await tx.update(schema.addresses).set({ isDefault: false }).where(and(eq(schema.addresses.userId, userId), eq(schema.addresses.type, type)));
    if (existing[0]) {
      await tx.update(schema.addresses).set({ ...values, isDefault: true, updatedAt: now }).where(eq(schema.addresses.id, existing[0].id));
    } else {
      await tx.insert(schema.addresses).values({ ...values, userId, type, isDefault: true });
    }
  });
}
