// "use strict";

// /**
//  * Urban Company — Category List Fetcher (Visible Browser Mode)
//  * Run: node uc-get-categories.js [city]
//  * Default city: mumbai
//  *
//  * Install deps first:
//  *   npm install puppeteer-extra puppeteer-extra-plugin-stealth random-useragent
//  */

// const fs = require("fs");
// const puppeteer = require("puppeteer-extra");
// const StealthPlugin = require("puppeteer-extra-plugin-stealth");
// const randomUA = require("random-useragent");

// puppeteer.use(StealthPlugin());

// // ── Config ────────────────────────────────────────────────────────────────────

// const CITY = process.argv[2] || "mumbai";
// const BASE_URL = `https://www.urbancompany.com/${CITY}`;
// const OUTPUT_FILE = `uc-categories-${CITY}.json`;

// const BROWSER_ARGS = [
//   "--no-sandbox",
//   "--disable-setuid-sandbox",
//   "--disable-dev-shm-usage",
//   "--disable-gpu",
//   "--disable-blink-features=AutomationControlled",
//   "--window-size=1366,768",
//   "--start-maximized",
// ];

// const SKIP_SLUGS = new Set([
//   "login", "register", "help", "about", "careers",
//   "blog", "partner", "franchise", "terms", "privacy",
//   "contact", "sitemap", "notifications",
// ]);

// // ── Helpers ───────────────────────────────────────────────────────────────────

// const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// function log(msg) {
//   console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
// }

// // ── Page setup (anti-bot spoofs, run once per page) ───────────────────────────

// async function setupPage(page) {
//   await page.evaluateOnNewDocument(() => {
//     Object.defineProperty(navigator, "webdriver",           { get: () => false });
//     Object.defineProperty(navigator, "languages",           { get: () => ["en-IN", "en-US", "en"] });
//     Object.defineProperty(navigator, "platform",            { get: () => "Win32" });
//     Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
//     Object.defineProperty(navigator, "deviceMemory",        { get: () => 8 });

//     // Realistic plugin list
//     const pluginData = [
//       { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
//       { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
//       { name: "Native Client",     filename: "internal-nacl-plugin" },
//     ];
//     Object.defineProperty(navigator, "plugins", {
//       get: () => {
//         const arr = pluginData.slice();
//         arr.item      = (i) => arr[i] ?? null;
//         arr.namedItem = (n) => arr.find((p) => p.name === n) ?? null;
//         arr.refresh   = () => {};
//         return arr;
//       },
//     });

//     // WebGL — spoof Intel iGPU
//     const _getParam = WebGLRenderingContext.prototype.getParameter;
//     WebGLRenderingContext.prototype.getParameter = function (p) {
//       if (p === 37445) return "Google Inc. (Intel)";
//       if (p === 37446) return "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)";
//       return _getParam.call(this, p);
//     };

//     // Canvas noise — tiny per-pixel jitter
//     const _toDataURL = HTMLCanvasElement.prototype.toDataURL;
//     HTMLCanvasElement.prototype.toDataURL = function (type, ...a) {
//       const ctx = this.getContext("2d");
//       if (ctx && this.width && this.height) {
//         const d = ctx.getImageData(0, 0, this.width, this.height);
//         for (let i = 0; i < d.data.length; i += 99)
//           d.data[i] ^= (Math.random() * 3) | 0;
//         ctx.putImageData(d, 0, 0);
//       }
//       return _toDataURL.call(this, type, ...a);
//     };
//   });
// }

// // ── Fingerprint (apply before each navigation) ────────────────────────────────

// async function applyFingerprint(page) {
//   const ua =
//     randomUA.getRandom((u) => u.deviceType === "desktop") ||
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

//   await page.setUserAgent(ua);
//   await page.setViewport({ width: 1366, height: 768 });
//   await page.emulateTimezone("Asia/Kolkata").catch(() => {});
//   await page.setExtraHTTPHeaders({
//     "accept-language":           "en-IN,en;q=0.9",
//     "accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
//     "upgrade-insecure-requests": "1",
//     "sec-ch-ua":                 `"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="99"`,
//     "sec-ch-ua-mobile":          "?0",
//     "sec-ch-ua-platform":        `"Windows"`,
//     "sec-fetch-dest":            "document",
//     "sec-fetch-mode":            "navigate",
//     "sec-fetch-site":            "none",
//     "sec-fetch-user":            "?1",
//   });
// }

// // ── Scroll the full page to trigger lazy-loaded category cards ────────────────

// async function autoScroll(page) {
//   await page.evaluate(() =>
//     new Promise((resolve) => {
//       let total = 0;
//       const dist = 300;
//       const timer = setInterval(() => {
//         window.scrollBy(0, dist);
//         total += dist;
//         if (total >= document.body.scrollHeight) {
//           clearInterval(timer);
//           resolve();
//         }
//       }, 200);
//     })
//   ).catch(() => {});
// }

// // ── Human-like mouse drift ────────────────────────────────────────────────────

// async function humanMouse(page) {
//   try {
//     const vp = page.viewport() ?? { width: 1366, height: 768 };
//     const rx = () => 80 + Math.random() * (vp.width  - 160);
//     const ry = () => 80 + Math.random() * (vp.height - 160);
//     const moves = 3 + Math.floor(Math.random() * 3);
//     for (let i = 0; i < moves; i++) {
//       await page.mouse.move(rx(), ry(), { steps: 10 + Math.floor(Math.random() * 10) });
//       await delay(100 + Math.random() * 200);
//     }
//   } catch (_) {}
// }

// // ── Extract categories from DOM (runs inside browser context) ─────────────────

// function extractCategoriesFromDOM(citySlug, skipSlugs) {
//   const results = [];
//   const seen    = new Set();

//   document.querySelectorAll("a[href]").forEach((a) => {
//     const href = (a.href || "").split("?")[0].toLowerCase().trim();

//     // Must match exactly:  /city/category  (2 segments, no deeper)
//     const match = href.match(
//       new RegExp(`urbancompany\\.com\\/${citySlug}\\/([a-z0-9][a-z0-9-]+)$`)
//     );
//     if (!match) return;

//     const slug = match[1];
//     if (skipSlugs.includes(slug)) return;
//     if (seen.has(slug))           return;
//     seen.add(slug);

//     // Best label: aria-label > img alt > visible text > slug
//     const label = (
//       a.getAttribute("aria-label") ||
//       a.querySelector("img")?.alt  ||
//       a.innerText?.trim().replace(/\s+/g, " ") ||
//       slug
//     ).trim();

//     if (!label || label.length > 80) return;

//     // Grab thumbnail from the card if available
//     const imgSrc = a.querySelector("img")?.src || "";

//     results.push({ name: label, slug, url: href, image: imgSrc });
//   });

//   return results;
// }

// // ── Main ──────────────────────────────────────────────────────────────────────

// async function getCategoryList() {
//   log("🚀 Launching browser (VISIBLE mode)...");

//   const browser = await puppeteer.launch({
//     headless: false,         // ← browser window opens visibly on your screen
//     args: BROWSER_ARGS,
//     defaultViewport: null,   // use the full OS window size
//   });

//   let page = null;

//   try {
//     page = await browser.newPage();

//     await setupPage(page);
//     await applyFingerprint(page);

//     log(`🌐 Navigating → ${BASE_URL}`);
//     await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

//     log("⏳ Letting page settle...");
//     await delay(2500);
//     await humanMouse(page);

//     log("📜 Scrolling to load lazy category cards...");
//     await autoScroll(page);
//     await delay(1500);

//     // Scroll back to top so the full page is parsed correctly
//     await page.evaluate(() => window.scrollTo(0, 0));
//     await delay(800);

//     log("🔍 Waiting for category links to appear in DOM...");
//     await page
//       .waitForSelector(`a[href*="urbancompany.com/${CITY}/"]`, { timeout: 15000 })
//       .catch(() => log("⚠  Selector wait timed out — extracting whatever is loaded"));

//     log("📦 Extracting categories...");
//     const skipArray  = [...SKIP_SLUGS];
//     const categories = await page.evaluate(extractCategoriesFromDOM, CITY, skipArray);

//     return categories;

//   } finally {
//     log("✅ Extraction done — closing browser in 3s so you can see the result...");
//     await delay(3000);
//     if (page) await page.close().catch(() => {});
//     await browser.close().catch(() => {});
//   }
// }

// // ── Entry point ───────────────────────────────────────────────────────────────

// (async () => {
//   try {
//     const categories = await getCategoryList();

//     if (!categories.length) {
//       console.log("\n⚠  No categories found.");
//       console.log("   UC may have blocked the request, or the page structure changed.");
//       console.log("   Try again in a few minutes.\n");
//       process.exit(1);
//     }

//     // ── Pretty console table ──────────────────────────────────────────────────
//     console.log(`\n✅  Found ${categories.length} categories — Urban Company ${CITY.toUpperCase()}\n`);
//     console.log("─".repeat(72));
//     categories.forEach((c, i) => {
//       console.log(`${String(i + 1).padStart(3, " ")}. ${c.name.padEnd(38, " ")} ${c.url}`);
//     });
//     console.log("─".repeat(72));

//     // ── Build output object ───────────────────────────────────────────────────
//     const output = {
//       city:      CITY,
//       fetchedAt: new Date().toISOString(),
//       total:     categories.length,
//       categories,
//     };

//     // ── Save JSON to file ─────────────────────────────────────────────────────
//     fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");
//     console.log(`\n💾  Saved to: ${OUTPUT_FILE}`);

//     // ── Print JSON to stdout ──────────────────────────────────────────────────
//     console.log("\n📋  JSON Output:\n");
//     console.log(JSON.stringify(output, null, 2));

//   } catch (err) {
//     console.error("\n❌  Fatal error:", err.message);
//     process.exit(1);
//   }
// })();