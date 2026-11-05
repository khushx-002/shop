/**
 * End-to-end tests (Playwright). Run with: npm run test:e2e
 *
 * - Runs against an already running site: E2E_BASE_URL (default http://localhost:3100, the dev server).
 *   It does NOT start a server itself.
 * - Uses the installed Google Chrome (channel "chrome"); no browser download needed.
 * - The dev server compiles pages on first visit, so timeouts are generous.
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: ".data/playwright/results",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 2,
  retries: 1,
  reporter: [["list"], ["html", { outputFolder: ".data/playwright/report", open: "never" }]],
  use: {
    baseURL,
    channel: "chrome",
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 90_000,
    actionTimeout: 20_000,
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1366, height: 900 } } },
  ],
});
