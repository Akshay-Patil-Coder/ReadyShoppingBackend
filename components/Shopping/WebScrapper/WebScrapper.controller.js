"use strict";

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AMAZON SCRAPER — Production Ready (Hardened v2)               ║
 * ║  ✅ domcontentloaded instead of networkidle2 (anti-bot fix)    ║
 * ║  ✅ Cookie persistence across browser restarts                 ║
 * ║  ✅ Realistic humanMouse — multi-move + scroll                 ║
 * ║  ✅ Exponential + random backoff on blocks                     ║
 * ║  ✅ consecutiveBlocks counter for extended cooldowns           ║
 * ║  ✅ Variable recycle interval (10–15, not always 20)           ║
 * ║  ✅ Long pauses (30–60s) injected randomly between products    ║
 * ║  ✅ setupPage  — one-time JS spoofs via evaluateOnNewDocument  ║
 * ║  ✅ applyFingerprint — per-navigation UA/viewport/headers      ║
 * ║  ✅ getPageState — diagnose product/captcha/block/search       ║
 * ║  ✅ Atomic brand + variant upserts (zero duplicates)           ║
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

const { VariantProduct, Product, Batch } = require("../VariantsProducts/VariantsProducts.model");
const { Variant } = require("../Variants/Variants.model");
const { brandmodel } = require("../ProductsBrand/ProductsBrand.model");
const { updateElasticById } = require("../ElasticSearch/elastic/CRUD");

puppeteer.use(StealthPlugin());

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_DIR = path.join(__dirname, "..", "..", "public", "ProductImage");
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

// Session cookie file — persists across browser restarts so Amazon sees a returning user
const COOKIE_FILE = path.join(__dirname, ".session-cookies.json");

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
    "America/New_York", "Europe/London",
];

const LOCALES = ["en-IN", "en-US", "en-GB"];

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {import('puppeteer').Browser | null} */
let browser = null;
let running = false;

const stats = { saved: 0, links: 0, variants: 0, errors: 0 };

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
        const cookies = await page.cookies("https://www.amazon.in");
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    } catch (_) {}
}

/**
 * Restore previously saved cookies onto a new page.
 * This makes Amazon see a returning user instead of a fresh anonymous session.
 */
async function loadCookies(page) {
    try {
        if (!fs.existsSync(COOKIE_FILE)) return;
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
        if (cookies.length) await page.setCookie(...cookies);
    } catch (_) {}
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
    await page.emulateTimezone(timezone).catch(() => {});

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
            await page.evaluate(() => {
                window.scrollBy(0, 100 + Math.random() * 400);
            });
            await delay(400 + Math.random() * 800);
            // Scroll back up slightly — mimics reading then re-checking top
            await page.evaluate(() => {
                window.scrollBy(0, -(50 + Math.random() * 150));
            });
        }
    } catch (_) {}
}

// ─── Page helpers ─────────────────────────────────────────────────────────────

async function safeWait(page, selector, timeout = 10000) {
    try { await page.waitForSelector(selector, { timeout }); return true; }
    catch (_) { return false; }
}

/** Returns: "product" | "captcha" | "block" | "search" | "unknown" | "error" */
async function getPageState(page) {
    return page.evaluate(() => {
        if (document.querySelector("#productTitle")) return "product";
        if (document.querySelector("form[action='/errors/validateCaptcha']")) return "captcha";
        if (document.body?.innerText.includes("traffic is piling up")) return "block";
        if (document.body?.innerText.includes("Robot Check")) return "block";
        if (document.body?.innerText.includes("Sorry, we just need")) return "block";
        if (document.querySelector(".s-result-item")) return "search";
        return "unknown";
    }).catch(() => "error");
}

async function handleCaptcha(page) {
    const state = await getPageState(page);
    if (state !== "captcha") return false;

    log("⚠ CAPTCHA detected — screenshot saved. Solve manually (2 min timeout)...");
    await page.screenshot({ path: "captcha.png" }).catch(() => { });

    await page.waitForFunction(
        () => !document.querySelector("form[action='/errors/validateCaptcha']"),
        { timeout: 120000, polling: 1000 }
    ).catch(() => log("⚠ CAPTCHA timeout — retrying navigation"));

    log("✅ CAPTCHA solved, continuing...");
    return true;
}

async function autoScroll(page) {
    await page.evaluate(() =>
        new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        })
    ).catch(() => { });
}

/**
 * openWithRetry — hardened page loader.
 *
 * KEY CHANGES vs original:
 *  - waitUntil: "domcontentloaded" instead of "networkidle2"
 *    networkidle2 is a well-known bot signal; real browsers never wait for it.
 *  - Loads saved cookies before navigating (returning-user session).
 *  - Saves cookies after a successful product load.
 *  - Exponential + random backoff on blocks instead of a flat 40s wait.
 *  - Waits for #productTitle or captcha selector, whichever arrives first,
 *    instead of relying purely on the network to go idle.
 */
async function openWithRetry(page, url, maxRetries = 3) {
    await setupPage(page).catch(() => {});
    await loadCookies(page);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log(`Opening Attempt (${attempt}/${maxRetries}): ${url}`);

            await applyFingerprint(page);

            // domcontentloaded fires as soon as the HTML is parsed — no bot signal
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

            // Simulate reading time before interacting — real users don't act instantly
            await delay(1500 + Math.random() * 2000);
            await humanMouse(page);

            // Wait for product title OR captcha form, whichever arrives first
            await Promise.race([
                page.waitForSelector("#productTitle", { timeout: 15000 }),
                page.waitForSelector("form[action='/errors/validateCaptcha']", { timeout: 15000 }),
                page.waitForSelector(".s-result-item", { timeout: 15000 }),
            ]).catch(() => {});

            const wasCaptcha = await handleCaptcha(page);
            if (wasCaptcha) continue; // re-evaluate state after captcha solved

            const state = await getPageState(page);
            log(`  ℹ Page state: ${state} — ${page.url().slice(0, 80)}`);

            if (state === "product") {
                // Save cookies so the next browser restart inherits this session
                await saveCookies(page);
                return true;
            }

            if (state === "block") {
                // Exponential + jitter backoff — not a flat predictable interval
                const backoff = 30000 + attempt * 15000 + Math.random() * 20000;
                log(`⚠ Amazon traffic block — waiting ${Math.round(backoff / 1000)}s...`);
                await delay(backoff);
                continue;
            }

            log("⚠ Product page not loaded properly.");

        } catch (err) {
            log(`Retry error: ${err.message}`);
        }

        // Increasing wait between retries with jitter
        const wait = 8000 * attempt + Math.random() * 5000;
        log(`Retrying after ${Math.round(wait / 1000)}s`);
        await delay(wait);
    }

    log(`❌ Failed after ${maxRetries} retries: ${url}`);
    return false;
}

// ─── Extraction (runs inside page.evaluate) ───────────────────────────────────

function extractBaseProduct() {
    const getASIN = () => {
        const match = window.location.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
        return match ? match[1] : "";
    };

    const getBrand = () => {
        let brand = document.querySelector("#bylineInfo")?.innerText ?? "";
        brand = brand.replace("Visit the", "").replace("Store", "").replace("Brand:", "").trim();
        if (!brand) {
            document.querySelectorAll("#productDetails_techSpec_section_1 tr").forEach((row) => {
                if (row.querySelector("th")?.innerText.trim() === "Brand")
                    brand = row.querySelector("td")?.innerText.trim() ?? "";
            });
        }
        return brand;
    };

    const images = [];
    document.querySelectorAll("#altImages li").forEach((li) => {
        if (li.classList.contains("videoThumbnail")) return;
        if (li.classList.contains("template-color-video")) return;
        if (li.querySelector(".vse-video-thumb-overlay, .PKplay-button, .video-block-icon")) return;
        if (li.querySelector('[class*="video" i]')) return;

        const img = li.querySelector("img");
        if (!img?.src) return;
        if (img.src.includes("PKplay") || img.src.includes("play-button")) return;

        images.push(img.src.replace(/\._.*?_\./, "._SL1500_."));
    });

    const videos = [];
    try {
        const imageBlock = window.P?.state?.("ImageBlockATF");
        if (imageBlock?.colorImages) {
            Object.values(imageBlock.colorImages).forEach((list) => {
                list.forEach((media) => {
                    if (media.type === "video") {
                        if (media.url) videos.push(media.url);
                        if (media.hlsUrl) videos.push(media.hlsUrl);
                        if (media.videoUrl) videos.push(media.videoUrl);
                    }
                });
            });
        }
        document.querySelectorAll("video source").forEach((s) => {
            if (s.src?.match(/\.(mp4|m3u8)/)) videos.push(s.src);
        });
        document.querySelectorAll("script").forEach((script) => {
            const matches = script.innerText.match(/https:\/\/[^"]+\.(mp4|m3u8)/g);
            if (matches) videos.push(...matches);
        });
    } catch (_) {}

    const aboutPoints = [];
    document.querySelectorAll("#feature-bullets li span").forEach((el) => {
        const text = el.innerText.trim();
        if (text) aboutPoints.push(text);
    });

    const asins = [];
    document.querySelectorAll(".inline-twister-row li").forEach((li) => {
        const asin = li.getAttribute("data-asin");
        if (asin?.length === 10) asins.push(asin);
    });

    return {
        currentASIN: getASIN(),
        Brand: getBrand(),
        ProductName: document.querySelector("#productTitle")?.innerText.trim(),
        images,
        videos: [...new Set(videos)],
        aboutPoints,
        asins: [...new Set(asins)],
    };
}

function extractVariant() {
    const getASIN = () => {
        const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
        return match ? match[1] : "";
    };

    const images = [];
    document.querySelectorAll("#altImages li").forEach((li) => {
        if (li.classList.contains("videoThumbnail")) return;
        if (li.classList.contains("template-color-video")) return;
        if (li.querySelector(".vse-video-thumb-overlay, .PKplay-button, .video-block-icon")) return;
        if (li.querySelector('[class*="video" i]')) return;

        const img = li.querySelector("img");
        if (!img?.src) return;
        if (img.src.includes("PKplay") || img.src.includes("play-button")) return;

        images.push(img.src.replace(/\._.*?_\./, "._SL1500_."));
    });

    const specs = [];
    const seenKeys = new Set();

    const pushSpec = (key, val) => {
        if (!key || !val) return;
        const cleanKey = key.trim().replace(/\s+/g, " ");
        const cleanVal = val.trim().replace(/\s+/g, " ");
        if (!cleanKey || !cleanVal) return;
        if (cleanVal === "‎" || cleanVal === "-" || cleanVal.length > 500) return;

        const dedupeKey = cleanKey.toLowerCase();
        if (seenKeys.has(dedupeKey)) return;
        seenKeys.add(dedupeKey);

        specs.push({ SpecificationKey: cleanKey, SpecificationValue: cleanVal });
    };

    const BLOCKED_KEYS = [
        "customer reviews", "best sellers rank", "customer ratings",
        "review", "ratings", "rank", "feedback",
    ];

    const isBlocked = (key) => {
        const k = key.toLowerCase();
        return BLOCKED_KEYS.some((b) => k.includes(b));
    };

    const SPEC_CONTAINERS = [
        "#productDetails_techSpec_section_1",
        "#productDetails_techSpec_section_2",
        "#productDetails_detailBullets_sections1",
        "#productDetails_db_sections",
        "#technicalSpecifications_section_1",
        "#prodDetails",
        "#poExpander",
        ".product-facts-detail",
    ];

    const BLOCKED_ANCESTORS = [
        "#reviewsMedley", "#cm-cr-dp-tab-content", "#askDPSearchTextID",
        "#ask_lazy_load_div", "#HLCXComparisonWidget_feature_div",
        "#dp-ads-center-promo", "#important-information",
    ];

    const isInBlockedSection = (el) =>
        BLOCKED_ANCESTORS.some((sel) => el.closest(sel));

    // 1. Standard table-based specs
    SPEC_CONTAINERS.forEach((containerSel) => {
        document.querySelectorAll(`${containerSel} tr`).forEach((row) => {
            if (isInBlockedSection(row)) return;
            const key = row.querySelector("th")?.innerText
                || row.querySelector("td:first-child")?.innerText;
            const val = row.querySelector("td:last-child")?.innerText
                || row.querySelector("td")?.innerText;
            if (key && !isBlocked(key)) pushSpec(key, val);
        });
    });

    // 2. Bullet-list style (#detailBullets_feature_div)
    document.querySelectorAll("#detailBullets_feature_div li").forEach((li) => {
        if (isInBlockedSection(li)) return;
        const spans = li.querySelectorAll("span.a-list-item > span");
        if (spans.length >= 2) {
            const key = spans[0].innerText.replace(/[:\s‏‎]+$/, "");
            const val = spans[1].innerText;
            if (key && !isBlocked(key)) pushSpec(key, val);
        } else {
            const text = li.innerText;
            const idx = text.indexOf(":");
            if (idx > 0) {
                const key = text.slice(0, idx);
                const val = text.slice(idx + 1);
                if (key && !isBlocked(key)) pushSpec(key, val);
            }
        }
    });

    // 3. New-style "product overview" key-value grid (fashion/home)
    document.querySelectorAll("#productOverview_feature_div tr").forEach((row) => {
        if (isInBlockedSection(row)) return;
        const cells = row.querySelectorAll("td");
        if (cells.length >= 2) {
            const key = cells[0].innerText;
            const val = cells[1].innerText;
            if (key && !isBlocked(key)) pushSpec(key, val);
        }
    });

    const aboutPoints = [];
    document.querySelectorAll("#feature-bullets li span").forEach((el) => {
        const text = el.innerText.trim();
        if (text) aboutPoints.push(text);
    });

    const variantFields = {};
    document.querySelectorAll(".inline-twister-row").forEach((row) => {
        const fieldName = row
            .querySelector(".dimension-text span:first-child")
            ?.innerText.replace(":", "").trim();
        const selected = row.querySelector(".a-button-selected");
        if (!selected || !fieldName) return;
        const img = selected.querySelector("img");
        const text = selected.querySelector(".swatch-title-text-display");
        const value = (img?.alt ?? text?.innerText ?? "").trim();
        if (value) variantFields[fieldName] = value;
    });

    return {
        ASIN: getASIN(),
        name: document.querySelector("#productTitle")?.innerText.trim(),
        price: document.querySelector(".a-price .a-offscreen")?.innerText.replace(/[₹,\s]/g, ""),
        offer: document.querySelector(".savingsPercentage")?.innerText.replace(/[%\s-]/g, ""),
        images,
        specs,
        aboutPoints,
        variantFields,
    };
}

// ─── Link collection ──────────────────────────────────────────────────────────

/**
 * freshSearchPage — open a brand-new page from the browser for search use.
 * Always creates a new page so we never reuse a dead/crashed session.
 */
async function freshSearchPage(browserInstance) {
    const page = await browserInstance.newPage();
    await setupPage(page).catch(() => {});
    await loadCookies(page);
    return page;
}

/**
 * collectProductLinks — hardened search page crawler.
 *
 * KEY CHANGES vs original:
 *  - Page is RECREATED on every retry — never reuses a dead/crashed session.
 *    Fixes: 'Protocol error (Emulation.setTouchEmulationEnabled): Session closed'.
 *  - domcontentloaded instead of networkidle2.
 *  - Loads and saves cookies so the session is reused across restarts.
 *  - consecutiveBlocks counter: 2+ blocks in a row triggers a 2–3 min cooldown.
 *  - Longer, randomised inter-page delays (6–14s vs 3–6s).
 *  - Page is always closed in a finally block — no resource leaks.
 */
async function collectProductLinks(browserInstance, keyword, pages) {
    const links = [];
    let consecutiveBlocks = 0;

    for (let i = 1; i <= pages; i++) {
        if (!running) break;

        log(`Search page: ${i}`);

        // Always open a fresh page — never carry over a potentially dead session
        let page = null;
        try {
            page = await freshSearchPage(browserInstance);
            await applyFingerprint(page);

            await page.goto(
                `https://www.amazon.in/s?k=${encodeURIComponent(keyword)}&page=${i}`,
                { waitUntil: 'domcontentloaded', timeout: 60000 }
            );

            // Reading pause before any interaction
            await delay(1200 + Math.random() * 1500);
            await humanMouse(page);
            await handleCaptcha(page);

            const state = await getPageState(page);

            if (state === 'block') {
                consecutiveBlocks++;
                const backoff = consecutiveBlocks >= 2
                    ? 120000 + Math.random() * 60000
                    : 40000 + Math.random() * 30000;
                log(`⚠ Block on search page (${consecutiveBlocks} consecutive) — waiting ${Math.round(backoff / 1000)}s`);
                i--;
                continue; // page closed in finally
            }
            consecutiveBlocks = 0;

            // Wait for results to render
            await Promise.race([
                page.waitForSelector('.s-result-item', { timeout: 12000 }),
                delay(12000),
            ]);

            const pageLinks = await page.evaluate(() => {
                const urls = [];
                document.querySelectorAll('.s-main-slot .s-result-item[data-asin]').forEach((item) => {
                    const asin = item.getAttribute('data-asin');
                    if (asin?.length === 10)
                        urls.push(`https://www.amazon.in/gp/product/${asin}`);
                });
                return [...new Set(urls)];
            });

            if (!pageLinks.length) {
                log('⚠ No products found on page — retrying after 15s');
                await delay(15000);
                i--;
                continue; // page closed in finally
            }

            links.push(...pageLinks);
            log(`✅ Found ${pageLinks.length} products on page ${i}`);
            await saveCookies(page);
            await delay(6000 + Math.random() * 8000);

        } catch (err) {
            log('❌ Search page error: ' + err.message);
            await delay(12000 + Math.random() * 8000);
            i--;
        } finally {
            // Always close — never leave a stale session open
            if (page) { try { await page.close(); } catch (_) {} }
        }
    }

    return [...new Set(links)];
}

// ─── Core product scrape ──────────────────────────────────────────────────────

async function scrapeProduct(browserInstance, link, config) {
    let page = null;
    try {
        const { companyId, HeadCategoryId, SubCategoryId } = config;

        page = await browserInstance.newPage();

        log(`Opening: ${link}`);

        const loaded = await openWithRetry(page, link);
        if (!loaded) return;

        await autoScroll(page);
        await randDelay(2000, 4000);

        const base = await page.evaluate(extractBaseProduct);

        if (!base?.ProductName || !base?.Brand || !base?.currentASIN) {
            log("❌ Missing base data");
            return;
        }

        // Idempotency check
        const existing = await VariantProduct.findOne({ ASIN: base.currentASIN, companyId });
        if (existing) {
            log("⚠️ Already exists: " + base.currentASIN);
            return;
        }

        // ── Brand (atomic upsert) ─────────────────────────────────────────────

        const brand = await brandmodel.findOneAndUpdate(
            { BrandName: base.Brand, companyId, HeadCategoryId },
            {
                $setOnInsert: { BrandName: base.Brand, companyId, HeadCategoryId },
                $addToSet: { SubCategoryId: SubCategoryId },
            },
            { new: true, upsert: true }
        );

        // ── Collect variant ASINs ─────────────────────────────────────────────

        const allImages = new Set(base.images || []);
        const allVideos = new Set(base.videos || []);

        const variantASINs = [
            base.currentASIN,
            ...(base.asins || []).filter((a) => a !== base.currentASIN),
        ];

        const variantRawData = [];

        for (const asin of variantASINs) {
            if (!running) break;
            try {
                const already = await VariantProduct.findOne({ ASIN: asin, companyId });
                if (already) continue;

                await applyFingerprint(page);

                // domcontentloaded here too — consistency across all navigations
                await page.goto(`https://www.amazon.in/dp/${asin}`, {
                    waitUntil: "domcontentloaded",
                    timeout: 40000,
                });

                // Reading pause
                await delay(1200 + Math.random() * 1500);
                await humanMouse(page);

                const wasCaptcha = await handleCaptcha(page);
                if (wasCaptcha) {
                    await page.goto(`https://www.amazon.in/dp/${asin}`, {
                        waitUntil: "domcontentloaded", timeout: 40000,
                    });
                    await delay(1200 + Math.random() * 1000);
                }

                // Wait for product title to confirm the page rendered
                await Promise.race([
                    page.waitForSelector("#productTitle", { timeout: 12000 }),
                    delay(12000),
                ]).catch(() => {});

                const vState = await getPageState(page);
                if (vState !== "product") {
                    log(`⚠ Variant ${asin} — unexpected page state: ${vState}`);
                    continue;
                }

                await randDelay(2000, 4000);

                const variantData = await page.evaluate(extractVariant);
                if (!variantData?.price) continue;

                (variantData.images || []).forEach((u) => allImages.add(u));
                (variantData.videos || []).forEach((u) => allVideos.add(u));

                variantRawData.push({ asin, data: variantData });

                // Save cookies after each variant load — keeps session alive
                await saveCookies(page);

            } catch (err) {
                log("❌ Variant fetch error: " + asin + " — " + err.message);
            }
        }

        // ── Download media ────────────────────────────────────────────────────

        const dlLimit = pLimit(5);
        const imageMap = {};

        await Promise.all(
            [...allImages].map((url) =>
                dlLimit(async () => {
                    const file = await downloadFile(url, IMAGE_DIR);
                    if (file) imageMap[url] = file;
                })
            )
        );

        // ── Create Product ────────────────────────────────────────────────────

        const commonImages = (base.images || []).map((u) => imageMap[u]).filter(Boolean);

        const product = await new Product({
            companyId, HeadCategoryId, SubCategoryId,
            BrandId: brand._id,
            ProductName: base.ProductName,
            CommonDescription: {
                Head: base.ProductName,
                Points: base.aboutPoints || [],
                TextDescription: "",
            },
            CommonImages: commonImages,
        }).save();

        log("✅ Product Created: " + product.ProductName);

        // ── Create Variants ───────────────────────────────────────────────────

        const varLimit = pLimit(5);
        const variantIds = [];
        const uniqueVariantNames = new Set();

        for (const { data: vData } of variantRawData) {
            for (const key of Object.keys(vData.variantFields || {})) {
                const trimmed = key.trim();
                if (trimmed) uniqueVariantNames.add(trimmed);
            }
        }

        const variantNameToId = new Map();
        for (const name of uniqueVariantNames) {
            try {
                const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const filter = {
                    VariantName: { $regex: `^${escaped}$`, $options: "i" },
                    companyId,
                    SubCategoryId,
                };

                let vf = await Variant.findOne(filter);

                if (!vf) {
                    try {
                        vf = await Variant.create({
                            VariantName: name,
                            VariantType: "String",
                            companyId, HeadCategoryId, SubCategoryId,
                        });
                    } catch (err) {
                        if (err.code === 11000) {
                            vf = await Variant.findOne(filter);
                        } else {
                            throw err;
                        }
                    }
                }

                if (vf) variantNameToId.set(name, vf._id);
            } catch (err) {
                log("⚠️ Variant resolve error for '" + name + "': " + err.message);
            }
        }

        await Promise.all(
            variantRawData.map(({ asin, data: vData }) =>
                varLimit(async () => {
                    try {
                        const variantFields = [];

                        for (const [key, value] of Object.entries(vData.variantFields || {})) {
                            const cleanedKey = key.trim();
                            const variantId = variantNameToId.get(cleanedKey);
                            if (!variantId || !value) continue;
                            variantFields.push({ VariantId: variantId, VariantValue: value.trim() });
                        }

                        const variantImages = (vData.images || []).map((u) => imageMap[u]).filter(Boolean);
                        const offerPercentage = Math.abs(Number(vData.offer) || 0);
                        const discountedPrice = Number(vData.price) || 0;
                        const originalPrice = offerPercentage > 0 && discountedPrice > 0
                            ? Math.round((discountedPrice * 100) / (100 - offerPercentage))
                            : discountedPrice;

                        const variant = await new VariantProduct({
                            companyId, HeadCategoryId, SubCategoryId,
                            ProductId: product._id,
                            ASIN: asin,
                            VariantProductName: vData.name || base.ProductName,
                            Price: originalPrice,
                            OfferPercentage: offerPercentage,
                            VariantFields: variantFields,
                            VariantProductImage: variantImages.length ? variantImages
                                : commonImages.length ? [commonImages[0]]
                                    : [],
                            Specification: vData.specs || [],
                            AboutProduct: {
                                Head: "About this item",
                                Points: vData.aboutPoints?.length ? vData.aboutPoints : base.aboutPoints,
                                TextDescription: "",
                            },
                        }).save();

                        variantIds.push(variant._id);

                        // Update VariantValues counters
                        for (const vf of variantFields) {
                            const incResult = await Variant.updateOne(
                                { _id: vf.VariantId, "VariantValues.Value": vf.VariantValue },
                                { $inc: { "VariantValues.$.Count": 1 } }
                            );

                            if (incResult.matchedCount === 0) {
                                await Variant.updateOne(
                                    { _id: vf.VariantId, "VariantValues.Value": { $ne: vf.VariantValue } },
                                    { $push: { VariantValues: { Value: vf.VariantValue, Count: 1 } } }
                                );
                                await Variant.updateOne(
                                    { _id: vf.VariantId, "VariantValues.Value": vf.VariantValue },
                                    { $inc: { "VariantValues.$.Count": 1 } }
                                );
                            }
                        }

                        stats.variants++;
                        broadcastStats();
                        log("✅ Variant Saved: " + asin);

                    } catch (err) {
                        stats.errors++;
                        broadcastStats();
                        log("❌ Variant error: " + asin + " — " + err.message);
                    }
                })
            )
        );

        // ── Finalise ──────────────────────────────────────────────────────────

        if (!variantIds.length) {
            await Product.findByIdAndDelete(product._id);
            log("❌ No variants saved → product deleted");
            return;
        }

        await Product.findByIdAndUpdate(product._id, { VariantProductIds: variantIds });

        try { await updateElasticById({ type: "product", id: product._id }); }
        catch (err) { log("⚠️ Elastic sync failed: " + err.message); }

        stats.saved++;
        broadcastStats();
        log("🎉 Fully Saved: " + product.ProductName);

    } catch (err) {
        stats.errors++;
        broadcastStats();
        log("🔥 Fatal scrape error: " + err.message);
    } finally {
        if (page) {
            try { await page.close(); } catch (_) {}
        }
    }
}

// ─── Browser factory ──────────────────────────────────────────────────────────

async function launchBrowser() {
    try {
        return await puppeteer.launch({
            headless: "new",
            executablePath: process.env.CHROME_PATH || "/usr/bin/chromium-browser",
            args: [
                ...BROWSER_ARGS,
                "--single-process",
                "--no-zygote",
            ],
            defaultViewport: null,
        });
    } catch (err) {
        log("❌ Browser launch failed: " + err.message);
        throw err;
    }
}

// ─── Start / stop ─────────────────────────────────────────────────────────────

/**
 * startScraping — main orchestrator.
 *
 * KEY CHANGES vs original:
 *  - Recycle interval is random 10–15 (not always 20) — breaks timing patterns.
 *  - Delays between products: 8–20s base, with 15% chance of a 30–60s long pause.
 *  - Cookies are saved before browser close so the next instance inherits the session.
 *  - 15–30s rest after browser recycle — avoids rapid session churn.
 */
async function startScraping(config, onFinish) {
    if (running) { log("⚠ Already running"); return; }

    Object.assign(stats, { saved: 0, links: 0, variants: 0, errors: 0 });
    broadcastStats();

    running = true;

    const pages = config.pages || 5;
    const keyword = config.keyword || "Products";

    log(`🚀 Starting scraper — keyword="${keyword}" pages=${pages}`);

    browser = await launchBrowser();

    // ── Collect links ─────────────────────────────────────────────────────────

    let productLinks = [];
    productLinks = await collectProductLinks(browser, keyword, pages);

    stats.links = productLinks.length;
    broadcastStats();
    log(`Products found: ${productLinks.length}`);

    // ── Scrape sequentially ───────────────────────────────────────────────────

    let counter = 0;
    // Random recycle threshold 10–15 — never a perfectly predictable interval
    let recycleAfter = 10 + Math.floor(Math.random() * 6);

    for (const link of productLinks) {
        if (!running) break;

        counter++;
        try {
            await scrapeProduct(browser, link, config);
        } catch (err) {
            stats.errors++;
            broadcastStats();
            log(`❌ Error scraping: ${link} | ${err.message}`);
        }

        // Base delay 8–20s between products
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
            } catch (_) {}

            try { await browser.close(); } catch (_) {}
            browser = await launchBrowser();

            // Longer rest after recycle — a real user takes a break between sessions
            await delay(15000 + Math.random() * 15000);

            // Pick a new random recycle threshold for the next batch
            recycleAfter = 10 + Math.floor(Math.random() * 6);
        }
    }

    log("✅ Scraping finished");
    try { await browser.close(); } catch (_) {}
    browser = null;
    running = false;

    onFinish?.();
}

function stopScraping() {
    running = false;
    if (browser) {
        browser.close().catch(() => {});
        browser = null;
    }
    log("🛑 Scraper stopped");
}

module.exports = { startScraping, stopScraping, stats };