/**
 * Database client used by the Next.js app (server side only).
 *
 * - With DATABASE_URL set (production): PostgreSQL through node-postgres (pg).
 * - Without it (local development): PGlite, a real PostgreSQL that runs inside
 *   Node and stores its files in ./.data/pglite. Migrations are applied automatically.
 *
 * The client is cached on globalThis so Next.js hot reloading does not open
 * a new connection on every change.
 */
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

if (typeof window !== "undefined") {
  throw new Error("The database client must never be imported in browser code.");
}

export type Db = PgliteDatabase<typeof schema>;

type Cache = { db?: Db; ready?: Promise<Db> };
const g = globalThis as unknown as { __jivoDb?: Cache };
const cache: Cache = (g.__jivoDb ??= {});

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    // Small pool: serverless hosts run many instances (use a pooled connection string, e.g. Neon "-pooler").
    const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000 });
    return drizzle(pool, { schema, casing: "snake_case" }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DATA_DIR === "memory" ? undefined : process.env.PGLITE_DATA_DIR || "./.data/pglite";
  if (dataDir) {
    const fs = await import("node:fs");
    const path = await import("node:path");
    fs.mkdirSync(path.dirname(path.resolve(dataDir)), { recursive: true });
  }
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client, { schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

/** Returns the shared database client (creates it on first use). */
export function getDb(): Promise<Db> {
  if (cache.db) return Promise.resolve(cache.db);
  if (!cache.ready) {
    cache.ready = create().then(
      (db) => {
        cache.db = db;
        return db;
      },
      (err) => {
        cache.ready = undefined; // do not remember a failed start; the next request tries again
        throw err;
      },
    );
  }
  return cache.ready;
}

export { schema };
