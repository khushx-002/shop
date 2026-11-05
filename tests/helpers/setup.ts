/**
 * Global unit-test setup (vitest.config.ts -> setupFiles).
 *
 * - next/cache: unstable_cache(fn) returns fn itself (no caching between tests), revalidate* do nothing.
 * - next/headers: cookies() is a simple in-memory cookie jar (tests can read/clear it via testCookies),
 *   headers() is empty.
 */
import { vi } from "vitest";

type Cookie = { name: string; value: string };

/** Cookie jar shared by the mocked cookies(); call testCookies.clear() in tests that need a clean state. */
export const testCookies = {
  store: new Map<string, string>(),
  clear() {
    this.store.clear();
  },
};

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => undefined,
  revalidatePath: () => undefined,
  unstable_noStore: () => undefined,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string): Cookie | undefined => (testCookies.store.has(name) ? { name, value: testCookies.store.get(name)! } : undefined),
    getAll: (): Cookie[] => [...testCookies.store].map(([name, value]) => ({ name, value })),
    has: (name: string) => testCookies.store.has(name),
    set: (name: string, value: string) => {
      testCookies.store.set(name, value);
    },
    delete: (name: string) => {
      testCookies.store.delete(name);
    },
  }),
  headers: async () => new Headers(),
}));
