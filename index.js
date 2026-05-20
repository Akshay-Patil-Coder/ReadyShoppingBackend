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
// require('./components/Shopping/ElasticSearch/elastic/createindex.js');
require('./components/Shopping/ElasticSearch/elastic/reindexAll.js');
const scraperRoutes = require('./components/Shopping/WebScrapper/WebScrapper.routes');
const UrbanScraperRoutes = require('./components/DoorStepService/UrbanScraper/UrbanScraper.routes');

const { ProductOrder } = require('./components/Shopping/ProductCart/ProductCart.model');
const { ServiceOrder } = require('./components/DoorStepService/ServiceProductCart/ServiceProductCart.model')
const staticPaths = require('./Routes/StaticPath.routes');
const { reindexProducts, reindexWishlist } = require('./components/Shopping/ElasticSearch/elastic/reindexAll.js');
const { runPriceSyncJob } = require('./components/Shopping/VariantsProducts/NodecronScrapper.js');

const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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
app.use('/api/v1/scraper-urban', UrbanScraperRoutes(io));

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


let shoppingCronRunning = false;
let serviceCronRunning = false;

cron.schedule("*/10 * * * *", async () => {
  if (shoppingCronRunning) {
    console.log("⏳ Shopping previous cron still running...");
    return;
  }

  shoppingCronRunning = true;
  console.log("🕒 Shopping: running order processing cron...");

  try {
    const companies = await ProductOrder.distinct("companyId", {
      'PaymentSession.status': { $in: ["PENDING", "INITIATED"] },
      ReservationStartedAt: { $exists: true }
    });

    await Promise.all(companies.map(async (companyId) => {
      try {
        await axios.post(
          `${process.env.BASE_URL}/nodeCron/processOrders`,
          { companyId },
          { timeout: 10000 }
        );
      } catch (err) {
        console.error(`❌ Shopping company ${companyId}:`, err.message);
      }
    }));

    console.log("✔ Shopping cron completed");
  } catch (err) {
    console.error("❌ Shopping cron error:", err.message);
  } finally {
    shoppingCronRunning = false;
  }
});

cron.schedule("*/10 * * * *", async () => {
  if (serviceCronRunning) {
    console.log("⏳ Door Step Service previous cron still running...");
    return;
  }

  serviceCronRunning = true;
  console.log("🕒 Door Step Service: running order processing cron...");

  try {
    const companies = await ServiceOrder.distinct("companyId", {
      'PaymentSession.status': { $in: ["PENDING", "INITIATED"] },
      ReservationStartedAt: { $exists: true }
    });

    await Promise.all(companies.map(async (companyId) => {
      try {
        await axios.post(
          `${process.env.BASE_URL}/nodeCron/processServiceOrders`,
          { companyId },
          { timeout: 10000 }
        );
      } catch (err) {
        console.error(`❌ Service company ${companyId}:`, err.message);
      }
    }));

    console.log("✔ Service cron completed");
  } catch (err) {
    console.error("❌ Service cron error:", err.message);
  } finally {
    serviceCronRunning = false;
  }
});

cron.schedule("0 3 * * *", () => {
  console.log("🕒 [ReindexCron] Starting nightly reindex at 3 AM...");

  (async () => {
    try {
      console.log("📦 [ReindexCron] Reindexing products...");
      await reindexProducts();
      console.log("✅ [ReindexCron] Products reindexed successfully");

      console.log("❤️  [ReindexCron] Reindexing wishlist...");
      await reindexWishlist();
      console.log("✅ [ReindexCron] Wishlist reindexed successfully");

      console.log("🎉 [ReindexCron] Nightly reindex complete");
    } catch (err) {
      console.error("❌ [ReindexCron] Reindex failed:", err.message);
    }
  })();
});

cron.schedule("0 23 * * *", () => {
  console.log("🕒 [PriceSyncCron] Starting nightly price sync at 11 PM...");

  (async () => {
    try {
      console.log("💰 [PriceSyncCron] Syncing Amazon prices...");
      await runPriceSyncJob();
      console.log("✅ [PriceSyncCron] Price sync completed successfully");

      console.log("🎉 [PriceSyncCron] Nightly price sync complete");
    } catch (err) {
      console.error("❌ [PriceSyncCron] Price sync failed:", err.message);
    }
  })();
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