const { serviceProductCartModel } = require('./ServiceProductCart.model');
const { ServiceAppointmentModel } = require('../ServiceAppointment/ServiceAppointment.model')
const { serviceProductsModel } = require('../ServiceProducts/ServiceProducts.model')
const { ObjectId } = require('mongodb');
const path = require('path')
const fs = require('fs');
const CompanyModel = require('../../CompanyBase/Company/Company.model')
const mongoose = require('mongoose');
const PaytmChecksum = require("paytmchecksum");
const https = require("https");
const crypto = require('crypto');
module.exports = {
    addServiceToCart: async (req, res) => {
        let {
            UserId,
            companyId,
            ServiceProductId,
            ProviderId,
            AppointmentId,
            Parts = [],
            Operation
        } = req.body;

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        try {
            if (!UserId || !companyId)
                return res.status(400).json({ message: "User or Company missing", success: false });

            let FoundCart = await serviceProductCartModel.findOne({ UserId, companyId });
            if (!FoundCart) {
                FoundCart = new serviceProductCartModel({ UserId, companyId, Services: [] });
            }

            let existingIndex = FoundCart.Services.findIndex(
                s =>
                    s.ServiceProductId.toString() === ServiceProductId.toString() &&
                    s.AppointmentId.toString() === AppointmentId.toString()
            );

            let FoundService = await serviceProductsModel.findOne({
                _id: ServiceProductId,
                companyId,
                isActive: true
            });

            if (!FoundService)
                return res.status(404).json({ message: "Service not found", success: false });

            let calculateService = (service, parts) => {
                let base = service.service_base_price || 0;

                let partsTotal = parts.reduce(
                    (sum, p) => sum + (p.partPrice || 0),
                    0
                );

                let discount = 0;
                if (service.offerPercentage > 0) {
                    discount = (base * service.offerPercentage) / 100;
                }

                let total = base + partsTotal;

                let final = (base - discount) + partsTotal;

                return { total, discount, final, partsTotal };
            };

            if (Operation === "add") {
                let appointmentDoc = await ServiceAppointmentModel.findOne({
                    companyId,
                    ServiceProviderId: ProviderId,
                    ServiceProductId,
                    isActive: true,
                    "schedule.appointments._id": AppointmentId
                });

                if (!appointmentDoc) {
                    return res.status(404).json({
                        message: "Appointment not found",
                        success: false
                    });
                }

                let foundSlot = null;

                for (let sch of appointmentDoc.schedule) {
                    let slot = sch.appointments.find(
                        a => a._id.toString() === AppointmentId.toString()
                    );
                    if (slot) {
                        foundSlot = slot;
                        break;
                    }
                }

                if (!foundSlot) {
                    return res.status(404).json({
                        message: "Slot not found",
                        success: false
                    });
                }

                if (foundSlot.booked === true) {
                    return res.status(400).json({
                        message: "Slot already booked",
                        success: false
                    });
                }
                if (existingIndex !== -1) {
                    FoundCart.Services.splice(existingIndex, 1);
                }

                let { total, discount, final, partsTotal } =
                    calculateService(FoundService, Parts);

                FoundCart.Services.push({
                    ServiceProductId,
                    ProviderId,
                    AppointmentId,
                    Parts,
                    PartsTotal: partsTotal,
                    TotalPrice: total,
                    DiscountPrice: discount,
                    FinalPrice: final,
                    IsActive: true
                });

            }

            else if (Operation === "update") {

                if (existingIndex === -1)
                    return res.status(404).json({ message: "Service not in cart", success: false });

                let item = FoundCart.Services[existingIndex];

                let { total, discount, final, partsTotal } =
                    calculateService(FoundService, Parts || item.Parts);

                item.Parts = Parts || item.Parts;
                item.PartsTotal = partsTotal;
                item.TotalPrice = total;
                item.DiscountPrice = discount;
                item.FinalPrice = final;

                FoundCart.Services[existingIndex] = item;
            }

            else if (Operation === "remove") {

                if (existingIndex === -1)
                    return res.status(404).json({ message: "Service not found", success: false });

                FoundCart.Services.splice(existingIndex, 1);
            }

            else {
                return res.status(400).json({ message: "Invalid operation", success: false });
            }

            let total = 0, discount = 0, final = 0;

            for (let s of FoundCart.Services) {
                if (s.IsActive !== false) {
                    total += s.TotalPrice || 0;
                    discount += s.DiscountPrice || 0;
                    final += s.FinalPrice || 0;
                }
            }

            FoundCart.TotalCartPrice = total;
            FoundCart.DiscountCartPrice = discount;
            FoundCart.FinalCartPrice = final;

            let saved = await FoundCart.save();

            await module.exports.validateServiceCart({ body: { UserId, companyId } });

            return res.status(200).json({
                message: "Service cart updated",
                success: true,
                data: saved
            });

        } catch (err) {
            console.error("ServiceCart Error:", err);
            return res.status(500).json({
                message: "Internal error",
                error: err.message,
                success: false
            });
        }
    },
    validateServiceCart: async ({ body }) => {
        let { UserId, companyId } = body;

        let FoundCart = await serviceProductCartModel.findOne({ UserId, companyId });
        if (!FoundCart) return;

        let updated = [];

        for (let item of FoundCart.Services) {

            let service = await serviceProductsModel.findOne({
                _id: item.ServiceProductId,
                companyId,
                isActive: true
            });

            if (!service) continue;

            let base = service.service_base_price || 0;

            let validParts = service.service_parts || [];
            let cleanedParts = [];

            for (let cartPart of item.Parts || []) {
                let match = validParts.find(p => p.partName === cartPart.partName);

                if (match) {
                    cleanedParts.push({
                        partName: match.partName,
                        partPrice: match.partPrice,
                        selected: cartPart.selected
                    });
                }
            }

            item.Parts = cleanedParts;

            let partsTotal = cleanedParts
                .filter(p => p.selected)
                .reduce((sum, p) => sum + (p.partPrice || 0), 0);

            let discount = 0;
            if (service.offerPercentage > 0) {
                discount = (base * service.offerPercentage) / 100;
            }

            let total = base + partsTotal;
            let final = (base - discount) + partsTotal;

            item.TotalPrice = total;
            item.DiscountPrice = discount;
            item.FinalPrice = final;
            item.PartsTotal = partsTotal;

            updated.push(item);
        }

        FoundCart.Services = updated;

        FoundCart.TotalCartPrice = updated.reduce((s, i) => s + (i.TotalPrice || 0), 0);
        FoundCart.DiscountCartPrice = updated.reduce((s, i) => s + (i.DiscountPrice || 0), 0);
        FoundCart.FinalCartPrice = updated.reduce((s, i) => s + (i.FinalPrice || 0), 0);

        await FoundCart.save();
    },
    proceedToPaymentForServiceCart: async (req, res) => {
        let { UserId, companyId } = req.body;
        let { RenderingDomain = "public" } = req.query;

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        RenderingDomain = ["private", "public"].includes(RenderingDomain?.toLowerCase())
            ? RenderingDomain.toLowerCase()
            : "public";

        let rollback = { orderId: null, appointmentUpdates: [], ReservedUpdated: [] };

        const RollBackFunction = async () => {
            try {
                for (let item of rollback.appointmentUpdates) {
                    await ServiceAppointmentModel.updateOne(
                        { "schedule.appointments._id": item.appointmentId },
                        {
                            $set: {
                                "schedule.$[].appointments.$[elem].booked": false
                            }
                        },
                        { arrayFilters: [{ "elem._id": item.appointmentId }] }
                    );
                }

                for (let item of rollback.ReservedUpdated) {
                    await serviceProductCartModel.updateOne(
                        { UserId, companyId, "Services._id": item._id },
                        { $set: { "Services.$.Reserved": item.Reserved } }
                    );
                }

                if (rollback.orderId) {
                    await ServiceOrder.findByIdAndDelete(rollback.orderId);
                }

            } catch (err) {
                console.error("Rollback error:", err.message);
            }
        };

        try {
            await module.exports.validateServiceCart({ body: { UserId, companyId } });

            let cart = await serviceProductCartModel.findOne({ UserId, companyId });
            if (!cart || !cart.Services.length)
                return res.status(400).json({ message: "Cart empty", success: false });

            let OrderData = {
                UserId,
                companyId,
                CartId: cart._id,
                Services: [],
                ReservationStartedAt: new Date()
            };

            for (let item of cart.Services) {

                if (item.IsActive === false || item.Reserved === true) continue;

                let appointment = await ServiceAppointmentModel.findOne({
                    "schedule.appointments._id": item.AppointmentId,
                    companyId,
                    isActive: true
                });

                if (!appointment) {
                    await RollBackFunction();
                    return res.status(400).json({ message: "Appointment not found", success: false });
                }

                let slot = null;

                for (let sch of appointment.schedule) {
                    for (let a of sch.appointments) {
                        if (a._id.toString() === item.AppointmentId.toString()) {
                            slot = a;
                        }
                    }
                }

                if (!slot || slot.booked === true) {
                    await RollBackFunction();
                    return res.status(400).json({ message: "Slot already booked", success: false });
                }

                OrderData.Services.push({
                    CartServiceId: item._id,
                    ServiceProductId: item.ServiceProductId,
                    ProviderId: item.ProviderId,
                    AppointmentId: item.AppointmentId,
                    Parts: item.Parts,
                    TotalPrice: item.TotalPrice,
                    DiscountPrice: item.DiscountPrice,
                    FinalPrice: item.FinalPrice
                });
            }

            if (!OrderData.Services.length)
                return res.status(400).json({ message: "No valid services", success: false });

            OrderData.TotalCartPrice = OrderData.Services.reduce((s, i) => s + (i.TotalPrice || 0), 0);
            OrderData.DiscountCartPrice = OrderData.Services.reduce((s, i) => s + (i.DiscountPrice || 0), 0);
            OrderData.FinalCartPrice = OrderData.Services.reduce((s, i) => s + (i.FinalPrice || 0), 0);

            let savedOrder = await new ServiceOrder(OrderData).save();
            rollback.orderId = savedOrder._id;

            for (let item of OrderData.Services) {
                await ServiceAppointmentModel.updateOne(
                    {
                        "schedule.appointments._id": item.AppointmentId,
                    },
                    {
                        $set: {
                            "schedule.$[].appointments.$[elem].booked": true
                        }
                    },
                    {
                        arrayFilters: [{ "elem._id": item.AppointmentId }]
                    }
                );

                rollback.appointmentUpdates.push({ appointmentId: item.AppointmentId });
            }

            for (let s of OrderData.Services) {
                let found = cart.Services.find(c => c._id.toString() === s.CartServiceId.toString());
                if (found) {
                    rollback.ReservedUpdated.push({ _id: found._id, Reserved: found.Reserved });
                    found.Reserved = true;
                }
            }

            await cart.save();

            let orderId = `SVC_${savedOrder._id.toString().slice(-6)}_${Date.now()}`;
            let totalAmount = OrderData.FinalCartPrice;

            let paytmParams = {
                body: {
                    requestType: "Payment",
                    mid: process.env.PAYTM_MID,
                    websiteName: process.env.PAYTM_WEBSITE,
                    orderId,
                    callbackUrl: `${process.env.BASE_URL}servicecart/handlePaymentStatus?RenderingDomain=${RenderingDomain}&companyId=${companyId}`,
                    txnAmount: { value: totalAmount.toString(), currency: "INR" },
                    userInfo: { custId: UserId.toString() }
                }
            };

            let checksum = await PaytmChecksum.generateSignature(
                JSON.stringify(paytmParams.body),
                process.env.PAYTM_KEY
            );

            paytmParams.head = { signature: checksum };

            let post_data = JSON.stringify(paytmParams);

            let options = {
                hostname: process.env.PAYTM_HOSTNAME,
                port: 443,
                path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(post_data)
                }
            };

            let paytmResponse = await new Promise((resolve, reject) => {
                let response = "";
                let reqPaytm = https.request(options, (resPaytm) => {
                    resPaytm.on("data", chunk => response += chunk);
                    resPaytm.on("end", () => resolve(JSON.parse(response)));
                });
                reqPaytm.on("error", reject);
                reqPaytm.write(post_data);
                reqPaytm.end();
            });

            if (!paytmResponse?.body?.txnToken) {
                await RollBackFunction();
                return res.status(500).json({ message: "No txnToken", success: false });
            }

            savedOrder.PaymentSession = {
                orderId,
                txnId: null,
                status: "INITIATED",
                amount: totalAmount,
                paymentGateway: "Paytm"
            };

            await savedOrder.save();

            return res.status(200).json({
                success: true,
                message: "Payment Initiated",
                url: `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                txnToken: paytmResponse.body.txnToken,
                orderId,
                amount: totalAmount
            });

        } catch (err) {
            console.error("Service Payment Error:", err);
            await RollBackFunction();
            return res.status(500).json({ message: "Internal error", success: false });
        }
    },
    handleServicePaymentStatus: async (req, res) => {
        let FrontendRenderDomain;
        try {
            let paytmResponse = req.body || {};
            let orderId = paytmResponse?.ORDERID;

            let paymentInfo = {
                orderId,
                txnId: paytmResponse.TXNID,
                amount: paytmResponse.TXNAMOUNT,
                respMsg: paytmResponse.RESPMSG,
                status: paytmResponse.STATUS
            };

            let { RenderingDomain = "public", companyId } = req.query;

            RenderingDomain = ["private", "public"].includes((RenderingDomain || "").toLowerCase())
                ? RenderingDomain.toLowerCase()
                : "public";

            try {
                const FoundCompany = companyId ? await CompanyModel.findById(companyId) : null;

                if (FoundCompany) {
                    if (RenderingDomain == "private" && FoundCompany.PredifinedDomain) {
                        FrontendRenderDomain = `${FoundCompany.PredifinedDomain.replace(/\/+$/, '')}/services`;
                    } else if (FoundCompany.CompanyDomain) {
                        let companydomain = FoundCompany.CompanyDomain.trim();
                        FrontendRenderDomain = `https://${companydomain}.shop.readytechnologies.in/services`;
                    }
                }
            } catch (err) {
                console.error('Error fetching company domain:', err?.message || err);
            }

            if (!FrontendRenderDomain) {
                FrontendRenderDomain = "http://localhost:4200/services";
            }

            let verifyPaytmStatus;

            try {
                const paytmParams = {
                    body: {
                        mid: process.env.PAYTM_MID,
                        orderId: paymentInfo.orderId
                    }
                };

                const checksum = await PaytmChecksum.generateSignature(
                    JSON.stringify(paytmParams.body),
                    process.env.PAYTM_KEY
                );

                paytmParams.head = { signature: checksum };

                const post_data = JSON.stringify(paytmParams);

                const options = {
                    hostname: "securegw.paytm.in",
                    port: 443,
                    path: `/v3/order/status`,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(post_data)
                    }
                };

                verifyPaytmStatus = await new Promise((resolve, reject) => {
                    let response = "";
                    const paytmReq = https.request(options, (paytmRes) => {
                        paytmRes.on("data", chunk => response += chunk);
                        paytmRes.on("end", () => {
                            try { resolve(JSON.parse(response)); }
                            catch (e) { reject(e); }
                        });
                    });
                    paytmReq.on("error", reject);
                    paytmReq.write(post_data);
                    paytmReq.end();
                });

            } catch (err) {
                console.error('Paytm verify error:', err?.message || err);

                return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=PAYTM-VERIFY-ERROR`);
            }

            const resultStatus = verifyPaytmStatus?.body?.resultInfo?.resultStatus || "UNKNOWN";

            const FoundOrder = await ServiceOrder.findOne({ "PaymentSession.orderId": orderId });

            if (!FoundOrder) {
                return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=ORDER-NOT-FOUND`);
            }


            if (resultStatus == "TXN_SUCCESS") {

                if (FoundOrder.PaymentSession?.status == 'SUCCESS') {
                    return res.redirect(`${FrontendRenderDomain}/order-checked?orderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=SUCCESS&serviceorderid=${FoundOrder._id}`);
                }


                FoundOrder.PaymentSession = FoundOrder.PaymentSession || {};
                FoundOrder.PaymentSession.status = "SUCCESS";
                FoundOrder.PaymentSession.txnId = paymentInfo.txnId;
                FoundOrder.PaymentSession.amount = paymentInfo.amount;

                await FoundOrder.save();

                return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=SUCCESS&serviceorderid=${FoundOrder._id}`);
            }


            if (resultStatus == "TXN_FAILURE" || resultStatus == "FAILURE") {

                if (FoundOrder.PaymentSession?.status == 'FAILED') {
                    return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=FAILED&serviceorderid=${FoundOrder._id}`);
                }

                try {
                    for (let item of (FoundOrder.Services || [])) {
                        await ServiceAppointmentModel.updateOne(
                            { "schedule.appointments._id": item.AppointmentId },
                            {
                                $set: {
                                    "schedule.$[].appointments.$[elem].booked": false
                                }
                            },
                            {
                                arrayFilters: [{ "elem._id": item.AppointmentId }]
                            }
                        );
                    }
                } catch (err) {
                    console.error('Rollback appointment error:', err?.message || err);
                }

                FoundOrder.PaymentSession = FoundOrder.PaymentSession || {};
                FoundOrder.PaymentSession.status = "FAILED";
                FoundOrder.PaymentSession.txnId = paymentInfo.txnId || FoundOrder.PaymentSession.txnId;
                FoundOrder.PaymentSession.amount = paymentInfo.amount || FoundOrder.PaymentSession.amount;

                await FoundOrder.save();

                const resultMsg = (verifyPaytmStatus?.body?.resultInfo?.resultMsg || "").toLowerCase();
                const respMsg = (paymentInfo?.respMsg || "").toLowerCase();

                const isCancelled =
                    resultMsg.includes("cancelled") ||
                    respMsg.includes("user has not completed transaction");

                if (isCancelled) {
                    return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=CANCELLED&serviceorderid=${FoundOrder._id}`);
                }

                return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=FAILED&serviceorderid=${FoundOrder._id}`);
            }

            return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || "")}&status=${encodeURIComponent(resultStatus)}&serviceorderid=${FoundOrder._id}`);

        } catch (err) {
            console.error("handleServicePaymentStatus Error:", err);

            const paytmorderId = (req.body && req.body.ORDERID)
                ? encodeURIComponent(req.body.ORDERID)
                : "";

            if (FrontendRenderDomain) {
                return res.redirect(`${FrontendRenderDomain}/order-checked?paytmorderId=${paytmorderId}&status=INTERNAL-SERVER-ERROR`);
            }

            const fallbackDomain = "http://localhost:4200/services";

            return res.redirect(`${fallbackDomain}/order-checked?paytmorderId=${paytmorderId}&status=INTERNAL-SERVER-ERROR`);
        }
    }
    // // addtocart: async (req, resp) => {
    // //     try {
    // //         let { companyId, UserId, serviceId, SelectedParts, TotalServiceParts, TotalServicePrice, SheduledTime } = req.body;
    // //         console.log("uiiu", req.body)


    // //         if (!companyId || !UserId || !serviceId) {
    // //             return resp.status(400).json({ message: "please provide all required fields", success: false })
    // //         }

    // //         let cartObject = {
    // //             serviceId,
    // //             SelectedParts
    // //         }
    // //         let calculatedPrice = 0
    // //         if (!TotalServicePrice && !TotalServiceParts) {
    // //             return resp.status(400).json({ message: "please provide Service Price or Service Parts", success: false })
    // //         }

    // //         if (TotalServicePrice && TotalServicePrice > 0) {
    // //             cartObject.TotalServicePrice = TotalServicePrice;
    // //         }
    // //         else {
    // //             TotalServiceParts.forEach((data) => {
    // //                 if (TotalServiceParts[0].selected == true)
    // //                     calculatedPrice = calculatedPrice + parseFloat(data.partPrice)
    // //             });
    // //             cartObject.TotalServicePrice = calculatedPrice;
    // //         }
    // //         if (TotalServiceParts && TotalServiceParts.length !== 0) {
    // //             cartObject.TotalServiceParts = TotalServiceParts
    // //         }
    // //         //pri
    // //         // if (SheduledTime) {
    // //         //     cartObject.SheduledTime = SheduledTime
    // //         // }
    // //         let oldData = await serviceProductCartModel.serviceProductCartModel.findOne({ companyId: companyId, UserId: UserId })
    // //         if (oldData) {
    // //             let existingSchedule = [];
    // //             //pri
    // //             // existingSchedule.push(SheduledTime)
    // //             let serviceExists = oldData.CartServices.some(cartService => cartService.serviceId == serviceId)
    // //             let sheduleexisting = oldData.CartServices.find(eachcart => eachcart.serviceId == serviceId)
    // //             //pri
    // //             // sheduleexisting.SheduledTime.forEach((appointmentsId)=>{
    // //             //     if(!existingSchedule.some(newappointments => newappointments.appointmentId == appointmentsId.appointmentId)){
    // //             //       existingSchedule.push(appointmentsId)
    // //             //     }
    // //             // })
    // //             // if(existingSchedule){
    // //             // cartObject.SheduledTime = existingSchedule
    // //             // }
    // //             if (serviceExists) {
    // //                 let updateservice = await serviceProductCartModel.serviceProductCartModel.findOneAndUpdate(
    // //                     { companyId: companyId, UserId: UserId },
    // //                     { $pull: { CartServices: { serviceId: serviceId } } },
    // //                     { new: true }
    // //                 )
    // //                 if (updateservice) {
    // //                     let addservice = await serviceProductCartModel.serviceProductCartModel.findOneAndUpdate(
    // //                         { companyId: companyId, UserId: UserId },
    // //                         { $addToSet: { CartServices: cartObject } },
    // //                         { new: true }
    // //                     )
    // //                     if (!addservice) {
    // //                         return resp.status(400).json({ message: "sevice not added to cart", success: false })
    // //                     }
    // //                     return resp.status(200).json({ message: "service added to cart", data: addservice, success: true })

    // //                 }
    // //             }
    // //             else {
    // //                 let addservice = await serviceProductCartModel.serviceProductCartModel.findOneAndUpdate(
    // //                     { companyId: companyId, UserId: UserId },
    // //                     { $addToSet: { CartServices: cartObject } },
    // //                     { new: true }
    // //                 )
    // //                 if (!addservice) {
    // //                     return resp.status(400).json({ message: "sevice not added to cart", success: false })
    // //                 }
    // //                 return resp.status(200).json({ message: "service added to cart", data: addservice, success: true })

    // //             }


    // //         }
    // //         else {
    // //             let result = new serviceProductCartModel.serviceProductCartModel({ companyId, UserId, CartServices: [cartObject] })
    // //             result = await result.save();
    // //             if (!result) {
    // //                 return resp.status(400).json({ message: "sevice not added to cart", success: false })
    // //             }
    // //             return resp.status(200).json({ message: "service added to cart", data: result, success: true })
    // //         }


    // //     } catch (error) {
    // //         return resp.status(400).json({ message: "something went wrong", error: error.message, success: false })
    // //     }
    // // },
    // // updateCartServiceParts: async (req, resp) => {
    // //     console.log("xxxxxxxxxxxxxxx", req.body)
    // //     try {
    // //         let { serviceId, UserId, TotalServiceParts } = req.body;
    // //         let companyId = req.query.companyId;
    // //         let operation = req.query.operation;
    // //         console.log("xxxxxxxxxxxxxxx", req.query.operation)
    // //         if (!serviceId || !companyId || !UserId || !TotalServiceParts) {
    // //             return resp.status(400).json({ message: "please provide all required fields", success: false })
    // //         }
    // //         else {
    // //             let result = await serviceProductCartModel.serviceProductCartModel.findOne({
    // //                 companyId, UserId,
    // //                 CartServices: { $elemMatch: { serviceId: serviceId } }
    // //             })
    // //             if (!result) {
    // //                 return resp.status(400).json({ message: "service or user not found", success: false })
    // //             }
    // //             if (operation == "add") {
    // //                 let serviceIndex = result.CartServices.findIndex(s => s.serviceId == serviceId)
    // //                 let existingParts = result.CartServices[serviceIndex].TotalServiceParts || [];

    // //                 let newParts = TotalServiceParts.filter(newPart =>
    // //                     !existingParts.some(existingPart => existingPart.partName === newPart.partName)
    // //                 );
    // //                 if (newParts.length === 0) {
    // //                     return resp.status(400).json({ message: "not new data to add", success: false })
    // //                 }
    // //                 let updatedResult = await serviceProductCartModel.serviceProductCartModel.updateOne(
    // //                     { companyId, UserId, "CartServices.serviceId": serviceId },
    // //                     { $push: { "CartServices.$.TotalServiceParts": { $each: newParts } } },
    // //                     { new: true }
    // //                 )
    // //                 if (updatedResult) {
    // //                     let calculatedPrice = null;

    // //                     let findData = await serviceProductCartModel.serviceProductCartModel.findOne({
    // //                         companyId, UserId,
    // //                         CartServices: { $elemMatch: { serviceId: serviceId } }
    // //                     })

    // //                     if (findData) {
    // //                         let serviceIndex = findData.CartServices.findIndex(s => s.serviceId == serviceId)
    // //                         let updatedExistingPart = findData.CartServices[serviceIndex].TotalServiceParts || [];
    // //                         updatedExistingPart.forEach((data) => {
    // //                             if (data.partPrice) {
    // //                                 calculatedPrice = calculatedPrice + parseFloat(data.partPrice)
    // //                             }
    // //                         });
    // //                     }
    // //                     if (calculatedPrice) {
    // //                         let updatePrice = await serviceProductCartModel.serviceProductCartModel.updateOne(
    // //                             { companyId, UserId, "CartServices.serviceId": serviceId },
    // //                             { $set: { "CartServices.$.TotalServicePrice": calculatedPrice } },
    // //                             { new: true }
    // //                         )
    // //                     }
    // //                 }

    // //                 if (!updatedResult) {
    // //                     return resp.status(400).json({ message: "something went wrong", success: false })

    // //                 }
    // //                 return resp.status(200).json({ message: "part added succesfully", success: true, data: updatedResult })
    // //             }
    // //             else if (operation == "delete") {
    // //                 let deltedResult = await serviceProductCartModel.serviceProductCartModel.updateOne(
    // //                     { companyId, UserId, "CartServices.serviceId": serviceId },
    // //                     { $pull: { "CartServices.$.TotalServiceParts": { partName: { $in: TotalServiceParts.map(p => p.partName) } } } },
    // //                     { new: true }
    // //                 )
    // //                 if (deltedResult) {
    // //                     let calculatedPrice = 0;

    // //                     let findData = await serviceProductCartModel.serviceProductCartModel.findOne({
    // //                         companyId, UserId,
    // //                         CartServices: { $elemMatch: { serviceId: serviceId } }
    // //                     })

    // //                     if (findData) {
    // //                         let serviceIndex = findData.CartServices.findIndex(s => s.serviceId == serviceId)
    // //                         let updatedExistingPart = findData.CartServices[serviceIndex].TotalServiceParts || [];
    // //                         updatedExistingPart.forEach((data) => {
    // //                             if (data.partPrice) {
    // //                                 calculatedPrice = calculatedPrice + parseFloat(data.partPrice)
    // //                             }
    // //                         });
    // //                     }
    // //                     if (calculatedPrice != null) {
    // //                         let updatePrice = await serviceProductCartModel.serviceProductCartModel.updateOne(
    // //                             { companyId, UserId, "CartServices.serviceId": serviceId },
    // //                             { $set: { "CartServices.$.TotalServicePrice": calculatedPrice } },
    // //                             { new: true }
    // //                         )
    // //                     }
    // //                 }

    // //                 if (!deltedResult) {
    // //                     return resp.status(400).json({ message: "something went wrong", success: false })

    // //                 }
    // //                 return resp.status(200).json({ message: "part deleted succesfully", success: true, data: deltedResult })
    // //             }
    // //         }
    // //     } catch (error) {
    // //         return resp.status(400).json({ message: "something went wrong", success: false, error: error.message })
    // //     }
    // // },
    // deletetocart: async (req, resp) => {
    //     console.log("^^^^^^^", req.body)
    //     try {
    //         let { UserId, serviceId } = req.body;
    //         let companyId = req.query.companyId;
    //         if (!companyId || !UserId || !serviceId) {
    //             return resp.status(400).json({ message: "please provide proper data", success: false })

    //         }
    //         let result = await serviceProductCartModel.serviceProductCartModel.findOne({
    //             companyId, UserId,
    //             CartServices: { $elemMatch: { serviceId: serviceId } }
    //         })
    //         if (!result) {
    //             return resp.status(400).json({ message: "service or user not found", success: false })
    //         }
    //         let updateservice = await serviceProductCartModel.serviceProductCartModel.findOneAndUpdate(
    //             { companyId: companyId, UserId: UserId, CartServices: { $elemMatch: { serviceId: serviceId } } },
    //             { $pull: { CartServices: { serviceId: serviceId } } },
    //             { new: true }
    //         )
    //         if (!updateservice) {
    //             return resp.status(400).json({ message: "sevice not deleted from cart", success: false })

    //         }
    //         return resp.status(200).json({ message: "service deleted succesfully", success: true, data: updateservice })


    //     } catch (error) {
    //         return resp.status(400).json({ message: "something went wrong", success: false, error: error.message })

    //     }
    // },
    // getServiceCartData: async (matchCondition) => {
    //     return await serviceProductCartModel.serviceProductCartModel.aggregate([
    //         {
    //             $match: matchCondition
    //         },
    //         {
    //             $lookup: {
    //                 from: "users",
    //                 localField: "UserId",
    //                 foreignField: "_id",
    //                 as: "UserInfo"
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "serviceproducts",
    //                 localField: "CartServices.serviceId",
    //                 foreignField: "_id",
    //                 as: "ServiceInfo"
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "serviceappointments",
    //                 localField: "CartServices.SheduledTime.appointmentId",
    //                 foreignField: "schedule.appointments._id",
    //                 as: "appointmentInfo"
    //             }
    //         },

    //         {
    //             $addFields: {
    //                 CartServices: {
    //                     $map: {
    //                         input: "$CartServices",
    //                         as: "cartService",
    //                         in: {
    //                             $mergeObjects: [
    //                                 "$$cartService",
    //                                 {
    //                                     serviceDetails: {
    //                                         $arrayElemAt: [
    //                                             {
    //                                                 $filter: {
    //                                                     input: "$ServiceInfo",
    //                                                     as: "service",
    //                                                     cond: { $eq: ["$$service._id", "$$cartService.serviceId"] }
    //                                                 }
    //                                             },
    //                                             0
    //                                         ]
    //                                     },
    //                                 }
    //                             ]
    //                         }
    //                     }
    //                 }
    //             }
    //         },
    //         {
    //             $addFields: {
    //                 CartServices: {
    //                     $map: {
    //                         input: "$CartServices",
    //                         as: "cartService",
    //                         in: {
    //                             $mergeObjects: [
    //                                 "$$cartService",
    //                                 {
    //                                     appointmentMatches: {
    //                                         $map: {
    //                                             input: "$$cartService.SheduledTime",
    //                                             as: "sheduledTime",
    //                                             in: {
    //                                                 $let: {
    //                                                     vars: {
    //                                                         flattenedAppointments: {
    //                                                             $reduce: {
    //                                                                 input: "$appointmentInfo",
    //                                                                 initialValue: [],
    //                                                                 in: {
    //                                                                     $concatArrays: [
    //                                                                         "$$value",
    //                                                                         {
    //                                                                             $map: {
    //                                                                                 input: "$$this.schedule",
    //                                                                                 as: "schedule",
    //                                                                                 in: "$$schedule.appointments"
    //                                                                             }
    //                                                                         }
    //                                                                     ]
    //                                                                 }
    //                                                             }
    //                                                         }
    //                                                     },
    //                                                     in: {

    //                                                         // matchedAppointment: {
    //                                                         $arrayElemAt: [
    //                                                             {
    //                                                                 $filter: {
    //                                                                     input: {
    //                                                                         $reduce: {
    //                                                                             input: "$$flattenedAppointments",
    //                                                                             initialValue: [],
    //                                                                             in: { $concatArrays: ["$$value", "$$this"] }
    //                                                                         }
    //                                                                     },
    //                                                                     as: "appointment",
    //                                                                     cond: {
    //                                                                         $and: [
    //                                                                             { $eq: ["$$appointment._id", "$$sheduledTime.appointmentId"] },
    //                                                                         ]
    //                                                                     }
    //                                                                 }
    //                                                             },
    //                                                             0
    //                                                         ]
    //                                                         // }
    //                                                     }
    //                                                 }
    //                                             }
    //                                         }
    //                                     }
    //                                 }
    //                             ]
    //                         }
    //                     }
    //                 }
    //             }
    //         },
    //         {
    //             $project: {
    //                 appointmentInfo: 0
    //             }
    //         }
    //     ]);
    // },
    // gettocart: async (req, res) => {
    //     let { companyId, UserId, serviceId } = req.query;

    //     try {
    //         if (!companyId || !UserId) {
    //             return res.status(400).json({ message: "please provide company id and user id", success: false })
    //         }
    //         let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

    //         if (UserId) {
    //             if (!mongoose.Types.ObjectId.isValid(UserId)) {
    //                 return res.status(400).json({ message: 'Invalid ID format', success: false });
    //             }
    //             matchCondition.UserId = mongoose.Types.ObjectId.createFromHexString(UserId);
    //         }
    //         if (serviceId) {
    //             if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    //                 return res.status(400).json({ message: 'Invalid ID format', success: false });
    //             }
    //             matchCondition["CartServices.serviceId"] = mongoose.Types.ObjectId.createFromHexString(serviceId);
    //         }

    //         const data = await module.exports.getServiceCartData(matchCondition);

    //         if (data.length === 0) {
    //             return res.status(404).json({ message: 'No Services Found', success: false });
    //         }

    //         // console.log('result of populated data', data);
    //         return res.status(200).json({ data: data, success: true });

    //     } catch (error) {
    //         return res.status(404).json({ message: 'Something went wrong', success: false, error: error.message });
    //     }
    // }
}