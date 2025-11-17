const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const OtherRoutes = require('./Routes/Other.routes')
const ShoppingRoutes = require('./Routes/Shopping.routes')
// const CoachingRoutes = require('./Routes/Coaching.routes')
const cron = require('node-cron')
const {ProductCart} = require('./components/Shopping/ProductCart/ProductCart.model')
const {VariantProduct,Product}= require('./components/Shopping/VariantsProducts/VariantsProducts.model')
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

cron.schedule("*/10 * * * *", async () => {
    console.log("🕒 Checking for abandoned payment carts...");

    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000); 

    try {
        const pendingCarts = await ProductCart.find({
            CartType: "PaymentPending",
            ReservationStartedAt: { $lt: cutoffTime }
        });

        for (let cart of pendingCarts) {
            console.log(`🧾 Releasing cart: ${cart._id}`);

            for (let item of cart.Products) {
                await VariantProduct.updateOne(
                    { _id: item.VariantProductId },
                    {
                        $inc: {
                            "InventoryBaseStock.AvailableStock": item.Quantity,
                            "InventoryBaseStock.ReservedStock": -item.Quantity
                        }
                    }
                );
            }

            cart.CartType = "Regular";
            cart.ReservationStartedAt = null;
            cart.ReservationExpiresAt = null;
            cart.PaymentSession = {
                orderId: null,
                txnId: null,
                status: "FAILED",
                amount: 0,
                paymentGateway: "Paytm"
            };

            await cart.save();
        }

        if (pendingCarts.length > 0) {
            console.log(`✅ Released ${pendingCarts.length} abandoned carts.`);
        } else {
            console.log("✅ No abandoned carts found.");
        }

    } catch (err) {
        console.error("❌ Error in releaseAbandonedPayments cron:", err);
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
