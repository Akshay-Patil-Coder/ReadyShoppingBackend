const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const OtherRoutes = require('./Routes/Other.routes')
const ShoppingRoutes = require('./Routes/Shopping.routes')
// const CoachingRoutes = require('./Routes/Coaching.routes')
const cors = require('cors')
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  methods: ["GET", "POST", "PUT", "DELETE", "PETCH", "HEAD"],
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

const staticPaths = {
  // '/api/v1/report': '../outputfiles/',
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
 
};

Object.entries(staticPaths).forEach(([route, dir]) => {
  app.use(route, express.static(path.join(__dirname, dir)));
});

// ✅ Start Server
const PORT = process.env.PORT || 5296;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
