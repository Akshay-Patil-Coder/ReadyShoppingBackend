// const { ServiceCart, ServiceOrder } = require('./ServiceProductCart.model');
// const { ServiceAppointmentModel } = require('../ServiceAppointment/ServiceAppointment.model')
// const { serviceProductsModel } = require('../ServiceProducts/ServiceProducts.model')
// const { ObjectId } = require('mongodb');
// const path = require('path')
// const fs = require('fs');
// const CompanyModel = require('../../CompanyBase/Company/Company.model')
// const mongoose = require('mongoose');
// const PaytmChecksum = require("paytmchecksum");
// const https = require("https");
// const crypto = require('crypto');
// module.exports = {
//     addServiceToCart: async (req, res) => {
//         let {
//             UserId,
//             companyId,
//             ServiceProductId,
//             ProviderId,
//             AppointmentId,
//             Parts = [],
//             Operation
//         } = req.body;

//         UserId = req.user.UserId || UserId;
//         companyId = req.user.companyId || companyId;

//         try {
//             if (!UserId || !companyId)
//                 return res.status(400).json({ message: "User or Company missing", success: false });

//             let FoundCart = await ServiceCart.findOne({ UserId, companyId });
//             if (!FoundCart) {
//                 FoundCart = new ServiceCart({ UserId, companyId, Services: [] });
//             }

//             let existingIndex = FoundCart.Services.findIndex(
//                 s =>
//                     s.ServiceProductId.toString() === ServiceProductId.toString() &&
//                     s.AppointmentId.toString() === AppointmentId.toString()
//             );

//             let FoundService = await serviceProductsModel.findOne({
//                 _id: ServiceProductId,
//                 companyId,
//                 isActive: true
//             });

//             if (!FoundService)
//                 return res.status(404).json({ message: "Service not found", success: false });

//             let calculateService = (service, parts) => {
//                 let base = service.service_base_price || 0;

//                 let partsTotal = parts.reduce(
//                     (sum, p) => sum + (p.partPrice || 0),
//                     0
//                 );

//                 let discount = 0;
//                 if (service.offerPercentage > 0) {
//                     discount = (base * service.offerPercentage) / 100;
//                 }

//                 let total = base + partsTotal;

//                 let final = (base - discount) + partsTotal;

//                 return { total, discount, final, partsTotal };
//             };

//             if (Operation === "add") {
//                 let appointmentDoc = await ServiceAppointmentModel.findOne({
//                     companyId,
//                     ServiceProviderId: ProviderId,
//                     ServiceProductId,
//                     isActive: true,
//                     "schedule.appointments._id": AppointmentId
//                 });

//                 if (!appointmentDoc) {
//                     return res.status(404).json({
//                         message: "Appointment not found",
//                         success: false
//                     });
//                 }

//                 let foundSlot = null;

//                 for (let sch of appointmentDoc.schedule) {
//                     let slot = sch.appointments.find(
//                         a => a._id.toString() === AppointmentId.toString()
//                     );
//                     if (slot) {
//                         foundSlot = slot;
//                         break;
//                     }
//                 }

//                 if (!foundSlot) {
//                     return res.status(404).json({
//                         message: "Slot not found",
//                         success: false
//                     });
//                 }

//                 if (foundSlot.booked === true) {
//                     return res.status(400).json({
//                         message: "Slot already booked",
//                         success: false
//                     });
//                 }
//                 if (existingIndex !== -1) {
//                     FoundCart.Services.splice(existingIndex, 1);
//                 }

//                 let { total, discount, final, partsTotal } =
//                     calculateService(FoundService, Parts);

//                 FoundCart.Services.push({
//                     ServiceProductId,
//                     ProviderId,
//                     AppointmentId,
//                     Parts,
//                     PartsTotal: partsTotal,
//                     TotalPrice: total,
//                     DiscountPrice: discount,
//                     FinalPrice: final,
//                     IsActive: true
//                 });

//             }

//             else if (Operation === "update") {

//                 if (existingIndex === -1)
//                     return res.status(404).json({ message: "Service not in cart", success: false });

//                 let item = FoundCart.Services[existingIndex];

//                 let { total, discount, final, partsTotal } =
//                     calculateService(FoundService, Parts || item.Parts);

//                 item.Parts = Parts || item.Parts;
//                 item.PartsTotal = partsTotal;
//                 item.TotalPrice = total;
//                 item.DiscountPrice = discount;
//                 item.FinalPrice = final;

//                 FoundCart.Services[existingIndex] = item;
//             }

//             else if (Operation === "remove") {

//                 if (existingIndex === -1)
//                     return res.status(404).json({ message: "Service not found", success: false });

//                 FoundCart.Services.splice(existingIndex, 1);
//             }

//             else {
//                 return res.status(400).json({ message: "Invalid operation", success: false });
//             }

//             let total = 0, discount = 0, final = 0;

//             for (let s of FoundCart.Services) {
//                 if (s.IsActive !== false) {
//                     total += s.TotalPrice || 0;
//                     discount += s.DiscountPrice || 0;
//                     final += s.FinalPrice || 0;
//                 }
//             }

//             FoundCart.TotalCartPrice = total;
//             FoundCart.DiscountCartPrice = discount;
//             FoundCart.FinalCartPrice = final;

//             let saved = await FoundCart.save();

//             await module.exports.validateServiceCart({ body: { UserId, companyId } });

//             return res.status(200).json({
//                 message: "Service cart updated",
//                 success: true,
//                 data: saved
//             });

//         } catch (err) {
//             console.error("ServiceCart Error:", err);
//             return res.status(500).json({
//                 message: "Internal error",
//                 error: err.message,
//                 success: false
//             });
//         }
//     },
//     validateServiceCart: async ({ body }) => {
//         let { UserId, companyId } = body;

//         let FoundCart = await ServiceCart.findOne({ UserId, companyId });
//         if (!FoundCart) return;

//         let updated = [];

//         for (let item of FoundCart.Services) {

//             let service = await serviceProductsModel.findOne({
//                 _id: item.ServiceProductId,
//                 companyId,
//                 isActive: true
//             });

//             if (!service) continue;

//             let base = service.service_base_price || 0;

//             let validParts = service.service_parts || [];
//             let cleanedParts = [];

//             for (let cartPart of item.Parts || []) {
//                 let match = validParts.find(p => p.partName === cartPart.partName);

//                 if (match) {
//                     cleanedParts.push({
//                         partName: match.partName,
//                         partPrice: match.partPrice,
//                         selected: cartPart.selected
//                     });
//                 }
//             }

//             item.Parts = cleanedParts;

//             let partsTotal = cleanedParts
//                 .filter(p => p.selected)
//                 .reduce((sum, p) => sum + (p.partPrice || 0), 0);

//             let discount = 0;
//             if (service.offerPercentage > 0) {
//                 discount = (base * service.offerPercentage) / 100;
//             }

//             let total = base + partsTotal;
//             let final = (base - discount) + partsTotal;

//             item.TotalPrice = total;
//             item.DiscountPrice = discount;
//             item.FinalPrice = final;
//             item.PartsTotal = partsTotal;

//             updated.push(item);
//         }

//         FoundCart.Services = updated;

//         FoundCart.TotalCartPrice = updated.reduce((s, i) => s + (i.TotalPrice || 0), 0);
//         FoundCart.DiscountCartPrice = updated.reduce((s, i) => s + (i.DiscountPrice || 0), 0);
//         FoundCart.FinalCartPrice = updated.reduce((s, i) => s + (i.FinalPrice || 0), 0);

//         await FoundCart.save();
//     },
//     proceedToPaymentForServiceCart: async (req, res) => {
//         let { UserId, companyId } = req.body;
//         let { RenderingDomain = "public" } = req.query;

//         if (req.user?.UserId) UserId = req.user.UserId;
//         if (req.user?.companyId) companyId = req.user.companyId;

//         RenderingDomain = ["private", "public"].includes(RenderingDomain?.toLowerCase())
//             ? RenderingDomain.toLowerCase()
//             : "public";

//         let rollback = { orderId: null, appointmentUpdates: [], ReservedUpdated: [] };

//         const RollBackFunction = async () => {
//             try {
//                 for (let item of rollback.appointmentUpdates) {
//                     await ServiceAppointmentModel.updateOne(
//                         { "schedule.appointments._id": item.appointmentId },
//                         {
//                             $set: {
//                                 "schedule.$[].appointments.$[elem].booked": false
//                             }
//                         },
//                         { arrayFilters: [{ "elem._id": item.appointmentId }] }
//                     );
//                 }

//                 for (let item of rollback.ReservedUpdated) {
//                     await ServiceCart.updateOne(
//                         { UserId, companyId, "Services._id": item._id },
//                         { $set: { "Services.$.Reserved": item.Reserved } }
//                     );
//                 }

//                 if (rollback.orderId) {
//                     await ServiceOrder.findByIdAndDelete(rollback.orderId);
//                 }

//             } catch (err) {
//                 console.error("Rollback error:", err.message);
//             }
//         };

//         try {
//             await module.exports.validateServiceCart({ body: { UserId, companyId } });

//             let cart = await ServiceCart.findOne({ UserId, companyId });
//             if (!cart || !cart.Services.length)
//                 return res.status(400).json({ message: "Cart empty", success: false });

//             let OrderData = {
//                 UserId,
//                 companyId,
//                 CartId: cart._id,
//                 Services: [],
//                 ReservationStartedAt: new Date()
//             };

//             for (let item of cart.Services) {

//                 if (item.IsActive === false || item.Reserved === true) continue;

//                 let appointment = await ServiceAppointmentModel.findOne({
//                     "schedule.appointments._id": item.AppointmentId,
//                     companyId,
//                     isActive: true
//                 });

//                 if (!appointment) {
//                     await RollBackFunction();
//                     return res.status(400).json({ message: "Appointment not found", success: false });
//                 }

//                 let slot = null;

//                 for (let sch of appointment.schedule) {
//                     for (let a of sch.appointments) {
//                         if (a._id.toString() === item.AppointmentId.toString()) {
//                             slot = a;
//                         }
//                     }
//                 }

//                 if (!slot || slot.booked === true) {
//                     await RollBackFunction();
//                     return res.status(400).json({ message: "Slot already booked", success: false });
//                 }

//                 OrderData.Services.push({
//                     CartServiceId: item._id,
//                     ServiceProductId: item.ServiceProductId,
//                     ProviderId: item.ProviderId,
//                     AppointmentId: item.AppointmentId,
//                     Parts: item.Parts,
//                     TotalPrice: item.TotalPrice,
//                     DiscountPrice: item.DiscountPrice,
//                     FinalPrice: item.FinalPrice
//                 });
//             }

//             if (!OrderData.Services.length)
//                 return res.status(400).json({ message: "No valid services", success: false });

//             OrderData.TotalCartPrice = OrderData.Services.reduce((s, i) => s + (i.TotalPrice || 0), 0);
//             OrderData.DiscountCartPrice = OrderData.Services.reduce((s, i) => s + (i.DiscountPrice || 0), 0);
//             OrderData.FinalCartPrice = OrderData.Services.reduce((s, i) => s + (i.FinalPrice || 0), 0);

//             let savedOrder = await new ServiceOrder(OrderData).save();
//             rollback.orderId = savedOrder._id;

//             for (let item of OrderData.Services) {
//                 await ServiceAppointmentModel.updateOne(
//                     {
//                         "schedule.appointments._id": item.AppointmentId,
//                     },
//                     {
//                         $set: {
//                             "schedule.$[].appointments.$[elem].booked": true
//                         }
//                     },
//                     {
//                         arrayFilters: [{ "elem._id": item.AppointmentId }]
//                     }
//                 );

//                 rollback.appointmentUpdates.push({ appointmentId: item.AppointmentId });
//             }

//             for (let s of OrderData.Services) {
//                 let found = cart.Services.find(c => c._id.toString() === s.CartServiceId.toString());
//                 if (found) {
//                     rollback.ReservedUpdated.push({ _id: found._id, Reserved: found.Reserved });
//                     found.Reserved = true;
//                 }
//             }

//             await cart.save();

//             let orderId = `SVC_${savedOrder._id.toString().slice(-6)}_${Date.now()}`;
//             let totalAmount = OrderData.FinalCartPrice;

//             let paytmParams = {
//                 body: {
//                     requestType: "Payment",
//                     mid: process.env.PAYTM_MID,
//                     websiteName: process.env.PAYTM_WEBSITE,
//                     orderId,
//                     callbackUrl: `${process.env.BASE_URL}servicecart/handlePaymentStatus?RenderingDomain=${RenderingDomain}&companyId=${companyId}`,
//                     txnAmount: { value: totalAmount.toString(), currency: "INR" },
//                     userInfo: { custId: UserId.toString() }
//                 }
//             };

//             let checksum = await PaytmChecksum.generateSignature(
//                 JSON.stringify(paytmParams.body),
//                 process.env.PAYTM_KEY
//             );

//             paytmParams.head = { signature: checksum };

//             let post_data = JSON.stringify(paytmParams);

//             let options = {
//                 hostname: process.env.PAYTM_HOSTNAME,
//                 port: 443,
//                 path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Content-Length": Buffer.byteLength(post_data)
//                 }
//             };

//             let paytmResponse = await new Promise((resolve, reject) => {
//                 let response = "";
//                 let reqPaytm = https.request(options, (resPaytm) => {
//                     resPaytm.on("data", chunk => response += chunk);
//                     resPaytm.on("end", () => resolve(JSON.parse(response)));
//                 });
//                 reqPaytm.on("error", reject);
//                 reqPaytm.write(post_data);
//                 reqPaytm.end();
//             });

//             if (!paytmResponse?.body?.txnToken) {
//                 await RollBackFunction();
//                 return res.status(500).json({ message: "No txnToken", success: false });
//             }

//             savedOrder.PaymentSession = {
//                 orderId,
//                 txnId: null,
//                 status: "INITIATED",
//                 amount: totalAmount,
//                 paymentGateway: "Paytm"
//             };

//             await savedOrder.save();

//             return res.status(200).json({
//                 success: true,
//                 message: "Payment Initiated",
//                 url: `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
//                 txnToken: paytmResponse.body.txnToken,
//                 orderId,
//                 amount: totalAmount
//             });

//         } catch (err) {
//             console.error("Service Payment Error:", err);
//             await RollBackFunction();
//             return res.status(500).json({ message: "Internal error", success: false });
//         }
//     },
//     handleServicePaymentStatus: async (req, res) => {
//         let FrontendRenderDomain;
//         try {
//             let paytmResponse = req.body || {};
//             let orderId = paytmResponse?.ORDERID;

//             let paymentInfo = {
//                 orderId,
//                 txnId: paytmResponse.TXNID,
//                 amount: paytmResponse.TXNAMOUNT,
//                 respMsg: paytmResponse.RESPMSG,
//                 status: paytmResponse.STATUS
//             };

//             let { RenderingDomain = "public", companyId } = req.query;

//             RenderingDomain = ["private", "public"].includes((RenderingDomain || "").toLowerCase())
//                 ? RenderingDomain.toLowerCase()
//                 : "public";

//             try {
//                 const FoundCompany = companyId ? await CompanyModel.findById(companyId) : null;

//                 if (FoundCompany) {
//                     if (RenderingDomain == "private" && FoundCompany.PredifinedDomain) {
//                         FrontendRenderDomain = `${FoundCompany.PredifinedDomain.replace(/\/+$/, '')}/services`;
//                     } else if (FoundCompany.CompanyDomain) {
//                         let companydomain = FoundCompany.CompanyDomain.trim();
//                         FrontendRenderDomain = `https://${companydomain}.shop.readytechnologies.in/services`;
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error fetching company domain:', err?.message || err);
//             }

//             if (!FrontendRenderDomain) {
//                 FrontendRenderDomain = "http://localhost:4200/services";
//             }

//             let verifyPaytmStatus;

//             try {
//                 const paytmParams = {
//                     body: {
//                         mid: process.env.PAYTM_MID,
//                         orderId: paymentInfo.orderId
//                     }
//                 };

//                 const checksum = await PaytmChecksum.generateSignature(
//                     JSON.stringify(paytmParams.body),
//                     process.env.PAYTM_KEY
//                 );

//                 paytmParams.head = { signature: checksum };

//                 const post_data = JSON.stringify(paytmParams);

//                 const options = {
//                     hostname: "securegw.paytm.in",
//                     port: 443,
//                     path: `/v3/order/status`,
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                         "Content-Length": Buffer.byteLength(post_data)
//                     }
//                 };

//                 verifyPaytmStatus = await new Promise((resolve, reject) => {
//                     let response = "";
//                     const paytmReq = https.request(options, (paytmRes) => {
//                         paytmRes.on("data", chunk => response += chunk);
//                         paytmRes.on("end", () => {
//                             try { resolve(JSON.parse(response)); }
//                             catch (e) { reject(e); }
//                         });
//                     });
//                     paytmReq.on("error", reject);
//                     paytmReq.write(post_data);
//                     paytmReq.end();
//                 });

//             } catch (err) {
//                 console.error('Paytm verify error:', err?.message || err);

//                 return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=PAYTM-VERIFY-ERROR`);
//             }

//             const resultStatus = verifyPaytmStatus?.body?.resultInfo?.resultStatus || "UNKNOWN";

//             const FoundOrder = await ServiceOrder.findOne({ "PaymentSession.orderId": orderId });

//             if (!FoundOrder) {
//                 return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=ORDER-NOT-FOUND`);
//             }


//             if (resultStatus == "TXN_SUCCESS") {

//                 if (FoundOrder.PaymentSession?.status == 'SUCCESS') {
//                     return res.redirect(`${FrontendRenderDomain}/order-checked?orderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=SUCCESS&serviceorderid=${FoundOrder._id}`);
//                 }


//                 FoundOrder.PaymentSession = FoundOrder.PaymentSession || {};
//                 FoundOrder.PaymentSession.status = "SUCCESS";
//                 FoundOrder.PaymentSession.txnId = paymentInfo.txnId;
//                 FoundOrder.PaymentSession.amount = paymentInfo.amount;

//                 await FoundOrder.save();

//                 return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=SUCCESS&serviceorderid=${FoundOrder._id}`);
//             }


//             if (resultStatus == "TXN_FAILURE" || resultStatus == "FAILURE") {

//                 if (FoundOrder.PaymentSession?.status == 'FAILED') {
//                     return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=FAILED&serviceorderid=${FoundOrder._id}`);
//                 }

//                 try {
//                     for (let item of (FoundOrder.Services || [])) {
//                         await ServiceAppointmentModel.updateOne(
//                             { "schedule.appointments._id": item.AppointmentId },
//                             {
//                                 $set: {
//                                     "schedule.$[].appointments.$[elem].booked": false
//                                 }
//                             },
//                             {
//                                 arrayFilters: [{ "elem._id": item.AppointmentId }]
//                             }
//                         );
//                     }
//                 } catch (err) {
//                     console.error('Rollback appointment error:', err?.message || err);
//                 }

//                 FoundOrder.PaymentSession = FoundOrder.PaymentSession || {};
//                 FoundOrder.PaymentSession.status = "FAILED";
//                 FoundOrder.PaymentSession.txnId = paymentInfo.txnId || FoundOrder.PaymentSession.txnId;
//                 FoundOrder.PaymentSession.amount = paymentInfo.amount || FoundOrder.PaymentSession.amount;

//                 await FoundOrder.save();

//                 const resultMsg = (verifyPaytmStatus?.body?.resultInfo?.resultMsg || "").toLowerCase();
//                 const respMsg = (paymentInfo?.respMsg || "").toLowerCase();

//                 const isCancelled =
//                     resultMsg.includes("cancelled") ||
//                     respMsg.includes("user has not completed transaction");

//                 if (isCancelled) {
//                     return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=CANCELLED&serviceorderid=${FoundOrder._id}`);
//                 }

//                 return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=FAILED&serviceorderid=${FoundOrder._id}`);
//             }

//             return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=${encodeURIComponent(resultStatus)}&serviceorderid=${FoundOrder._id}`);

//         } catch (err) {
//             console.error("handleServicePaymentStatus Error:", err);

//             const paytmorderId = (req.body && req.body.ORDERID)
//                 ? encodeURIComponent(req.body.ORDERID)
//                 : "";

//             if (FrontendRenderDomain) {
//                 return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${paytmorderId}&status=INTERNAL-SERVER-ERROR`);
//             }

//             const fallbackDomain = "http://localhost:4200/services";

//             return res.redirect(`${fallbackDomain}/order-checked?paytmorderId=${paytmorderId}&status=INTERNAL-SERVER-ERROR`);
//         }
//     },
//     getServiceCart: async (req, res) => {
//         let { UserId, companyId } = req.query;

//         if (req.user?.UserId) UserId = req.user.UserId;
//         if (req.user?.companyId) companyId = req.user.companyId;

//         try {
//             if (
//                 !mongoose.isValidObjectId(companyId) ||
//                 !mongoose.isValidObjectId(UserId)
//             ) {
//                 return res.status(400).json({
//                     message: "Invalid User or Company",
//                     success: false,
//                 });
//             }

//             const matchCondition = {
//                 companyId: new mongoose.Types.ObjectId(String(companyId)),
//                 UserId: new mongoose.Types.ObjectId(String(UserId)),
//             };

//             let data = await module.exports.getServiceCartData(matchCondition);

//             if (!data?.length || data[0]?.Services?.length === 0) {
//                 return res.status(400).json({
//                     message: "Cart is empty",
//                     success: false,
//                 });
//             }

//             data = data.map((cart) => {
//                 // Strip inactive services, then sort newest first
//                 cart.Services = cart.Services
//                     .filter((s) => s.IsActive !== false)
//                     .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//                 return cart;
//             });

//             return res.status(200).json({
//                 message: "Service cart fetched successfully",
//                 success: true,
//                 data,
//             });
//         } catch (error) {
//             console.error("GetServiceCartError:", error.message);
//             return res.status(500).json({
//                 message: "Internal Server Error",
//                 success: false,
//             });
//         }
//     },

//     getServiceCartData: async (matchCondition) => {
//         try {
//             const data = await ServiceCart.aggregate([
//                 { $match: matchCondition },

//                 // ── Join ServiceProducts ──────────────────────────────────────────
//                 {
//                     $lookup: {
//                         from: "serviceproducts",
//                         localField: "Services.ServiceProductId",
//                         foreignField: "_id",
//                         as: "_ServiceProducts",
//                     },
//                 },

//                 // ── Join Providers ────────────────────────────────────────────────
//                 {
//                     $lookup: {
//                         from: "providers",
//                         localField: "Services.ProviderId",
//                         foreignField: "_id",
//                         as: "_Providers",
//                     },
//                 },

//                 // ── Join ServiceAppointments (by nested appointment _id) ──────────
//                 {
//                     $lookup: {
//                         from: "serviceappointments",
//                         localField: "Services.AppointmentId",
//                         foreignField: "schedule.appointments._id",
//                         as: "_Appointments",
//                     },
//                 },

//                 // ── Enrich each Service entry ─────────────────────────────────────
//                 {
//                     $addFields: {
//                         Services: {
//                             $map: {
//                                 input: "$Services",
//                                 as: "srv",
//                                 in: {
//                                     $mergeObjects: [
//                                         "$$srv",

//                                         // ── ServiceProductInfo ──────────────────
//                                         {
//                                             ServiceProductInfo: {
//                                                 $let: {
//                                                     vars: {
//                                                         product: {
//                                                             $arrayElemAt: [
//                                                                 {
//                                                                     $filter: {
//                                                                         input: "$_ServiceProducts",
//                                                                         as: "sp",
//                                                                         cond: { $eq: ["$$sp._id", "$$srv.ServiceProductId"] },
//                                                                     },
//                                                                 },
//                                                                 0,
//                                                             ],
//                                                         },
//                                                     },
//                                                     in: {
//                                                         ServiceProductId: "$$product._id",
//                                                         ServiceName: "$$product.ServiceName",
//                                                         Images: "$$product.serviceImages",
//                                                         Description: "$$product.service_description",
//                                                         Parts: "$$product.service_parts",
//                                                         BasePrice: "$$product.service_base_price",
//                                                         OfferPercentage: "$$product.offerPercentage",
//                                                         ServiceTime: "$$product.serviceTime",
//                                                     },
//                                                 },
//                                             },
//                                         },

//                                         // ── ProviderInfo ────────────────────────
//                                         {
//                                             ProviderInfo: {
//                                                 $let: {
//                                                     vars: {
//                                                         provider: {
//                                                             $arrayElemAt: [
//                                                                 {
//                                                                     $filter: {
//                                                                         input: "$_Providers",
//                                                                         as: "pv",
//                                                                         cond: { $eq: ["$$pv._id", "$$srv.ProviderId"] },
//                                                                     },
//                                                                 },
//                                                                 0,
//                                                             ],
//                                                         },
//                                                     },
//                                                     in: {
//                                                         ProviderId: "$$provider._id",
//                                                         ProviderName: "$$provider.name",  // adjust field name to your providers schema
//                                                         Phone: "$$provider.phone",         // adjust field name to your providers schema
//                                                     },
//                                                 },
//                                             },
//                                         },

//                                         // ── AppointmentInfo (specific slot) ────
//                                         {
//                                             AppointmentInfo: {
//                                                 $let: {
//                                                     vars: {
//                                                         // Find the ServiceAppointment doc that contains this AppointmentId
//                                                         apptDoc: {
//                                                             $arrayElemAt: [
//                                                                 {
//                                                                     $filter: {
//                                                                         input: "$_Appointments",
//                                                                         as: "ad",
//                                                                         cond: {
//                                                                             $gt: [
//                                                                                 {
//                                                                                     $size: {
//                                                                                         $filter: {
//                                                                                             input: "$$ad.schedule",
//                                                                                             as: "sch",
//                                                                                             cond: {
//                                                                                                 $gt: [
//                                                                                                     {
//                                                                                                         $size: {
//                                                                                                             $filter: {
//                                                                                                                 input: "$$sch.appointments",
//                                                                                                                 as: "a",
//                                                                                                                 cond: { $eq: ["$$a._id", "$$srv.AppointmentId"] },
//                                                                                                             },
//                                                                                                         },
//                                                                                                     },
//                                                                                                     0,
//                                                                                                 ],
//                                                                                             },
//                                                                                         },
//                                                                                     },
//                                                                                 },
//                                                                                 0,
//                                                                             ],
//                                                                         },
//                                                                     },
//                                                                 },
//                                                                 0,
//                                                             ],
//                                                         },
//                                                     },
//                                                     in: {
//                                                         $let: {
//                                                             vars: {
//                                                                 // Find the specific schedule entry holding this AppointmentId
//                                                                 slot: {
//                                                                     $arrayElemAt: [
//                                                                         {
//                                                                             $filter: {
//                                                                                 input: "$$apptDoc.schedule",
//                                                                                 as: "sch",
//                                                                                 cond: {
//                                                                                     $gt: [
//                                                                                         {
//                                                                                             $size: {
//                                                                                                 $filter: {
//                                                                                                     input: "$$sch.appointments",
//                                                                                                     as: "a",
//                                                                                                     cond: { $eq: ["$$a._id", "$$srv.AppointmentId"] },
//                                                                                                 },
//                                                                                             },
//                                                                                         },
//                                                                                         0,
//                                                                                     ],
//                                                                                 },
//                                                                             },
//                                                                         },
//                                                                         0,
//                                                                     ],
//                                                                 },
//                                                             },
//                                                             in: {
//                                                                 $let: {
//                                                                     vars: {
//                                                                         // Find the specific appointment slot
//                                                                         appt: {
//                                                                             $arrayElemAt: [
//                                                                                 {
//                                                                                     $filter: {
//                                                                                         input: "$$slot.appointments",
//                                                                                         as: "a",
//                                                                                         cond: { $eq: ["$$a._id", "$$srv.AppointmentId"] },
//                                                                                     },
//                                                                                 },
//                                                                                 0,
//                                                                             ],
//                                                                         },
//                                                                     },
//                                                                     in: {
//                                                                         AppointmentId: "$$appt._id",
//                                                                         Date: "$$slot.date",
//                                                                         Day: "$$slot.day",
//                                                                         StartTime: "$$appt.ServiceStartTime",
//                                                                         EndTime: "$$appt.ServiceEndTime",
//                                                                         Booked: "$$appt.booked",
//                                                                     },
//                                                                 },
//                                                             },
//                                                         },
//                                                     },
//                                                 },
//                                             },
//                                         },
//                                     ],
//                                 },
//                             },
//                         },
//                     },
//                 },

//                 {
//                     $project: {
//                         _ServiceProducts: 0,
//                         _Providers: 0,
//                         _Appointments: 0,
//                     },
//                 },
//             ]);

//             return data || null;
//         } catch (error) {
//             console.error("getServiceCartDataError:", error);
//             throw new Error("Failed to fetch service cart data");
//         }
//     },

// } 

'use strict';

const mongoose = require('mongoose');
const https = require('https');
const PaytmChecksum = require('paytmchecksum');

const { ServiceCart, ServiceOrder } = require('./ServiceProductCart.model');
const { ServiceAppointmentModel } = require('../ServiceAppointment/ServiceAppointment.model');
const { serviceProductsModel } = require('../ServiceProducts/ServiceProducts.model');
const CompanyModel = require('../../CompanyBase/Company/Company.model');
const { User } = require('../../UserBase/User/User.model')


/**
 * calculateService
 * ─────────────────
 * Single source of truth for pricing.
 * Rules (consistent across add / validate / proceed):
 *   • Only Parts where selected !== false contribute to partsTotal
 *   • discount applies to base price only
 *   • total  = base + partsTotal          (gross, before discount)
 *   • final  = (base − discount) + partsTotal
 *
 * @param {Object} serviceDoc  – Mongoose document from serviceProductsModel
 * @param {Array}  parts       – Parts array from the cart item
 * @returns {{ total, discount, final, partsTotal }}
 */
const calculateService = (serviceDoc, parts = []) => {
    const base = serviceDoc.service_base_price || 0;

    const partsTotal = parts
        .filter(p => p.selected !== false)
        .reduce((sum, p) => sum + (p.partPrice || 0), 0);

    const discount =
        (serviceDoc.offerPercentage > 0)
            ? (base * serviceDoc.offerPercentage) / 100
            : 0;

    const total = base + partsTotal;
    const final = (base - discount) + partsTotal;

    return {
        total: total.toFixed(2),
        discount: discount.toFixed(2),
        final: final.toFixed(2),
        partsTotal: partsTotal.toFixed(2)
    };
};

/**
 * recalcCartTotals
 * ─────────────────
 * Recomputes cart-level price fields from its active Services array.
 * Mutates the cart document in-place; caller must still call cart.save().
 *
 * @param {Object} cart – Mongoose ServiceCart document
 */
const recalcCartTotals = (cart) => {
    let total = 0, discount = 0, final = 0;
    for (const s of cart.Services) {
        if (s.IsActive !== false) {
            total += s.TotalPrice || 0;
            discount += s.DiscountPrice || 0;
            final += s.FinalPrice || 0;
        }
    }
    cart.TotalCartPrice = total;
    cart.DiscountCartPrice = discount;
    cart.FinalCartPrice = final;
};

/**
 * setAppointmentBooked
 * ─────────────────────
 * Correct positional update for a deeply-nested appointment slot.
 * Uses TWO arrayFilters so only the exact schedule entry AND the exact
 * appointment are touched — not every schedule entry ($[] bug avoided).
 *
 * @param {ObjectId|string} appointmentId
 * @param {boolean}         bookedValue
 */
const setAppointmentBooked = async (appointmentId, bookedValue) => {
    await ServiceAppointmentModel.updateOne(
        { 'schedule.appointments._id': appointmentId },
        {
            $set: {
                'schedule.$[sch].appointments.$[appt].booked': bookedValue,
            },
        },
        {
            arrayFilters: [
                { 'sch.appointments._id': appointmentId },
                { 'appt._id': appointmentId },
            ],
        }
    );
};

/**
 * findSlotInAppointment
 * ──────────────────────
 * Locates the exact schedule entry and appointment slot inside an
 * appointment document.  Returns { foundSchedule, foundSlot } or nulls.
 *
 * @param {Object}          appointmentDoc – Mongoose ServiceAppointment document
 * @param {ObjectId|string} appointmentId
 */
const findSlotInAppointment = (appointmentDoc, appointmentId) => {
    for (const sch of appointmentDoc.schedule) {
        for (const appt of sch.appointments) {
            if (appt._id.toString() === appointmentId.toString()) {
                return { foundSchedule: sch, foundSlot: appt };
            }
        }
    }
    return { foundSchedule: null, foundSlot: null };
};



module.exports = {


    addServiceToCart: async (req, res) => {
        let {
            UserId,
            companyId,
            ServiceProductId,
            ProviderId,
            AppointmentId,
            Parts = [],
            Operation,
        } = req.body;

        UserId = req.user?.UserId || UserId;
        companyId = req.user?.companyId || companyId;

        try {
            if (!UserId || !companyId)
                return res.status(400).json({ message: 'User or Company missing', success: false });

            let FoundCart = await ServiceCart.findOne({ UserId, companyId });
            if (!FoundCart) {
                FoundCart = new ServiceCart({ UserId, companyId, Services: [] });
            }

            const existingIndex = FoundCart.Services.findIndex(s =>
                s.ServiceProductId.toString() === String(ServiceProductId) &&
                s.AppointmentId.toString() === String(AppointmentId)
            );

            const FoundService = await serviceProductsModel.findOne({
                _id: ServiceProductId,
                companyId,
                isActive: true,
            });

            if (!FoundService)
                return res.status(404).json({ message: 'Service not found', success: false });

            if (Operation === 'add') {

                const appointmentDoc = await ServiceAppointmentModel.findOne({
                    companyId,
                    ServiceProviderId: ProviderId,
                    ServiceProductId,
                    isActive: true,
                    'schedule.appointments._id': AppointmentId,
                });

                if (!appointmentDoc)
                    return res.status(404).json({ message: 'Appointment not found', success: false });

                const { foundSlot } = findSlotInAppointment(appointmentDoc, AppointmentId);

                if (!foundSlot)
                    return res.status(404).json({ message: 'Slot not found', success: false });

                if (foundSlot.booked === true)
                    return res.status(400).json({ message: 'Slot already booked', success: false });

                if (existingIndex !== -1) FoundCart.Services.splice(existingIndex, 1);

                const { total, discount, final, partsTotal } = calculateService(FoundService, Parts);

                FoundCart.Services.push({
                    ServiceProductId,
                    ProviderId,
                    AppointmentId,
                    Parts,
                    PartsTotal: partsTotal,
                    TotalPrice: total,
                    DiscountPrice: discount,
                    FinalPrice: final,
                    IsActive: true,
                    Reserved: false,
                });
            }

            else if (Operation === 'update') {

                if (existingIndex === -1)
                    return res.status(404).json({ message: 'Service not in cart', success: false });

                const item = FoundCart.Services[existingIndex];
                const useParts = (Parts && Parts.length) ? Parts : item.Parts;

                const { total, discount, final, partsTotal } = calculateService(FoundService, useParts);

                item.Parts = useParts;
                item.PartsTotal = partsTotal;
                item.TotalPrice = total;
                item.DiscountPrice = discount;
                item.FinalPrice = final;

                FoundCart.Services[existingIndex] = item;
            }

            else if (Operation === 'remove') {

                if (existingIndex === -1)
                    return res.status(404).json({ message: 'Service not found in cart', success: false });

                FoundCart.Services.splice(existingIndex, 1);
            }

            else {
                return res.status(400).json({ message: 'Invalid operation', success: false });
            }

            recalcCartTotals(FoundCart);
            const saved = await FoundCart.save();

            await module.exports.validateServiceCart({ body: { UserId, companyId } });

            return res.status(200).json({
                message: 'Service cart updated',
                success: true,
                data: saved,
            });

        } catch (err) {
            console.error('addServiceToCart Error:', err);
            return res.status(500).json({ message: 'Internal error', error: err.message, success: false });
        }
    },


    validateServiceCart: async ({ body }) => {
        const { UserId, companyId } = body;

        const FoundCart = await ServiceCart.findOne({ UserId, companyId });
        if (!FoundCart) return;

        const updated = [];

        for (const item of FoundCart.Services) {

            const service = await serviceProductsModel.findOne({
                _id: item.ServiceProductId,
                companyId,
                isActive: true,
            });
            if (!service) continue;

            const appointmentDoc = await ServiceAppointmentModel.findOne({
                'schedule.appointments._id': item.AppointmentId,
                companyId,
                isActive: true,
            });

            if (appointmentDoc) {
                const { foundSlot } = findSlotInAppointment(appointmentDoc, item.AppointmentId);
                if (foundSlot && foundSlot.booked === true && item.Reserved !== true) {
                    continue;
                }
            }

            const validParts = service.service_parts || [];
            const cleanedParts = [];

            for (const cartPart of item.Parts || []) {
                const match = validParts.find(p => p.partName === cartPart.partName);
                if (match) {
                    cleanedParts.push({
                        partName: match.partName,
                        partPrice: match.partPrice,
                        selected: cartPart.selected,
                    });
                }
            }

            item.Parts = cleanedParts;

            const { total, discount, final, partsTotal } = calculateService(service, cleanedParts);

            item.TotalPrice = total;
            item.DiscountPrice = discount;
            item.FinalPrice = final;
            item.PartsTotal = partsTotal;

            updated.push(item);
        }

        FoundCart.Services = updated;
        recalcCartTotals(FoundCart);
        await FoundCart.save();
    },


    proceedToPaymentForServiceCart: async (req, res) => {
        let { UserId, companyId, AddressId } = req.body;
        let { RenderingDomain = 'public' } = req.query;

        RenderingDomain = ['private', 'public'].includes((RenderingDomain || '').toLowerCase())
            ? RenderingDomain.toLowerCase()
            : 'public';

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        let rollback = {
            orderId: null,
            appointmentUpdates: [],   
            reservedUpdates: [],  
        };

        const RollBackFunction = async (rollback) => {
            try {
                try {
                    if (rollback.appointmentUpdates?.length) {
                        await Promise.all(
                            rollback.appointmentUpdates.map(({ appointmentId }) =>
                                setAppointmentBooked(appointmentId, false)
                            )
                        );
                    }
                } catch (err) {
                    console.error('RollBackError for appointment unbook:', err.message);
                }

                try {
                    if (rollback.reservedUpdates?.length) {
                        await Promise.all(
                            rollback.reservedUpdates.map(({ _id, previousReserved }) =>
                                ServiceCart.findOneAndUpdate(
                                    { companyId, UserId, 'Services._id': _id },
                                    { $set: { 'Services.$.Reserved': previousReserved } }
                                )
                            )
                        );
                    }
                } catch (err) {
                    console.error('RollBackError for reserved updates:', err.message);
                }

                try {
                    if (rollback.orderId) {
                        await ServiceOrder.findOneAndDelete({ _id: rollback.orderId });
                    }
                } catch (err) {
                    console.error('RollBackError for delete order:', err.message);
                }

            } catch (err) {
                console.error('RollBackFunction outer error:', err.message);
            }
        };

        try {
            await module.exports.validateServiceCart({ body: { UserId, companyId } });

            const FoundUser = await User.findOne({ companyId, _id: UserId });
            if (!FoundUser) {
                return res.status(400).json({ message: 'User not found', success: false });
            }

            if (!FoundUser.Address || FoundUser.Address.length === 0) {
                return res.status(400).json({ message: 'Address not found', success: false });
            }

            let FoundedAddress;
            if (!AddressId) {
                FoundedAddress = FoundUser.Address.find(a => a.DefaultAddress === true);
                if (!FoundedAddress) FoundedAddress = FoundUser.Address[0];
            } else {
                FoundedAddress = FoundUser.Address.find(a => String(a._id) === String(AddressId));
            }

            if (!FoundedAddress) {
                return res.status(400).json({ message: 'Address not found', success: false });
            }

            const FoundCart = await ServiceCart.findOne({ UserId, companyId });
            if (!FoundCart || !FoundCart.Services?.length) {
                return res.status(400).json({ message: 'Cart is empty', success: false });
            }

            const now = new Date();
            const reservationExpiry = new Date(now.getTime() + 15 * 60 * 1000);

            let OrderData = {
                UserId,
                companyId,
                CartId: FoundCart._id,
                Services: [],
                ReservationStartedAt: now,
                ReservationExpiresAt: reservationExpiry,
                UserDetails: {
                    UserName: FoundUser.UserName || '',
                    Email: FoundUser.Email || '',
                    Phone: FoundUser.Phone,
                    AddresserName: FoundedAddress.AddresserName || FoundUser.UserName || 'Guest',
                    AddresserNumber: FoundedAddress.AddresserNumber || FoundUser.Phone,
                    AddressType: FoundedAddress.AddressType || 'Home',
                    Street: FoundedAddress.Street || '',
                    City: FoundedAddress.City || '',
                    State: FoundedAddress.State || '',
                    Country: FoundedAddress.Country || '',
                    PostalCode: FoundedAddress.PostalCode || '',
                    Latitude: FoundedAddress.Latitude || '',
                    Longitude: FoundedAddress.Longitude || '',
                    ManualAddress: FoundedAddress.ManualAddress || '',
                },
            };

            let FoundOrder;

            try {
                for (const item of FoundCart.Services) {
                    if (item.IsActive === false || item.Reserved === true) continue;

                    const appointmentDoc = await ServiceAppointmentModel.findOne({
                        'schedule.appointments._id': item.AppointmentId,
                        companyId,
                        isActive: true,
                    });

                    if (!appointmentDoc) {
                        await RollBackFunction(rollback);
                        return res.status(400).json({ message: 'Appointment not found', success: false });
                    }

                    const { foundSchedule, foundSlot } = findSlotInAppointment(
                        appointmentDoc, item.AppointmentId
                    );

                    if (!foundSlot) {
                        await RollBackFunction(rollback);
                        return res.status(400).json({ message: 'Slot not found', success: false });
                    }

                    if (foundSlot.booked === true) {
                        await RollBackFunction(rollback);
                        return res.status(400).json({ message: 'Slot already booked', success: false });
                    }

                    const serviceProduct = await serviceProductsModel.findById(item.ServiceProductId);

                    const providerDoc = await mongoose.connection
                        .collection('serviceproviders')
                        .findOne({ _id: new mongoose.Types.ObjectId(String(item.ProviderId)) });

                    const ServiceData = {
                        ServiceInfo: {
                            ServiceProductId: item.ServiceProductId,
                            ServiceName: serviceProduct?.ServiceName || '',
                            Description: {
                                Head: '',
                                Points: [],
                                TextDescription: serviceProduct?.service_description || '',
                            },
                            Images: serviceProduct?.serviceImages || [],
                            BasePrice: serviceProduct?.service_base_price || 0,
                            OfferPercentage: serviceProduct?.offerPercentage ?? null,
                        },
                        ProviderInfo: {
                            ProviderId: item.ProviderId,
                            ProviderName: providerDoc?.name || '',
                            Phone: providerDoc?.phone || '',
                        },
                        AppointmentInfo: {
                            AppointmentId: item.AppointmentId,
                            Date: foundSchedule?.date || '',
                            Day: foundSchedule?.day || '',
                            StartTime: foundSlot?.ServiceStartTime || '',
                            EndTime: foundSlot?.ServiceEndTime || '',
                        },
                    };

                    OrderData.Services.push({
                        CartServiceId: item._id,
                        OrderStatus: [{ Status: 'INITIATED', StatusAt: now }],
                        CreatedAt: now,
                        ServiceData,
                        Parts: item.Parts,
                        PartsTotal: item.PartsTotal,
                        TotalPrice: item.TotalPrice,
                        DiscountPrice: item.DiscountPrice,
                        FinalPrice: item.FinalPrice,
                        IsActive: true,
                    });
                }

                if (!OrderData.Services.length) {
                    return res.status(400).json({ message: 'No valid services to process', success: false });
                }

                OrderData.TotalCartPrice = parseFloat(OrderData.Services.reduce((s, i) => s + (i.TotalPrice || 0), 0).toFixed(2));
                OrderData.DiscountCartPrice = parseFloat(OrderData.Services.reduce((s, i) => s + (i.DiscountPrice || 0), 0).toFixed(2));
                OrderData.FinalCartPrice = parseFloat(OrderData.Services.reduce((s, i) => s + (i.FinalPrice || 0), 0).toFixed(2));

                const SaveOrder = await new ServiceOrder(OrderData).save();
                rollback.orderId = SaveOrder._id;

                FoundOrder = await ServiceOrder.findOne({ _id: SaveOrder._id });

            } catch (err) {
                await RollBackFunction(rollback);
                console.error('Order Build Error:', err);
                return res.status(500).json({ message: 'Unable to create order', success: false });
            }

            if (!FoundOrder) {
                await RollBackFunction(rollback);
                return res.status(500).json({ message: 'Order initialization failed', success: false });
            }

            try {
                for (const orderSvc of FoundOrder.Services) {
                    const apptId = orderSvc.ServiceData.AppointmentInfo.AppointmentId;

                    if (!apptId) continue;

                    await setAppointmentBooked(apptId, true);
                    rollback.appointmentUpdates.push({ appointmentId: apptId });
                }
            } catch (err) {
                console.error('Appointment Book Error:', err);
                await RollBackFunction(rollback);
                return res.status(500).json({ message: 'Failed to reserve appointment slots', success: false });
            }

            try {
                const orderId = `SVC_${FoundOrder._id.toString().slice(-6)}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
                const totalAmount = FoundOrder.FinalCartPrice || FoundOrder.TotalCartPrice;

                const paytmParams = {
                    body: {
                        requestType: 'Payment',
                        mid: process.env.PAYTM_MID,
                        websiteName: process.env.PAYTM_WEBSITE,
                        orderId,
                        callbackUrl: `${process.env.BASE_URL}servicecart/handlePaymentStatus?RenderingDomain=${RenderingDomain}&companyId=${companyId}`,
                        txnAmount: { value: totalAmount.toString(), currency: 'INR' },
                        userInfo: { custId: UserId.toString() },
                    },
                };

                const checksum = await PaytmChecksum.generateSignature(
                    JSON.stringify(paytmParams.body),
                    process.env.PAYTM_KEY
                );
                paytmParams.head = { signature: checksum };

                const post_data = JSON.stringify(paytmParams);
                const paytmOptions = {
                    hostname: process.env.PAYTM_HOSTNAME,
                    port: 443,
                    path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(post_data),
                    },
                };

                const paytmResponse = await new Promise((resolve, reject) => {
                    let raw = '';
                    const paytmReq = https.request(paytmOptions, paytmRes => {
                        paytmRes.on('data', chunk => (raw += chunk));
                        paytmRes.on('end', () => {
                            try { resolve(JSON.parse(raw)); }
                            catch (e) { reject(e); }
                        });
                    });
                    paytmReq.on('error', reject);
                    paytmReq.write(post_data);
                    paytmReq.end();
                });

                FoundOrder.PaymentSession = {
                    orderId,
                    txnId: null,
                    status: 'INITIATED',
                    amount: totalAmount,
                    paymentGateway: 'Paytm',
                };
                FoundOrder.ReservationStartedAt = now;

                for (const orderSvc of FoundOrder.Services) {
                    const cartSvc = FoundCart.Services.find(
                        c => c._id.toString() === orderSvc.CartServiceId?.toString()
                    );
                    if (cartSvc) {
                        rollback.reservedUpdates.push({
                            _id: cartSvc._id,
                            previousReserved: cartSvc.Reserved,
                        });
                        cartSvc.Reserved = true;
                    }
                }

                await FoundCart.save();
                await FoundOrder.save();

                if (!paytmResponse?.body?.txnToken) {
                    await RollBackFunction(rollback);
                    console.error('No txnToken in Paytm response:', paytmResponse);
                    return res.status(500).json({
                        message: 'Payment gateway did not return txnToken',
                        success: false,
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Payment initiated',
                    url: `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                    txnToken: paytmResponse.body.txnToken,
                    orderId,
                    mid: process.env.PAYTM_MID,
                    amount: totalAmount,
                });

            } catch (err) {
                console.error('Payment Initiation Error:', err);
                await RollBackFunction(rollback);
                return res.status(500).json({ message: 'Failed to initiate payment', success: false });
            }

        } catch (err) {
            console.error('proceedToPaymentForServiceCart Error:', err);
            await RollBackFunction(rollback);
            return res.status(500).json({ message: 'Internal Server Error', success: false });
        }
    },


    proceedToPaymentForSingleService: async (req, res) => {
        let {
            UserId,
            companyId,
            AddressId,
            ServiceProductId,
            ProviderId,
            AppointmentId,
            Parts = [],
        } = req.body;

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        let { RenderingDomain = 'public' } = req.query;
        RenderingDomain = ['private', 'public'].includes((RenderingDomain || '').toLowerCase())
            ? RenderingDomain.toLowerCase()
            : 'public';

        let rollback = { orderId: null, appointmentId: null };

        const RollBack = async () => {
            try {
                if (rollback.appointmentId) {
                    await setAppointmentBooked(rollback.appointmentId, false);
                }
                if (rollback.orderId) {
                    await ServiceOrder.findByIdAndDelete(rollback.orderId);
                }
            } catch (rbErr) {
                console.error('SingleService Rollback Error:', rbErr.message);
            }
        };

        try {
            if (!ServiceProductId || !ProviderId || !AppointmentId) {
                return res.status(400).json({
                    message: 'Missing required fields: ServiceProductId, ProviderId, AppointmentId',
                    success: false,
                });
            }

            if (!UserId || !companyId) {
                return res.status(400).json({ message: 'User or Company not provided', success: false });
            }

            Parts = Array.isArray(Parts) ? Parts : [];

            const FoundUser = await User.findOne({ _id: UserId, companyId });
            if (!FoundUser) {
                return res.status(404).json({ message: 'User not found', success: false });
            }

            let Address;
            if (!AddressId) {
                Address = FoundUser.Address?.find(a => a.DefaultAddress === true) || FoundUser.Address?.[0];
            } else {
                Address = FoundUser.Address?.find(a => String(a._id) === String(AddressId));
            }
            if (!Address) {
                return res.status(400).json({ message: 'Address not found', success: false });
            }

            const FoundService = await serviceProductsModel.findOne({
                _id: ServiceProductId,
                companyId,
                isActive: true,
            });
            if (!FoundService) {
                return res.status(404).json({ message: 'Service not found', success: false });
            }

            const appointmentDoc = await ServiceAppointmentModel.findOne({
                companyId,
                ServiceProviderId: ProviderId,
                ServiceProductId,
                isActive: true,
                'schedule.appointments._id': AppointmentId,
            });
            if (!appointmentDoc) {
                return res.status(404).json({ message: 'Appointment not found', success: false });
            }

            const { foundSchedule, foundSlot } = findSlotInAppointment(appointmentDoc, AppointmentId);

            if (!foundSlot) {
                return res.status(404).json({ message: 'Slot not found', success: false });
            }
            if (foundSlot.booked === true) {
                return res.status(400).json({ message: 'Slot already booked', success: false });
            }

            const providerDoc = await mongoose.connection
                .collection('providers')
                .findOne({ _id: new mongoose.Types.ObjectId(String(ProviderId)) });

            const base = FoundService.service_base_price || 0;

            const validParts = FoundService.service_parts || [];
            const cleanedParts = Parts
                .map(cartPart => {
                    const match = validParts.find(p => p.partName === cartPart.partName);
                    if (!match) return null;
                    return {
                        partName: match.partName,
                        partPrice: match.partPrice,
                        selected: cartPart.selected !== false,
                    };
                })
                .filter(Boolean);

            const partsTotal = cleanedParts
                .filter(p => p.selected !== false)
                .reduce((sum, p) => sum + (p.partPrice || 0), 0);

            const discount =
                FoundService.offerPercentage > 0
                    ? parseFloat(((base * FoundService.offerPercentage) / 100).toFixed(2))
                    : 0;

            const totalPrice = parseFloat((base + partsTotal).toFixed(2));
            const finalPrice = parseFloat((base - discount + partsTotal).toFixed(2));

            const ServiceData = {
                ServiceInfo: {
                    ServiceProductId: FoundService._id,
                    ServiceName: FoundService.ServiceName || '',
                    Description: {
                        Head: '',
                        Points: [],
                        TextDescription: FoundService.service_description || '',
                    },
                    Images: FoundService.serviceImages || [],
                    BasePrice: FoundService.service_base_price || 0,
                    OfferPercentage: FoundService.offerPercentage ?? null,
                },
                ProviderInfo: {
                    ProviderId: new mongoose.Types.ObjectId(String(ProviderId)),
                    ProviderName: providerDoc?.name || '',
                    Phone: providerDoc?.phone || '',
                },
                AppointmentInfo: {
                    AppointmentId: foundSlot._id,
                    Date: foundSchedule?.date || '',
                    Day: foundSchedule?.day || '',
                    StartTime: foundSlot?.ServiceStartTime || '',
                    EndTime: foundSlot?.ServiceEndTime || '',
                },
            };

            const now = new Date();
            const reservationExpiry = new Date(now.getTime() + 15 * 60 * 1000);

            const OrderData = {
                UserId,
                companyId,
                ReservationStartedAt: now,
                ReservationExpiresAt: reservationExpiry,
                UserDetails: {
                    UserName: FoundUser.UserName || '',
                    Email: FoundUser.Email || '',
                    Phone: FoundUser.Phone,
                    AddresserName: Address.AddresserName || FoundUser.UserName || 'Guest',
                    AddresserNumber: Address.AddresserNumber || FoundUser.Phone,
                    AddressType: Address.AddressType || 'Home',
                    Street: Address.Street || '',
                    City: Address.City || '',
                    State: Address.State || '',
                    Country: Address.Country || '',
                    PostalCode: Address.PostalCode || '',
                    Latitude: Address.Latitude || '',
                    Longitude: Address.Longitude || '',
                    ManualAddress: Address.ManualAddress || '',
                },
                Services: [
                    {
                        OrderStatus: [{ Status: 'INITIATED', StatusAt: now }],
                        CreatedAt: now,
                        ServiceData,
                        Parts: cleanedParts,
                        PartsTotal: partsTotal,
                        TotalPrice: totalPrice,
                        DiscountPrice: discount,
                        FinalPrice: finalPrice,
                        IsActive: true,
                    },
                ],
                TotalCartPrice: totalPrice,
                DiscountCartPrice: discount,
                FinalCartPrice: finalPrice,
            };

            const savedOrder = await new ServiceOrder(OrderData).save();
            rollback.orderId = savedOrder._id;

            const FoundOrder = await ServiceOrder.findById(savedOrder._id);

            await setAppointmentBooked(AppointmentId, true);
            rollback.appointmentId = AppointmentId;

            const orderId = `SVC_${FoundOrder._id.toString().slice(-6)}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
            const totalAmount = FoundOrder.FinalCartPrice || FoundOrder.TotalCartPrice || 0;

            const paytmParams = {
                body: {
                    requestType: 'Payment',
                    mid: process.env.PAYTM_MID,
                    websiteName: process.env.PAYTM_WEBSITE,
                    orderId,
                    callbackUrl: `${process.env.BASE_URL}servicecart/handlePaymentStatus?RenderingDomain=${RenderingDomain}&companyId=${companyId}`,
                    txnAmount: { value: totalAmount.toString(), currency: 'INR' },
                    userInfo: { custId: UserId.toString() },
                },
            };

            const checksum = await PaytmChecksum.generateSignature(
                JSON.stringify(paytmParams.body),
                process.env.PAYTM_KEY
            );
            paytmParams.head = { signature: checksum };

            const post_data = JSON.stringify(paytmParams);
            const paytmOptions = {
                hostname: process.env.PAYTM_HOSTNAME,
                port: 443,
                path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(post_data),
                },
            };

            const paytmResponse = await new Promise((resolve, reject) => {
                let raw = '';
                const paytmReq = https.request(paytmOptions, paytmRes => {
                    paytmRes.on('data', chunk => (raw += chunk));
                    paytmRes.on('end', () => {
                        try { resolve(JSON.parse(raw)); }
                        catch (e) { reject(e); }
                    });
                });
                paytmReq.on('error', reject);
                paytmReq.write(post_data);
                paytmReq.end();
            });

            if (!paytmResponse?.body?.txnToken) {
                await RollBack();
                console.error('Paytm response missing txnToken:', paytmResponse);
                return res.status(500).json({
                    message: 'Payment gateway did not return txnToken',
                    success: false,
                });
            }

            FoundOrder.PaymentSession = {
                orderId,
                txnId: null,
                status: 'INITIATED',
                amount: totalAmount,
                paymentGateway: 'Paytm',
            };
            FoundOrder.ReservationStartedAt = now;
            await FoundOrder.save();

            return res.status(200).json({
                success: true,
                message: 'Payment initiated',
                url: `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                txnToken: paytmResponse.body.txnToken,
                orderId,
                mid: process.env.PAYTM_MID,
                amount: totalAmount,
            });

        } catch (error) {
            console.error('SingleService Checkout Error:', error);
            await RollBack();
            return res.status(500).json({ message: 'Internal Server Error', success: false });
        }
    },
    handleServicePaymentStatus: async (req, res) => {
        let FrontendRenderDomain;

        try {
            const paytmBody = req.body || {};
            const orderId = paytmBody?.ORDERID;

            const paymentInfo = {
                orderId,
                txnId: paytmBody.TXNID,
                amount: paytmBody.TXNAMOUNT,
                respMsg: paytmBody.RESPMSG,
                status: paytmBody.STATUS,
            };

            let { RenderingDomain = 'public', companyId } = req.query;

            RenderingDomain = ['private', 'public'].includes((RenderingDomain || '').toLowerCase())
                ? RenderingDomain.toLowerCase()
                : 'public';

            try {
                const FoundCompany = companyId ? await CompanyModel.findById(companyId) : null;
                if (FoundCompany) {
                    if (RenderingDomain === 'private' && FoundCompany.PredifinedDomain) {
                        FrontendRenderDomain = `${FoundCompany.PredifinedDomain.replace(/\/+$/, '')}/services`;
                    } else if (FoundCompany.CompanyDomain) {
                        FrontendRenderDomain = `https://${FoundCompany.CompanyDomain.trim()}.shop.readytechnologies.in/services`;
                    }
                }
            } catch (err) {
                console.error('Error fetching company domain:', err?.message || err);
            }

            if (!FrontendRenderDomain) {
                FrontendRenderDomain = 'http://localhost:4200/services';
            }

            let verifyPaytmStatus;

            try {
                const verifyParams = {
                    body: {
                        mid: process.env.PAYTM_MID,
                        orderId: paymentInfo.orderId,
                    },
                };

                const verifyChecksum = await PaytmChecksum.generateSignature(
                    JSON.stringify(verifyParams.body),
                    process.env.PAYTM_KEY
                );
                verifyParams.head = { signature: verifyChecksum };

                const verifyData = JSON.stringify(verifyParams);
                const verifyOptions = {
                    hostname: 'securegw.paytm.in',
                    port: 443,
                    path: '/v3/order/status',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(verifyData),
                    },
                };

                verifyPaytmStatus = await new Promise((resolve, reject) => {
                    let raw = '';
                    const vReq = https.request(verifyOptions, vRes => {
                        vRes.on('data', chunk => (raw += chunk));
                        vRes.on('end', () => {
                            try { resolve(JSON.parse(raw)); }
                            catch (e) { reject(e); }
                        });
                    });
                    vReq.on('error', reject);
                    vReq.write(verifyData);
                    vReq.end();
                });

            } catch (err) {
                console.error('Paytm verify error:', err?.message || err);
                return res.redirect(
                    `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=PAYTM-VERIFY-ERROR`
                );
            }

            const resultStatus = verifyPaytmStatus?.body?.resultInfo?.resultStatus || 'UNKNOWN';

            const FoundOrder = await ServiceOrder.findOne({ 'PaymentSession.orderId': orderId });

            if (!FoundOrder) {
                return res.redirect(
                    `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=ORDER-NOT-FOUND`
                );
            }

            if (resultStatus === 'TXN_SUCCESS') {

                if (FoundOrder.PaymentSession?.status === 'SUCCESS') {
                    return res.redirect(
                        `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=SUCCESS&serviceorderid=${FoundOrder._id}`
                    );
                }

                FoundOrder.PaymentSession.status = 'SUCCESS';
                FoundOrder.PaymentSession.txnId = paymentInfo.txnId;
                FoundOrder.PaymentSession.amount = paymentInfo.amount;
                await FoundOrder.save();

                try {
                    const cart = await ServiceCart.findOne({
                        UserId: FoundOrder.UserId,
                        companyId: FoundOrder.companyId,
                    });

                    if (cart) {
                        for (const orderSvc of FoundOrder.Services) {
                            const cartSvc = cart.Services.find(
                                c => c._id.toString() === orderSvc.CartServiceId?.toString()
                            );
                            if (cartSvc) {
                                cartSvc.IsActive = false;
                                cartSvc.Reserved = false;
                            }
                        }
                        recalcCartTotals(cart);
                        await cart.save();
                    }
                } catch (err) {
                    console.error('Post-payment cart cleanup error:', err?.message || err);
                }

                return res.redirect(
                    `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=SUCCESS&serviceorderid=${FoundOrder._id}`
                );
            }

            if (resultStatus === 'TXN_FAILURE' || resultStatus === 'FAILURE') {

                if (FoundOrder.PaymentSession?.status === 'FAILED') {
                    return res.redirect(
                        `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=FAILED&serviceorderid=${FoundOrder._id}`
                    );
                }

                try {
                    for (const orderSvc of FoundOrder.Services || []) {
                        const apptId = orderSvc.ServiceData?.AppointmentInfo?.AppointmentId;
                        if (apptId) {
                            await setAppointmentBooked(apptId, false);
                        }
                    }
                } catch (err) {
                    console.error('Appointment unbook error on failure:', err?.message || err);
                }

                try {
                    const cart = await ServiceCart.findOne({
                        UserId: FoundOrder.UserId,
                        companyId: FoundOrder.companyId,
                    });

                    if (cart) {
                        for (const orderSvc of FoundOrder.Services) {
                            const cartSvc = cart.Services.find(
                                c => c._id.toString() === orderSvc.CartServiceId?.toString()
                            );
                            if (cartSvc) cartSvc.Reserved = false;
                        }
                        await cart.save();
                    }
                } catch (err) {
                    console.error('Cart reserved-flag reset error:', err?.message || err);
                }

                FoundOrder.PaymentSession.status = 'FAILED';
                FoundOrder.PaymentSession.txnId = paymentInfo.txnId || FoundOrder.PaymentSession.txnId;
                FoundOrder.PaymentSession.amount = paymentInfo.amount || FoundOrder.PaymentSession.amount;
                await FoundOrder.save();

                const resultMsg = (verifyPaytmStatus?.body?.resultInfo?.resultMsg || '').toLowerCase();
                const respMsg = (paymentInfo?.respMsg || '').toLowerCase();

                const isCancelled =
                    resultMsg.includes('cancelled') ||
                    respMsg.includes('user has not completed transaction');

                return res.redirect(
                    `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=${isCancelled ? 'CANCELLED' : 'FAILED'}&serviceorderid=${FoundOrder._id}`
                );
            }

            return res.redirect(
                `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=${encodeURIComponent(resultStatus)}&serviceorderid=${FoundOrder._id}`
            );

        } catch (err) {
            console.error('handleServicePaymentStatus Error:', err);

            const paytmorderId = req.body?.ORDERID
                ? encodeURIComponent(req.body.ORDERID)
                : '';

            const fallback = FrontendRenderDomain || 'http://localhost:4200/services';
            return res.redirect(
                `${fallback}/order-checked?paytmorderId=${paytmorderId}&status=INTERNAL-SERVER-ERROR`
            );
        }
    },


    getServiceCart: async (req, res) => {
        let { UserId, companyId } = req.query;

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        try {
            if (
                !mongoose.isValidObjectId(companyId) ||
                !mongoose.isValidObjectId(UserId)
            ) {
                return res.status(400).json({ message: 'Invalid User or Company', success: false });
            }

            const matchCondition = {
                companyId: new mongoose.Types.ObjectId(String(companyId)),
                UserId: new mongoose.Types.ObjectId(String(UserId)),
            };

            let data = await module.exports.getServiceCartData(matchCondition);

            if (!data?.length || data[0]?.Services?.length === 0) {
                return res.status(400).json({ message: 'Cart is empty', success: false });
            }

            data = data.map(cart => {
                cart.Services = cart.Services
                    .filter(s => s.IsActive !== false)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                return cart;
            });

            if (!data[0]?.Services?.length) {
                return res.status(400).json({ message: 'Cart is empty', success: false });
            }

            return res.status(200).json({
                message: 'Service cart fetched successfully',
                success: true,
                data,
            });

        } catch (error) {
            console.error('GetServiceCartError:', error.message);
            return res.status(500).json({ message: 'Internal Server Error', success: false });
        }
    },


    getServiceCartData: async (matchCondition) => {
        try {
            const data = await ServiceCart.aggregate([
                { $match: matchCondition },

                {
                    $lookup: {
                        from: 'serviceproducts',
                        localField: 'Services.ServiceProductId',
                        foreignField: '_id',
                        as: '_ServiceProducts',
                    },
                },

                {
                    $lookup: {
                        from: 'serviceproviders',
                        localField: 'Services.ProviderId',
                        foreignField: '_id',
                        as: '_Providers',
                    },
                },

                {
                    $lookup: {
                        from: 'serviceappointments',
                        localField: 'Services.AppointmentId',
                        foreignField: 'schedule.appointments._id',
                        as: '_Appointments',
                    },
                },

                {
                    $addFields: {
                        Services: {
                            $map: {
                                input: '$Services',
                                as: 'srv',
                                in: {
                                    $mergeObjects: [
                                        '$$srv',

                                        {
                                            ServiceProductInfo: {
                                                $let: {
                                                    vars: {
                                                        product: {
                                                            $arrayElemAt: [
                                                                {
                                                                    $filter: {
                                                                        input: '$_ServiceProducts',
                                                                        as: 'sp',
                                                                        cond: { $eq: ['$$sp._id', '$$srv.ServiceProductId'] },
                                                                    },
                                                                },
                                                                0,
                                                            ],
                                                        },
                                                    },
                                                    in: {
                                                        ServiceProductId: '$$product._id',
                                                        ServiceName: '$$product.ServiceName',
                                                        Images: '$$product.serviceImages',
                                                        Description: '$$product.service_description',
                                                        Parts: '$$product.service_parts',
                                                        BasePrice: '$$product.service_base_price',
                                                        OfferPercentage: '$$product.offerPercentage',
                                                        ServiceTime: '$$product.serviceTime',
                                                    },
                                                },
                                            },
                                        },

                                        {
                                            ProviderInfo: {
                                                $let: {
                                                    vars: {
                                                        provider: {
                                                            $arrayElemAt: [
                                                                {
                                                                    $filter: {
                                                                        input: '$_Providers',
                                                                        as: 'pv',
                                                                        cond: { $eq: ['$$pv._id', '$$srv.ProviderId'] },
                                                                    },
                                                                },
                                                                0,
                                                            ],
                                                        },
                                                    },
                                                    in: {
                                                        ProviderId: '$$provider._id',
                                                        ProviderFirstName: '$$provider.FirstName',
                                                        ProviderLastName: '$$provider.LastName',
                                                        Phone: '$$provider.Phone',
                                                    },
                                                },
                                            },
                                        },

                                        {
                                            AppointmentInfo: {
                                                $let: {
                                                    vars: {
                                                        apptDoc: {
                                                            $arrayElemAt: [
                                                                {
                                                                    $filter: {
                                                                        input: '$_Appointments',
                                                                        as: 'ad',
                                                                        cond: {
                                                                            $gt: [
                                                                                {
                                                                                    $size: {
                                                                                        $filter: {
                                                                                            input: '$$ad.schedule',
                                                                                            as: 'sch',
                                                                                            cond: {
                                                                                                $gt: [
                                                                                                    {
                                                                                                        $size: {
                                                                                                            $filter: {
                                                                                                                input: '$$sch.appointments',
                                                                                                                as: 'a',
                                                                                                                cond: { $eq: ['$$a._id', '$$srv.AppointmentId'] },
                                                                                                            },
                                                                                                        },
                                                                                                    },
                                                                                                    0,
                                                                                                ],
                                                                                            },
                                                                                        },
                                                                                    },
                                                                                },
                                                                                0,
                                                                            ],
                                                                        },
                                                                    },
                                                                },
                                                                0,
                                                            ],
                                                        },
                                                    },
                                                    in: {
                                                        $let: {
                                                            vars: {
                                                                scheduleEntry: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $filter: {
                                                                                input: '$$apptDoc.schedule',
                                                                                as: 'sch',
                                                                                cond: {
                                                                                    $gt: [
                                                                                        {
                                                                                            $size: {
                                                                                                $filter: {
                                                                                                    input: '$$sch.appointments',
                                                                                                    as: 'a',
                                                                                                    cond: { $eq: ['$$a._id', '$$srv.AppointmentId'] },
                                                                                                },
                                                                                            },
                                                                                        },
                                                                                        0,
                                                                                    ],
                                                                                },
                                                                            },
                                                                        },
                                                                        0,
                                                                    ],
                                                                },
                                                            },
                                                            in: {
                                                                $let: {
                                                                    vars: {
                                                                        appt: {
                                                                            $arrayElemAt: [
                                                                                {
                                                                                    $filter: {
                                                                                        input: '$$scheduleEntry.appointments',
                                                                                        as: 'a',
                                                                                        cond: { $eq: ['$$a._id', '$$srv.AppointmentId'] },
                                                                                    },
                                                                                },
                                                                                0,
                                                                            ],
                                                                        },
                                                                    },
                                                                    in: {
                                                                        AppointmentId: '$$appt._id',
                                                                        Date: '$$scheduleEntry.date',
                                                                        Day: '$$scheduleEntry.day',
                                                                        StartTime: '$$appt.ServiceStartTime',
                                                                        EndTime: '$$appt.ServiceEndTime',
                                                                        Booked: '$$appt.booked',
                                                                        Selected: '$$appt.selected',
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },

                                    ],
                                },
                            },
                        },
                    },
                },

                {
                    $project: {
                        _ServiceProducts: 0,
                        _Providers: 0,
                        _Appointments: 0,
                    },
                },
            ]);

            return data || null;

        } catch (error) {
            console.error('getServiceCartDataError:', error);
            throw new Error('Failed to fetch service cart data');
        }
    },


    getServiceOrders: async (req, res) => {
        try {
            let {
                UserId,
                companyId,
                Status,
                ServiceOrderId,
                AppointmentId,
                OrderId,
                PaymentStatus,
            } = req.query;

            if (req.user?.UserId) UserId = req.user.UserId;
            if (req.user?.companyId) companyId = req.user.companyId;

            if (!mongoose.isValidObjectId(companyId) || !mongoose.isValidObjectId(UserId)) {
                return res.status(400).json({
                    message: 'Not found proper data of Company or User',
                    success: false,
                });
            }

            const allowedPaymentStatus = ['INITIATED', 'SUCCESS', 'FAILED', 'PENDING', 'EXPIRED'];
            const allowedStatus = ['INITIATED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

            if (PaymentStatus && !allowedPaymentStatus.includes(PaymentStatus)) {
                return res.status(400).json({
                    message: `Invalid PaymentStatus. Allowed: ${allowedPaymentStatus.join(', ')}`,
                    success: false,
                });
            }

            if (Status && !allowedStatus.includes(Status)) {
                return res.status(400).json({
                    message: `Invalid Status. Allowed: ${allowedStatus.join(', ')}`,
                    success: false,
                });
            }

            if (OrderId && !mongoose.isValidObjectId(OrderId)) {
                return res.status(400).json({ message: 'Provide a valid Order Id', success: false });
            }

            if (ServiceOrderId && !mongoose.isValidObjectId(ServiceOrderId)) {
                return res.status(400).json({ message: 'Provide a valid Service Order Id', success: false });
            }

            if (AppointmentId && !mongoose.isValidObjectId(AppointmentId)) {
                return res.status(400).json({ message: 'Provide a valid Appointment Id', success: false });
            }

            let matchCondition = {
                companyId: new mongoose.Types.ObjectId(String(companyId)),
                UserId: new mongoose.Types.ObjectId(String(UserId)),
            };

            if (OrderId) {
                matchCondition._id = new mongoose.Types.ObjectId(String(OrderId));
            }

            if (PaymentStatus) {
                matchCondition['PaymentSession.status'] = PaymentStatus;
            }

            if (AppointmentId || ServiceOrderId) {
                const elemMatch = {};
                if (AppointmentId) {
                    elemMatch['ServiceData.AppointmentInfo.AppointmentId'] =
                        new mongoose.Types.ObjectId(String(AppointmentId));
                }
                if (ServiceOrderId) {
                    elemMatch['_id'] = new mongoose.Types.ObjectId(String(ServiceOrderId));
                }
                matchCondition.Services = { $elemMatch: elemMatch };
            }

            let Orders = await ServiceOrder.find(matchCondition).sort({ createdAt: -1 });

            if (!Orders.length) {
                return res.status(404).json({ message: 'No service orders found', success: false });
            }

            let FilteredOrders = Orders.map(order => {
                let services = order.Services || [];

                services = services.filter(s => s.IsActive !== false);

                if (Status) {
                    services = services.filter(s => {
                        const lastStatus = s.OrderStatus?.[s.OrderStatus.length - 1]?.Status;
                        return lastStatus === Status;
                    });
                }

                if (ServiceOrderId) {
                    services = services.filter(s =>
                        s._id.equals(new mongoose.Types.ObjectId(String(ServiceOrderId)))
                    );
                }

                if (AppointmentId) {
                    services = services.filter(s =>
                        s.ServiceData?.AppointmentInfo?.AppointmentId?.equals(
                            new mongoose.Types.ObjectId(String(AppointmentId))
                        )
                    );
                }

                return { ...order.toObject(), Services: services };
            });

            FilteredOrders = FilteredOrders.filter(o => o.Services.length > 0);

            if (!FilteredOrders.length) {
                return res.status(404).json({
                    message: 'No service orders found matching the given filters',
                    success: false,
                });
            }

            return res.status(200).json({
                message: 'Service orders fetched',
                data: FilteredOrders,
                success: true,
            });

        } catch (error) {
            console.error('getServiceOrdersError:', error.message);
            return res.status(500).json({
                message: 'Internal Server Error',
                error: error.message,
                success: false,
            });
        }
    },

    getAllServiceOrders: async (req, res) => {
        try {
            let {
                UserId,
                companyId,
                Status,
                ServiceOrderId,
                AppointmentId,
                SortOrder,
                StartDate,
                EndDate,
                OrderId,
                PaymentStatus,
            } = req.query;

            if (req.user?.companyId) companyId = req.user.companyId;

            if (!mongoose.isValidObjectId(companyId)) {
                return res.status(400).json({
                    message: 'Not found proper data of Company',
                    success: false,
                });
            }

            const allowedPaymentStatus = ['INITIATED', 'SUCCESS', 'FAILED', 'PENDING', 'EXPIRED'];
            const allowedStatus = ['INITIATED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

            if (PaymentStatus && !allowedPaymentStatus.includes(PaymentStatus)) {
                return res.status(400).json({
                    message: `Invalid PaymentStatus. Allowed: ${allowedPaymentStatus.join(', ')}`,
                    success: false,
                });
            }

            if (Status && !allowedStatus.includes(Status)) {
                return res.status(400).json({
                    message: `Invalid Status. Allowed: ${allowedStatus.join(', ')}`,
                    success: false,
                });
            }

            if (UserId && !mongoose.isValidObjectId(UserId)) {
                return res.status(400).json({ message: 'Provide a valid User Id', success: false });
            }

            if (OrderId && !mongoose.isValidObjectId(OrderId)) {
                return res.status(400).json({ message: 'Provide a valid Order Id', success: false });
            }

            if (ServiceOrderId && !mongoose.isValidObjectId(ServiceOrderId)) {
                return res.status(400).json({ message: 'Provide a valid Service Order Id', success: false });
            }

            if (AppointmentId && !mongoose.isValidObjectId(AppointmentId)) {
                return res.status(400).json({ message: 'Provide a valid Appointment Id', success: false });
            }

            let matchCondition = {
                companyId: new mongoose.Types.ObjectId(String(companyId)),
            };

            if (UserId) {
                matchCondition.UserId = new mongoose.Types.ObjectId(String(UserId));
            }

            if (OrderId) {
                matchCondition._id = new mongoose.Types.ObjectId(String(OrderId));
            }

            if (StartDate || EndDate) {
                matchCondition.createdAt = {};
                if (StartDate) matchCondition.createdAt.$gte = new Date(StartDate);
                if (EndDate) matchCondition.createdAt.$lte = new Date(EndDate);
            }

            if (PaymentStatus) {
                matchCondition['PaymentSession.status'] = PaymentStatus;
            }

            if (AppointmentId || ServiceOrderId) {
                const elemMatch = {};
                if (AppointmentId) {
                    elemMatch['ServiceData.AppointmentInfo.AppointmentId'] =
                        new mongoose.Types.ObjectId(String(AppointmentId));
                }
                if (ServiceOrderId) {
                    elemMatch['_id'] = new mongoose.Types.ObjectId(String(ServiceOrderId));
                }
                matchCondition.Services = { $elemMatch: elemMatch };
            }

            let Orders = await ServiceOrder.find(matchCondition).sort({ createdAt: -1 });

            if (!Orders.length) {
                return res.status(404).json({ message: 'No service orders found', success: false });
            }

            let FilteredOrders = Orders.map(order => {
                let services = order.Services || [];

                services = services.filter(s => s.IsActive !== false);

                if (Status) {
                    services = services.filter(s => {
                        const lastStatus = s.OrderStatus?.[s.OrderStatus.length - 1]?.Status;
                        return lastStatus === Status;
                    });
                }

                if (ServiceOrderId) {
                    services = services.filter(s =>
                        s._id.equals(new mongoose.Types.ObjectId(String(ServiceOrderId)))
                    );
                }

                if (AppointmentId) {
                    services = services.filter(s =>
                        s.ServiceData?.AppointmentInfo?.AppointmentId?.equals(
                            new mongoose.Types.ObjectId(String(AppointmentId))
                        )
                    );
                }

                return { ...order.toObject(), Services: services };
            });

            FilteredOrders = FilteredOrders.filter(o => o.Services.length > 0);

            if (!FilteredOrders.length) {
                return res.status(404).json({
                    message: 'No service orders found matching the given filters',
                    success: false,
                });
            }

            if (SortOrder === 'older') {
                FilteredOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            } else if (SortOrder === 'newer') {
                FilteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            return res.status(200).json({
                message: 'Service orders fetched',
                data: FilteredOrders,
                success: true,
            });

        } catch (error) {
            console.error('getAllServiceOrdersError:', error.message);
            return res.status(500).json({
                message: 'Internal Server Error',
                error: error.message,
                success: false,
            });
        }
    },
};