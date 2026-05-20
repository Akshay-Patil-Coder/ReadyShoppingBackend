"use strict";


const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const randomUA = require("random-useragent");
const fs = require("fs");
const path = require("path");

const { VariantProduct } = require("../VariantsProducts/VariantsProducts.model");
const { updateElasticById } = require("../ElasticSearch/elastic/CRUD");

puppeteer.use(StealthPlugin());


const CRON_SCHEDULE = process.env.PRICE_SYNC_CRON || "0 */6 * * *";


const BATCH_SIZE = parseInt(process.env.PRICE_SYNC_BATCH || "50", 10);

const RECYCLE_AFTER = 10 + Math.floor(Math.random() * 6);   

const COOKIE_FILE = path.join(__dirname, ".session-cookies.json");
const POINTER_FILE = path.join(__dirname, ".price-sync-pointer.json");

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


const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const randDelay = (lo = 5000, hi = 12000) => delay(lo + Math.random() * (hi - lo));
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

function log(msg) {
    const ts = new Date().toLocaleTimeString();
    console.log(`[PriceSync ${ts}] ${msg}`);
    global.broadcastLog?.({ msg: `[PriceSync] ${msg}`, ts });
}


function loadPointer() {
    try {
        if (fs.existsSync(POINTER_FILE))
            return JSON.parse(fs.readFileSync(POINTER_FILE, "utf8")).offset ?? 0;
    } catch (_) { }
    return 0;
}

function savePointer(offset) {
    try { fs.writeFileSync(POINTER_FILE, JSON.stringify({ offset })); }
    catch (_) { }
}


async function saveCookies(page) {
    try {
        const cookies = await page.cookies("https://www.amazon.in");
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    } catch (_) { }
}

async function loadCookies(page) {
    try {
        if (!fs.existsSync(COOKIE_FILE)) return;
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, "utf8"));
        if (cookies.length) await page.setCookie(...cookies);
    } catch (_) { }
}


async function setupPage(page) {
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
        Object.defineProperty(navigator, "languages", { get: () => ["en-IN", "en-US", "en"] });
        Object.defineProperty(navigator, "platform", { get: () => "Win32" });
        Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
        Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });

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

        const _getParam = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (p) {
            if (p === 37445) return "Google Inc. (Intel)";
            if (p === 37446) return "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)";
            return _getParam.call(this, p);
        };

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

        const _query = navigator.permissions?.query?.bind(navigator.permissions);
        if (_query) {
            navigator.permissions.query = (p) =>
                p.name === "notifications"
                    ? Promise.resolve({ state: Notification.permission })
                    : _query(p);
        }
    });
}

async function applyFingerprint(page) {
    const ua = randomUA.getRandom((u) => u.deviceType === "desktop")
        ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    const viewport = randomItem(VIEWPORTS);
    const timezone = randomItem(TIMEZONES);
    const locale = randomItem(LOCALES);

    await page.setUserAgent(ua);
    await page.setViewport(viewport);
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

async function humanMouse(page) {
    try {
        const vp = page.viewport() ?? { width: 1366, height: 768 };
        const rx = () => 80 + Math.random() * (vp.width - 160);
        const ry = () => 80 + Math.random() * (vp.height - 160);

        const moves = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < moves; i++) {
            await page.mouse.move(rx(), ry(), { steps: 8 + Math.floor(Math.random() * 15) });
            await delay(80 + Math.random() * 300);
        }

        if (Math.random() > 0.4) {
            await page.evaluate(() => window.scrollBy(0, 100 + Math.random() * 400));
            await delay(400 + Math.random() * 800);
            await page.evaluate(() => window.scrollBy(0, -(50 + Math.random() * 150)));
        }
    } catch (_) { }
}

async function getPageState(page) {
    return page.evaluate(() => {
        if (document.querySelector("#productTitle")) return "product";
        if (document.querySelector("form[action='/errors/validateCaptcha']")) return "captcha";
        if (document.body?.innerText.includes("traffic is piling up")) return "block";
        if (document.body?.innerText.includes("Robot Check")) return "block";
        if (document.body?.innerText.includes("Sorry, we just need")) return "block";
        return "unknown";
    }).catch(() => "error");
}

async function handleCaptcha(page) {
    const state = await getPageState(page);
    if (state !== "captcha") return false;
    log("⚠ CAPTCHA — waiting up to 2 min for manual solve...");
    await page.screenshot({ path: "captcha-price-sync.png" }).catch(() => { });
    await page.waitForFunction(
        () => !document.querySelector("form[action='/errors/validateCaptcha']"),
        { timeout: 120000, polling: 1000 }
    ).catch(() => log("⚠ CAPTCHA timeout — skipping this ASIN"));
    return true;
}

function extractPrice() {
    const rawPrice = document.querySelector(".a-price .a-offscreen")?.innerText
        ?? document.querySelector("#priceblock_ourprice")?.innerText
        ?? document.querySelector("#priceblock_dealprice")?.innerText
        ?? "";

    const rawOffer = document.querySelector(".savingsPercentage")?.innerText
        ?? document.querySelector("#savingsPercentage")?.innerText
        ?? "";

    const price = parseFloat(rawPrice.replace(/[₹,\s]/g, ""));
    const offer = Math.abs(parseFloat(rawOffer.replace(/[%\s\-]/g, ""))) || 0;

    if (!price || isNaN(price)) return null;

    const originalPrice = offer > 0
        ? Math.round((price * 100) / (100 - offer))
        : price;

    return { discountedPrice: price, offerPercentage: offer, originalPrice };
}


async function fetchPrice(page, asin, retries = 3) {
    const url = `https://www.amazon.in/dp/${asin}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await applyFingerprint(page);
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
            await delay(1200 + Math.random() * 1500);
            await humanMouse(page);

            await Promise.race([
                page.waitForSelector("#productTitle", { timeout: 15000 }),
                page.waitForSelector("form[action='/errors/validateCaptcha']", { timeout: 15000 }),
            ]).catch(() => { });

            const wasCaptcha = await handleCaptcha(page);
            if (wasCaptcha) {
                await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
                await delay(1500 + Math.random() * 1000);
                await page.waitForSelector("#productTitle", { timeout: 12000 }).catch(() => { });
            }

            const state = await getPageState(page);

            if (state === "block") {
                const backoff = 30000 + attempt * 15000 + Math.random() * 20000;
                log(`⚠ Block on ${asin} — waiting ${Math.round(backoff / 1000)}s...`);
                await delay(backoff);
                continue;
            }

            if (state !== "product") {
                log(`⚠ ${asin} — unexpected state: ${state}`);
                continue;
            }

            const pricing = await page.evaluate(extractPrice);
            if (!pricing) {
                log(`⚠ ${asin} — could not parse price`);
                continue;
            }

            await saveCookies(page);
            return pricing;

        } catch (err) {
            log(`❌ fetchPrice attempt ${attempt} failed for ${asin}: ${err.message}`);
            await delay(8000 * attempt + Math.random() * 5000);
        }
    }

    return null;
}


async function updateVariantPrice(variantDoc, pricing) {
    const { originalPrice, offerPercentage } = pricing;

    const priceChanged = variantDoc.Price !== originalPrice;
    const offerChanged = variantDoc.OfferPercentage !== offerPercentage;

    if (!priceChanged && !offerChanged) {
        log(`  ↔ No change for ${variantDoc.ASIN} (₹${originalPrice}, ${offerPercentage}%)`);
        return false;
    }

    await VariantProduct.findByIdAndUpdate(variantDoc._id, {
        Price: originalPrice,
        OfferPercentage: offerPercentage    });

    try {
        await updateElasticById({ type: "product", id: variantDoc.ProductId });
    } catch (err) {
        log(`⚠ Elastic sync failed for ${variantDoc.ASIN}: ${err.message}`);
    }

    log(`  ✅ Updated ${variantDoc.ASIN}: ₹${variantDoc.Price}→₹${originalPrice}, ${variantDoc.OfferPercentage}%→${offerPercentage}%`);
    return true;
}


async function launchBrowser() {
    return puppeteer.launch({
        headless: "new",
        executablePath: process.env.CHROME_PATH || "/usr/bin/chromium-browser",
        args: [...BROWSER_ARGS, "--single-process", "--no-zygote"],
        defaultViewport: null,
    });
}


let jobRunning = false;

async function runPriceSyncJob() {
    if (jobRunning) {
        log("⚠ Previous run still in progress — skipping");
        return;
    }
    jobRunning = true;

    const jobStart = Date.now();
    log(`🚀 Price sync started — batch size: ${BATCH_SIZE}`);

    let browser = null;
    let updated = 0, skipped = 0, failed = 0;

    try {

        const totalCount = await VariantProduct.countDocuments({ ASIN: { $exists: true } });
        if (!totalCount) {
            log("ℹ No VariantProducts in DB — nothing to sync");
            return;
        }

        let offset = loadPointer();
        if (offset >= totalCount) {
            offset = 0;
            log("↻ Pointer wrapped around to start");
        }

        const variants = await VariantProduct
            .find({ ASIN: { $exists: true, $ne: "" } })
            .select("_id ASIN Price OfferPercentage ProductId")
            .skip(offset)
            .limit(BATCH_SIZE)
            .lean();

        log(`📋 Processing ${variants.length} ASINs (offset ${offset}/${totalCount})`);

        savePointer(offset + variants.length);


        browser = await launchBrowser();
        const page = await browser.newPage();
        await setupPage(page);
        await loadCookies(page);

        let counter = 0;
        let recycleAfter = RECYCLE_AFTER;


        for (const variant of variants) {
            log(`→ ${variant.ASIN} (${counter + 1}/${variants.length})`);

            try {
                const pricing = await fetchPrice(page, variant.ASIN);

                if (!pricing) {
                    failed++;
                    continue;
                }

                const wasUpdated = await updateVariantPrice(variant, pricing);
                wasUpdated ? updated++ : skipped++;

            } catch (err) {
                failed++;
                log(`❌ Error on ${variant.ASIN}: ${err.message}`);
            }

            counter++;

            const base = 5000 + Math.random() * 7000;
            const longPause = Math.random() < 0.15 ? 20000 + Math.random() * 20000 : 0;
            await delay(base + longPause);

            if (counter % recycleAfter === 0) {
                log("♻ Recycling browser...");
                try {
                    const openPages = await browser.pages();
                    if (openPages[0]) await saveCookies(openPages[0]);
                } catch (_) { }
                try { await browser.close(); } catch (_) { }

                browser = await launchBrowser();
                const newPage = await browser.newPage();
                await setupPage(newPage);
                await loadCookies(newPage);

                Object.assign(page, newPage); 

                await delay(10000 + Math.random() * 10000);
                recycleAfter = 10 + Math.floor(Math.random() * 6);
            }
        }

    } catch (err) {
        log(`🔥 Fatal job error: ${err.message}`);
    } finally {
        if (browser) {
            try { await browser.close(); } catch (_) { }
        }
        const elapsed = Math.round((Date.now() - jobStart) / 1000);
        log(`✅ Price sync done in ${elapsed}s — updated: ${updated}, skipped: ${skipped}, failed: ${failed}`);
        jobRunning = false;
    }
}



module.exports = {  runPriceSyncJob };