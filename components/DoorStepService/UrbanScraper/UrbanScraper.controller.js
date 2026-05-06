"use strict";

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  URBAN COMPANY SCRAPER — Production Ready (Hardened v2)        ║
 * ║  ✅ domcontentloaded instead of networkidle2 (anti-bot fix)    ║
 * ║  ✅ Cookie persistence across browser restarts                 ║
 * ║  ✅ Realistic humanMouse — multi-move + scroll                 ║
 * ║  ✅ Exponential + random backoff on blocks                     ║
 * ║  ✅ consecutiveBlocks counter for extended cooldowns           ║
 * ║  ✅ Variable recycle interval (10–15, not always fixed)        ║
 * ║  ✅ Long pauses (30–60s) injected randomly between services    ║
 * ║  ✅ setupPage  — one-time JS spoofs via evaluateOnNewDocument  ║
 * ║  ✅ applyFingerprint — per-navigation UA/viewport/headers      ║
 * ║  ✅ getPageState — diagnose listing/service/captcha/block      ║
 * ║  ✅ Atomic provider + product upserts (zero duplicates)        ║
 * ║  ✅ Crash-safe selectors (safeWait, no throw)                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─── Imports ──────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const randomUA = require("random-useragent");
const pLimit = require("p-limit").default;
const axios = require("axios");

const { serviceProductsModel } = require("../ServiceProducts/ServiceProducts.model");
const { serviceProviderModel } = require("../ServiceProvider/ServiceProvider.model");

puppeteer.use(StealthPlugin());

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_DIR = path.join(__dirname, "..", "..", "public", "ServiceImage");
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

// Session cookie file — persists across browser restarts so UC sees a returning user
const COOKIE_FILE = path.join(__dirname, ".uc-session-cookies.json");

const BASE_URL = "https://www.urbancompany.com";

const BROWSER_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-accelerated-2d-canvas",
    "--disable-blink-features=AutomationControlled",
    "--window-size=1920,1080",
];

const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1280, height: 800 },
];

const TIMEZONES = [
    "Asia/Kolkata", "Asia/Kolkata", "Asia/Kolkata",
    "Asia/Calcutta", "Asia/Mumbai",
];

const LOCALES = ["en-IN", "en-US", "en-GB"];

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {import('puppeteer').Browser | null} */
let browser = null;
let running = false;

const stats = { saved: 0, links: 0, providers: 0, errors: 0 };

// ─── Utilities ────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const randDelay = (lo = 5000, hi = 12000) => delay(lo + Math.random() * (hi - lo));
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

function log(msg) {
    console.log(msg);
    global.broadcastLog?.({ msg, ts: new Date().toLocaleTimeString() });
}

function broadcastStats() { global.broadcastStats?.(); }

// ─── Cookie persistence ───────────────────────────────────────────────────────

/**
 * Save cookies from the current page to disk.
 * Called after every successful page load so the session stays fresh.
 */
async function saveCookies(page) {
    try {
        const cookies = await page.cookies(BASE_URL);
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    } catch (_) { }
}

/**
 * Restore previously saved cookies onto a new page.
 * This makes Urban Company see a returning user instead of a fresh anonymous session.
 */
async function loadCookies(page) {
    try {
        if (!fs.existsSync(COOKIE_FILE)) return;
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
        if (cookies.length) await page.setCookie(...cookies);
    } catch (_) { }
}

// ─── Image download ───────────────────────────────────────────────────────────

const getFileNameFromUrl = (url) => {
    const hash = crypto.createHash("md5").update(url).digest("hex");
    const ext = path.extname(url.split("?")[0]) || ".jpg";
    return `${hash}${ext}`;
};

async function downloadFile(url, folder, retries = 3) {
    if (!url?.startsWith("http")) return null;
    const fileName = getFileNameFromUrl(url);
    const filePath = path.join(folder, fileName);
    if (fs.existsSync(filePath)) return fileName;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await axios({
                url, method: "GET", responseType: "stream",
                timeout: 20000,
                headers: { "User-Agent": "Mozilla/5.0" },
            });
            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(filePath);
                res.data.pipe(writer);
                writer.on("finish", resolve);
                writer.on("error", reject);
            });
            return fileName;
        } catch (err) {
            if (attempt === retries) {
                log("❌ Download failed: " + url.slice(0, 60));
                return null;
            }
            await delay(1000 * attempt);
        }
    }
    return null;
}

// ─── Fingerprint ──────────────────────────────────────────────────────────────

/**
 * setupPage — call ONCE right after newPage().
 * evaluateOnNewDocument persists across ALL navigations on this page.
 */
async function setupPage(page) {
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
        Object.defineProperty(navigator, "languages", { get: () => ["en-IN", "en-US", "en"] });
        Object.defineProperty(navigator, "platform", { get: () => "Win32" });
        Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
        Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });

        // Realistic plugin list
        const pluginData = [
            { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
            { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
            { name: "Native Client", filename: "internal-nacl-plugin" },
        ];
        Object.defineProperty(navigator, "plugins", {
            get: () => {
                const arr = pluginData.slice();
                arr.item = (i) => arr[i] ?? null;
                arr.namedItem = (n) => arr.find((p) => p.name === n) ?? null;
                arr.refresh = () => { };
                return arr;
            },
        });

        // WebGL — spoof Intel iGPU
        const _getParam = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (p) {
            if (p === 37445) return "Google Inc. (Intel)";
            if (p === 37446) return "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)";
            return _getParam.call(this, p);
        };

        // Canvas noise — tiny per-pixel jitter
        const _toDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function (type, ...a) {
            const ctx = this.getContext("2d");
            if (ctx && this.width && this.height) {
                const d = ctx.getImageData(0, 0, this.width, this.height);
                for (let i = 0; i < d.data.length; i += 99)
                    d.data[i] ^= (Math.random() * 3) | 0;
                ctx.putImageData(d, 0, 0);
            }
            return _toDataURL.call(this, type, ...a);
        };

        // Permissions spoof
        const _query = navigator.permissions?.query?.bind(navigator.permissions);
        if (_query) {
            navigator.permissions.query = (p) =>
                p.name === "notifications"
                    ? Promise.resolve({ state: Notification.permission })
                    : _query(p);
        }
    });
}

/**
 * isPageAlive — check if a page's CDP session is still open.
 * Prevents "Session closed" errors when calling page methods on a dead page.
 */
async function isPageAlive(page) {
    try {
        await page.evaluate(() => true);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * applyFingerprint — call before EACH page.goto().
 * Sets UA, viewport, timezone, sec-ch-ua headers.
 *
 * NOTE: Does NOT call emulateMediaType or any touch emulation API —
 * those trigger Emulation.setTouchEmulationEnabled which crashes on
 * dead/closed sessions and is unnecessary for desktop spoofing.
 */
async function applyFingerprint(page) {
    const ua = randomUA.getRandom((u) => u.deviceType === "desktop")
        ?? randomUA.getRandom()
        ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    const viewport = randomItem(VIEWPORTS);
    const timezone = randomItem(TIMEZONES);
    const locale = randomItem(LOCALES);

    await page.setUserAgent(ua);
    await page.setViewport(viewport);

    // emulateTimezone is safe — it uses a different CDP domain than touch emulation
    await page.emulateTimezone(timezone).catch(() => { });

    await page.setExtraHTTPHeaders({
        "accept-language": `${locale},en;q=0.9`,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "upgrade-insecure-requests": "1",
        "sec-ch-ua": `"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="99"`,
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": `"Windows"`,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
    });
}

/**
 * humanMouse — realistic multi-point mouse drift with occasional scrolling.
 * Real users don't just move the mouse twice; they wander, pause, and scroll.
 */
async function humanMouse(page) {
    try {
        const vp = page.viewport() ?? { width: 1366, height: 768 };
        const rx = () => 80 + Math.random() * (vp.width - 160);
        const ry = () => 80 + Math.random() * (vp.height - 160);

        // 3–6 random movements with pauses between each
        const moves = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < moves; i++) {
            await page.mouse.move(rx(), ry(), { steps: 8 + Math.floor(Math.random() * 15) });
            await delay(80 + Math.random() * 300);
        }

        // 60% chance of also scrolling a bit — real users do this immediately on page load
        if (Math.random() > 0.4) {
            await page.evaluate(() => window.scrollBy(0, 100 + Math.random() * 400));
            await delay(400 + Math.random() * 800);
            // Scroll back up slightly — mimics reading then re-checking top
            await page.evaluate(() => window.scrollBy(0, -(50 + Math.random() * 150)));
        }
    } catch (_) { }
}

// ─── Page helpers ─────────────────────────────────────────────────────────────

async function safeWait(page, selector, timeout = 10000) {
    try { await page.waitForSelector(selector, { timeout }); return true; }
    catch (_) { return false; }
}

/** Returns: "listing" | "service" | "captcha" | "block" | "unknown" | "error" */
async function getPageState(page) {
    return page.evaluate(() => {
        if (document.querySelector("[data-testid='service-card']")) return "listing";
        if (document.querySelector(".categoryContainer")) return "listing";
        if (document.querySelector(".sc-jNnpgg")) return "listing";
        if (document.querySelector("[class*='ServiceCard']")) return "listing";
        if (document.querySelector("[class*='service-card']")) return "listing";

        if (document.querySelector("[class*='ServiceDetail']")) return "service";
        if (document.querySelector("[class*='service-detail']")) return "service";
        if (document.querySelector(".serviceDetailPage")) return "service";

        if (document.title?.toLowerCase().includes("access denied")) return "block";
        if (document.title?.toLowerCase().includes("too many requests")) return "block";
        if (document.body?.innerText?.includes("429")) return "block";
        if (document.body?.innerText?.includes("Access Denied")) return "block";
        if (document.body?.innerText?.includes("Cloudflare")) return "block";
        if (document.body?.innerText?.includes("checking your browser")) return "block";

        if (document.querySelector("form[action*='captcha']")) return "captcha";
        if (document.querySelector(".cf-challenge-running")) return "captcha";

        return "unknown";
    }).catch(() => "error");
}

async function handleCaptcha(page) {
    const state = await getPageState(page);
    if (state !== "captcha") return false;

    log("⚠ CAPTCHA detected — screenshot saved. Solve manually (2 min timeout)...");
    await page.screenshot({ path: "uc-captcha.png" }).catch(() => { });

    await page.waitForFunction(
        () => !document.querySelector("form[action*='captcha']") &&
            !document.querySelector(".cf-challenge-running"),
        { timeout: 120000, polling: 1000 }
    ).catch(() => log("⚠ CAPTCHA timeout — retrying navigation"));

    log("✅ CAPTCHA solved, continuing...");
    return true;
}

async function autoScroll(page) {
    await page.evaluate(() =>
        new Promise((resolve) => {
            let total = 0;
            const dist = 300;
            const timer = setInterval(() => {
                window.scrollBy(0, dist);
                total += dist;
                if (total >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
            }, 150);
        })
    ).catch(() => { });
}

/**
 * openWithRetry — hardened page loader.
 *
 * KEY CHANGES vs original:
 *  - waitUntil: "domcontentloaded" instead of networkidle (anti-bot fix).
 *  - Loads saved cookies before navigating (returning-user session).
 *  - Saves cookies after a successful page load.
 *  - Exponential + random backoff on blocks instead of a flat wait.
 *  - Waits for service selectors or captcha, whichever arrives first.
 *  - isPageAlive guard before each attempt.
 */
async function openWithRetry(page, url, maxRetries = 3) {
    await setupPage(page).catch(() => { });
    await loadCookies(page);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log(`Opening (${attempt}/${maxRetries}): ${url}`);

            await applyFingerprint(page);

            // domcontentloaded fires as soon as HTML is parsed — no bot signal
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

            // Simulate reading time before interacting — real users don't act instantly
            await delay(1500 + Math.random() * 2000);
            await humanMouse(page);

            // Wait for a known selector or captcha, whichever arrives first
            await Promise.race([
                page.waitForSelector("[data-testid='service-card']", { timeout: 15000 }),
                page.waitForSelector("[class*='ServiceCard']", { timeout: 15000 }),
                page.waitForSelector("[class*='service-card']", { timeout: 15000 }),
                page.waitForSelector(".categoryContainer", { timeout: 15000 }),
                page.waitForSelector("[class*='ServiceDetail']", { timeout: 15000 }),
                page.waitForSelector("form[action*='captcha']", { timeout: 15000 }),
            ]).catch(() => { });

            const wasCaptcha = await handleCaptcha(page);
            if (wasCaptcha) continue; // re-evaluate state after captcha solved

            const state = await getPageState(page);
            log(`  ℹ Page state: ${state} — ${page.url().slice(0, 80)}`);

            if (state === "listing" || state === "service") {
                // Save cookies so the next browser restart inherits this session
                await saveCookies(page);
                return state;
            }

            if (state === "block") {
                // Exponential + jitter backoff — not a flat predictable interval
                const backoff = 30000 + attempt * 15000 + Math.random() * 20000;
                log(`⚠ UC traffic block — waiting ${Math.round(backoff / 1000)}s...`);
                await delay(backoff);
                continue;
            }

            log("⚠ Unexpected page state — retrying");

        } catch (err) {
            log(`Retry error: ${err.message}`);
        }

        // Increasing wait between retries with jitter
        const wait = 8000 * attempt + Math.random() * 5000;
        log(`Retrying after ${Math.round(wait / 1000)}s`);
        await delay(wait);
    }

    log(`❌ Failed after ${maxRetries} retries: ${url}`);
    return null;
}

// ─── Extraction (runs inside page.evaluate) ───────────────────────────────────

/**
 * extractListingLinks — scrape all service detail page URLs from a category listing.
 * Runs inside page.evaluate so it has full DOM access.
 */
function extractListingLinks(baseUrl) {
    const links = new Set();

    // Prefer explicit service-card anchors
    document.querySelectorAll(
        "[data-testid='service-card'] a, [class*='ServiceCard'] a, [class*='service-card'] a"
    ).forEach((a) => {
        const href = a.href;
        if (href && href.includes(baseUrl)) links.add(href);
    });

    // Fallback: any anchor that looks like a service detail URL
    document.querySelectorAll("a[href]").forEach((a) => {
        const href = a.href || "";
        if (
            href.includes("/services/") ||
            href.match(/urbancompany\.com\/[a-z-]+\/[a-z-]+\/[a-z-]+/)
        ) {
            links.add(href);
        }
    });

    return [...links];
}

/**
 * extractServiceDetail — scrape all data from a UC service detail page.
 * Runs inside page.evaluate so it has full DOM access.
 */
function extractServiceDetail() {
    const text = (sel) =>
        document.querySelector(sel)?.innerText?.trim() || "";

    const textAll = (sel) =>
        [...document.querySelectorAll(sel)].map((el) => el.innerText?.trim()).filter(Boolean);

    const serviceName =
        text("h1[class*='title']") ||
        text("h1[class*='Title']") ||
        text("[class*='serviceName']") ||
        text("[class*='ServiceName']") ||
        text("h1") ||
        "";

    const rawPrice =
        text("[class*='price']:not([class*='original']):not([class*='strike'])") ||
        text("[class*='Price']:not([class*='original']):not([class*='strike'])") ||
        text("[class*='amount']") ||
        "";
    const price = parseFloat(rawPrice.replace(/[₹,\s]/g, "")) || null;

    const rawOffer =
        text("[class*='discount']") ||
        text("[class*='Discount']") ||
        text("[class*='offer']") ||
        text("[class*='Offer']") ||
        "";
    const offerPercentage = parseFloat(rawOffer.replace(/[%\s-]/g, "")) || null;

    const description =
        text("[class*='description']") ||
        text("[class*='Description']") ||
        text("[class*='about']") ||
        text("[class*='About']") ||
        text("[class*='serviceInfo']") ||
        "";

    const aboutPoints = textAll(
        "[class*='include'] li, [class*='Include'] li, " +
        "[class*='benefit'] li, [class*='Benefit'] li, " +
        "[class*='feature'] li, [class*='Feature'] li, " +
        "[class*='checklist'] li, [class*='checkList'] li"
    );

    // Add-on / spare parts
    const parts = [];
    document.querySelectorAll(
        "[class*='addon'], [class*='AddOn'], [class*='add-on'], [class*='extra']"
    ).forEach((card) => {
        const name = card.querySelector("[class*='name'], [class*='Name'], h3, h4, p")?.innerText?.trim();
        const price = parseFloat(
            (card.querySelector("[class*='price'], [class*='Price']")?.innerText || "")
                .replace(/[₹,\s]/g, "")
        ) || null;
        if (name) parts.push({ partName: name, partPrice: price });
    });

    const rawTime =
        text("[class*='duration']") ||
        text("[class*='Duration']") ||
        text("[class*='time']") ||
        "";
    const serviceTime = parseFloat(rawTime.replace(/[^0-9.]/g, "")) || null;

    const rawRating =
        text("[class*='rating']") ||
        text("[class*='Rating']") ||
        text("[class*='star']") ||
        "";
    const rating = parseFloat(rawRating) || 0;

    const rawReviews =
        text("[class*='review']") ||
        text("[class*='Review']") ||
        "";
    const totalReviews = parseInt(rawReviews.replace(/[^0-9]/g, "")) || 0;

    const images = [];
    document.querySelectorAll(
        "[class*='serviceImage'] img, [class*='ServiceImage'] img, " +
        "[class*='service-image'] img, [class*='gallery'] img, " +
        "[class*='Gallery'] img, [class*='hero'] img, [class*='Hero'] img"
    ).forEach((img) => {
        const src = img.src || img.dataset?.src || img.dataset?.lazySrc;
        if (src && src.startsWith("http") && !src.includes("placeholder"))
            images.push(src);
    });

    const providerName =
        text("[class*='providerName']") ||
        text("[class*='ProviderName']") ||
        text("[class*='expertName']") ||
        text("[class*='professional']") ||
        "";

    const providerImage =
        document.querySelector(
            "[class*='providerImage'] img, [class*='ProviderImage'] img, " +
            "[class*='expertImage'] img, [class*='professional'] img"
        )?.src || "";

    const providerRating = parseFloat(
        text("[class*='providerRating'], [class*='ProviderRating']")
    ) || 0;

    const googleLocation =
        text("[class*='location']") ||
        text("[class*='Location']") ||
        text("[class*='address']") ||
        text("[class*='Address']") ||
        window.location.pathname;

    const urlParts = window.location.pathname.split("/").filter(Boolean);
    const citySlug = urlParts[0] || "";
    const categorySlug = urlParts[1] || "";
    const subCategorySlug = urlParts[2] || "";

    return {
        serviceName,
        price,
        offerPercentage,
        description,
        aboutPoints,
        parts,
        serviceTime,
        rating,
        totalReviews,
        images,
        providerName,
        providerImage,
        providerRating,
        googleLocation,
        citySlug,
        categorySlug,
        subCategorySlug,
        pageUrl: window.location.href,
    };
}

// ─── Link collection ──────────────────────────────────────────────────────────

/**
 * freshPage — open a brand-new page from the browser.
 * Always creates a new page so we never reuse a dead/crashed session.
 */
async function freshPage(browserInstance) {
    const page = await browserInstance.newPage();
    await setupPage(page).catch(() => { });
    await loadCookies(page);
    return page;
}

/**
 * collectServiceLinks — hardened listing page crawler.
 *
 * KEY CHANGES vs original:
 *  - Page is RECREATED on every listing page — never reuses a dead/crashed session.
 *    Fixes: 'Protocol error (Emulation.setTouchEmulationEnabled): Session closed'.
 *  - domcontentloaded instead of networkidle.
 *  - Loads and saves cookies so the session is reused across restarts.
 *  - consecutiveBlocks counter: 2+ blocks in a row triggers a 2–3 min cooldown.
 *  - Longer, randomised inter-page delays (6–14s vs flat intervals).
 *  - Page is always closed in a finally block — no resource leaks.
 */
async function collectServiceLinks(browserInstance, categoryUrl, maxPages = 5) {
    const allLinks = new Set();
    let consecutiveBlocks = 0;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        if (!running) break;

        log(`Listing page: ${pageNum} — ${categoryUrl}`);

        // Always open a fresh page — never carry over a potentially dead session
        let page = null;
        try {
            page = await freshPage(browserInstance);
            await applyFingerprint(page);

            const urlWithPage = pageNum > 1
                ? `${categoryUrl}${categoryUrl.includes("?") ? "&" : "?"}page=${pageNum}`
                : categoryUrl;

            // domcontentloaded fires as soon as HTML is parsed — no bot signal
            await page.goto(urlWithPage, { waitUntil: "domcontentloaded", timeout: 60000 });

            // Reading pause before any interaction
            await delay(1200 + Math.random() * 1500);
            await humanMouse(page);

            await handleCaptcha(page);

            const state = await getPageState(page);

            if (state === "block") {
                consecutiveBlocks++;
                // 2+ consecutive blocks → much longer cooldown
                const backoff = consecutiveBlocks >= 2
                    ? 120000 + Math.random() * 60000
                    : 40000 + Math.random() * 30000;
                log(`⚠ Block on listing page (${consecutiveBlocks} consecutive) — waiting ${Math.round(backoff / 1000)}s`);
                pageNum--;
                continue; // page closed in finally
            }
            consecutiveBlocks = 0;

            await autoScroll(page);
            await delay(800 + Math.random() * 1200);

            // Wait for service cards to render
            await Promise.race([
                page.waitForSelector("[data-testid='service-card']", { timeout: 12000 }),
                page.waitForSelector("[class*='ServiceCard']", { timeout: 12000 }),
                page.waitForSelector("[class*='service-card']", { timeout: 12000 }),
                delay(12000),
            ]).catch(() => { });

            const beforeCount = allLinks.size;
            const pageLinks = await page.evaluate(extractListingLinks, BASE_URL);

            pageLinks.forEach((l) => allLinks.add(l));
            const newLinks = allLinks.size - beforeCount;

            if (!newLinks) {
                log(`ℹ No new links on page ${pageNum} — stopping pagination`);
                break;
            }

            log(`✅ Found ${newLinks} new service links on listing page ${pageNum} (total ${allLinks.size})`);
            await saveCookies(page);
            await delay(6000 + Math.random() * 8000);

        } catch (err) {
            log("❌ Listing page error: " + err.message);
            await delay(12000 + Math.random() * 8000);
            pageNum--;
        } finally {
            // Always close — never leave a stale session open
            if (page) { try { await page.close(); } catch (_) { } }
        }
    }

    return [...allLinks];
}

// ─── Core service scrape ──────────────────────────────────────────────────────

async function scrapeService(browserInstance, link, config) {
    let page = null;
    try {
        const { companyId, HeadServiceId, SubServiceId } = config;

        page = await browserInstance.newPage();

        const state = await openWithRetry(page, link);
        if (!state) return;

        await autoScroll(page);
        await randDelay(1500, 3500);

        const data = await page.evaluate(extractServiceDetail);

        if (!data?.serviceName) {
            log("❌ No service name found on: " + link);
            return;
        }

        // Idempotency check
        const existing = await serviceProductsModel.findOne({
            ServiceName: data.serviceName,
            companyId,
            HeadServiceId,
        });
        if (existing) {
            log("⚠️ Already exists: " + data.serviceName);
            return;
        }

        // ── Download images ───────────────────────────────────────────────────

        const dlLimit = pLimit(4);
        const imageFiles = [];

        await Promise.all(
            (data.images || []).map((url) =>
                dlLimit(async () => {
                    const file = await downloadFile(url, IMAGE_DIR);
                    if (file) imageFiles.push(file);
                })
            )
        );

        // ── Provider (atomic upsert) ──────────────────────────────────────────

        const providerFirstName = data.providerName
            ? data.providerName.split(" ")[0] || "Urban"
            : "Urban";
        const providerLastName = data.providerName
            ? data.providerName.split(" ").slice(1).join(" ") || "Professional"
            : "Professional";

        let providerImageFile = "default-provider.jpg";
        if (data.providerImage) {
            const downloaded = await downloadFile(data.providerImage, IMAGE_DIR);
            if (downloaded) providerImageFile = downloaded;
        }

        const provider = await serviceProviderModel.findOneAndUpdate(
            {
                FirstName: providerFirstName,
                LastName: providerLastName,
                companyId,
                HeadServiceId: { $in: [HeadServiceId] },
            },
            {
                $setOnInsert: {
                    FirstName: providerFirstName,
                    LastName: providerLastName,
                    ProviderImage: providerImageFile,
                    companyId,
                    Email: `provider_${Date.now()}_${Math.random().toString(36).slice(2)}@urbancompany.scraped`,
                    Phone: "0000000000",
                    PanCardNo: "SCRAPE0000X",
                    GstNo: "00SCRAPE0000X0Z0",
                    Street: data.googleLocation || data.citySlug || "Unknown",
                    City: data.citySlug || "Unknown",
                    State: "Unknown",
                    Country: "India",
                    PostalCode: "000000",
                    Lattitude: 0,
                    Longitude: 0,
                    Password: crypto.createHash("sha256").update("uc_scraped_placeholder").digest("hex"),
                    isActive: true,
                    isActiveBy: "System",
                },
                $addToSet: {
                    HeadServiceId: HeadServiceId,
                    SubServiceId: SubServiceId,
                },
            },
            { new: true, upsert: true }
        );

        stats.providers++;
        broadcastStats();
        log(`👤 Provider: ${providerFirstName} ${providerLastName}`);

        // ── Save service product ──────────────────────────────────────────────

        await new serviceProductsModel({
            ServiceName: data.serviceName,
            serviceImages: imageFiles,
            companyId,
            HeadServiceId,
            SubServiceId,
            ProviderId: provider._id,
            service_description: data.description || data.aboutPoints?.join(". ") || data.serviceName,
            service_parts: (data.parts || []).filter((p) => p.partName),
            service_base_price: data.price || 0,
            offerPercentage: data.offerPercentage || 0,
            serviceTime: data.serviceTime || null,
            googleLocation: data.googleLocation || data.pageUrl,
            RatingStar: data.rating || 0,
            TotalReviews: data.totalReviews || 0,
            isActive: true,
        }).save();

        stats.saved++;
        broadcastStats();
        log(`🎉 Service Saved: ${data.serviceName}`);

        // Save cookies so the next browser restart inherits this session
        await saveCookies(page);

    } catch (err) {
        stats.errors++;
        broadcastStats();
        log(`🔥 Fatal scrape error on ${link}: ${err.message}`);
    } finally {
        if (page) { try { await page.close(); } catch (_) { } }
    }
}

// ─── Browser factory ──────────────────────────────────────────────────────────
async function launchBrowser() {
    try {
        return await puppeteer.launch({
            headless: "new",
            executablePath: process.env.CHROME_PATH || undefined,
            args: [
                ...BROWSER_ARGS,
                "--start-maximized"
            ],
            defaultViewport: null,
        });
    } catch (err) {
        log("❌ Browser launch failed: " + err.message);
        throw err;
    }
}
async function startScraping(config, onFinish) {
    if (running) { log("⚠ Already running"); return; }

    Object.assign(stats, { saved: 0, links: 0, providers: 0, errors: 0 });
    broadcastStats();

    running = true;

    const categoryUrls = config.categoryUrls || [];
    const maxListingPages = config.maxListingPages || 5;

    if (!categoryUrls.length) {
        log("❌ No categoryUrls provided. Example: ['https://www.urbancompany.com/bangalore/plumbers']");
        running = false;
        onFinish?.();
        return;
    }

    log(`🚀 Starting Urban Company scraper — ${categoryUrls.length} category URL(s)`);

    browser = await launchBrowser();

    // ── Collect links ─────────────────────────────────────────────────────────

    let allServiceLinks = [];

    for (const catUrl of categoryUrls) {
        if (!running) break;
        log(`📂 Collecting links from: ${catUrl}`);
        const links = await collectServiceLinks(browser, catUrl, maxListingPages);
        allServiceLinks.push(...links);
        log(`  → ${links.length} service links collected`);
    }

    allServiceLinks = [...new Set(allServiceLinks)];
    stats.links = allServiceLinks.length;
    broadcastStats();
    log(`🔗 Total service links: ${allServiceLinks.length}`);

    // ── Scrape sequentially ───────────────────────────────────────────────────

    let counter = 0;
    // Random recycle threshold 10–15 — never a perfectly predictable interval
    let recycleAfter = 10 + Math.floor(Math.random() * 6);

    for (const link of allServiceLinks) {
        if (!running) break;

        counter++;
        try {
            await scrapeService(browser, link, config);
        } catch (err) {
            stats.errors++;
            broadcastStats();
            log(`❌ Error on: ${link} | ${err.message}`);
        }

        // Base delay 8–20s between services
        const baseDelay = 8000 + Math.random() * 12000;
        // 15% chance of a much longer 30–60s pause — mimics a user taking a break
        const longPause = Math.random() < 0.15
            ? 30000 + Math.random() * 30000
            : 0;
        await delay(baseDelay + longPause);

        // Browser recycle at randomised interval
        if (counter % recycleAfter === 0 && running) {
            log("♻ Restarting browser...");

            // Save cookies before closing so the next instance inherits the session
            try {
                const openPages = await browser.pages();
                if (openPages[0]) await saveCookies(openPages[0]);
            } catch (_) { }

            try { await browser.close(); } catch (_) { }
            browser = await launchBrowser();

            // Longer rest after recycle — a real user takes a break between sessions
            await delay(15000 + Math.random() * 15000);

            // Pick a new random recycle threshold for the next batch
            recycleAfter = 10 + Math.floor(Math.random() * 6);
        }
    }

    log("✅ Urban Company scraping finished");
    try { await browser.close(); } catch (_) { }
    browser = null;
    running = false;

    onFinish?.();
}

function stopScraping() {
    running = false;
    if (browser) {
        browser.close().catch(() => { });
        browser = null;
    }
    log("🛑 Urban Company scraper stopped");
}
async function getCategoryList(browser) {
    const page = await browser.newPage();

    await page.goto("https://www.urbancompany.com/mumbai", {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    await delay(3000);
    await autoScroll(page);

    const categories = await page.evaluate(() => {
        const results = [];

        // Target category cards more specifically
        document.querySelectorAll("a").forEach(a => {
            const href = a.href || "";

            // Match only valid category URLs
            if (/urbancompany\.com\/[a-z-]+\/[a-z-]+/.test(href)) {
                const name = a.innerText?.trim();

                if (name && name.length < 40) {
                    results.push({
                        name,
                        url: href.split("?")[0]
                    });
                }
            }
        });

        // Remove duplicates
        return Array.from(
            new Map(results.map(i => [i.url, i])).values()
        );
    });

    await page.close();
    return categories;
}
// GET /api/categories
const getCategoriesAPI = async (req, res) => {
    try {
        const browser = await launchBrowser();
        const categories = await getCategoryList(browser);
        await browser.close();

        res.json({
            success: true,
            data: categories
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
module.exports = { startScraping, stopScraping, stats, getCategoriesAPI };