/**
 * Lighthouse runner: scores the main pages on mobile and desktop and writes a summary.
 *
 *   npm run build && npm start                 # measure a PRODUCTION build (dev mode is much slower)
 *   npm run audit:lighthouse                   # = node scripts/lighthouse.mjs [baseUrl] [options]
 *
 * Options:
 *   [baseUrl]          first argument, default http://localhost:3000
 *   --only <path>      one page only, e.g. --only /shop/
 *   --mobile-only      only the mobile preset
 *   --desktop-only     only the desktop preset
 *   --out <dir>        output folder (default docs/reports/lighthouse/<YYYY-MM-DD>)
 *
 * Uses `npx -y lighthouse@12` with the installed Google Chrome (CHROME_PATH, default
 * C:/Program Files/Google/Chrome/Application/chrome.exe on Windows), headless.
 * Saves one JSON report per page and form factor, plus summary.md (also printed).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_PATHS = ["/", "/shop/", "/product-category/super-oils/", "/product/jivo-rice-bran-oil/", "/product/jivo-extra-virgin-coconut-oil/", "/cart/"];
const WINDOWS_CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function parseArgs(argv) {
  const o = { base: "http://localhost:3000", paths: DEFAULT_PATHS, forms: ["mobile", "desktop"], out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only") {
      let p = argv[++i];
      if (!p) throw new Error("--only needs a path, e.g. --only /shop/");
      // Git Bash turns "/shop/" into "C:/Program Files/Git/shop/": undo that (or pass "shop/" without the slash)
      const msys = /^[A-Za-z]:[\\/].*?[\\/]Git([\\/].*)$/.exec(p);
      if (msys) p = msys[1].replace(/\\/g, "/");
      o.paths = [p.startsWith("/") ? p : `/${p}`];
    } else if (a === "--mobile-only") o.forms = ["mobile"];
    else if (a === "--desktop-only") o.forms = ["desktop"];
    else if (a === "--out") o.out = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/lighthouse.mjs [baseUrl] [--only /path/] [--mobile-only|--desktop-only] [--out dir]");
      process.exit(0);
    } else if (/^https?:\/\//.test(a)) o.base = a.replace(/\/+$/, "");
    else throw new Error(`Unknown option: ${a}`);
  }
  return o;
}

/** "/product/x/" -> "product-x" ("/" -> "home"). */
const slugOf = (p) => p.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-") || "home";

/** Runs a command and resolves with its exit code and error output. */
function run(cmd, args, env) {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    // On Windows npx is a .cmd file, so it must run through the shell: build one command line
    // with every argument quoted (our arguments are fixed strings and URLs, never user text from the web).
    const line = [cmd, ...args].map((a) => (/[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(" ");
    const child = isWin ? spawn(line, { env, shell: true, stdio: ["ignore", "ignore", "pipe"] }) : spawn(cmd, args, { env, stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, stderr: err }));
    child.on("error", (e) => resolve({ code: 1, stderr: String(e) }));
  });
}

const pct = (score) => (typeof score === "number" ? Math.round(score * 100) : "–");
const ms = (audit) => (audit?.numericValue != null ? `${(audit.numericValue / 1000).toFixed(2)} s` : "–");
const msInt = (audit) => (audit?.numericValue != null ? `${Math.round(audit.numericValue)} ms` : "–");
const cls = (audit) => (audit?.numericValue != null ? audit.numericValue.toFixed(3) : "–");

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const date = new Date().toISOString().slice(0, 10);
  const outDir = path.resolve(o.out || path.join("docs", "reports", "lighthouse", date));
  fs.mkdirSync(outDir, { recursive: true });
  const env = { ...process.env };
  if (!env.CHROME_PATH && process.platform === "win32" && fs.existsSync(WINDOWS_CHROME)) env.CHROME_PATH = WINDOWS_CHROME;

  // quick check that the site answers before starting slow Lighthouse runs
  try {
    const res = await fetch(o.base + "/", { signal: AbortSignal.timeout(30_000) });
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw new Error(`${o.base} does not answer (${err instanceof Error ? err.message : err}). Start the site first: npm run build && npm start`);
  }
  if (/:3100\b/.test(o.base)) console.warn("! This looks like the DEV server. Dev mode is slow; scores are only meaningful for a production build (npm run build && npm start).");

  const results = [];
  for (const p of o.paths) {
    for (const form of o.forms) {
      const url = o.base + p;
      const file = path.join(outDir, `${slugOf(p)}-${form}.json`);
      process.stdout.write(`Lighthouse ${form.padEnd(7)} ${url} ... `);
      const args = [
        "-y",
        "lighthouse@12",
        url,
        "--quiet",
        "--output=json",
        `--output-path=${file}`,
        "--only-categories=performance,accessibility,best-practices,seo",
        "--chrome-flags=--headless=new --no-first-run --no-default-browser-check",
        "--max-wait-for-load=90000",
      ];
      if (form === "desktop") args.push("--preset=desktop");
      if (fs.existsSync(file)) fs.rmSync(file);
      const { code, stderr } = await run("npx", args, env);
      // Lighthouse on Windows sometimes exits with an error while deleting its temp profile
      // even though the report was written, so the report file decides success.
      if (!fs.existsSync(file)) {
        console.log("FAILED");
        console.error(stderr.split("\n").filter(Boolean).slice(-5).join("\n"));
        results.push({ path: p, form, error: `exit code ${code}` });
        continue;
      }
      const lhr = JSON.parse(fs.readFileSync(file, "utf8"));
      if (lhr.runtimeError) {
        console.log(`ERROR (${lhr.runtimeError.code})`);
        results.push({ path: p, form, error: lhr.runtimeError.message });
        continue;
      }
      const c = lhr.categories;
      const a = lhr.audits;
      const row = {
        path: p,
        form,
        perf: pct(c.performance?.score),
        a11y: pct(c.accessibility?.score),
        bp: pct(c["best-practices"]?.score),
        seo: pct(c.seo?.score),
        lcp: ms(a["largest-contentful-paint"]),
        cls: cls(a["cumulative-layout-shift"]),
        tbt: msInt(a["total-blocking-time"]),
        file: path.basename(file),
      };
      results.push(row);
      console.log(`perf ${row.perf}, a11y ${row.a11y}, bp ${row.bp}, seo ${row.seo}`);
    }
  }

  const lines = [
    `# Lighthouse summary – ${date}`,
    "",
    `Base URL: ${o.base} · Lighthouse 12 · ${o.forms.join(" + ")} preset(s) · reports in this folder.`,
    "",
    "| Page | Form factor | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |",
    "|---|---|---|---|---|---|---|---|---|",
    ...results.map((r) =>
      r.error
        ? `| ${r.path} | ${r.form} | error: ${String(r.error).replace(/\|/g, "/").slice(0, 120)} | | | | | | |`
        : `| ${r.path} | ${r.form} | ${r.perf} | ${r.a11y} | ${r.bp} | ${r.seo} | ${r.lcp} | ${r.cls} | ${r.tbt} |`,
    ),
    "",
    "Targets: Performance ≥ 90 (mobile ≥ 80), Accessibility/Best Practices/SEO ≥ 95, LCP < 2.5 s, CLS < 0.1, TBT < 200 ms.",
    "Old site baseline (mobile home page): Performance 17, Accessibility 83, Best Practices 75, SEO 85, LCP 25.2 s, CLS 0.194, TBT 6,400 ms.",
    "",
  ];
  const md = lines.join("\n");
  fs.writeFileSync(path.join(outDir, "summary.md"), md, "utf8");
  console.log("\n" + md);
  console.log(`Saved to ${outDir}`);
  if (results.some((r) => r.error)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`Lighthouse run failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
