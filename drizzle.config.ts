import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config: generates SQL migrations from src/lib/db/schema.ts into ./drizzle.
 * The same migrations run on the local PGlite database and on production PostgreSQL.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  ...(process.env.DATABASE_URL
    ? { dbCredentials: { url: process.env.DATABASE_URL } }
    : { driver: "pglite", dbCredentials: { url: "./.data/pglite" } }),
});
