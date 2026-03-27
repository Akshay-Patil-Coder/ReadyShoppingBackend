const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const randomUseragent = require("random-useragent");

puppeteer.use(StealthPlugin());

// ─── State ────────────────────────────────────────────────────────────────────

let browser = null;
let running = false;

const stats = {
    saved: 0,
    links: 0,
    variants: 0,
    errors: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function saveProduct(product, filePath) {
    const data = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
        : [];

    data.push(product);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─── Page Helpers ─────────────────────────────────────────────────────────────
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
                "upgrade-insecure-requests": "1"
            });

            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 60000
            });

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

// ─── Page Scrapers ────────────────────────────────────────────────────────────

function extractBaseProduct() {
   const getASIN = () => {
    const match = window.location.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
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
        if (img.src) {
            images.push(img.src.replace(/\._.*?_\./, "._SL1500_."));
        }
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
        if (img.src) {
            images.push(img.src.replace(/\._.*?_\./, "._SL1500_."));
        }
    });

    const specs = [];

    // TABLE 1
    document.querySelectorAll("#productDetails_techSpec_section_1 tr")
        .forEach(row => {
            const key = row.querySelector("th")?.innerText.trim();
            const val = row.querySelector("td")?.innerText.trim();
            if (key && val) specs.push({ SpecificationKey: key, SpecificationValue: val });
        });

    // TABLE 2
    document.querySelectorAll("#productDetails_detailBullets_sections1 tr")
        .forEach(row => {
            const key = row.querySelector("th")?.innerText.trim();
            const val = row.querySelector("td")?.innerText.trim();
            if (key && val) specs.push({ SpecificationKey: key, SpecificationValue: val });
        });

    // BULLETS
    document.querySelectorAll("#detailBullets_feature_div li")
        .forEach(li => {
            const text = li.innerText.split(":");
            if (text.length === 2) {
                specs.push({
                    SpecificationKey: text[0].trim(),
                    SpecificationValue: text[1].trim()
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
        offer: document
            .querySelector(".savingsPercentage")
            ?.innerText.replace("%", ""),
        images,
        specs,
        aboutPoints,
        variantFields,
    };
}

// ─── Core Scraper ─────────────────────────────────────────────────────────────

async function collectProductLinks(page, keyword, pages) {
    const links = [];

    for (let i = 1; i <= pages; i++) {
        if (!running) break;

        log(`Search page: ${i}`);

        await page.goto(
            `https://www.amazon.in/s?k=${keyword}&page=${i}`,
            { waitUntil: "domcontentloaded" }
        );

        await page.waitForSelector(".s-result-item");

        const pageLinks = await page.evaluate(() => {
            const urls = [];

            document
                .querySelectorAll(".s-main-slot .s-result-item[data-asin]")
                .forEach((item) => {
                    const asin = item.getAttribute("data-asin");
                    if (asin?.length === 10) {
                        urls.push(`https://www.amazon.in/gp/product/${asin}`);
                    }
                });

            return [...new Set(urls)];
        });

        links.push(...pageLinks);
        await randomDelay(3000, 6000);
    }

    return [...new Set(links)];
}

async function scrapeProduct(page, link, filePath) {
    log(`Opening: ${link}`);

    const loaded = await openWithRetry(page, link);
    if (!loaded) {
        stats.errors++;
        broadcastStats();
        return;
    }

    await page.mouse.move(
        Math.random() * 500,
        Math.random() * 500
    );

    await autoScroll(page);
    await randomDelay(2000, 5000);

    const base = await page.evaluate(extractBaseProduct);

    const productData = {
        Brand: base.Brand,
        ProductName: base.ProductName,
        CommonImages: base.images,
        CommonVideos: base.videos,
        CommonDescription: {
            Head: base.ProductName,
            Points: base.aboutPoints,
            TextDescription: "",
        },
        Variants: [],
    };

    // ✅ ALWAYS include current ASIN FIRST
    const variantASINs = [
        base.currentASIN,
        ...base.asins.filter(a => a !== base.currentASIN)
    ];

    const seen = new Set();

    for (const asin of variantASINs) {
        if (!running) break;
        if (seen.has(asin)) continue;
        seen.add(asin);

        const variantUrl = `https://www.amazon.in/dp/${asin}`;
        log(`Variant: ${variantUrl}`);

        try {
            await page.goto(variantUrl, { waitUntil: "domcontentloaded" });
            await handleCaptcha(page);
            await randomDelay(4000, 8000);

            const v = await page.evaluate(extractVariant);

            productData.Variants.push({
                ASIN: asin,
                VariantProductName: v.name || base.ProductName,
                VariantFields: Object.keys(v.variantFields || {}).length
                    ? v.variantFields
                    : { },
                Price: Number(v.price) || 0,
                OfferPercentage: Number(v.offer) || 0,
                VariantProductImage: v.images?.length ? v.images : base.images,
                Specification: v.specs?.length ? v.specs : [],
                AboutProduct: {
                    Head: "About this item",
                    Points: v.aboutPoints?.length ? v.aboutPoints : base.aboutPoints,
                    TextDescription: "",
                },
            });

            stats.variants++;
            broadcastStats();

        } catch (err) {
            log("⚠ Variant failed:", asin);
        }
    }

 


    log(`Scraped: ${productData.ProductName}`);

    // ✅ SAVE using current ASIN as identity
    saveProduct(productData, filePath);

    stats.saved++;
    broadcastStats();
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function startScraping(config, onFinish) {
    stats.saved = 0;
    stats.links = 0;
    stats.variants = 0;
    stats.errors = 0;
    broadcastStats();

    running = true;

    const pages = config.pages || 5;
    const keyword = config.keyword || "Products";
    const safeKeyword = keyword.replace(/[^a-z0-9]/gi, "");
    const filePath = path.join(__dirname, "data", `${safeKeyword}Products.json`);

    log(`💾 Save file: ${filePath}`);

    browser = await puppeteer.launch({ headless: false, args: ["--no-sandbox"] });
    let page = await browser.newPage();

    // await page.setViewport({
    //     width: 1200 + Math.floor(Math.random() * 200),
    //     height: 700 + Math.floor(Math.random() * 200),
    // });

    await page.setUserAgent(randomUseragent.getRandom());

    const productLinks = await collectProductLinks(page, keyword, pages);

    stats.links = productLinks.length;
    broadcastStats();
    log(`Products found: ${productLinks.length}`);
    let counter = 0;

    for (const link of productLinks) {
        if (!running) break;

        counter++;

        try {

            await scrapeProduct(page, link, filePath);
            await randomDelay(3000, 6000);

            // Refresh browser every 15 products
            if (counter % 15 === 0) {

                log("♻ Refreshing browser session");

                await page.close();
                page = await browser.newPage();

                // await page.setViewport({
                //     width: 1200 + Math.floor(Math.random() * 200),
                //     height: 700 + Math.floor(Math.random() * 200),
                // });

                await page.setUserAgent(randomUseragent.getRandom());
            }

        } catch (err) {

            stats.errors++;
            broadcastStats();
            log(`Error scraping: ${link}`);

        }
    }

    log("✅ Scraping finished");
    await browser.close();
    running = false;
    onFinish?.();
}

function stopScraping() {
    running = false;
    browser?.close();
    log("🛑 Scraper stopped");
}

module.exports = { startScraping, stopScraping, stats };