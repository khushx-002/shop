/**
 * Applies the SQL migrations in ./drizzle to the database.
 * Usage: npm run db:migrate   (uses DATABASE_URL, or the local PGlite database when unset)
 */
import "./lib/env";
import * as schema from "../src/lib/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url, max: 2 });
    const db = drizzle(pool, { schema, casing: "snake_case" });
    await migrate(db, { migrationsFolder: "./drizzle" });
    await pool.end();
    console.log("Migrations applied to PostgreSQL (DATABASE_URL).");
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dataDir = process.env.PGLITE_DATA_DIR || "./.data/pglite";
    (await import("node:fs")).mkdirSync((await import("node:path")).dirname(dataDir), { recursive: true });
    const client = new PGlite(dataDir);
    const db = drizzle(client, { schema, casing: "snake_case" });
    await migrate(db, { migrationsFolder: "./drizzle" });
    await client.close();
    console.log("Migrations applied to local PGlite database (./.data/pglite).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
