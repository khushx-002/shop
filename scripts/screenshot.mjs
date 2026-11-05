/**
 * Takes full-page screenshots with the installed Google Chrome (via Playwright) and cuts
 * them into readable slices. Used to compare the old shop.jivo.in with the new site.
 *
 * Usage:
 *   node scripts/screenshot.mjs <plan.json>            plan = [{ name, url, viewports?, actions? }]
 *   node scripts/screenshot.mjs --url <url> --out <dir> --name <name> [--viewports desktop,mobile]
 *
 * Output: <out>/<name>__<viewport>.png (full page) and <name>__<viewport>__NN.png slices.
 * Viewports: desktop 1440x900, tablet 1024x768, mobile 390x844.
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, isMobile: false },
  tablet: { width: 1024, height: 768, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true },
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
    else out._ = argv[i];
  }
  return out;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 180));
    }
    window.scrollTo(0, 0);
  });
}

async function runActions(page, actions = []) {
  for (const a of actions) {
    if (a.type === "click") await page.click(a.selector, { timeout: 8000 }).catch((e) => console.warn("  click failed", a.selector, e.message));
    if (a.type === "hover") await page.hover(a.selector, { timeout: 8000 }).catch((e) => console.warn("  hover failed", a.selector, e.message));
    if (a.type === "wait") await page.waitForTimeout(a.ms || 800);
    if (a.type === "goto") await page.goto(a.url, { waitUntil: "domcontentloaded", timeout: 90000 });
    if (a.type === "eval") await page.evaluate(a.code).catch((e) => console.warn("  eval failed", e.message));
  }
}

async function capture(browser, job, outDir) {
  const viewports = job.viewports || ["desktop", "tablet", "mobile"];
  for (const vpName of viewports) {
    const vp = VIEWPORTS[vpName];
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
      userAgent: vp.isMobile
        ? "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
        : undefined,
    });
    if (job.cookies) await context.addCookies(job.cookies);
    const page = await context.newPage();
    const started = Date.now();
    try {
      if (job.setup) await runActions(page, job.setup);
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(job.settle ?? 1500);
      if (job.fullPage !== false) await autoScroll(page);
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      if (job.actions) await runActions(page, job.actions);
      await page.waitForTimeout(job.afterActions ?? 600);
      const file = path.join(outDir, `${job.name}__${vpName}.png`);
      await page.screenshot({ path: file, fullPage: job.fullPage !== false, animations: "disabled", timeout: 120000 });
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      console.log(`  ok ${job.name} ${vpName} (${height}px tall, ${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } catch (e) {
      console.error(`  FAILED ${job.name} ${vpName}: ${e.message}`);
    } finally {
      await context.close();
    }
  }
}

const args = parseArgs(process.argv.slice(2));
let plan;
let outDir;
if (args._) {
  const cfg = JSON.parse(fs.readFileSync(args._, "utf8"));
  plan = cfg.jobs;
  outDir = args.out || cfg.out;
} else if (args.url) {
  plan = [{ name: args.name || "page", url: args.url, viewports: args.viewports ? String(args.viewports).split(",") : undefined, fullPage: args.viewportOnly ? false : true }];
  outDir = args.out || "tests/screenshots/new";
} else {
  console.error("Usage: node scripts/screenshot.mjs <plan.json> | --url <url> --out <dir> --name <name> [--viewports desktop,mobile] [--viewportOnly]");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const job of plan) {
  if (args.only && !String(args.only).split(",").includes(job.name)) continue;
  await capture(browser, job, outDir);
}
await browser.close();
