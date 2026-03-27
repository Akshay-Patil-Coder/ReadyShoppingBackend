const express = require("express");
const router = express.Router();
const { startScraping, stopScraping, stats } = require("./WebScrapper.controller");

let scraperRunning = false;

module.exports = (io) => {

    router.get("/", (_req, res) => {
        res.send("🚀 Amazon Scraper API Running");
    });

    router.get("/status", (_req, res) => {
        res.json({ status: scraperRunning ? "RUNNING" : "STOPPED" });
    });

    router.post("/start-scraper", (req, res) => {
        if (scraperRunning) {
            return res.json({ status: "already_running" });
        }

        scraperRunning = true;
        io.emit("status", "RUNNING");

        startScraping(req.body, () => {
            scraperRunning = false;
            io.emit("status", "STOPPED");
            console.log("✅ Scraper finished");
        });

        res.json({ status: "started" });
    });

    router.get("/stop-scraper", (_req, res) => {
        stopScraping();
        scraperRunning = false;
        io.emit("status", "STOPPED");
        res.json({ status: "stopped" });
    });

    return router;
};