const superagent = require("superagent");
const xml2json = require("xml2json");
const user_model = require("../user/user.model");
const moment = require("moment");
const bankCodes_model = require("./bankCodes.model");
const payment_model = require("./payment.model");
const shortid = require("shortid");
const transaction_model = require("./transaction.model");
const consultancy_model = require("../liveconsultancy/liveconsultancy.model");
const appointment_model = require("../appointment/appointment.model");
const diagnostic_model = require("../diagnostic/diagnostic.model");
const nursing_model = require("../nursing/nursing.model");
const home_appointment_model = require("../homeappointment/home.appointment.model");
const pharmacy_model = require("../pharmacy/pharmacy.model");
const user_model2 = require("../user/user.model");
const utility = require("../../util/utility");
const { offerrecord } = require("../offernew/offernew.model");
const crypto = require("crypto");
const Handlebars = require("handlebars");
const path = require("path");
const fs = require("fs-extra");
const { cartSchema } = require("../pharmacist/pharmacist.model");
const { sendNotification } = require("../pushnotifications/push.controller");
const mongoose = require("mongoose");
const admin_model = require("../admin/admin.model");
const notification_model = require("../notification/notification.model");
const { sendEmailToPatient, appointmentBookSendEmail } = require("../../util/utility");
const { packagerecords } = require("../package/package.model");
const { sendMessage } = require("../../socket");
const moment_timezone = require("moment-timezone");
const axios = require("axios");
const { saveUserlog } = require("../user/user.controller");

// Bank funcs
exports.paymentLogin = async (req, res) => {
    console.log("REQ.QUERY", JSON.stringify(req.query));
    if (!req.query.amt || req.query.userid || !req.query.orderId || !req.query.transactionType) {
        res.status(400).send({
            success: false,
            msg: "Enter All Details.",
        });
    }
    console.log("----------req.user---------------------------------------------", req.user);
    if (req.query.userId != req.user._id) {
        res.status(400).send({
            success: false,
            msg: "User Id does not match.",
        });
    } else {
        console.log("gyjutluiyhuDJASfcasfcw--------");
        user_model.findOne({ _id: req.query.userId }, async (err, data) => {
            console.log("-------user data--------", data);
            console.log("error------------", err);
            if (err) {
                res.status(500).send({
                    success: false,
                    data: err,
                });
            }
            if (data && data._id) {
                const startingDay = moment(new Date()).tz("Asia/Kolkata").format("MM/DD/YYYY");
                const dateObj = moment(new Date()).tz("Asia/Kolkata").format("YYYY-MM-DD");
                const login = "62021";
                const prodid = "SCANDEN";
                const pass = "SCANDEN@123";
                const transid = shortid.generate();
                const idBase = Buffer.from(data.phone).toString("base64");
                const key = "ca449a91c50d923f24";
                const sign = login + pass + "NBFundTransfer" + prodid + transid + req.query.amt + "INR";
                console.log(sign, "<----sign");
                function sig(sign, key) {
                    return crypto.createHmac("sha512", key).update(Buffer.from(sign, "utf-8")).digest("hex");
                }
                const signature = sig(sign, key);
                console.log("siganture in login", signature);
                const paymentData = {};
                paymentData.mer_txn = transid;
                paymentData.user = req.query.userId;
                paymentData.bankId = req.query.bankId;
                paymentData.orderId = req.query.orderId;
                paymentData.transactionType = req.query.transactionType;
                paymentData.customerAccount = req.query.custacc;
                paymentData.dateObj = dateObj;
                paymentData.amount = req.query.amt;
                const payData = new payment_model(paymentData);
                payData.save((err, data1) => {
                    console.log(err, "payment data", data1);
                });
                console.log("CHECK data************", data);
                const options = {
                    host: "https://payment.atomtech.in",
                    path: "/paynetz/epi/fts?login=" + login + "&pass=" + pass + "&ttype=NBFundTransfer&prodid=" + prodid + "&amt=" + req.query.amt + "&txncurr=INR&txnscamt=0&clientcode=" + encodeURIComponent(idBase) + "&txnid=" + transid + "&date=" + startingDay + "&custacc=" + req.query.custacc + "&udf1=" + data.fname + " " + data.lname + "&udf2=" + data.email + "&udf3=" + data.phone + "&ru=https://paymentapi.familycarehospitals.com/api/v1/payment/redirect&signature=" + signature,
                    method: "POST",
                };
                const url = options["host"] + options["path"];
                console.log("ggggggggggggggggg", url);
                res.status(200).send({
                    success: true,
                    url: url,
                    paymentId: payData._id,
                });
            } else {
                res.status(417).send({
                    success: false,
                    data: "User not found.",
                });
            }
        });
    }
};

exports.paymentLoginPack = async (req, res) => {
    console.log("REQ.QUERY", JSON.stringify(req.query));
    if (!req.query.amt || req.query.userid || !req.query.orderId || !req.query.transactionType) {
        res.status(400).send({
            success: false,
            msg: "Enter All Details.",
        });
    }
    console.log("----------req.user---------------------------------------------", req.user);
    if (req.query.userId != req.user._id) {
        res.status(400).send({
            success: false,
            msg: "User Id does not match.",
        });
    } else {
        console.log("gyjutluiyhuDJASfcasfcw--------");
        user_model.findOne({ _id: req.query.userId }, async (err, data) => {
            console.log("-------user data--------", data);
            console.log("error------------", err);
            if (err) {
                res.status(500).send({
                    success: false,
                    data: err,
                });
            }
            if (data && data._id) {
                const startingDay = moment(new Date()).tz("Asia/Kolkata").format("MM/DD/YYYY");
                const dateObj = moment(new Date()).tz("Asia/Kolkata").format("YYYY-MM-DD");
                const login = "62021";
                const prodid = "SCANDEN";
                const pass = "SCANDEN@123";
                const transid = shortid.generate();
                const idBase = Buffer.from(data.phone).toString("base64");
                const key = "ca449a91c50d923f24";
                const sign = login + pass + "NBFundTransfer" + prodid + transid + req.query.amt + "INR";
                console.log(sign, "<----sign");
                function sig(sign, key) {
                    return crypto.createHmac("sha512", key).update(Buffer.from(sign, "utf-8")).digest("hex");
                }
                const signature = sig(sign, key);
                const paymentData = {};
                paymentData.mer_txn = transid;
                paymentData.user = req.query.userId;
                paymentData.bankId = req.query.bankId;
                paymentData.orderId = req.query.orderId;
                paymentData.transactionType = req.query.transactionType;
                paymentData.customerAccount = req.query.custacc;
                paymentData.dateObj = dateObj;
                paymentData.amount = req.query.amt;
                const payData = new payment_model(paymentData);
                payData.save((err, data1) => {
                    console.log(err, "payment data", data1);
                });
                const options = {
                    host: "https://payment.atomtech.in",
                    path: "/paynetz/epi/fts?login=" + login + "&pass=" + pass + "&ttype=NBFundTransfer&prodid=" + prodid + "&amt=" + req.query.amt + "&txncurr=INR&txnscamt=0&clientcode=" + encodeURIComponent(idBase) + "&txnid=" + transid + "&date=" + startingDay + "&custacc=" + req.query.custacc + "&udf1=" + req.query.name + "&udf2=" + data.email + "&udf3=" + data.phone + "&ru=https://paymentapi.familycarehospitals.com/api/v1/payment/redirectpack&signature=" + signature,
                    method: "POST",
                };
                const url = options["host"] + options["path"];
                console.log("ggggggggggggggggg", url);
                res.status(200).send({
                    success: true,
                    url: url,
                    paymentId: payData._id,
                });
            } else {
                res.status(417).send({
                    success: false,
                    data: "User not found.",
                });
            }
        });
    }
};

exports.paymentRefund = async (req, res) => {
    console.log("REQ.BODY======", req.body);
    const data = await pharmacy_model.findOne({ _id: req.query.paymentId });
    if (!data || data == undefined) {
        res.status(500).send({
            success: false,
            msg: "Payment id Not Found.",
        });
    }
    user_model.findOne({ _id: data.user }, (err, dataResp) => {
        if (err) {
            res.status(500).send({
                success: false,
                data: err,
            });
        }
        if (dataResp && dataResp._id) {
            const merchantid = "62021";
            const pass = "SCANDEN@123";
            const options = {
                host: "https://payment.atomtech.in",
                path: "/paynetz/epi/rfts?merchantid=" + merchantid + "&pass=" + pass + "&atomtxnid=" + dataResp.mer_txn + "&refundamt=" + dataResp.amount + "&txndate=" + dataResp.dateObj,
                method: "POST",
            };
            const url = options["host"] + options["path"];
            console.log("Formed new URL-----------------", url);
            res.status(200).send({
                success: false,
                url: url,
            });
        } else {
            res.status(417).send({
                success: false,
                data: "User not found.",
            });
        }
    });
};

exports.redirect = async (req, res) => {
    console.log("Payment Redirected in redirect ***********************************", JSON.stringify(req.body));
    let subject;
    let content;
    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?';
    const str = req.body.mmp_txn + req.body.mer_txn + req.body.f_code + req.body.prod + req.body.discriminator + req.body.amt + req.body.bank_txn;
    const key = "ca449a91c50d923f24";
    function sig(str, key) {
        return crypto.createHmac("sha512", key).update(Buffer.from(str, "utf-8")).digest("hex");
    }
    const sign = sig(str, key);
    console.log(str, "signature in redirect", sign);
    console.log("Response=>" + JSON.stringify(req.body));
    let status;
    const paid = await payment_model.findOne({ mer_txn: req.body.mer_txn }).lean();
    console.log("paid.amount-------------------", paid, "req.body-------------", req.body, "sign------------", sign);
    console.log(typeof req.body.amt.split(".")[0], "=======req.body.amt.split('.')[0]======", req.body.amt.split(".")[0]);
    if (req.body.f_code == "Ok") {
        status = "success";
    } else if (paid.amount.split(".")[0] !== req.body.amt.split(".")[0] || req.body.signature !== sign) {
        console.log("I AM HERE=============");
        status = "pending";
    } else if (req.body.f_code == "F") {
        status = "failed";
    }
    if (req.body.f_code == "C") {
        status = "cancelled";
    }
    const condition = {
        mmp_txn: req.body.mmp_txn,
        mer_txn: req.body.mer_txn,
        amt: req.body.amt,
        prod: req.body.prod,
        date: req.body.date,
        bank_txn: req.body.bank_txn,
        f_code: req.body.f_code,
        clientcode: req.body.clientcode,
        bank_name: req.body.bank_name,
        merchant_id: req.body.merchant_id,
        udf9: req.body.udf9,
        discriminator: req.body.discriminator,
        surcharge: req.body.surcharge,
        CardNumber: req.body.CardNumber,
        udf1: req.body.udf1,
        udf2: req.body.udf2,
        udf3: req.body.udf3,
        udf4: req.body.udf4,
        udf5: req.body.udf5,
        udf6: req.body.udf6,
        status: status,
    };
    console.log("condition in redirect", condition);
    payment_model.findOneAndUpdate({ mer_txn: req.body.mer_txn }, { $set: condition }, { new: true }, async (err, data) => {
        console.log(err, data);
        if (err) {
            const queryPrams = {
                error: err,
                tranType: data.transactionType,
                payStat: "Error"
            };
            const queryString = Object.keys(queryPrams).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`).join('&');
            res.redirect(`${redirectUrl}${queryString}`);
        }
        const newDate = new Date();
        const latestDate = moment(newDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
        if (data) {
            let transaction;
            transaction = new transaction_model({
                payment: data._id,
                TransactionId: data.mer_txn,
                transactionType: data.transactionType,
                amount: req.body.amt,
                user: data.user,
                orderId: data.orderId,
                date: latestDate,
                transactionStatus: "paid",
                status: status,
                payThrough: "bank",
                mmp_txn: data.mmp_txn,
            });
            await transaction.save();
            console.log(transaction, "<<<<<<<<<<<<<<<<transaction");
            if (req.body.f_code == "Ok" && status == "success") {
                subject = "Your Family Care " + data.transactionType + " Confirmation (" + transaction.mmp_txn + ")";
                if (data.transactionType === "newliveconsultancy") {
                    const result = await consultancy_model.liveNewConsultancySchema.findOneAndUpdate({ _id: data.orderId }, { $set: { transaction: transaction._id, valid: true, payThrough: "bank", Completed: "Completed" } }, { new: true });
                    content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + req.body.amt;
                    console.log("New live consultancy", result);
                } else if (data.transactionType === "consultancy") {
                    const result = await consultancy_model.findOneAndUpdate({ _id: data.orderId }, { $set: { transaction: transaction._id, valid: true, payThrough: "bank", payment_method: "Credit Card/Debit Card/Netbanking Payment" } }, { new: true });
                    content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + req.body.amt;
                    console.log("result>>>>>>>>>>>", result);
                } else if (data.transactionType === "pharmacy") {
                    let field = "";
                    let date = moment_timezone().format("DD-MM-YYYY");
                    let time = moment_timezone().format("h:mm a");
                    var isOrderPlaced = [];
                    isOrderPlaced.push({ status: "true", date: date, time: time });
                    console.log(isOrderPlaced, "isOrderPlacedisOrderPlaced");
                    const result = await pharmacy_model.findOneAndUpdate({ _id: data.orderId }, { $set: { transaction: transaction._id, isOrderPlace: isOrderPlaced, valid: true, payThrough: "bank", payment_method: "Credit Card/Debit Card/Netbanking Payment" } }, { new: true });
                    const userData = await user_model.findOne({ _id: result.user });
                    const cartData = await cartSchema.findOne({ _id: result.cartId });
                    console.log("cartData--------------", cartData);
                    let dispatchedAddress = {};
                    userData.address.forEach((element) => {
                        if (result.dispatched_address == element._id) {
                            dispatchedAddress = element;
                        }
                    });
                    var subject = "Your FamilyCare Pharmacy Order Placed";
                    var data12 = {
                        subject: subject,
                        result: result,
                        userData: userData,
                        cartData: cartData,
                        listMedicines: cartData.medicines,
                        dispatchedAddress: dispatchedAddress,
                    };
                    addHelpers(data12);
                    const content = compile("pharmacy_order_place", JSON.parse(JSON.stringify(data12))).then(function (response) {
                        if (response) {
                            sendEmailToPatient(userData.email, subject, "<p>" + response + "</p>", "html");
                        }
                    });
                } else if (data.transactionType === "nursing") {
                    const result = await nursing_model.findOneAndUpdate({ _id: data.orderId }, { $set: { transaction: transaction._id, valid: true, payThrough: "bank" } }, { new: true });
                    content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + req.body.amt;
                } else if (data.transactionType === "home-appointment") {
                    const result = await home_appointment_model.findOneAndUpdate({ _id: data.orderId }, { $set: { transaction: transaction._id, valid: true, payThrough: "bank" } }, { new: true });
                    content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + req.body.amt;
                    console.log("result>>>>>>>>>>>", result);
                } else if (data.transactionType === "appointment") {
                    const result = await appointment_model.findOneAndUpdate({ _id: data.orderId }, { $set: { transaction: transaction._id, valid: true, payStatus: "completed", payThrough: "bank" } }, { new: true });
                    content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + req.body.amt;
                    console.log("result>>>>>>>>>>>", result);
                } else if (data.transactionType === "diagnostic") {
                    const result = await diagnostic_model.findOneAndUpdate({ _id: data.orderId }, { $set: { transaction: transaction._id, valid: true, payThrough: "bank" } }, { new: true });
                    content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + req.body.amt;
                    console.log("result>>>>>>>>>>>", result);
                } else if (data.transactionType === "package" || data.transactionType === "package-hospital" || data.transactionType === "package-home") {
                    const result = await packagerecords.findOneAndUpdate({ _id: data.orderId }, { $set: { transaction: transaction._id, valid: true, payThrough: "bank", paystatus: "Completed", status: "Completed" } }, { new: true });
                    content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + req.body.amt;
                    console.log("result>>>>>>>>>>>", result);
                    const result1 = await packagerecords.findOne({ package_records_Id: data.orderId });
                    console.log(result, "result---------->");
                    appointmentBookSendEmail("Package Booked", "<p>" + result1.patientName + " has book package please check order.</p> \n Contact Number: " + result1.phone, "html");
                    const leadDatabody = {
                        name: result1.patientName,
                        contact: result1.phone,
                        alternateContact: "",
                        product: "fch lead",
                        email: result1.email,
                        leadSource: "fch web",
                        type: "Health Packages",
                    };
                    axios.post("https://lmsapi.dealmoneyonline.com/api/v2/fch/addFchLead", leadDatabody, { headers: { "Content-Type": "application/json" } }).then(function (response) {
                        if (response) {
                            console.log("Zoom API response--", response.data);
                            console.log(JSON.stringify(response.data));
                        }
                    });
                } else if (data.transactionType === "offernew" || data.transactionType === "offernew-home" || data.transactionType === "offernew-hospital") {
                    const result = await offerrecord.findOneAndUpdate({ _id: data.orderId }, { $set: { transaction: transaction._id, valid: true, payThrough: "bank", paystatus: "Completed", status: "Completed" } }, { new: true });
                    content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + req.body.amt;
                    console.log("result>>>>>>>>>>>", result);
                }
                const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "success"
                };
                const queryString = Object.keys(queryPrams).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`).join('&');
                res.redirect(`${redirectUrl}${queryString}`);
            } else if (status == "pending") {
                const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "pending"
                };
                const queryString = Object.keys(queryPrams).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`).join('&');
                res.redirect(`${redirectUrl}${queryString}`);
            } else {
                const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "Failed"
                };
                const queryString = Object.keys(queryPrams).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`).join('&');
                res.redirect(`${redirectUrl}${queryString}`);
            }
        } else {
            const queryPrams = {
                txnId: data.paytmTxnId,
                tranType: data.transactionType,
                payStat: "Not Found"
            };
            const queryString = Object.keys(queryPrams).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`).join('&');
            res.redirect(`${redirectUrl}${queryString}`);
        }
    });
};
exports.redirectpack = async (req, res) => {
    console.log(
        "Payment Redirected***********************************",
        JSON.stringify(req.body)
    );

    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?';
    let subject;
    let content;
    const str =
        req.body.mmp_txn +
        req.body.mer_txn +
        req.body.f_code +
        req.body.prod +
        req.body.discriminator +
        req.body.amt +
        req.body.bank_txn;
    const key = "ca449a91c50d923f24";

    function sig(str, key) {
        return crypto
            .createHmac("sha512", key)
            .update(Buffer.from(str, "utf-8"))
            .digest("hex");
    }

    const sign = sig(str, key);
    console.log(str, "signature in redirect", sign);
    console.log("Response=>" + JSON.stringify(req.body));

    let status;
    const paid = await payment_model
        .findOne({ mer_txn: req.body.mer_txn })
        .lean();

    console.log(
        "paid.amount-------------------",
        paid,
        "req.body-------------",
        req.body,
        "sign------------",
        sign
    );

    console.log(
        typeof req.body.amt.split(".")[0],
        "=======req.body.amt.split('.')[0]======",
        req.body.amt.split(".")[0]
    );

    if (req.body.f_code == "Ok") {
        status = "success";
    } else if (paid.amount !== req.body.amt || req.body.signature !== sign) {
        console.log("I AM HERE=============");
        status = "pending";
    } else if (req.body.f_code == "F") {
        status = "failed";
    }

    if (req.body.f_code == "C") {
        status = "cancelled";
    }

    const condition = {
        mmp_txn: req.body.mmp_txn,
        mer_txn: req.body.mer_txn,
        amt: req.body.amt,
        prod: req.body.prod,
        date: req.body.date,
        bank_txn: req.body.bank_txn,
        f_code: req.body.f_code,
        clientcode: req.body.clientcode,
        bank_name: req.body.bank_name,
        merchant_id: req.body.merchant_id,
        udf9: req.body.udf9,
        discriminator: req.body.discriminator,
        surcharge: req.body.surcharge,
        CardNumber: req.body.CardNumber,
        udf1: req.body.udf1,
        udf2: req.body.udf2,
        udf3: req.body.udf3,
        udf4: req.body.udf4,
        udf5: req.body.udf5,
        udf6: req.body.udf6,
        status: status,
    };

    console.log("condition in pack", condition);

    try {
        const data = await payment_model.findOneAndUpdate(
            { mer_txn: req.body.mer_txn },
            { $set: condition },
            { new: true }
        );

        if (!data) {
            res.status(200).send({
                success: false,
                data: "Payment Not Found.",
            });
            return;
        }

        const newDate = new Date();
        const latestDate = moment
            .default(newDate)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");

        const transaction = new transaction_model({
            payment: data._id,
            TransactionId: data.mer_txn,
            transactionType: data.transactionType,
            amount: req.body.amt,
            user: data.user,
            orderId: data.orderId,
            date: latestDate,
            transactionStatus: "paid",
            status: status,
            payThrough: "bank",
            mmp_txn: data.mmp_txn,
        });

        await transaction.save();
        console.log(transaction, "<<<<<<<<<<<<<<<<transaction in pack");

        if (
            req.body.f_code == "Ok" &&
            status == "success"
        ) {
            subject =
                "Your Family Care " +
                data.transactionType +
                " Confirmation (" +
                transaction.mmp_txn +
                ")";

            if (data.transactionType === "newliveconsultancy") {
                const result =
                    await consultancy_model.liveNewConsultancySchema.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "bank",
                                Completed: "Completed"
                            },
                        },
                        { new: true }
                    );
                content =
                    data.transactionType +
                    " Received Order number: " +
                    transaction.mmp_txn +
                    " Received on: " +
                    latestDate +
                    " \n of amount " +
                    req.body.amt;
                console.log("New live consultancy", result);
            } else if (data.transactionType === "consultancy") {
                const result =
                    await consultancy_model.default.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "bank",
                            },
                        },
                        { new: true }
                    );
                content =
                    data.transactionType +
                    " Received Order number: " +
                    transaction.mmp_txn +
                    " Received on: " +
                    latestDate +
                    " \n of amount " +
                    req.body.amt;
                console.log("result>>>>>>>>>>>", result);
            } else if (data.transactionType === "pharmacy") {
                let field = "";
                const result = await pharmacy_model.findOneAndUpdate(
                    { _id: data.orderId },
                    {
                        $set: {
                            transaction: transaction._id,
                            valid: true,
                            payThrough: "bank",
                            payment_method: "Credit Card/Debit Card/Netbanking Payment",
                        },
                    },
                    { new: true }
                );

                result.medicines.forEach((element) => {
                    let count = 0;
                    if (element.approved === true) {
                        field =
                            field +
                            ++count +
                            ". Name: " +
                            element.name +
                            " " +
                            count +
                            ". Quantity: " +
                            element.quantity +
                            "\n";
                    }
                });

                subject =
                    "Your FamilyCare " +
                    data.transactionType +
                    " Order Confirmation " +
                    transaction.mmp_txn;
                content =
                    data.transactionType +
                    " Received Order number: " +
                    transaction.mmp_txn +
                    " Received on: " +
                    latestDate +
                    " \n of amount " +
                    req.body.amt +
                    " order detail(s) " +
                    field +
                    " Total Ammount" +
                    result.Charge;

                // ---added lead data----//
                const leadDatabody = {
                    name: result.user.fname + " " + result.user.lname,
                    contact: result.user.phone,
                    alternateContact: "",
                    product: "fch lead",
                    email: result.user.email,
                    leadSource: "fch web",
                    type: "Pharmacy",
                };

                try {
                    const response = await axios.post(
                        "https://lmsapi.dealmoneyonline.com/api/v2/fch/addFchLead",
                        leadDatabody,
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    );
                    if (response) {
                        console.log("Zoom API response--", response.data);
                        console.log(JSON.stringify(response.data));
                    }
                } catch (error) {
                    console.error("Error sending lead data:", error);
                }
            } else if (data.transactionType === "nursing") {
                const result = await nursing_model.findOneAndUpdate(
                    { _id: data.orderId },
                    {
                        $set: {
                            transaction: transaction._id,
                            valid: true,
                            payThrough: "bank",
                        },
                    },
                    { new: true }
                );
                content =
                    data.transactionType +
                    " Received Order number: " +
                    transaction.mmp_txn +
                    " Received on: " +
                    latestDate +
                    " \n of amount " +
                    req.body.amt;
                console.log("result>>>>>>>>>>>", result);

                const result1 = await nursing_model
                    .findOne({ _id: data.orderId })
                    .populate("user")
                    .lean();
                console.log(result, "result---------->");

               appointmentBookSendEmail(
                    "Nursing Order ",
                    "<p>" +
                    result1.user.fname +
                    " " +
                    result1.user.lname +
                    " has ordered please check order.</p> \n Contact Number: " +
                    result1.user.phone,
                    "html"
                );

                const leadDatabody = {
                    name: result1.user.patientName,
                    contact: result1.user.phone,
                    alternateContact: "",
                    product: "fch lead",
                    email: result1.user.email,
                    leadSource: "fch web",
                    type: "Nursing",
                };

                try {
                    const response = await axios.post(
                        "https://lmsapi.dealmoneyonline.com/api/v2/fch/addFchLead",
                        leadDatabody,
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    );
                    if (response) {
                        console.log("Zoom API response--", response.data);
                        console.log(JSON.stringify(response.data));
                    }
                } catch (error) {
                    console.error("Error sending lead data:", error);
                }
            } else if (data.transactionType === "home-appointment") {
                const result =
                    await home_appointment_model.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "bank",
                            },
                        },
                        { new: true }
                    );
                content =
                    data.transactionType +
                    " Received Order number: " +
                    transaction.mmp_txn +
                    " Received on: " +
                    latestDate +
                    " \n of amount " +
                    req.body.amt;
                console.log("result>>>>>>>>>>>", result);
            } else if (data.transactionType === "appointment") {
                const result =
                    await appointment_model.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payStatus: "completed",
                                payThrough: "bank",
                                status: "Completed"
                            },
                        },
                        { new: true }
                    );
                content =
                    data.transactionType +
                    " Received Order number: " +
                    transaction.mmp_txn +
                    " Received on: " +
                    latestDate +
                    " \n of amount " +
                    req.body.amt;
                console.log("result>>>>>>>>>>>", result);
            } else if (data.transactionType === "diagnostic") {
                const result =
                    await  diagnostic_model.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "bank",
                            },
                        },
                        { new: true }
                    );
                content =
                    data.transactionType +
                    " Received Order number: " +
                    transaction.mmp_txn +
                    " Received on: " +
                    latestDate +
                    " \n of amount " +
                    req.body.amt;
                console.log("result>>>>>>>>>>>", result);
            } else if (
                data.transactionType === "package" ||
                data.transactionType === "package-hospital" ||
                data.transactionType === "package-home"
            ) {
                const result =
                    await packagerecords.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "bank",
                                paystatus: "Completed",
                                status: "Completed"
                            },
                        },
                        { new: true }
                    );
                content =
                    data.transactionType +
                    " Received Order number: " +
                    transaction.mmp_txn +
                    " Received on: " +
                    latestDate +
                    " \n of amount " +
                    req.body.amt;
                console.log("result>>>>>>>>>>>", result);
            } else if (
                data.transactionType === "offernew" ||
                data.transactionType === "offernew-home" ||
                data.transactionType === "offernew-hospital"
            ) {
                const result =
                    await offerrecord.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "bank",
                                paystatus: "Completed",
                                status: "Completed"
                            },
                        },
                        { new: true }
                    );
                content =
                    data.transactionType +
                    " Received Order number: " +
                    transaction.mmp_txn +
                    " Received on: " +
                    latestDate +
                    " \n of amount " +
                    req.body.amt;
                console.log("result>>>>>>>>>>> redirectpack in method.", result);
            }

            const queryParams = {
                txnId: data.paytmTxnId,
                tranType: data.transactionType,
                payStat: "success"
            };
            const queryString = Object.keys(queryParams)
                .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
                .join('&');
            res.redirect(`${redirectUrl}${queryString}`);
        } else if (status === "cancelled" || status === "failed") {
            // Added by Prakash
            if (data.transactionType === "pharmacy") {
                const cartDetails = await  cartSchema
                    .findOneAndUpdate(
                        { user: data.user },
                        { $set: { isCartProgress: true } },
                        { new: true }
                    )
                    .sort({ updatedAt: -1 });
                console.log(
                    "cartDetailscartDetails nnnnnnnnnnnnnnnn cancled",
                    cartDetails
                );
            }

            const queryParams = {
                error: "Payment failed or cancelled",
                tranType: data.transactionType,
                payStat: "Failed"
            };
            const queryString = Object.keys(queryParams)
                .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
                .join('&');
            res.redirect(`${redirectUrl}${queryString}`);
        } else {
            var sendData = {
                amount: req.body.amt,
                id: data.mer_txn,
                name: req.body.udf1,
                icon: " far fa-times-circle text-danger",
                date: latestDate,
                urltext: "Back To Family Care Website",
                url: "https://familycarehospitals.com/#/",
            };
            res.render("pendingurl", { sendData: sendData });
            res.status(200).send({
                success: false,
                data: "Payment is pending",
            });
        }
    } catch (err) {
        console.error("Error in redirectpack:", err);
        res.status(500).send({
            success: false,
            data: err,
        });
    }
};


exports.checkBankPaymentStatus = async (req, res) => {
    const merchantId = "62021";
    let subject;
    let content;
    try {
        const data = await payment_model_1.default.findOne({
            _id: req.query.paymentId,
        });
        const userData = await user_model_1.default.findOne({ _id: data.user });
        console.log(
            userData,
            "==data from payment model----of particular payment ID------",
            data
        );

        if (!data || data == undefined) {
            res.status(500).send({
                success: false,
                msg: "Payment id Not Found.",
            });
            return;
        }

        if (
            data &&
            (data.status == "success" ||
                data.f_code == "Ok" ||
                data.status == "cancelled" ||
                data.status == "failed")
        ) {
            if (data.status == "success" || data.f_code == "Ok") {
                const valid = true;
                updateRecord(data, valid, userData, (err, resp) => {
                    res.status(200).send({
                        success: true,
                        data: "Payment Successful..",
                    });
                });
            } else if (data.status == "pending") {
                const valid = false;
                updateRecord(data, valid, userData, (err, resp) => {
                    res.status(200).send({
                        success: false,
                        data: "Payment pending..",
                    });
                });
            } else {
                const valid = false;
                updateRecord(data, valid, userData, (err, resp) => {
                    res.status(200).send({
                        success: false,
                        data: "Payment failed. Try again..",
                    });
                });
            }
        } else {
            superagent_1.default
                .post(
                    `https://payment.atomtech.in/paynetz/vfts?merchantid=${merchantId}&merchanttxnid=${data.mer_txn}&amt=${data.amount}&tdate=${data.dateObj}`
                )
                .end(async (err, response) => {
                    if (err) {
                        res.status(421).send({
                            success: false,
                            err: err,
                        });
                        return;
                    }

                    console.log("STATUS: " + response.statusCode);
                    let status;
                    const json = xml2json.toJson(response.text);
                    const parsedResponse = JSON.parse(json);
                    console.log("status response from superagent-------", parsedResponse);

                    status = parsedResponse.VerifyOutput.VERIFIED == "SUCCESS" ? "success" : "failed";

                    data.merchant_id = parsedResponse.VerifyOutput.MerchantID;
                    data.mer_txn = parsedResponse.VerifyOutput.MerchantTxnID;
                    data.amt = parsedResponse.VerifyOutput.AMT;
                    data.verified = parsedResponse.VerifyOutput.VERIFIED;
                    data.bid = parsedResponse.VerifyOutput.BID;
                    data.bank_name = parsedResponse.VerifyOutput.bankname;
                    data.mmp_txn = parsedResponse.VerifyOutput.atomtxnId;
                    data.discriminator = parsedResponse.VerifyOutput.discriminator;
                    data.surcharge = parsedResponse.VerifyOutput.surcharge;
                    data.CardNumber = parsedResponse.VerifyOutput.CardNumber;
                    data.date = parsedResponse.VerifyOutput.TxnDate;
                    data.udf9 = parsedResponse.VerifyOutput.UDF9;
                    data.reconstatus = parsedResponse.VerifyOutput.reconstatus;
                    data.sdt = parsedResponse.VerifyOutput.sdt;

                    const transaction = new transaction_model({
                        payment: data._id,
                        TransactionId: data.mer_txn,
                        transactionType: data.transactionType,
                        amount: data.amount,
                        user: data.user,
                        orderId: data.orderId,
                        date:  moment.default(data.date).tz("Asia/Kolkata").format(),
                        transactionStatus: "paid",
                        status: status,
                        payThrough: "bank",
                    });

                    await Promise.all([transaction.save(), data.save()]);

                    if (status == "success") {
                        subject =
                            "Your FamilyCare " +
                            data.transactionType +
                            " Confirmation (" +
                            transaction._id +
                            ")";
                        console.log(transaction, "<<<<<<<<<<<<<<<<transaction");

                        if (data.transactionType === "consultancy") {
                            const result =
                                await consultancy_model.default.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: {
                                            transaction: transaction._id,
                                            valid: true,
                                            payThrough: "bank",
                                        },
                                    },
                                    { new: true }
                                );
                            content =
                                data.transactionType +
                                " Received Order number: " +
                                transaction._id +
                                " Received on: " +
                                 moment
                                    .default(req.body.date)
                                    .tz("Asia/Kolkata")
                                    .format("YYYY-MM-DD") +
                                " \n of amount " +
                                data.amount;
                            console.log("result CONSULTANCY>>>>>>>>>>>", result);
                            const userData = await user_model_1.default.findOne({
                                _id: data.user,
                            });

                            //called data for mail
                            const doctorDetails =
                                await consultancy_model.allDoctorSchema.findOne({
                                    _id: mongoose.Types.ObjectId.createFromHexString(result.doctor),
                                });

                            const adminData = await admin_model
                                .findOneAndUpdate(
                                    {},
                                    { $inc: { count: 1 } },
                                    { new: true }
                                )
                                .lean();
                            //send and save notification
                            const notify = await notification_model.default.findOne({
                                user: result.user,
                                appointmentId: result.consultancyId,
                            });
                            if (notify) {
                                notify.assigndoctor = true;
                                notify.doctor = doctorDetails._id;
                                notify.type = "Consultancy";
                                notify.status = "Accepted";
                                notify.usermessage =
                                    userData.fname +
                                    " " +
                                    userData.lname +
                                    "'s live video consultation with Dr. " +
                                    doctorDetails.doctor_fname +
                                    " " +
                                    doctorDetails.doctor_lname +
                                    " on " +
                                    notify.date +
                                    " at " +
                                    notify.time +
                                    " has been booked successfully. Your appointment id: " +
                                    notify.appointmentId +
                                    " You will get a confirmation call from our team shortly.";
                                notify.doctormessage =
                                    "Your consultancy has been confirmed for " +
                                    notify.date +
                                    " at " +
                                    notify.time +
                                    " your pharmacy id: " +
                                    notify.appointmentId;
                                await notify.save();
                                if (result.user) {
                                    console.log("hii ravi", result.user);
                                    let info = {};
                                    info.userId = result.user._id;
                                    info.usercount = adminData.count;
                                    info.title = "Booking Successful";
                                    info.notification =
                                        userData.fname +
                                        " " +
                                        userData.lname +
                                        "'s live video consultation with Dr. " +
                                        doctorDetails.doctor_fname +
                                        " " +
                                        doctorDetails.doctor_lname +
                                        " on " +
                                        notify.date +
                                        " at " +
                                        notify.time +
                                        " has been booked successfully. Your appointment id: " +
                                        notify.appointmentId +
                                        " You will get a confirmation call from our team shortly.";
                                    info.type = "Consultancy";
                                    info.status = "Accepted";
                                    info.sendTo = "user";
                                    sendNotification(info);
                                    info = {};
                                    console.log(
                                        "rrrrr========",
                                        adminData.count,
                                        adminData._id
                                    );
                                    const sendCount = await  sendMessage(
                                        adminData.count,
                                        result.user._id
                                    );
                                    console.log("sendCount ", sendCount);
                                }
                            } else {
                                console.log("not find any such type of notification ");
                            }
                            // Send SMS To Patient
                            sendConsultancySms(doctorDetails, userData, notify);
                        } else if (data.transactionType === "pharmacy") {
                            const result =
                                await  pharmacy_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: {
                                            transaction: transaction._id,
                                            valid: true,
                                            payThrough: "bank",
                                        },
                                    },
                                    { new: true }
                                );
                            const userData = await user_model_1.default.findOne({
                                _id: data.user,
                            });
                            const cartData =
                                await cartSchema.findOne({
                                    _id: result.cartId,
                                });

                            let dispatchedAddress = {};
                            userData.address.forEach((element) => {
                                if (result.dispatched_address == element._id) {
                                    dispatchedAddress = element;
                                }
                            });
                            const adminData = await admin_model
                                .findOneAndUpdate(
                                    {},
                                    { $inc: { count: 1 } },
                                    { new: true }
                                )
                                .lean();
                            //send and save notification
                            const notify = await notification_model.default.findOne({
                                user: result.user,
                                appointmentId: result.pharmacyId,
                            });
                            if (notify) {
                                notify.assigndoctor = true;
                                notify.type = "Order";
                                notify.status = "In Progress";
                                notify.usermessage =
                                    "Hi, your pharmacy order is currently being processed. You will receive an order confirmation shortly via email/ SMS";
                                notify.doctormessage =
                                    "Your Pharmacy order has been confirmed for " +
                                    notify.date +
                                    " at " +
                                    notify.time +
                                    ". your pharmacy id: " +
                                    notify.appointmentId;
                                await notify.save();
                                if (result.user) {
                                    console.log("hii ravi", result.user);
                                    let info = {};
                                    info.userId = result.user._id;
                                    info.usercount = adminData.count;
                                    info.notification =
                                        "Hi, your pharmacy order is currently being processed. You will receive an order confirmation shortly via email/ SMS";
                                    info.type = "Order";
                                    info.status = "In Progress";
                                    info.sendTo = "user";
                                   sendNotification(info);
                                    info = {};
                                    console.log(
                                        "rrrrr========",
                                        adminData.count,
                                        adminData._id
                                    );
                                    const sendCount = await  sendMessage(
                                        adminData.count,
                                        result.user._id
                                    );
                                    console.log("sendCount ", sendCount);
                                }
                                //Added by Prakash
                                if (data.transactionType === "pharmacy") {
                                    const cartDetails = await  cartSchema
                                        .findOneAndUpdate(
                                            { user: data.user },
                                            { $set: { isCartProgress: false } },
                                            { new: true }
                                        )
                                        .sort({ updatedAt: -1 });
                                    console.log(
                                        "check payment status bank cartDetailscartDetails",
                                        cartDetails
                                    );
                                }
                            } else {
                                console.log("not find any such type of notification ");
                            }
                            // Send SMS To Patient
                            sendSms(userData, notify);

                            console.log(
                                "dispatchedAddress------------",
                                dispatchedAddress
                            );
                            subject = "Your FamilyCare Pharmacy Order Placed";
                            console.log("Subject------------", subject);

                            const mailData = {
                                subject: subject,
                                result: result,
                                userData: userData,
                                cartData: cartData,
                                dispatchedAddress: dispatchedAddress,
                            };
                            console.log("mailData------------", mailData);
                            addHelpers(mailData);
                            console.log(
                                "data=============",
                               path.join(
                                    process.cwd(),
                                    "dist/templates",
                                    `order_placed_mail.hbs`
                                )
                            );
                            const content = await compile("order_placed_mail", mailData);
                            console.log(
                                "respozcvsxczvcxzxzxzxzxzxzxzxzxzxzxzxzxzxzxzxznse",
                                content
                            );
                            if (content) {
                               sendEmailToPatient(
                                    userData.email,
                                    subject,
                                    content,
                                    "html"
                                );
                            }
                        } else if (data.transactionType === "nursing") {
                            const result =
                                await nursing_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: {
                                            transaction: transaction._id,
                                            valid: true,
                                            payThrough: "bank",
                                        },
                                    },
                                    { new: true }
                                );
                            content =
                                data.transactionType +
                                " Received Order number: " +
                                transaction._id +
                                " Received on: " +
                                 moment
                                    .default(req.body.date)
                                    .tz("Asia/Kolkata")
                                    .format("YYYY-MM-DD") +
                                " \n of amount " +
                                data.amount;
                            console.log("result>>>>>>>>>>>", result);
                        } else if (data.transactionType === "home-appointment") {
                            const result =
                                await home_appointment_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: {
                                            transaction: transaction._id,
                                            valid: true,
                                            payThrough: "bank",
                                        },
                                    },
                                    { new: true }
                                );
                            content =
                                data.transactionType +
                                " Received Order number: " +
                                transaction._id +
                                " Received on: " +
                                 moment
                                    .default(req.body.date)
                                    .tz("Asia/Kolkata")
                                    .format("YYYY-MM-DD") +
                                " \n of amount " +
                                data.amount;
                            console.log("result>>>>>>>>>>>", result);
                        } else if (data.transactionType === "appointment") {
                            const result =
                                await appointment_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: {
                                            transaction: transaction._id,
                                            valid: true,
                                            payStatus: "completed",
                                            payThrough: "bank",
                                        },
                                    },
                                    { new: true }
                                );
                            content =
                                data.transactionType +
                                " Received Order number: " +
                                transaction._id +
                                " Received on: " +
                                 moment
                                    .default(req.body.date)
                                    .tz("Asia/Kolkata")
                                    .format("YYYY-MM-DD") +
                                " \n of amount " +
                                data.amount;
                            console.log("result>>>>>>>>>>>", result);
                        } else if (data.transactionType === "newliveconsultancy") {
                            const result =
                                await consultancy_model.liveNewConsultancySchema.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: {
                                            transaction: transaction._id,
                                            valid: true,
                                            paystatus: "completed",
                                            payThrough: "bank",
                                        },
                                    },
                                    { new: true }
                                );
                            content =
                                data.transactionType +
                                " Received Order number: " +
                                transaction._id +
                                " Received on: " +
                                 moment
                                    .default(req.body.date)
                                    .tz("Asia/Kolkata")
                                    .format("YYYY-MM-DD") +
                                " \n of amount " +
                                data.amount;
                            console.log("bank status checked for newliveconsultancy", result);
                        } else if (data.transactionType === "diagnostic") {
                            const result =
                                await  diagnostic_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: {
                                            transaction: transaction._id,
                                            valid: true,
                                            payThrough: "bank",
                                        },
                                    },
                                    { new: true }
                                );
                            content =
                                data.transactionType +
                                " Received Order number: " +
                                transaction._id +
                                " Received on: " +
                                moment
                                    .default(req.body.date)
                                    .tz("Asia/Kolkata")
                                    .format("YYYY-MM-DD") +
                                " \n of amount " +
                                data.amount;
                            console.log("result>>>>>>>>>>>", result);
                        }
                        const user = await user_model_2.default
                            .findOne({ _id: data.user })
                            .lean();
                        if (user.email) {
                            await utility.sendEmailForDoctor(
                                user.email,
                                subject,
                                content,
                                "text/html"
                            );
                        }
                        console.log(
                            "i AM GOING OUT OF THIS API",
                            content,
                            parsedResponse.VerifyOutput.atomtxnId
                        );
                        res.status(200).send({
                            success: true,
                            data: "Payment Successful",
                        });
                    } else {
                        if (data.transactionType === "consultancy") {
                            const result =
                                await consultancy_model.default.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: { transaction: transaction._id, valid: false },
                                    },
                                    { new: true }
                                );
                            console.log("result>>>>>>>>>>>", result);
                        } else if (data.transactionType === "pharmacy") {
                            const result =
                                await  pharmacy_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: { transaction: transaction._id, valid: false },
                                    },
                                    { new: true }
                                );
                            console.log("result>>>>>>>>>>>", result);
                            //Added by Prakash
                            const cartDetails = await  cartSchema
                                .findOneAndUpdate(
                                    { user: data.user },
                                    { $set: { isCartProgress: false } },
                                    { new: true }
                                )
                                .sort({ updatedAt: -1 });
                            console.log(
                                "check payment status cart cancelled cartDetailscartDetails",
                                cartDetails
                            );
                        } else if (data.transactionType === "nursing") {
                            const result =
                                await nursing_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: { transaction: transaction._id, valid: false },
                                    },
                                    { new: true }
                                );
                            console.log("result>>>>>>>>>>>", result);
                        } else if (data.transactionType === "home-appointment") {
                            const result =
                                await home_appointment_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: { transaction: transaction._id, valid: false },
                                    },
                                    { new: true }
                                );
                            console.log("result>>>>>>>>>>>", result);
                        } else if (data.transactionType === "appointment") {
                            const result =
                                await appointment_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: { transaction: transaction._id, valid: false },
                                    },
                                    { new: true }
                                );
                            console.log("result>>>>>>>>>>>", result);
                        } else if (data.transactionType === "newliveconsultancy") {
                            const result =
                                await consultancy_model.liveNewConsultancySchema.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: { transaction: transaction._id, valid: false },
                                    },
                                    { new: true }
                                );
                            console.log("bank status checked for new live consultancy", result);
                        } else if (data.transactionType === "diagnostic") {
                            const result =
                                await  diagnostic_model.findOneAndUpdate(
                                    { _id: data.orderId },
                                    {
                                        $set: { transaction: transaction._id, valid: false },
                                    },
                                    { new: true }
                                );
                            console.log("result>>>>>>>>>>>", result);
                        }
                        res.status(200).send({
                            success: false,
                            data: "Payment failure",
                        });
                    }
                });
        }

        // zee code save userlogs
        const userlog = {
            _id: data.user,
            ModuleName: "payment",
            Action: "View",
            RowStatus: 0,
            loginFrom: "Patient App"
        };
        saveUserlog(userlog);

    } catch (err) {
        res.status(500).send({
            success: false,
            error: err,
        });
    }
};
function sendSms(data, notify) {
    console.log(data);
    var phoneno = data.phone;
    if (!phoneno) {
        console.log("data not found");
    } else {
        const OTP = Math.floor(1000 + Math.random() * 9000);
        const smsData = {
            mobileNo: phoneno,
            msg: "Hi, thank you for using FCH app. Your pharmacy order is currently being processed. You'll soon receive an email regarding the confirmation of the order placed.",
        };
        const to = "91" + smsData.mobileNo;
        const msg = smsData.msg;
        const url =
            "https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=" +
            to +
            "&msg=" +
            msg +
            "&mt=0";

        superagent.get(url).end(function (err, response) {
            if (err) {
                console.log("function error");
            } else {
                user_model2.updateMany(
                    {
                        phone: phoneno,
                        phoneisverified: false,
                    },
                    {
                        $set: { otp: OTP },
                    },
                    { new: true },
                    function (err) {
                        if (err) {
                            console.log("err");
                        } else {
                            console.log("Booked Pharmacy Successfully");
                        }
                    }
                );
            }
        });
    }
}

function sendPackageSms(data) {
    console.log(data);
    var phoneno = data.phone;
    if (!phoneno) {
        console.log("data not found");
    } else {
        const OTP = Math.floor(1000 + Math.random() * 9000);
        const smsData = {
            mobileNo: phoneno,
            msg: "Hi ! Thank you for using the Family Care Hospitals App. Your diagnostic test order has been received and is now being processed.",
        };
        const to = "91" + smsData.mobileNo;
        const msg = smsData.msg;
        const url =
            "https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=" +
            to +
            "&msg=" +
            msg +
            "&mt=0";

        superagent.get(url).end(function (err, response) {
            if (err) {
                console.log("function error");
            } else {
                user_model2.updateMany(
                    {
                        phone: phoneno,
                        phoneisverified: false,
                    },
                    {
                        $set: { otp: OTP },
                    },
                    { new: true },
                    function (err) {
                        if (err) {
                            console.log("err");
                        } else {
                            console.log("Booked Pharmacy Successfully");
                        }
                    }
                );
            }
        });
    }
}
function sendConsultancySms(doctorDetails, data, notify) {
    console.log(data);
    var phoneno = data.phone;
    if (!phoneno) {
        console.log("data not found");
    } else {
        const smsData = {
            mobileNo: phoneno,
            msg:
                data.fname +
                " " +
                data.lname +
                "'s live video consultation with Dr. " +
                doctorDetails.doctor_fname +
                " " +
                doctorDetails.doctor_lname +
                " on " +
                notify.date +
                " at " +
                notify.time +
                " has been booked successfully. Your appointment id: " +
                notify.appointmentId,
        };
        const to = "91" + smsData.mobileNo;
        const msg = smsData.msg;
        const url =
            "https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=" +
            to +
            "&msg=" +
            msg +
            "&mt=0";
        superagent.get(url).end(function (err, response) {
            if (err) {
                console.log("function error");
            } else {
                console.log("Booked consultancy Successfully");
            }
        });
    }
}

const compile = async function (templateName, data) {
    const filePath3 = path.join(
        process.cwd(),
        "dist/templates",
        `${templateName}.hbs`
    );
    console.log("filePath3", process.cwd(), filePath3);
    const html = await fs.readFile(filePath3, "utf-8");
    console.log("----------contents------------", html);
    return Handlebars.compile(html)(data);
};
function addHelpers(dataa) {
    console.log("function called addhelpers-----------");
    console.log("checking data for helper???????????", dataa);

    Handlebars.registerHelper("pharmacyId", () => dataa.result.pharmacyId);
    Handlebars.registerHelper("fname", () => dataa.userData.fname);
    Handlebars.registerHelper("payment_method", () => "Prepaid");
    Handlebars.registerHelper("lname", () => dataa.userData.lname);
    Handlebars.registerHelper("email", () => dataa.userData.email);
    Handlebars.registerHelper("phone", () => dataa.userData.phone);
    Handlebars.registerHelper("subject", () => dataa.subject);
    Handlebars.registerHelper("medicines", () => dataa.cartData.medicines);
    Handlebars.registerHelper("ShippingCharge", () => dataa.cartData.delivery_charge);
    Handlebars.registerHelper("TotalPaidCharge", () => dataa.cartData.totalPaidAmount);
    Handlebars.registerHelper("totalActualAmount", () => dataa.cartData.totalActualAmount);
    Handlebars.registerHelper("discountedValue", () => dataa.cartData.totalDiscount);
    Handlebars.registerHelper("dispatchedAddress", () => dataa.dispatchedAddress);
}

// Update record function
function updateRecord(data, valid, userData, cb) {
    console.log(
        userData,
        "data--------in UpdateRecord---------",
        data,
        "--status-- value-----",
        valid
    );

    if (data.transactionType === "consultancy") {
        if (valid) {
            utility.sendEmailToAdmin(
                "Live Consultancy",
                `<p>${userData.fname} ${userData.lname} has booked online appointment please check order.</p>`,
                "html"
            );

            let result, adminData, notify, doctorDetails, info = {};
            const transaction = new transaction_model({
                payment: data._id,
                TransactionId: data.mer_txn,
                transactionType: data.transactionType,
                amount: data.amount,
                user: data.user,
                orderId: data.orderId,
                date: moment(data.date).tz("Asia/Kolkata").format(),
                transactionStatus: "paid",
                status: data.status,
                payThrough: "bank",
            });

            transaction.save();
            consultancy_model.findOneAndUpdate(
                { _id: data.orderId },
                {
                    $set: {
                        transaction: transaction._id,
                        valid: true,
                        payThrough: "bank",
                        payment_method: "Credit Card/Debit Card/Netbanking Payment",
                    },
                },
                { new: true },
                function (e, r) {
                    result = r;

                    consultancy_model.allDoctorSchema.findOne(
                        { _id: mongoose.Types.ObjectId.createFromHexString(result.doctor) },
                        function (error, resp) {
                            doctorDetails = resp;

                            user_model_1.findOne({ _id: data.user }, function (ee, re) {
                                userData = re;
                            });
                            admin_model.findOneAndUpdate(
                                {},
                                { $inc: { count: 1 } },
                                { new: true },
                                function (ee, ress) {
                                    adminData = ress;
                                }
                            );
                            notification_model.findOne(
                                { user: result.user, appointmentId: result.consultancyId },
                                function (ee, rre) {
                                    notify = rre;
                                    if (notify) {
                                        notify.assigndoctor = true;
                                        notify.doctor = doctorDetails._id;
                                        notify.type = "Consultancy";
                                        notify.status = "In Progress";
                                        notify.usermessage =
                                            `${userData.fname} ${userData.lname}'s live video consultation with Dr. ${doctorDetails.doctor_fname} ${doctorDetails.doctor_lname} on ${notify.date} at ${notify.time} has been booked successfully. Your appointment id: ${notify.appointmentId} You will get a confirmation call from our team shortly.`;
                                        notify.doctormessage =
                                            `Your consultancy has been confirmed for ${notify.date} at ${notify.time} your pharmacy id: ${notify.appointmentId}`;
                                        notify.save();

                                        if (result.user) {
                                            info.userId = result.user._id;
                                            info.usercount = adminData.count;
                                            info.title = "Booking Successful";
                                            info.notification = notify.usermessage;
                                            info.type = "Consultancy";
                                            info.status = "In Progress";
                                            info.sendTo = "user";
                                           sendNotification(info);
                                             sendMessage(
                                                adminData.count,
                                                result.user._id,
                                                function (e, r) {
                                                    console.log("sendCount ", r);
                                                }
                                            );
                                            sendConsultancySms(doctorDetails, userData, notify);
                                        }
                                    } else {
                                        console.log("not find any such type of notification ");
                                    }
                                }
                            );
                        }
                    );
                }
            ).lean();

            var subject = "Your FamilyCare Live Consultancy Booked";
            var mailData = { subject, result, userData };
            consultancyHelper(mailData);
            compile("live_consultancy_mail", mailData)
                .then(function (response) {
                    if (response) {
                        sendEmailToPatient(
                            userData.email,
                            subject,
                            response,
                            "html"
                        );
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
        }

        consultancy_model.findOneAndUpdate(
            { _id: data.orderId },
            {
                $set: { valid: valid, payThrough: "bank", paymentStatus: data.status },
            },
            { new: true },
            function (e, r) {
                if (e) cb(e, null);
                else cb(null, r);
            }
        );
    }

    else if (data.transactionType === "package" || "package-hospital" || "package-home") {
        if (valid) {
            utility.sendEmailToAdmin(
                "Package Book",
                `<p>${userData.fname} ${userData.lname} has ordered please check order.</p>`,
                "html"
            );
        }
       packagerecords.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
            { new: true },
            function (e, r) {
                if (e) cb(e, null);
                else cb(null, r);
            }
        );
    }

    else if (data.transactionType === "offernew") {
        if (valid) {
            utility.sendEmailToAdmin(
                "Offer Book",
                `<p>${userData.fname} ${userData.lname} has ordered please check order.</p>`,
                "html"
            );
        }
        offernew_model_1.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
            { new: true },
            function (e, r) {
                if (e) cb(e, null);
                else cb(null, r);
            }
        );
    }

    else if (data.transactionType === "pharmacy") {
        pharmacy_model_1.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
            { new: true },
            function (e, r) {
                if (e) cb(e, null);
                else cb(null, r);
            }
        );
    }

    else if (data.transactionType === "nursing") {
        nursing_model_1.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
            { new: true },
            function (e, r) {
                if (e) cb(e, null);
                else cb(null, r);
            }
        );
    }

    else if (data.transactionType === "home-appointment") {
        home_appointment_model_1.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
            { new: true },
            function (e, r) {
                if (e) cb(e, null);
                else cb(null, r);
            }
        );
    }

    else if (data.transactionType === "appointment") {
        appointment_model_1.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
            { new: true },
            function (e, r) {
                if (e) cb(e, null);
                else cb(null, r);
            }
        );
    }

    else if (data.transactionType === "diagnostic") {
        diagnostic_model_1.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
            { new: true },
            function (e, r) {
                if (e) cb(e, null);
                else cb(null, r);
            }
        );
    }
}
exports.walletRedirect = async (req, res) => {
    let subject;
    let content;

    const str =
        req.body.mmp_txn +
        req.body.mer_txn +
        req.body.f_code +
        req.body.prod +
        req.body.discriminator +
        req.body.amt +
        req.body.bank_txn;

    const key = "dd05870673e1975873";

    function sig(str, key) {
        return crypto
            .createHmac("sha512", key)
            .update(Buffer.from(str, "utf-8"))
            .digest("hex");
    }

    const sign = sig(str, key);
    console.log("Response=>" + JSON.stringify(req.body));

    let status;
    const paid = await payment_model.findOne({ mer_txn: req.body.mer_txn }).lean();

    if (req.body.f_code === "Ok") {
        status = "success";
    } else if (req.body.f_code === "F") {
        status = "failed";
    } else if (req.body.f_code === "C") {
        status = "cancelled";
    } else if (req.body.signature !== sign || paid.amount !== req.body.amt) {
        status = "pending";
    }

    const condition = {
        mmp_txn: req.body.mmp_txn,
        mer_txn: req.body.mer_txn,
        amt: req.body.amt,
        prod: req.body.prod,
        date: req.body.date,
        bank_txn: req.body.bank_txn,
        f_code: req.body.f_code,
        clientcode: req.body.clientcode,
        bank_name: req.body.bank_name,
        merchant_id: req.body.merchant_id,
        udf9: req.body.udf9,
        discriminator: req.body.discriminator,
        surcharge: req.body.surcharge,
        CardNumber: req.body.CardNumber,
        udf1: req.body.udf1,
        udf2: req.body.udf2,
        udf3: req.body.udf3,
        udf4: req.body.udf4,
        udf5: req.body.udf5,
        udf6: req.body.udf6,
        status: status,
    };

    if (paid.f_code === "F" || paid.f_code === "C") {
        res.status(200).send({
            success: false,
            data: "Payment failed. Try Again.",
        });
    } else if (paid.f_code === "Ok") {
        res.status(200).send({
            success: true,
            data: "Payment successful. Try Again.",
        });
    } else {
        console.log("condition", condition);
        payment_model.findOneAndUpdate(
            { mer_txn: req.body.mer_txn },
            { $set: condition },
            { new: true },
            async (err, data) => {
                console.log(err, data);
                if (err) {
                    res.status(500).send({
                        success: false,
                        data: err,
                    });
                }
                if (data) {
                    const transaction = new transaction_model({
                        payment: data._id,
                        TransactionId: data.mer_txn,
                        transactionType: data.transactionType,
                        amount: req.body.amt,
                        user: data.user,
                        date: moment(req.body.date).tz("Asia/Kolkata").format(),
                        transactionStatus: "add",
                        status: status,
                    });
                    await transaction.save();
                    console.log(transaction, "<><><><><>>>>>>><<<<<<transaction");

                    if (req.body.f_code === "Ok" && req.body.signature === sign && data) {
                        const user = await user_model.findOne({ _id: data.user }).lean();
                        console.log(user, "<<<<<<<<<<<<<user");
                        const newBalance =
                            parseInt(user.walletBalance, 10) + parseInt(req.body.amt, 10);
                        const updated = await user_model.updateOne(
                            { _id: data.user },
                            { $set: { walletBalance: newBalance } }
                        );
                        console.log(
                            newBalance,
                            ">>>>>>>>>>>>>>>>>><<<<<updatedddd",
                            updated
                        );
                        subject =
                            "Your FamilyCare " +
                            data.transactionType +
                            " Order Confirmation " +
                            transaction._id;
                        content =
                            req.body.amt +
                            " Money Added in your wallet successfully. Transaction Id: " +
                            transaction._id;
                        if (user.email) {
                            await utility.sendEmailForDoctor(
                                user.email,
                                subject,
                                content,
                                "text/html"
                            );
                        }
                        res.status(200).send({
                            success: true,
                            data: "Payment Successful. Money added into your wallet.",
                        });
                    } else if (status === "pending") {
                        res.status(200).send({
                            success: true,
                            data:
                                "Payment in Pending state. Your " +
                                data.transactionType +
                                " will be updated after confirming this transaction.",
                        });
                    } else {
                        res.status(200).send({
                            success: false,
                            data: "Payment failure. Try Again.",
                        });
                    }
                } else {
                    res.status(200).send({
                        success: false,
                        data: "Payment Not Found.",
                    });
                }
            }
        );
    }
};

// Add money into wallet
exports.addIntoWallet = async (req, res) => {
    if (!req.query.amt || !req.query.custacc || !req.query.userId) {
        return res.status(400).send({
            success: false,
            msg: "Enter All Details.",
        });
    }

    if (req.query.userId !== req.user._id) {
        return res.status(400).send({
            success: false,
            msg: "User Id does not match.",
        });
    }

    user_model.findOne({ _id: req.query.userId }, async (err, data) => {
        if (err) {
            return res.status(500).send({
                success: false,
                data: err,
            });
        }

        if (data && data._id) {
            const startingDay = moment(new Date())
                .tz("Asia/Kolkata")
                .format("MM/DD/YYYY");
            const dateObj = moment(new Date())
                .tz("Asia/Kolkata")
                .format("YYYY-MM-DD");
            const login = "62021";
            const prodid = "SCANDEN";
            const pass = "SCANDEN@123";
            const transid = shortid.generate();
            const idBase = Buffer.from(data.phone).toString("base64");
            const key = "ca449a91c50d923f24";
            const sign =
                login + pass + "NBFundTransfer" + prodid + transid + req.query.amt + "INR";

            function sig(sign, key) {
                return crypto
                    .createHmac("sha512", key)
                    .update(Buffer.from(sign, "utf-8"))
                    .digest("hex");
            }

            const signature = sig(sign, key);

            const paymentData = {
                mer_txn: transid,
                user: req.query.userId,
                transactionType: req.query.transactionType,
                customerAccount: req.query.custacc,
                dateObj: dateObj,
                amount: req.query.amt,
            };

            const payData = new payment_model(paymentData);
            await payData.save();

            const url =
                "https://payment.atomtech.in/paynetz/epi/fts?login=" +
                login +
                "&pass=" +
                pass +
                "&ttype=NBFundTransfer&prodid=" +
                prodid +
                "&amt=" +
                req.query.amt +
                "&txncurr=INR&txnscamt=0&clientcode=" +
                encodeURIComponent(idBase) +
                "&txnid=" +
                transid +
                "&date=" +
                startingDay +
                "&custacc=" +
                req.query.custacc +
                "&udf2=" +
                data.email +
                "&udf3=" +
                data.phone +
                "&ru=https://familycare.dealmoney.net/api/v1/payment/walletredirect&signature=" +
                signature;

            console.log(url);
            res.status(200).send({
                success: true,
                url: url,
                paymentId: payData._id,
            });
        } else {
            res.status(417).send({
                success: false,
                data: "User not found.",
            });
        }
    });
};

// Pay through wallet
exports.payThroughWallet = async (req, res) => {
    let subject;
    let content;

    if (
        !req.body.amt ||
        !req.body.userId ||
        !req.body.orderId ||
        !req.body.transactionType
    ) {
        return res.status(400).send({
            success: false,
            msg: "Enter All Details.",
        });
    }

    if (req.body.userId !== req.user._id) {
        return res.status(400).send({
            success: false,
            msg: "User Id does not match.",
        });
    }

    user_model.findOne({ _id: req.body.userId }, async (err, data) => {
        if (err) {
            return res.status(500).send({
                success: false,
                data: err,
            });
        }

        if (data && data._id) {
            if (data.walletBalance >= req.body.amt) {
                const date = moment(new Date())
                    .tz("Asia/Kolkata")
                    .format("MM/DD/YYYY");
                const transid = shortid.generate();

                const paymentData = {
                    mer_txn: transid,
                    user: req.body.userId,
                    bankId: req.body.bankId,
                    orderId: req.body.orderId,
                    transactionType: req.body.transactionType,
                    f_code: "Ok",
                    status: "success",
                };

                const payData = new payment_model(paymentData);
                await payData.save();

                const transaction = new transaction_model({
                    payment: payData._id,
                    TransactionId: transid,
                    transactionType: req.body.transactionType,
                    amount: req.body.amt,
                    user: req.body.userId,
                    orderId: req.body.orderId,
                    date: moment(new Date()).tz("Asia/Kolkata").format(),
                    transactionStatus: "paid",
                    status: "success",
                    payThrough: "wallet",
                });
                await transaction.save();

                subject =
                    "Your FamilyCare " +
                    req.body.transactionType +
                    " Confirmation (" +
                    transaction._id +
                    ")";

                if (req.body.transactionType === "consultancy") {
                    await consultancy_model.findOneAndUpdate(
                        { _id: req.body.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "wallet",
                            },
                        },
                        { new: true }
                    );
                    content =
                        req.body.transactionType +
                        " Received. \n Order number: " +
                        transaction._id +
                        " \n Received on: " +
                        moment(req.body.date).tz("Asia/Kolkata").toISOString() +
                        " \n of Amount " +
                        req.body.amt;
                } else if (req.body.transactionType === "pharmacy") {
                    let field = "";
                    const result = await pharmacy_model.findOneAndUpdate(
                        { _id: req.body.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "wallet",
                            },
                        },
                        { new: true }
                    );
                    result.medicines.forEach((element, index) => {
                        if (element.approved === true) {
                            field +=
                                index +
                                1 +
                                ". Name: " +
                                element.name +
                                " Quantity: " +
                                element.quantity +
                                "\n";
                        }
                    });
                    content =
                        req.body.transactionType +
                        " Received. \n Order number: " +
                        transaction._id +
                        " \n Received on: " +
                        moment(req.body.date).tz("Asia/Kolkata").toISOString() +
                        " \n of Amount " +
                        req.body.amt +
                        " \n Order Detail(s) \n " +
                        field +
                        " Total Amount " +
                        result.Charge;
                } else if (req.body.transactionType === "nursing") {
                    await nursing_model.findOneAndUpdate(
                        { _id: req.body.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "wallet",
                            },
                        },
                        { new: true }
                    );
                    content =
                        req.body.transactionType +
                        " Received. \n Order number: " +
                        transaction._id +
                        " \n Received on: " +
                        moment(req.body.date).tz("Asia/Kolkata").toISOString() +
                        " \n of Amount " +
                        req.body.amt;
                } else if (req.body.transactionType === "home-appointment") {
                    await home_appointment_model.findOneAndUpdate(
                        { _id: req.body.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "wallet",
                            },
                        },
                        { new: true }
                    );
                    content =
                        req.body.transactionType +
                        " Received. \n Order number: " +
                        transaction._id +
                        " \n Received on: " +
                        moment(req.body.date).tz("Asia/Kolkata").toISOString() +
                        " \n of Amount " +
                        req.body.amt;
                } else if (req.body.transactionType === "appointment") {
                    await appointment_model.findOneAndUpdate(
                        { _id: req.body.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payStatus: "completed",
                                payThrough: "wallet",
                            },
                        },
                        { new: true }
                    );
                    content =
                        req.body.transactionType +
                        " Received. \n Order number: " +
                        transaction._id +
                        " \n Received on: " +
                        moment(req.body.date).tz("Asia/Kolkata").toISOString() +
                        " \n of Amount " +
                        req.body.amt;
                } else if (req.body.transactionType === "diagnostic") {
                    await diagnostic_model.findOneAndUpdate(
                        { _id: req.body.orderId },
                        {
                            $set: {
                                transaction: transaction._id,
                                valid: true,
                                payThrough: "wallet",
                            },
                        },
                        { new: true }
                    );
                    content =
                        req.body.transactionType +
                        " Received. \n Order number: " +
                        transaction._id +
                        " \n Received on: " +
                        moment(req.body.date).tz("Asia/Kolkata").toISOString() +
                        " \n of Amount " +
                        req.body.amt;
                }

                const newBalance =
                    parseInt(data.walletBalance, 10) - parseInt(req.body.amt, 10);
                await user_model.updateOne(
                    { _id: data._id },
                    { $set: { walletBalance: newBalance } }
                );

                if (data.email) {
                    await utility.sendEmailForDoctor(
                        data.email,
                        subject,
                        content,
                        "text/html"
                    );
                }

                res.status(200).send({
                    success: true,
                    data: "Payment Successful.",
                });
            } else {
                res.status(200).send({
                    success: false,
                    data: "Not Enough Balance in your Wallet.",
                });
            }
        } else {
            res.status(417).send({
                success: false,
                data: "User not found.",
            });
        }
    });
};
exports.checkWalletPaymentStatus = async (req, res) => {
    const merchantId = "62021";
    let subject;
    let content;

    try {
        const data = await payment_model.findOne({ _id: req.query.paymentId });
        console.log(
            `https://payment.atomtech.in/paynetz/vfts?merchantid=${merchantId}&merchanttxnid=${data?.mer_txn}&amt=${data?.amount}&tdate=${data?.dateObj}`
        );

        if (!data) {
            return res.status(500).send({ success: false, msg: "Payment id Not Found." });
        }

        if (["Ok", "F", "C"].includes(data.f_code)) {
            if (data.status === "success" || data.f_code === "Ok") {
                return res.status(200).send({
                    success: true,
                    data: "Payment Successful. Money added into your wallet.",
                });
            } else if (data.status === "pending") {
                return res.status(200).send({
                    success: true,
                    data: `Payment in Pending state. Your ${data.transactionType} will be updated after confirming this transaction.`,
                });
            } else {
                return res.status(200).send({
                    success: false,
                    data: "Payment failed. Try again.",
                });
            }
        }

        // 🔹 Call AtomTech API
        const url = `https://payment.atomtech.in/paynetz/vfts?merchantid=${merchantId}&merchanttxnid=${data.mer_txn}&amt=${data.amount}&tdate=${data.dateObj}`;
        superagent.post(url).end(async (err, response) => {
            if (err) {
                return res.status(421).send({ success: false, err });
            }

            console.log("STATUS:", response.statusCode, url);
            const json = xml2json.toJson(response.text);
            let parsedResponse = JSON.parse(json);
            console.log(parsedResponse, "<<<<<<<<<<response");

            let status = parsedResponse.VerifyOutput.VERIFIED === "NODATA" ? "failed" : "success";

            // 🔹 Update payment record
            data.merchant_id = parsedResponse.VerifyOutput.MerchantID;
            data.mer_txn = parsedResponse.VerifyOutput.MerchantTxnID;
            data.amt = parsedResponse.VerifyOutput.AMT;
            data.verified = parsedResponse.VerifyOutput.VERIFIED;
            data.bid = parsedResponse.VerifyOutput.BID;
            data.bank_name = parsedResponse.VerifyOutput.bankname;
            data.mmp_txn = parsedResponse.VerifyOutput.atomtxnId;
            data.discriminator = parsedResponse.VerifyOutput.discriminator;
            data.surcharge = parsedResponse.VerifyOutput.surcharge !== "null" ? parsedResponse.VerifyOutput.surcharge : 0;
            data.CardNumber = parsedResponse.VerifyOutput.CardNumber;
            data.date = parsedResponse.VerifyOutput.TxnDate || data.date;
            data.udf9 = parsedResponse.VerifyOutput.UDF9;
            data.reconstatus = parsedResponse.VerifyOutput.reconstatus;
            data.sdt = parsedResponse.VerifyOutput.sdt;

            const transaction = new transaction_model({
                payment: data._id,
                TransactionId: data.mer_txn,
                transactionType: data.transactionType,
                amount: data.amount,
                user: data.user,
                date: moment(data.date).tz("Asia/Kolkata").format(),
                transactionStatus: "add",
                status,
                payThrough: "wallet",
            });

            await Promise.all([transaction.save(), data.save()]);
            console.log(transaction, "<<Transaction Saved>>");

            if (status === "success") {
                const user = await user_model2.findOne({ _id: data.user }).lean();
                console.log(user, "<<User>>");

                const newBalance = parseInt(user.walletBalance, 10) + parseInt(data.amount, 10);
                await user_model2.updateOne({ _id: data.user }, { $set: { walletBalance: newBalance } });

                subject = `Your FamilyCare ${data.transactionType} Order Confirmation ${transaction._id}`;
                content = `${req.body.amt} Added in your wallet successfully. Transaction Id: ${transaction._id}`;
                if (user.email) {
                    await utility.sendEmailForDoctor(user.email, subject, content, "text/html");
                }

                return res.status(200).send({ success: true, data: "Payment Successful. Money added into your wallet." });
            } else {
                return res.status(200).send({ success: false, data: "Payment failed. Try again." });
            }
        });
    } catch (err) {
        res.status(500).send({ success: false, error: err });
    }
};

// ✅ Refund Back into Wallet
exports.addBackIntoWallet = async (orderId, type) => {
    let result;

    if (type === "consultancy") {
        result = await consultancy_model.findOne({ _id: orderId, valid: true }).populate("transaction").lean();
    } else if (type === "pharmacy") {
        result = await pharmacy_model.findOne({ _id: orderId, valid: true }).populate("transaction").lean();
    } else if (type === "nursing") {
        result = await nursing_model.findOne({ _id: orderId, valid: true }).populate("transaction").lean();
    } else if (type === "home-appointment") {
        result = await home_appointment_model.findOne({ _id: orderId, valid: true }).populate("transaction").lean();
    } else if (type === "appointment") {
        result = await appointment_model.findOne({ _id: orderId, valid: true, payStatus: "completed" }).populate("transaction").lean();
    } else if (type === "diagnostic") {
        result = await diagnostic_model.findOne({ _id: orderId, valid: true }).populate("transaction").lean();
    }

    if (result && result.transaction && result.transaction.status === "success") {
        const transaction = new transaction_model({
            TransactionId: shortid.generate(),
            transactionType: type,
            amount: result.Charge,
            user: result.user,
            date: moment(result.date).tz("Asia/Kolkata").format(),
            transactionStatus: "refund",
            status: "success",
            payThrough: result.payThrough,
        });

        await transaction.save();

        const user = await user_model2.findOne({ _id: result.user }).lean();
        const newBalance = parseInt(user.walletBalance, 10) + parseInt(result.Charge, 10);
        await user_model2.updateOne({ _id: result.user }, { $set: { walletBalance: newBalance } });

        const subject = `Your FamilyCare ${type} Order cancelled ${transaction._id}`;
        const content = `Refunded amount of Rs ${result.amt} will be added in your wallet. Transaction Id: ${transaction._id}`;
        if (user.email) {
            await utility.sendEmailForDoctor(user.email, subject, content, "text/html");
        }

        return true;
    }
    return false;
};

// ✅ Add Bank Codes
exports.addBankCodes = async (req, res) => {
    try {
        const bankDetail = {
            bankNames: req.body.bankNames,
            atomBankCodes: req.body.atomBankCodes,
        };

        const bankCodesAdd = new bankCodes_model(bankDetail);
        const data = await bankCodesAdd.save();

        res.status(200).send({ success: true, data });
    } catch (err) {
        res.status(500).send({ success: false, data: err });
    }
};

// ✅ Get Bank Codes
exports.getBankCodes = async (req, res) => {
    try {
        const data = await BankCodes.find({}).lean();
        res.status(200).send({ success: true, data });
    } catch (err) {
        res.status(500).send({ success: false, error: err });
    }
};

// ✅ List of Payments
exports.listOfPayment = async (req, res) => {
    try {
        const paymentData = await payment_model.find({ user: req.query.userId }).sort({ _id: -1 }).exec();
        res.status(200).send({ success: true, data: paymentData });
    } catch (err) {
        res.status(500).send({ success: false, data: err });
    }
};
exports.getPaymentList = async (req, res) => {
    console.log("Inside payment list method------");
    try {
        const page = req.params.page === undefined ? 1 : parseInt(req.params.page);
        const limit = 10;

        const Count = transaction_model.count({});
        const paymentData = transaction_model
            .find()
            .populate("user")
            .populate("payment")
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const result = await Promise.all([paymentData, Count]);

        console.log("final result--------", result);
        res.status(200).send({
            success: true,
            data: result[0],
            Count: result[1],
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            err: error,
        });
    }
};

exports.getSearchField = async (req, res) => {
    try {
        let page = 1,
            limit = 10,
            skip = 0;

        if (req.query.page) page = parseInt(req.query.page);
        if (req.query.limit) limit = parseInt(req.query.limit);
        if (page > 1) skip = (page - 1) * limit;

        console.log("value from UI-------", page, limit, skip);

        if (req.query.name) {
            const Count = transaction_model.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "users",
                    },
                },
                {
                    $project: {
                        name: 1,
                        users: { $arrayElemAt: ["$users", 0] },
                        amount: 1,
                        TransactionId: 1,
                        transactionType: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    },
                },
                {
                    $group: {
                        _id: "$_id",
                        userName: { $first: "$users.name" },
                        amount: { $first: "$amount" },
                        TransactionId: { $first: "$TransactionId" },
                        transactionType: { $first: "$transactionType" },
                        status: { $first: "$status" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
                    },
                },
                {
                    $match: {
                        $or: [
                            { userName: { $regex: req.query.name, $options: "i" } },
                            { transactionType: { $regex: req.query.name, $options: "i" } },
                            { status: { $regex: req.query.name, $options: "i" } },
                        ],
                    },
                },
                {
                    $group: {
                        _id: undefined,
                        count: { $sum: 1 },
                    },
                },
            ]);

            const paymentData = transaction_model
                .aggregate([
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "users",
                        },
                    },
                    {
                        $project: {
                            name: 1,
                            users: { $arrayElemAt: ["$users", 0] },
                            amount: 1,
                            TransactionId: 1,
                            transactionType: 1,
                            status: 1,
                            createdAt: 1,
                            updatedAt: 1,
                        },
                    },
                    {
                        $group: {
                            _id: "$_id",
                            userName: { $first: "$users.name" },
                            amount: { $first: "$amount" },
                            TransactionId: { $first: "$TransactionId" },
                            transactionType: { $first: "$transactionType" },
                            status: { $first: "$status" },
                            createdAt: { $first: "$createdAt" },
                            updatedAt: { $first: "$updatedAt" },
                        },
                    },
                    {
                        $match: {
                            $or: [
                                { userName: { $regex: req.query.name, $options: "i" } },
                                { transactionType: { $regex: req.query.name, $options: "i" } },
                                { status: { $regex: req.query.name, $options: "i" } },
                            ],
                        },
                    },
                ])
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit);

            const result = await Promise.all([paymentData, Count]);

            res.status(200).send({
                Count: result && result[1].length > 0 ? result[1][0].count : 0,
                data: result[0],
            });
        } else {
            res.status(400).send({
                success: false,
                err: "Search key not found",
            });
        }
    } catch (error) {
        res.status(400).send({
            success: false,
            err: error,
        });
    }
};

exports.filterPayment = async (req, res) => {
    console.log(
        "=========Check data for filter coming in body==========",
        req.body
    );
    try {
        if (
            (req.body.transaction_type === "" &&
                req.body.cust_name === "" &&
                req.body.status.length === 0 &&
                req.body.from_amt === "" &&
                req.body.to_amt === "" &&
                req.body.startDate === "" &&
                req.body.endDate === "") ||
            (req.body.transaction_type === undefined &&
                req.body.cust_name === undefined &&
                req.body.status.length === 0 &&
                req.body.from_amt === undefined &&
                req.body.to_amt === undefined &&
                req.body.startDate === undefined &&
                req.body.endDate === undefined)
        ) {
            return res.status(400).send({
                success: false,
                err: "please select any given fields",
            });
        }

        const limit = 10;
        const condition = {};
        const page = req.params.page === undefined ? 1 : parseInt(req.params.page);

        if (req.body.startDate || req.body.endDate) condition.date = {};
        if (req.body.from_amt || req.body.to_amt) condition.amount = {};

        if (req.body.transaction_type)
            condition.transactionType = new RegExp(req.body.transaction_type, "i");

        if (req.body.status.length !== 0)
            condition.status = { $in: req.body.status };

        if (req.body.startDate) {
            const sdateT = req.body.startDate.split("-");
            const dateTs = `${sdateT[0]}-${sdateT[1]}-${sdateT[2]}`;
            const time =  moment.default(dateTs).startOf("day");
            console.log("Startdate is here-------------", time);
            condition.createdAt = condition.createdAt || {};
            condition.createdAt.$gte = time;
        }

        if (req.body.endDate) {
            const edateT = req.body.endDate.split("-");
            const dateTe = `${edateT[0]}-${edateT[1]}-${edateT[2]}`;
            const time =  moment.default(dateTe).endOf("day");
            console.log("Enddate is here---------------------", time);
            condition.createdAt = condition.createdAt || {};
            condition.createdAt.$lte = time;
        }

        if (req.body.from_amt) condition.amount.$gte = req.body.from_amt;
        if (req.body.to_amt) condition.amount.$lte = req.body.to_amt;

        if (req.body.cust_name)
            condition.userName = new RegExp(req.body.cust_name, "i");

        console.log("condition=========", condition);

        const Count = transaction_model.count(condition);
        const paymentData = transaction_model
            .aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "users",
                    },
                },
                {
                    $project: {
                        name: 1,
                        users: { $arrayElemAt: ["$users", 0] },
                        amount: 1,
                        TransactionId: 1,
                        transactionType: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    },
                },
                {
                    $group: {
                        _id: "$_id",
                        userName: { $first: "$users.name" },
                        amount: { $first: "$amount" },
                        TransactionId: { $first: "$TransactionId" },
                        transactionType: { $first: "$transactionType" },
                        status: { $first: "$status" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
                    },
                },
                {
                    $match: condition,
                },
            ])
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const result = await Promise.all([paymentData, Count]);
        console.log("filter final result------------", result);

        res.status(200).send({
            success: true,
            data: result[0],
            Count: result[1],
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            err: error,
        });
    }
};
