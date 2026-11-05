/**
 * zod schemas for the checkout API bodies (server side).
 * zod checks the shape and sizes; validateCheckoutFields() then checks the business rules
 * (required fields, phone, PIN, state) and returns one message per field.
 */
import { z } from "zod";
import { FIELD_LIMITS } from "./validation";
import { ORDER_NUMBER_RE } from "./helpers";
import { PAYMENT_METHOD_IDS } from "./payment-methods";

const str = (max: number) => z.string().max(max * 2, "This field is too long.").default("");

export const addressInputSchema = z.object({
  fullName: str(FIELD_LIMITS.fullName),
  company: str(FIELD_LIMITS.company),
  address1: str(FIELD_LIMITS.address1),
  address2: str(FIELD_LIMITS.address2),
  city: str(FIELD_LIMITS.city),
  state: z.string().max(8).default(""),
  postcode: z.string().max(20).default(""),
  phone: str(FIELD_LIMITS.phone),
  email: str(FIELD_LIMITS.email),
});

export const checkoutInputSchema = z.object({
  billing: addressInputSchema,
  shipToDifferent: z.boolean().default(false),
  shipping: addressInputSchema.default({ fullName: "", company: "", address1: "", address2: "", city: "", state: "", postcode: "", phone: "", email: "" }),
  createAccount: z.boolean().default(false),
  orderNotes: z.string().max(FIELD_LIMITS.orderNotes, `Order notes can be at most ${FIELD_LIMITS.orderNotes} characters.`).default(""),
  reviewConsent: z.boolean().default(false),
  paymentMethod: z.enum(PAYMENT_METHOD_IDS, { error: "Invalid payment method." }).default("razorpay"),
  expected: z.object({
    lines: z
      .array(z.object({ variationId: z.number().int().positive(), qty: z.number().int().positive().max(9999), unitPricePaise: z.number().int().nonnegative() }))
      .max(200),
    totalPaise: z.number().int().nonnegative(),
  }),
});

export const totalsInputSchema = z.object({
  state: z.string().max(8).default(""),
  postcode: z.string().max(20).default(""),
  email: z.string().max(FIELD_LIMITS.email * 2).optional(),
});

export const verifyInputSchema = z.object({
  orderNumber: z.string().regex(ORDER_NUMBER_RE, "Invalid order number."),
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]{6,40}$/, "Invalid payment details."),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]{6,40}$/, "Invalid payment details."),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid payment signature."),
});

export const payInputSchema = z.object({
  orderNumber: z.string().regex(ORDER_NUMBER_RE, "Invalid order number."),
  key: z.string().min(16).max(64),
});
