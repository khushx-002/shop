/** One-time tokens for "set password" and "reset password" links. Only a SHA-256 hash is stored. */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { schema } from "@/lib/db";

export type TokenPurpose = "reset" | "set_password";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createToken(db: Db, userId: number, purpose: TokenPurpose): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const hours = purpose === "set_password" ? 24 * 7 : 1;
  await db.insert(schema.passwordResetTokens).values({ userId, tokenHash: hash(token), purpose, expiresAt: new Date(Date.now() + hours * 3600_000) });
  return token;
}

/** Returns the token row if valid (not used, not expired). Does not consume it. */
export async function findValidToken(db: Db, token: string) {
  if (!token || token.length < 20) return null;
  const row = await db.query.passwordResetTokens.findFirst({
    where: and(eq(schema.passwordResetTokens.tokenHash, hash(token)), isNull(schema.passwordResetTokens.usedAt), gt(schema.passwordResetTokens.expiresAt, new Date())),
  });
  return row ?? null;
}

/**
 * Marks the token used atomically (only one request can win) and cancels every other unused
 * token of the same user. Returns false when the token was already used.
 */
export async function consumeToken(db: Db, id: number, userId: number): Promise<boolean> {
  const won = await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.passwordResetTokens.id, id), isNull(schema.passwordResetTokens.usedAt)))
    .returning({ id: schema.passwordResetTokens.id });
  if (!won.length) return false;
  await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.passwordResetTokens.userId, userId), isNull(schema.passwordResetTokens.usedAt)));
  return true;
}
