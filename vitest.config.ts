/**
 * Unit test settings (Vitest). Run with: npm test  (= vitest run)
 *
 * - Node environment (our code under test is server code: pricing, auth, catalog, cart).
 * - "@/..." resolves to ./src like in tsconfig.json.
 * - "server-only" is replaced by an empty module (the real one throws outside React Server Components).
 * - next/cache and next/headers are mocked in tests/helpers/setup.ts.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: path.join(root, "src", "$1") },
      { find: /^server-only$/, replacement: path.join(root, "tests", "helpers", "empty-module.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/helpers/setup.ts"],
    // Every test file gets its own in-memory database (PGLITE_DATA_DIR=memory); never the dev database.
    env: { PGLITE_DATA_DIR: "memory", DATABASE_URL: "" },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
