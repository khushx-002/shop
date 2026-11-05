/** Shared database connection for command-line scripts (migrate, seed, import). */
import * as schema from "../../src/lib/db/schema";
import type { PgliteDatabase } from "drizzle-orm/pglite";

export type ScriptDb = PgliteDatabase<typeof schema>;

export async function connect(): Promise<{ db: ScriptDb; close: () => Promise<void>; kind: "postgres" | "pglite" }> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: 2 });
    const db = drizzle(pool, { schema, casing: "snake_case" }) as unknown as ScriptDb;
    return { db, close: () => pool.end(), kind: "postgres" };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DATA_DIR === "memory" ? undefined : process.env.PGLITE_DATA_DIR || "./.data/pglite";
  if (dataDir) (await import("node:fs")).mkdirSync((await import("node:path")).dirname(dataDir), { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client, { schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db, close: () => client.close(), kind: "pglite" };
}
