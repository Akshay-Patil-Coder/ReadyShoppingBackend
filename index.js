const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const http = require("http");

const cors = require('cors');
const clc = require('cli-color');
const cron = require('node-cron');
const axios = require('axios');

const { Server } = require("socket.io");

const OtherRoutes = require('./Routes/Other.routes');
const DoorStepServiceRoutes = require('./Routes/DoorStepService.routes');
const ShoppingRoutes = require('./Routes/Shopping.routes');
// const CoachingRoutes = require('./Routes/Coaching.routes');

const scraperRoutes = require('./components/Shopping/WebScrapper/WebScrapper.routes');

const { ProductOrder } = require('./components/Shopping/ProductCart/ProductCart.model');
const staticPaths = require('./Routes/StaticPath.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: '*',
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.set("view engine", "ejs");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let stats = {};
let scraperRunning = false;

global.broadcastStats = () => io.emit("stats", stats);
global.broadcastLog = (log) => io.emit("scraper-log", log);


app.use('/api/v1/scraper', scraperRoutes(io));

OtherRoutes.default(app);
ShoppingRoutes.default(app);
DoorStepServiceRoutes.default(app);
// CoachingRoutes.default(app);

app.use((req, res, next) => {
  const start = Date.now();

  const methodColors = {
    GET: clc.green,
    POST: clc.blue,
    PUT: clc.yellow,
    PATCH: clc.magenta,
    DELETE: clc.red
  };

  const methodColor = methodColors[req.method] || clc.white;

  console.log(clc.bold("\n➡ API HIT"));
  console.log(methodColor(req.method) + " " + clc.cyan(req.originalUrl));

  res.on("finish", () => {
    const duration = Date.now() - start;

    let statusColor =
      res.statusCode >= 500 ? clc.bgRed.white :
      res.statusCode >= 400 ? clc.red :
      res.statusCode >= 300 ? clc.yellow :
      clc.green;

    console.log("✔ " + statusColor(`Status: ${res.statusCode}`) + clc.blackBright(` (${duration}ms)`));
  });

  next();
});

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB Error:', err);
    process.exit(1);
  }
})();

let cronRunning = false;

cron.schedule("*/10 * * * *", async () => {
  if (cronRunning) {
    console.log("⏳ Previous cron still running...");
    return;
  }

  cronRunning = true;
  console.log("🕒 Running order processing cron...");

  try {
    const companies = await ProductOrder.distinct("companyId", {
      'PaymentSession.status': { $in: ["PENDING", "INITIATED"] },
      ReservationStartedAt: { $exists: true }
    });

    await Promise.all(companies.map(async (companyId) => {
      try {
        await axios.post(
          `${process.env.BASE_URL}/nodeCronShopping/processOrders`,
          { companyId },
          { timeout: 10000 }
        );
      } catch (err) {
        console.error(`❌ Company ${companyId}:`, err.message);
      }
    }));

    console.log("✔ Cron completed");
  } catch (err) {
    console.error("❌ Cron Error:", err.message);
  } finally {
    cronRunning = false;
  }
});

io.on("connection", (socket) => {
  console.log("🔌 Client connected");

  socket.emit("stats", stats);
  socket.emit("status", scraperRunning ? "RUNNING" : "STOPPED");

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
  });
});

Object.entries(staticPaths).forEach(([route, dir]) => {
  app.use(route, express.static(path.join(__dirname, dir)));
});

app.use((err, req, res, next) => {
  console.error("🔥 Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5296;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});