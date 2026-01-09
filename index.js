const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const OtherRoutes = require('./Routes/Other.routes')
const DoorStepServiceRoutes = require('./Routes/DoorStepService.routes')
const ShoppingRoutes = require('./Routes/Shopping.routes')
// const CoachingRoutes = require('./Routes/Coaching.routes')
const cron = require('node-cron')
const {  ProductOrder } = require('./components/Shopping/ProductCart/ProductCart.model')
const staticPaths = require('./Routes/StaticPath.routes');
const cors = require('cors')
const clc = require('cli-color');
// require('./components/Shopping/ElasticSearch/elastic/createindex.js');
// require('./components/Shopping/ElasticSearch/elastic/reindexAll.js');
const axios = require('axios')
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(cors({
  origin: '*',
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
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
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1);
  }
})();

OtherRoutes.default(app);
ShoppingRoutes.default(app);
DoorStepServiceRoutes.default(app);
// CoachingRoutes.default(app);





let cronRunning = false;

cron.schedule("*/10 * * * *", async () => {
  if (cronRunning) {
    console.log("⏳ Previous cron still running, skipping this tick.");
    return;
  }

  cronRunning = true;
  console.log("🕒 Running company-wise order processing cron...");

  try {
    const companies = await ProductOrder.distinct("companyId", {
      'PaymentSession.status': { $in: ["PENDING", 'INITIATED'] },
      ReservationStartedAt: { $exists: true }
    });


    const runningCompanies = new Set();

    await Promise.all(companies.map(async (companyId) => {
      if (runningCompanies.has(companyId)) return;
      runningCompanies.add(companyId);

      try {
        await axios.post(`${process.env.BASE_URL}nodeCronShopping/processOrders`, { companyId });
      } catch (err) {
        console.error(`❌ Error hitting API for company ${companyId}:`, err.message);
      } finally {
        runningCompanies.delete(companyId);
      }
    }));


    console.log("✔ Cron finished for all companies.");
  } catch (err) {
    console.error("❌ Cron Error:", err.message);
  } finally {
    cronRunning = false;
  }
});



Object.entries(staticPaths).forEach(([route, dir]) => {
  app.use(route, express.static(path.join(__dirname, dir)));
});

const PORT = process.env.PORT || 5296;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
