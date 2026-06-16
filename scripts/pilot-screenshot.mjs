#!/usr/bin/env node
/**
 * pilot-screenshot — render a URL at a fixed viewport and save a PNG.
 *
 * Thin wrapper over Playwright/Chromium so QA + UX agents can produce
 * visual-truth evidence from any worktree in the Pilot container. The Chromium
 * binary is baked into the image (see Dockerfile, PLAYWRIGHT_BROWSERS_PATH).
 *
 * Usage:
 *   pilot-screenshot <url> --viewport=1440x900 --out=screenshot-desktop.png
 *   pilot-screenshot <url> --viewport=390x844  --out=screenshot-mobile.png
 *
 * Options:
 *   --viewport=WxH      Viewport in CSS px. Default 1440x900.
 *                       Standard gate sizes: 1440x900 desktop, 390x844 mobile.
 *   --out=FILE          Output PNG path (relative to your cwd). Default
 *                       ./pilot-screenshot.png.
 *   --full-page         Capture the full scrollable page, not just the viewport.
 *   --wait=MS           Extra settle time after network-idle. Default 1500.
 *   --cookie=NAME=VALUE Inject a cookie scoped to the target origin. Repeatable.
 *   --storage-state=F   Reuse a Playwright storageState JSON (full session).
 *   --no-auth           Do not auto-inject the board bearer token.
 *
 * Authentication (in priority order, all optional):
 *   1. --storage-state=<file>  full saved session (cookies + localStorage)
 *   2. --cookie=name=value     explicit cookie injection
 *   3. board bearer token from ~/.paperclip/auth.json (default, unless --no-auth)
 *
 * Relative URLs (starting with "/") are resolved against the board apiBase from
 * ~/.paperclip/auth.json, else $PAPERCLIP_API_BASE, else http://localhost:3100.
 *
 * Attaching to an issue thread (so it renders inline in the UI):
 *   curl -sf -X POST \
 *     "$PAPERCLIP_API_BASE/api/companies/$COMPANY_ID/issues/$ISSUE_ID/attachments" \
 *     -H "Authorization: Bearer $TOKEN" \
 *     -F "file=@screenshot-desktop.png;type=image/png"
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// --- Resolve Playwright regardless of caller cwd -------------------------
// The browser + module live in the image (/app), not the agent's worktree.
function loadChromium() {
  // @playwright/test is the direct dependency (re-exports chromium), so it is
  // reliably resolvable; bare `playwright` is only a transitive dep and pnpm
  // does not hoist it to the project root. Try the env override and /app first
  // so this resolves from the agent's worktree cwd.
  const candidates = [
    process.env.PAPERCLIP_PLAYWRIGHT_PATH,
    "/app/node_modules/@playwright/test",
    "/app/node_modules/playwright",
    "@playwright/test",
    "playwright",
  ].filter(Boolean);
  for (const id of candidates) {
    try {
      const mod = require(id);
      if (mod?.chromium) return mod.chromium;
    } catch {
      // try next
    }
  }
  throw new Error(
    "Playwright not found. Expected @playwright/test in /app/node_modules (baked into the Pilot image).",
  );
}

// --- CLI parsing ---------------------------------------------------------
const rawArgs = process.argv.slice(2);
const positional = [];
const opts = { cookies: [] };

for (const arg of rawArgs) {
  if (arg === "--full-page") opts.fullPage = true;
  else if (arg === "--no-auth") opts.noAuth = true;
  else if (arg.startsWith("--viewport=")) opts.viewport = arg.slice("--viewport=".length);
  else if (arg.startsWith("--out=")) opts.out = arg.slice("--out=".length);
  else if (arg.startsWith("--wait=")) opts.wait = Number(arg.slice("--wait=".length));
  else if (arg.startsWith("--cookie=")) opts.cookies.push(arg.slice("--cookie=".length));
  else if (arg.startsWith("--storage-state=")) opts.storageState = arg.slice("--storage-state=".length);
  else if (arg.startsWith("--")) {
    console.error(`Unknown option: ${arg}`);
    process.exit(2);
  } else positional.push(arg);
}

const rawUrl = positional[0];
if (!rawUrl) {
  console.error("Usage: pilot-screenshot <url> --viewport=1440x900 --out=screenshot-desktop.png");
  process.exit(2);
}

// Viewport
const viewportStr = opts.viewport || "1440x900";
const vm = /^(\d+)x(\d+)$/.exec(viewportStr.trim());
if (!vm) {
  console.error(`Invalid --viewport=${viewportStr} (expected WxH, e.g. 1440x900)`);
  process.exit(2);
}
const viewport = { width: Number(vm[1]), height: Number(vm[2]) };
const outPath = path.resolve(process.cwd(), opts.out || "pilot-screenshot.png");
const waitMs = Number.isFinite(opts.wait) ? opts.wait : 1500;

// --- Board credentials (optional) ----------------------------------------
function loadBoardCred() {
  try {
    const authPath = path.resolve(os.homedir(), ".paperclip/auth.json");
    const auth = JSON.parse(fs.readFileSync(authPath, "utf-8"));
    const entry = Object.values(auth.credentials || {})[0];
    if (entry?.token && entry?.apiBase) return { token: entry.token, apiBase: entry.apiBase };
  } catch {
    // no creds — fine for public/unauthenticated pages
  }
  return null;
}

const cred = loadBoardCred();
const apiBase = cred?.apiBase || process.env.PAPERCLIP_API_BASE || "http://localhost:3100";
const url = rawUrl.startsWith("http") ? rawUrl : `${apiBase}${rawUrl}`;
const origin = new URL(url).origin;

// --- Capture -------------------------------------------------------------
(async () => {
  let browser;
  try {
    const chromium = loadChromium();
    browser = await chromium.launch({ headless: true });
    const contextOptions = { viewport };
    if (opts.storageState) {
      if (!fs.existsSync(opts.storageState)) {
        throw new Error(`--storage-state file not found: ${opts.storageState}`);
      }
      contextOptions.storageState = opts.storageState;
    }
    const context = await browser.newContext(contextOptions);

    // Explicit cookie injection (req #4: cookie/session reuse).
    if (opts.cookies.length) {
      const cookies = opts.cookies.map((pair) => {
        const eq = pair.indexOf("=");
        if (eq === -1) throw new Error(`Invalid --cookie=${pair} (expected name=value)`);
        return {
          name: pair.slice(0, eq),
          value: pair.slice(eq + 1),
          url: origin,
        };
      });
      await context.addCookies(cookies);
    }

    const page = await context.newPage();

    // Default auth: inject the board bearer token, scoped to the board origin.
    if (cred?.token && !opts.noAuth) {
      await page.route(`${origin}/**`, async (route) => {
        await route.continue({
          headers: { ...route.request().headers(), Authorization: `Bearer ${cred.token}` },
        });
      });
    }

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    if (waitMs > 0) await page.waitForTimeout(waitMs);
    await page.screenshot({ path: outPath, fullPage: Boolean(opts.fullPage) });
    console.log(`Saved ${viewport.width}x${viewport.height} screenshot: ${outPath}`);
  } catch (err) {
    console.error(`pilot-screenshot failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
