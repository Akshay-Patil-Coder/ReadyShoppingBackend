"use strict";

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AMAZON SCRAPER — Production Ready                             ║
 * ║  ✅ Original sequential architecture (browser + page per job)  ║
 * ║  ✅ setupPage  — one-time JS spoofs via evaluateOnNewDocument   ║
 * ║  ✅ applyFingerprint — per-navigation UA/viewport/headers       ║
 * ║  ✅ humanMouse — post-load mouse drift                         ║
 * ║  ✅ getPageState — diagnose product/captcha/block/search        ║
 * ║  ✅ networkidle2 — full JS render before extraction            ║
 * ║  ✅ Atomic brand + variant upserts (zero duplicates)           ║
 * ║  ✅ Crash-safe selectors (safeWait, no throw)                  ║
 * ║  ✅ Browser recycle every 20 products                          ║
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
 * applyFingerprint — call before EACH page.goto().
 * Sets UA, viewport, timezone, sec-ch-ua headers.
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
    await page.emulateTimezone(timezone);

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

/** Human-like mouse drift after each page load */
async function humanMouse(page) {
    try {
        const vp = page.viewport() ?? { width: 1366, height: 768 };
        const rx = () => 100 + Math.random() * (vp.width - 200);
        const ry = () => 100 + Math.random() * (vp.height - 200);
        await page.mouse.move(rx(), ry(), { steps: 10 });
        await delay(60 + Math.random() * 120);
        await page.mouse.move(rx(), ry(), { steps: 10 });
    } catch (_) { }
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

async function openWithRetry(page, url, maxRetries = 3) {
    // Inject JS spoofs once for this page's full lifetime
    await setupPage(page).catch(() => { });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log(`Opening Attempt (${attempt}/${maxRetries}): ${url}`);

            await applyFingerprint(page);
            await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

            await humanMouse(page);

            const wasCaptcha = await handleCaptcha(page);
            if (wasCaptcha) continue;   // re-check state after captcha solved

            const state = await getPageState(page);
            log(`  ℹ Page state: ${state} — ${page.url().slice(0, 80)}`);

            if (state === "product") return true;

            if (state === "block") {
                log("⚠ Amazon traffic block — waiting 40s...");
                await delay(40000);
                continue;
            }

            log("⚠ Product page not loaded properly.");

        } catch (err) {
            log(`Retry error: ${err.message}`);
        }

        const wait = 5000 * attempt;
        log(`Retrying after ${wait / 1000}s`);
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
    document.querySelectorAll("#altImages img").forEach((img) => {
        if (img.src) images.push(img.src.replace(/\._.*?_\./, "._SL1500_."));
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
    } catch (_) { }

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
    document.querySelectorAll("#altImages img").forEach((img) => {
        if (img.src) images.push(img.src.replace(/\._.*?_\./, "._SL1500_."));
    });

    const specs = [];
    const pushSpec = (key, val) => {
        if (key && val) specs.push({ SpecificationKey: key.trim(), SpecificationValue: val.trim() });
    };

    document.querySelectorAll("#productDetails_techSpec_section_1 tr").forEach((row) => {
        pushSpec(row.querySelector("th")?.innerText, row.querySelector("td")?.innerText);
    });
    document.querySelectorAll("#productDetails_detailBullets_sections1 tr").forEach((row) => {
        pushSpec(row.querySelector("th")?.innerText, row.querySelector("td")?.innerText);
    });
    document.querySelectorAll("#detailBullets_feature_div li").forEach((li) => {
        const parts = li.innerText.split(":");
        if (parts.length >= 2) pushSpec(parts[0], parts.slice(1).join(":"));
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

async function collectProductLinks(page, keyword, pages) {
    await setupPage(page).catch(() => { });

    const links = [];

    for (let i = 1; i <= pages; i++) {
        if (!running) break;

        log(`Search page: ${i}`);
        try {
            await applyFingerprint(page);
            await page.goto(
                `https://www.amazon.in/s?k=${encodeURIComponent(keyword)}&page=${i}`,
                { waitUntil: "networkidle2", timeout: 60000 }
            );

            await humanMouse(page);
            await handleCaptcha(page);

            const state = await getPageState(page);
            if (state === "block") {
                log("⚠ Block on search page — waiting 40s");
                await randDelay(40000, 60000);
                i--;    // retry same page
                continue;
            }

            await safeWait(page, ".s-result-item", 15000);

            const pageLinks = await page.evaluate(() => {
                const urls = [];
                document.querySelectorAll(".s-main-slot .s-result-item[data-asin]").forEach((item) => {
                    const asin = item.getAttribute("data-asin");
                    if (asin?.length === 10)
                        urls.push(`https://www.amazon.in/gp/product/${asin}`);
                });
                return [...new Set(urls)];
            });

            if (!pageLinks.length) {
                log("⚠ No products found on page — retrying after 10s");
                await delay(10000);
                i--;
                continue;
            }

            links.push(...pageLinks);
            log(`✅ Found ${pageLinks.length} products on page ${i}`);
            await randDelay(3000, 6000);

        } catch (err) {
            log("❌ Search page error: " + err.message);
            await delay(8000);
            i--;    // retry
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
                $setOnInsert: {
                    BrandName: base.Brand,
                    companyId,
                    HeadCategoryId
                },
                $addToSet: {
                    SubCategoryId: SubCategoryId
                }
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
                await page.goto(`https://www.amazon.in/dp/${asin}`, {
                    waitUntil: "networkidle2",
                    timeout: 40000,
                });

                await humanMouse(page);

                const wasCaptcha = await handleCaptcha(page);
                if (wasCaptcha) {
                    await page.goto(`https://www.amazon.in/dp/${asin}`, {
                        waitUntil: "networkidle2", timeout: 40000,
                    });
                }

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

        await Promise.all(
            variantRawData.map(({ asin, data: vData }) =>
                varLimit(async () => {
                    try {
                        const variantFields = [];

                        for (const [key, value] of Object.entries(vData.variantFields || {})) {
                            try {
                                const cleanedKey = key.trim();
                                const escapedKey = cleanedKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

                                // Atomic upsert — zero race conditions
                                const vf = await Variant.findOneAndUpdate(
                                    {
                                        VariantName: { $regex: `^${escapedKey}$`, $options: "i" },
                                        companyId,
                                        SubCategoryId
                                    },
                                    {
                                        $setOnInsert: {
                                            VariantName: cleanedKey,
                                            VariantType: "String",
                                            companyId, HeadCategoryId, SubCategoryId,
                                        },
                                    },
                                    { new: true, upsert: true }
                                );

                                if (value) {
                                    variantFields.push({ VariantId: vf._id, VariantValue: value.trim() });
                                }
                            } catch (err) {
                                console.log("Variant field error:", err.message);
                            }
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
                            const exists = await Variant.findOne({
                                _id: vf.VariantId,
                                "VariantValues.Value": vf.VariantValue,
                            });
                            if (exists) {
                                await Variant.updateOne(
                                    { _id: vf.VariantId, "VariantValues.Value": vf.VariantValue },
                                    { $inc: { "VariantValues.$.Count": 1 } }
                                );
                            } else {
                                await Variant.updateOne(
                                    { _id: vf.VariantId },
                                    { $push: { VariantValues: { Value: vf.VariantValue, Count: 1 } } }
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
            try { await page.close(); } catch (_) { }
        }
    }
}

// ─── Browser factory ──────────────────────────────────────────────────────────

async function launchBrowser() {
    try {
        return await puppeteer.launch({
            headless: "new", // ✅ required for server
            executablePath: process.env.CHROME_PATH || "/usr/bin/chromium-browser",
            args: [
                ...BROWSER_ARGS,
                "--single-process",
                "--no-zygote"
            ],
            defaultViewport: null
        });
    } catch (err) {
        log("❌ Browser launch failed: " + err.message);
        throw err;
    }
}

// ─── Start / stop ─────────────────────────────────────────────────────────────

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

    const mainPage = await browser.newPage();
    let productLinks = [];
    try {
        productLinks = await collectProductLinks(mainPage, keyword, pages);
    } finally {
        try { await mainPage.close(); } catch (_) { }
    }

    stats.links = productLinks.length;
    broadcastStats();
    log(`Products found: ${productLinks.length}`);

    // ── Scrape sequentially ───────────────────────────────────────────────────

    let counter = 0;

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

        await randDelay(3000, 6000);

        // Recycle browser every 20 products to prevent memory creep / crashes
        if (counter % 20 === 0 && running) {
            log("♻ Restarting browser...");
            try { await browser.close(); } catch (_) { }
            browser = await launchBrowser();
        }
    }

    log("✅ Scraping finished");
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
    log("🛑 Scraper stopped");
}

module.exports = { startScraping, stopScraping, stats };

/*
 * ═══════════════════════════════════════════════════════════════
 *  RECOMMENDED MongoDB indexes (run once in mongo shell):
 *
 *  db.variantproducts.createIndex(
 *    { ASIN: 1, companyId: 1 }, { unique: true }
 *  );
 *
 *  db.variants.createIndex(
 *    { VariantName: 1, companyId: 1 },
 *    { unique: true, collation: { locale: "en", strength: 2 } }
 *  );
 * ═══════════════════════════════════════════════════════════════
 */