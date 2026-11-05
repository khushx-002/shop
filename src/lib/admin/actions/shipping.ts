"use server";
/**
 * Admin shipping actions: zones (where) and rates (how much).
 * The cart and checkout read zones live from the database, so no cache needs refreshing.
 */
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { INDIAN_STATES } from "@/lib/india";
import { adminAction } from "../auth";
import { checkbox, fail, formObject, idField, ok, optionalInt, optionalText, parseForm, requiredText, rupeesOptional } from "../form";

const STATE_CODES = new Set(INDIAN_STATES.map((s) => s.code));

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : null));

const zoneSchema = z.object({
  id: optionalId,
  name: requiredText(100, "Zone name"),
  pincodePrefixes: z
    .string()
    .optional()
    .transform((v) => [...new Set((v ?? "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))])
    .pipe(z.array(z.string().regex(/^[1-9]\d{0,5}$/, "PIN code prefixes must be 1–6 digits, e.g. 110, 122, 201.")).max(500, "Too many PIN code prefixes.")),
  states: z.array(z.string()).transform((list) => [...new Set(list.filter((s) => STATE_CODES.has(s)))]),
  isRestOfCountry: checkbox,
  enabled: checkbox,
  codEnabled: checkbox,
  codUnavailableNotice: optionalText(200, "Message when cash on delivery is off"),
  note: optionalText(300, "Note"),
  sortOrder: optionalInt("Sort order", -1000, 1000).transform((v) => v ?? 0),
});

export async function saveZoneAction(_prev: unknown, formData: FormData) {
  const result = await adminAction(async () => {
    const parsed = parseForm(zoneSchema, formObject(formData, ["states"]));
    if (!parsed.ok) return parsed.state;
    const { id, ...values } = parsed.data;
    if (!values.isRestOfCountry && !values.pincodePrefixes.length && !values.states.length) {
      return fail("Please fix the highlighted fields.", { pincodePrefixes: "Add PIN code prefixes or states, or tick “Rest of India”." });
    }
    const db = await getDb();
    if (values.isRestOfCountry) {
      const other = await db.query.shippingZones.findFirst({
        where: and(eq(schema.shippingZones.isRestOfCountry, true), id ? ne(schema.shippingZones.id, id) : undefined),
        columns: { name: true },
      });
      if (other) return fail("Please fix the highlighted fields.", { isRestOfCountry: `“${other.name}” is already the Rest of India zone. Only one zone can be.` });
    }
    if (id) {
      const [row] = await db.update(schema.shippingZones).set(values).where(eq(schema.shippingZones.id, id)).returning({ id: schema.shippingZones.id });
      if (!row) return fail("This zone no longer exists.");
      revalidatePath("/admin", "layout");
      return ok(`Zone “${values.name}” saved.`);
    }
    const [row] = await db.insert(schema.shippingZones).values(values).returning({ id: schema.shippingZones.id });
    revalidatePath("/admin", "layout");
    return ok(`created:${row.id}`);
  });
  if (result?.ok && result.message?.startsWith("created:")) redirect(`/admin/shipping/${result.message.slice(8)}/?created=1`);
  return result;
}

export async function deleteZoneAction(_prev: unknown, formData: FormData) {
  const result = await adminAction(async () => {
    const parsed = parseForm(z.object({ id: idField }), formObject(formData));
    if (!parsed.ok) return parsed.state;
    const db = await getDb();
    const [row] = await db.delete(schema.shippingZones).where(eq(schema.shippingZones.id, parsed.data.id)).returning({ name: schema.shippingZones.name });
    if (!row) return fail("This zone no longer exists.");
    revalidatePath("/admin", "layout");
    return ok(`deleted:${row.name}`);
  });
  if (result?.ok && result.message?.startsWith("deleted:")) redirect(`/admin/shipping/?deleted=${encodeURIComponent(result.message.slice(8))}`);
  return result;
}

const rateSchema = z
  .object({
    id: optionalId,
    zoneId: idField,
    type: z.enum(["flat", "free"], { error: "Choose the rate type." }),
    label: requiredText(80, "Label"),
    cost: rupeesOptional("Cost"),
    minOrder: rupeesOptional("Minimum order"),
    enabled: checkbox,
    sortOrder: optionalInt("Sort order", -1000, 1000).transform((v) => v ?? 0),
  })
  .transform((d, ctx) => {
    if (d.type === "flat" && d.cost == null) ctx.addIssue({ code: "custom", path: ["cost"], message: "Enter the shipping cost in rupees (0 is allowed)." });
    return {
      id: d.id,
      zoneId: d.zoneId,
      type: d.type,
      label: d.label,
      costPaise: d.type === "flat" ? (d.cost ?? 0) : 0,
      // Flat rates have no minimum; for free shipping it is the order amount that unlocks it.
      minOrderPaise: d.type === "free" ? d.minOrder : null,
      enabled: d.enabled,
      sortOrder: d.sortOrder,
    };
  });

export async function saveRateAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(rateSchema, formObject(formData));
    if (!parsed.ok) return parsed.state;
    const { id, ...values } = parsed.data;
    const db = await getDb();
    const zone = await db.query.shippingZones.findFirst({ where: eq(schema.shippingZones.id, values.zoneId), columns: { id: true } });
    if (!zone) return fail("This zone no longer exists.");
    if (id) {
      const [row] = await db
        .update(schema.shippingRates)
        .set(values)
        .where(and(eq(schema.shippingRates.id, id), eq(schema.shippingRates.zoneId, values.zoneId)))
        .returning({ id: schema.shippingRates.id });
      if (!row) return fail("This rate no longer exists.");
    } else {
      await db.insert(schema.shippingRates).values(values);
    }
    revalidatePath("/admin", "layout");
    return ok(`Rate “${values.label}” saved.`);
  });
}

export async function deleteRateAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(z.object({ id: idField }), formObject(formData));
    if (!parsed.ok) return parsed.state;
    const db = await getDb();
    const [row] = await db.delete(schema.shippingRates).where(eq(schema.shippingRates.id, parsed.data.id)).returning({ label: schema.shippingRates.label });
    if (!row) return fail("This rate no longer exists.");
    revalidatePath("/admin", "layout");
    return ok(`Rate “${row.label}” deleted.`);
  });
}
