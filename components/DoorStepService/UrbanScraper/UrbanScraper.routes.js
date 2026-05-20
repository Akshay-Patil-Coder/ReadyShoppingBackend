"use strict";

const express = require("express");
const router = express.Router();
const { startScraping, stopScraping, stats, getCategoriesAPI } = require("./UrbanScraper.controller");

module.exports = (io) => {

    // ── Health check ──────────────────────────────────────────────────────────

    router.get("/", (_req, res) => {
        res.send("🚀 Urban Company Scraper API Running");
    });

    // ── Status ────────────────────────────────────────────────────────────────

    router.get("/status", (_req, res) => {
        res.json({
            status: stats.running ? "RUNNING" : "STOPPED",
            stats: {
                saved: stats.saved,
                links: stats.links,
                providers: stats.providers,
                errors: stats.errors,
            },
        });
    });

    // ── Start scraper ─────────────────────────────────────────────────────────

    router.post("/start-scraper", (req, res) => {
        if (stats.running) {
            return res.status(409).json({ status: "already_running" });
        }

        // Wire up Socket.IO broadcasts before starting
        global.broadcastLog = (payload) => io.emit("log", payload);
        global.broadcastStats = () => io.emit("stats", stats);

        io.emit("status", "RUNNING");
        io.emit("stats", stats);

        startScraping(req.body, () => {
            io.emit("status", "STOPPED");
            io.emit("stats", stats);
            console.log("✅ Urban Company scraper finished");
        });

        return res.json({ status: "started" });
    });

    // ── Stop scraper ──────────────────────────────────────────────────────────

    router.get("/stop-scraper", (_req, res) => {
        stopScraping();
        io.emit("status", "STOPPED");
        io.emit("stats", stats);
        res.json({ status: "stopped" });
    });

    // ── Get categories ────────────────────────────────────────────────────────

    router.get("/getCategory", (req, res) => {
        getCategoriesAPI(req, res);
    });

    return router;
};