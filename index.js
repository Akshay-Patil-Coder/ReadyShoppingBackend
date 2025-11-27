const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const OtherRoutes = require('./Routes/Other.routes')
const ShoppingRoutes = require('./Routes/Shopping.routes')
// const CoachingRoutes = require('./Routes/Coaching.routes')
const cron = require('node-cron')
const { ProductCart, ProductOrder } = require('./components/Shopping/ProductCart/ProductCart.model')
const { VariantProduct, Product } = require('./components/Shopping/VariantsProducts/VariantsProducts.model')
const cors = require('cors')
const PaytmChecksum = require("paytmchecksum");
const https = require("https");
const crypto = require('crypto');
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

const FIFTEEN_MIN = 15 * 60 * 1000;
const FIVE_HOURS = 5 * 60 * 60 * 1000;

const safeId = (v) => (v === undefined || v === null) ? null : (typeof v === 'string' ? v : (v.toString ? v.toString() : String(v)));

function buildOrderProductKeySet(orderProducts = []) {
  return new Set(
    orderProducts
      .map(p => {
        const pid = safeId(p?.ProductData?.ProductInfo?.ProductId);
        const vid = safeId(p?.ProductData?.VariantProductInfo?.VariantProductId);
        return pid && vid ? `${pid}|${vid}` : null;
      })
      .filter(Boolean)
  );
}

async function verifyPaytm(order) {
  try {
    const paytmParams = { body: { mid: process.env.PAYTM_MID, orderId: order.PaymentSession.orderId } };
    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), process.env.PAYTM_KEY);
    paytmParams.head = { signature: checksum };
    const post_data = JSON.stringify(paytmParams);

    const options = {
      hostname: "securegw.paytm.in",
      port: 443,
      path: `/v3/order/status`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(post_data) }
    };

    return await new Promise((resolve, reject) => {
      let response = "";
      const paytmReq = https.request(options, (paytmRes) => {
        paytmRes.on("data", chunk => response += chunk);
        paytmRes.on("end", () => {
          try { resolve(JSON.parse(response)); }
          catch (err) { reject(err); }
        });
      });
      paytmReq.on("error", reject);
      paytmReq.write(post_data);
      paytmReq.end();
    });
  } catch (err) {
    console.error("verifyPaytm error:", err);
    return null;
  }
}



async function cleanupSimilarProducts(FoundCart, similarProducts) {
  if (!similarProducts || similarProducts.length === 0) return;

  if (similarProducts.length > 1) {
    const reservedProduct = similarProducts.filter(p => p.Reserved == true);
    const unreservedProduct = similarProducts.filter(p => p.Reserved == false);

    if (reservedProduct.length && unreservedProduct.length) {
      for (let EachReservedProduct of reservedProduct) {
        try {
          await ProductCart.updateOne(
            { _id: FoundCart._id },
            { $pull: { Products: { _id: EachReservedProduct._id } } }
          );
        } catch (error) {
          console.error('Delete Reserved Product Error', error.message);
        }
      }
    } else if (reservedProduct.length) {
      const highestQuantityProduct = reservedProduct.reduce((max, p) => p.Quantity > max.Quantity ? p : max, reservedProduct[0]);

      try {
        await Promise.all(reservedProduct.map(async (p) => {
          if (p._id.toString() !== highestQuantityProduct._id.toString()) {
            await ProductCart.updateOne(
              { _id: FoundCart._id },
              { $pull: { Products: { _id: p._id } } }
            );
          }
        }));
      } catch (error) {
        console.error('Delete Non Highest Quantity Reserved Product Error', error.message);
      }

      try {
        await ProductCart.updateOne(
          { _id: FoundCart._id, "Products._id": highestQuantityProduct._id },
          { $set: { "Products.$.Reserved": false } }
        );
      } catch (error) {
        console.error('Unreserve Highest Quantity Product Error', error.message);
      }
    }
  } else if (similarProducts.length === 1 && similarProducts[0].Reserved) {
    try {
      await ProductCart.updateOne(
        { _id: FoundCart._id, "Products._id": similarProducts[0]._id },
        { $set: { "Products.$.Reserved": false } }
      );
    } catch (error) {
      console.error('UnReserved Single Product Error', error.message);
    }
  }
}

async function adjustVariantStock(variantId, incObj = {}) {
  if (!variantId) return;
  try {
    await VariantProduct.updateOne({ _id: variantId }, { $inc: incObj });
  } catch (error) {
    console.error('Adjust Stock Error for variant', variantId, error.message);
  }
}

async function processOrder(order, cutoffTime, pendingCutoff) {
  console.log(`📌 Checking Order: ${order._id}`);

  const verifyPaytmStatus = await verifyPaytm(order);
  const resultStatus = verifyPaytmStatus?.body?.resultInfo?.resultStatus;
  console.log(`📡 Paytm Status: ${resultStatus} for Order: ${order._id}`);

  const FoundCart = await ProductCart.findOne({ _id: order.CartId });
  if (!FoundCart) {
    console.warn(`⚠ Cart not found for Order ${order._id}`);
    return;
  }

  const orderProductKeySet = buildOrderProductKeySet(order.Products || []);
  const isExpired = order.ReservationStartedAt < cutoffTime;
  const isPendingExpired = order.ReservationStartedAt < pendingCutoff;

  if (resultStatus === "PENDING" && isPendingExpired) {
    console.log(`🛑 PENDING after expiry: Removing order ${order._id}`);
    const uniqueCartGroups = groupCartByKey(FoundCart.Products || [], orderProductKeySet);
    for (let group of uniqueCartGroups) {
      await cleanupSimilarProducts(FoundCart, group);
    }

    order.PaymentSession.status = "EXPIRED";
    await order.save();
    for (let item of order.Products || []) {
      const variantId = safeId(item?.ProductData?.VariantProductInfo?.VariantProductId);
      await adjustVariantStock(variantId, {
        "InventoryBaseStock.AvailableStock": item.Quantity,
        "InventoryBaseStock.ReservedStock": -item.Quantity
      });
    }

    await FoundCart.save();
    return;
  }

  if (isExpired) {
    console.log(`⏱️ Order ${order._id} expired (>15 mins).`);

    if (resultStatus === "TXN_SUCCESS") {
      for (let item of order.Products || []) {
        const variantId = safeId(item?.ProductData?.VariantProductInfo?.VariantProductId);
        await adjustVariantStock(variantId, { "InventoryBaseStock.ReservedStock": -item.Quantity });
      }

      order.PaymentSession.status = "SUCCESS";
      order.PaymentSession.txnId = verifyPaytmStatus?.body?.txnId;
      order.PaymentSession.amount = verifyPaytmStatus?.body?.txnAmount;

      try {
        const productKeys = buildOrderProductKeySet(order.Products || []);
        await Promise.all((FoundCart.Products || []).map(async (cartProd) => {
          const entriesInOrder = (order.Products || []).filter(
            p => safeId(p?.CartProductId) === safeId(cartProd._id)
          );
          if (entriesInOrder.length > 0 && cartProd.Reserved == true) {
            await ProductCart.updateOne(
              { _id: FoundCart._id },
              { $pull: { Products: { _id: cartProd._id, Reserved: true } } }
            );
          }
        }));
      } catch (error) {
        console.error('Delete Reserved Product From Cart On Payment Success Error:', error.message);
      }

      await order.save();
      return;
    }

    if (resultStatus === "TXN_FAILURE" || resultStatus === "FAILURE") {
      console.log(`🛑 FAILED after expiry: Removing order ${order._id}`);

      const uniqueCartGroups = groupCartByKey(FoundCart.Products || [], orderProductKeySet);
      for (let group of uniqueCartGroups) {
        await cleanupSimilarProducts(FoundCart, group);
      }

      order.PaymentSession.status = "FAILED";
      await order.save();

      for (let item of order.Products || []) {
        const variantId = safeId(item?.ProductData?.VariantProductInfo?.VariantProductId);
        await adjustVariantStock(variantId, {
          "InventoryBaseStock.AvailableStock": item.Quantity,
          "InventoryBaseStock.ReservedStock": -item.Quantity
        });
      }

      await FoundCart.save();
      return;
    }
  }

  console.log(`⏳ Order ${order._id} still within valid time.`);

  if (resultStatus === "TXN_SUCCESS") {
    for (let item of order.Products || []) {
      const variantId = safeId(item?.ProductData?.VariantProductInfo?.VariantProductId);
      await adjustVariantStock(variantId, { "InventoryBaseStock.ReservedStock": -item.Quantity });
    }

    order.PaymentSession.status = "SUCCESS";
    order.PaymentSession.txnId = verifyPaytmStatus?.body?.txnId;
    order.PaymentSession.amount = verifyPaytmStatus?.body?.txnAmount;

    try {
      await Promise.all((FoundCart.Products || []).map(async (product) => {
        const productEntries = (order.Products || []).filter(
          (p) => safeId(p?.CartProductId) === safeId(product._id)
        );

        if (productEntries.length > 0 && product.Reserved == true) {
          await ProductCart.updateOne(
            { _id: FoundCart._id },
            {
              $pull: {
                Products: {
                  _id: product._id,
                  Reserved: true
                }
              }
            }
          );
        }
      }));
    } catch (error) {
      console.error('Delete Reserved Product From Cart On Payment Success Error:', error.message);
    }

    await order.save();
    return;
  }

  console.log(`🟡 Payment ${resultStatus}. Time not expired → No action.`);
}

function groupCartByKey(cartProducts = [], orderProductKeySet) {
  const map = new Map();
  for (let p of cartProducts) {
    const key = `${safeId(p?.ProductId)}|${safeId(p?.VariantProductId)}`;
    if (!orderProductKeySet.has(key)) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return Array.from(map.values());
}



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
        await axios.post(`http://localhost:5296/processOrders`, { companyId });
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
app.post('/processOrders', async (req, res) => {
  const { companyId } = req.body;
  if (!companyId) return res.status(400).json({ message: "companyId is required", success: false });

  try {
    const cutoffTime = new Date(Date.now() - FIFTEEN_MIN);
    const pendingCutoff = new Date(Date.now() - FIVE_HOURS);

    const orders = await ProductOrder.find({
      companyId,
      'PaymentSession.status': { $in: ["PENDING", 'INITIATED'] },
      ReservationStartedAt: { $exists: true }
    });

    if (!orders.length) {
      return res.status(200).json({ message: `No pending orders for company ${companyId}`, success: true });
    }

    for (let order of orders) {
      try {
        await processOrder(order, cutoffTime, pendingCutoff);
      } catch (err) {
        console.error(`❌ Error processing order ${order._id}:`, err.message);
      }
    }


    return res.status(200).json({ message: `Processed orders for company ${companyId}`, success: true });
  } catch (err) {
    console.error("❌ Error in processOrders API:", err);
    return res.status(500).json({ message: "Internal Server Error", success: false });
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
