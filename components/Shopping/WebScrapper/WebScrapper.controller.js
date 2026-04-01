"use strict";

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const randomUseragent = require("random-useragent");
const { VariantProduct, Product, Batch } = require("../VariantsProducts/VariantsProducts.model");
const { Variant } = require("../Variants/Variants.model");
const { brandmodel } = require("../ProductsBrand/ProductsBrand.model");
const axios = require("axios");
const crypto = require("crypto");
const pLimit = require("p-limit").default;
const { updateElasticById, deleteElasticById, deleteElasticVariantByProductId } = require('../ElasticSearch/elastic/CRUD');


puppeteer.use(StealthPlugin());


/** @type {import('puppeteer').Browser | null} */
let browser = null;
let running = false;

const stats = {
    saved: 0,
    links: 0,
    variants: 0,
    errors: 0,
};


const IMAGE_DIR = path.join(__dirname, "..", "..", "public", "ProductImage");

if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });


const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const randomDelay = (min = 5000, max = 12000) =>
    delay(min + Math.random() * (max - min));

function log(msg) {
    console.log(msg);
    global.broadcastLog?.({ msg, ts: new Date().toLocaleTimeString() });
}

function broadcastStats() {
    global.broadcastStats?.();
}



const getFileNameFromUrl = (url) => {
    const hash = crypto.createHash("md5").update(url).digest("hex");
    const ext = path.extname(url.split("?")[0]) || ".jpg";
    return `${hash}${ext}`;
};

const downloadFile = async (url, folder, retries = 2) => {
    try {
        if (!url || !url.startsWith("http")) return null;

        const fileName = getFileNameFromUrl(url);
        const filePath = path.join(folder, fileName);

        if (fs.existsSync(filePath)) return fileName;

        const response = await axios({
            url,
            method: "GET",
            responseType: "stream",
            timeout: 15000,
            headers: { "User-Agent": "Mozilla/5.0" },
        });

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        return fileName;
    } catch (err) {
        if (retries > 0) return downloadFile(url, folder, retries - 1);
        log("❌ Download failed: " + url);
        return null;
    }
};

// ─── Page helpers ─────────────────────────────────────────────────────────────

async function detectAmazonBlock(page) {
    const content = await page.content();
    if (content.includes("traffic is piling up")) {
        log("⚠ Amazon traffic protection triggered");
        await randomDelay(15000, 30000);
        return true;
    }
    return false;
}

async function handleCaptcha(page) {
    const captcha = await page.$("form[action='/errors/validateCaptcha']");
    if (!captcha) return;

    log("⚠ CAPTCHA detected — solve manually...");
    await page.screenshot({ path: "captcha.png" });

    await page.waitForFunction(
        () => !document.body.innerText.includes("Enter the characters you see below"),
        { timeout: 120000 }
    );

    log("✅ CAPTCHA solved, continuing...");
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
    );
}

async function openWithRetry(page, url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log(`Opening Attempt (${attempt}/${maxRetries}): ${url}`);

            await page.setUserAgent(randomUseragent.getRandom());
            await page.setExtraHTTPHeaders({
                "accept-language": "en-US,en;q=0.9",
                "upgrade-insecure-requests": "1",
            });

            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
            await handleCaptcha(page);

            if (await detectAmazonBlock(page)) {
                throw new Error("Amazon traffic block");
            }

            const titleExists = await page.$("#productTitle");
            if (titleExists) return true;

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


function extractBaseProduct() {
    const getASIN = () => {
        const match = window.location.pathname.match(
            /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/
        );
        return match ? match[1] : "";
    };

    const getBrand = () => {
        let brand = "";
        const byline = document.querySelector("#bylineInfo");

        if (byline) {
            brand = byline.innerText
                .replace("Visit the", "")
                .replace("Store", "")
                .trim();
        }

        if (!brand) {
            document
                .querySelectorAll("#productDetails_techSpec_section_1 tr")
                .forEach((row) => {
                    const key = row.querySelector("th")?.innerText.trim();
                    const val = row.querySelector("td")?.innerText.trim();
                    if (key === "Brand") brand = val;
                });
        }

        return brand.replace("Brand:", "").trim();
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
            const matches = script.innerText.match(
                /https:\/\/[^"]+\.(mp4|m3u8)/g
            );
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

    document.querySelectorAll("#productDetails_techSpec_section_1 tr").forEach((row) => {
        const key = row.querySelector("th")?.innerText.trim();
        const val = row.querySelector("td")?.innerText.trim();
        if (key && val) specs.push({ SpecificationKey: key, SpecificationValue: val });
    });

    document.querySelectorAll("#productDetails_detailBullets_sections1 tr").forEach((row) => {
        const key = row.querySelector("th")?.innerText.trim();
        const val = row.querySelector("td")?.innerText.trim();
        if (key && val) specs.push({ SpecificationKey: key, SpecificationValue: val });
    });

    document.querySelectorAll("#detailBullets_feature_div li").forEach((li) => {
        const text = li.innerText.split(":");
        if (text.length === 2) {
            specs.push({
                SpecificationKey: text[0].trim(),
                SpecificationValue: text[1].trim(),
            });
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
            ?.innerText.replace(":", "")
            .trim();

        const selected = row.querySelector(".a-button-selected");
        if (!selected) return;

        const img = selected.querySelector("img");
        const text = selected.querySelector(".swatch-title-text-display");
        const value = img?.alt.trim() ?? text?.innerText.trim() ?? null;

        if (fieldName && value) variantFields[fieldName] = value;
    });

    return {
        ASIN: getASIN(),
        name: document.querySelector("#productTitle")?.innerText.trim(),
        price: document
            .querySelector(".a-price .a-offscreen")
            ?.innerText.replace(/[₹,]/g, ""),
        offer: document.querySelector(".savingsPercentage")?.innerText.replace("%", ""),
        images,
        specs,
        aboutPoints,
        variantFields,
    };
}


async function collectProductLinks(page, keyword, pages) {
    const links = [];

    for (let i = 1; i <= pages; i++) {
        if (!running) break;

        log(`Search page: ${i}`);

        await page.goto(`https://www.amazon.in/s?k=${keyword}&page=${i}`, {
            waitUntil: "domcontentloaded",
        });

        await page.waitForSelector(".s-result-item");

        const pageLinks = await page.evaluate(() => {
            const urls = [];
            document
                .querySelectorAll(".s-main-slot .s-result-item[data-asin]")
                .forEach((item) => {
                    const asin = item.getAttribute("data-asin");
                    if (asin?.length === 10)
                        urls.push(`https://www.amazon.in/gp/product/${asin}`);
                });
            return [...new Set(urls)];
        });

        links.push(...pageLinks);
        await randomDelay(3000, 6000);
    }

    return [...new Set(links)];
}


/**

 * @param {import('puppeteer').Browser} browserInstance
 * @param {string} link
 * @param {object} config
 */
async function scrapeProduct(browserInstance, link, config) {

    let page = null;

    try {
        const { companyId, HeadCategoryId, SubCategoryId } = config;

        page = await browserInstance.newPage();
        await page.setUserAgent(randomUseragent.getRandom());

        log(`Opening: ${link}`);

        const loaded = await openWithRetry(page, link);
        if (!loaded) return; // finally will close the page

        await autoScroll(page);
        await randomDelay(2000, 4000);

        const base = await page.evaluate(extractBaseProduct);

        if (!base?.ProductName || !base?.Brand || !base?.currentASIN) {
            log("❌ Missing base data");
            return;
        }

        const existing = await VariantProduct.findOne({ ASIN: base.currentASIN });
        if (existing) {
            log("⚠️ Already exists: " + base.currentASIN);
            return;
        }

        // ── Brand ──────────────────────────────────────────────────────────────

        let brand = await brandmodel.findOne({ BrandName: base.Brand, companyId });
        if (!brand) {
            brand = await new brandmodel({
                BrandName: base.Brand,
                companyId,
                HeadCategoryId,
                SubCategoryId,
            }).save();
        }

        // ── Media collection ───────────────────────────────────────────────────

        const allImages = new Set(base.images || []);
        const allVideos = new Set(base.videos || []);

        const variantASINs = [
            base.currentASIN,
            ...(base.asins || []).filter((a) => a !== base.currentASIN),
        ];

        /** @type {{ asin: string; data: ReturnType<typeof extractVariant> }[]} */
        const variantRawData = [];

        for (const asin of variantASINs) {
            if (!running) break;

            try {
                const already = await VariantProduct.findOne({ ASIN: asin });
                if (already) continue;

                await page.goto(`https://www.amazon.in/dp/${asin}`, {
                    waitUntil: "domcontentloaded",
                    timeout: 30000,
                });

                await handleCaptcha(page);
                await randomDelay(3000, 6000);

                const variantData = await page.evaluate(extractVariant);
                if (!variantData?.price) continue;

                // FIX #4 — renamed inner loop variable from `v` to `videoUrl`
                // to avoid shadowing the outer `variantData` variable (was `v`).
                (variantData.images || []).forEach((imgUrl) => allImages.add(imgUrl));
                (variantData.videos || []).forEach((videoUrl) => allVideos.add(videoUrl));

                variantRawData.push({ asin, data: variantData });
            } catch (err) {
                log("❌ Variant fetch error: " + asin + " — " + err.message);
            }
        }

        // ── Download media ─────────────────────────────────────────────────────

        // Per-product pLimit so concurrent downloads don't share a global slot.
        const dlLimit = pLimit(5);

        const imageMap = {};
        const videoMap = {};

        await Promise.all([
            ...[...allImages].map((url) =>
                dlLimit(async () => {
                    try {
                        const file = await downloadFile(url, IMAGE_DIR);
                        if (file) imageMap[url] = file;
                    } catch (_) { }
                })
            ),
        ]);

        // ── Create Product ─────────────────────────────────────────────────────

        const commonImages = (base.images || []).map((i) => imageMap[i]).filter(Boolean);

        const product = await new Product({
            companyId,
            HeadCategoryId,
            SubCategoryId,
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

        // ── Create Variants ────────────────────────────────────────────────────

        // FIX #9 — create a fresh pLimit per product for variant DB writes.
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
                                const escapedKey = cleanedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                                let vf = await Variant.findOne({
                                    VariantName: { $regex: `^${escapedKey}$`, $options: "i" },
                                    companyId
                                });

                                if (!vf) {
                                    vf = await new Variant({
                                        companyId,
                                        HeadCategoryId,
                                        SubCategoryId,
                                        VariantName: cleanedKey, // keep original format if you want
                                        VariantType: "String",
                                    }).save();
                                }

                                if (value) {
                                    variantFields.push({
                                        VariantId: vf._id,
                                        VariantValue: value.trim(),
                                    });
                                }

                            } catch (err) {
                                console.log("Variant field error:", err.message);
                            }
                        }

                        const variantImages = (vData.images || [])
                            .map((i) => imageMap[i])
                            .filter(Boolean);

                        const offerPercentage = Math.abs(Number(vData.offer) || 0);

                        const discountedPrice = Number(vData.price) || 0;

                        let originalPrice = discountedPrice;

                        if (offerPercentage > 0 && discountedPrice > 0) {
                            originalPrice = Math.round(
                                (discountedPrice * 100) / (100 - offerPercentage)
                            );
                        }
                        const variant = await new VariantProduct({
                            companyId,
                            HeadCategoryId,
                            SubCategoryId,
                            ProductId: product._id,
                            ASIN: asin,
                            VariantProductName: vData.name || base.ProductName,

                            Price: originalPrice,

                            OfferPercentage: offerPercentage,

                            VariantFields: variantFields,
                            VariantProductImage: variantImages.length
                                ? variantImages
                                : commonImages.length
                                    ? [commonImages[0]]
                                    : [],

                            Specification: vData.specs || [],

                            AboutProduct: {
                                Head: "About this item",
                                Points: vData.aboutPoints?.length
                                    ? vData.aboutPoints
                                    : base.aboutPoints,
                                TextDescription: "",
                            },
                        }).save();

                        variantIds.push(variant._id);

                        // Update Variant value counts
                        for (const vf of variantFields) {
                            const existingVariant = await Variant.findOne({
                                _id: vf.VariantId,
                                "VariantValues.Value": vf.VariantValue,
                            });

                            if (existingVariant) {
                                await Variant.updateOne(
                                    {
                                        _id: vf.VariantId,
                                        "VariantValues.Value": vf.VariantValue,
                                    },
                                    { $inc: { "VariantValues.$.Count": 1 } }
                                );
                            } else {
                                await Variant.updateOne(
                                    { _id: vf.VariantId },
                                    {
                                        $push: {
                                            VariantValues: { Value: vf.VariantValue, Count: 1 },
                                        },
                                    }
                                );
                            }
                        }

                        // FIX #7 — increment stats.variants here where a variant is actually saved
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

        // ── Finalise ───────────────────────────────────────────────────────────

        if (!variantIds.length) {
            await Product.findByIdAndDelete(product._id);
            log("❌ No variants saved → product deleted");
            return;
        }

        await Product.findByIdAndUpdate(product._id, {
            VariantProductIds: variantIds,
        });

        // FIX #5 — updateElasticById is now defined above (no longer a ReferenceError)
        try {
            await updateElasticById({ type: "product", id: product._id });
        } catch (elasticErr) {
            log("⚠️ Elastic sync failed: " + elasticErr.message);
        }

        stats.saved++;
        broadcastStats();
        log("🎉 Fully Saved: " + product.ProductName);
    } catch (err) {
        stats.errors++;
        broadcastStats();
        log("🔥 Fatal scrape error: " + err.message);
    } finally {
        // FIX #3 — page is ONLY closed here, never in the early returns above.
        if (page) {
            try {
                await page.close();
            } catch (_) { }
        }
    }
}

// ─── Start / stop ─────────────────────────────────────────────────────────────

async function startScraping(config, onFinish) {
    // Reset stats
    stats.saved = 0;
    stats.links = 0;
    stats.variants = 0;
    stats.errors = 0;
    broadcastStats();

    running = true;

    const pages = config.pages || 5;
    const keyword = config.keyword || "Products";

    log(`🚀 Starting scraper — keyword="${keyword}" pages=${pages}`);

    browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // ── Collect links ──────────────────────────────────────────────────────────

    // FIX #6 — mainPage is now properly closed after link collection.
    const mainPage = await browser.newPage();
    await mainPage.setUserAgent(randomUseragent.getRandom());

    let productLinks = [];
    try {
        productLinks = await collectProductLinks(mainPage, keyword, pages);
    } finally {
        try {
            await mainPage.close();
        } catch (_) { }
    }

    stats.links = productLinks.length;
    broadcastStats();
    log(`Products found: ${productLinks.length}`);

    // ── Scrape each product sequentially ──────────────────────────────────────

    let counter = 0;

    for (const link of productLinks) {
        if (!running) break;

        counter++;

        try {
            // FIX #1 + #8 — pass the BROWSER instance, not a page.
            // scrapeProduct creates its own page internally and always closes it.
            // FIX #2 — await the call so errors are caught and the loop waits.
            await scrapeProduct(browser, link, config);
        } catch (err) {
            stats.errors++;
            broadcastStats();
            log(`❌ Error scraping: ${link} | ${err.message}`);
        }

        await randomDelay(3000, 6000);

        // Restart browser periodically to prevent memory / crash issues.
        // FIX #9 — we capture the new browser in the module-level variable so
        // subsequent calls to scrapeProduct receive the fresh instance.
        if (counter % 20 === 0 && running) {
            log("♻ Restarting browser to prevent crash...");
            try {
                await browser.close();
            } catch (_) { }

            browser = await puppeteer.launch({
                headless: false,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });
        }
    }

    log("✅ Scraping finished");

    try {
        await browser.close();
    } catch (_) { }

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