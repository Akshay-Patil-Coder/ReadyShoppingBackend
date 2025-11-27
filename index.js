const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const OtherRoutes = require('./Routes/Other.routes')
const ShoppingRoutes = require('./Routes/Shopping.routes')
// const CoachingRoutes = require('./Routes/Coaching.routes')
const cron = require('node-cron')
const {  ProductOrder } = require('./components/Shopping/ProductCart/ProductCart.model')
const cors = require('cors')
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
        await axios.post(`http://localhost:5296/api/v1/nodeCronShopping/processOrders`, { companyId });
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


const staticPaths = {
  '/api/v1/UserImage': './components/public/UserImage',
  '/api/v1/BrandImage': './components/public/BrandImage',
  '/api/v1/BannerImage': './components/public/BannerImage',
  '/api/v1/CompanyLogos': './components/public/CompanyLogos',
  '/api/v1/FunctionallityLogos': './components/public/FunctionallityLogos',
  '/api/v1/ProductCategories': './components/public/ProductCategories',
  '/api/v1/ProductImage': './components/public/ProductImage',
  '/api/v1/ProductVideo': './components/public/ProductVideo',
  '/api/v1/ProductServiceImage': './components/public/ProductServiceImage',
  '/api/v1/ProductsRatingImage': './components/public/ProductSRatingImage',
  '/api/v1/BatchImages': './components/public/BatchImages',

};

Object.entries(staticPaths).forEach(([route, dir]) => {
  app.use(route, express.static(path.join(__dirname, dir)));
});

const PORT = process.env.PORT || 5296;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
