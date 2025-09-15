"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : new P(function (resolve) {
              resolve(result.value);
            }).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const superagent_1 = __importDefault(require("superagent"));
const xml2json_1 = __importDefault(require("xml2json"));
const user_model_1 = __importDefault(require("../user/user.model"));
const moment_1 = __importDefault(require("moment"));
const bankCodes_model_1 = __importDefault(require("./bankCodes.model"));
const payment_model_1 = __importDefault(require("./payment.model"));
const shortid_1 = __importDefault(require("shortid"));
const transaction_model_1 = __importDefault(require("./transaction.model"));
//const consultancy_model_1 = __importDefault(require("../consultancy/consultancy.model"));
const consultancy_model_1 = __importDefault(
  require("../liveconsultancy/liveconsultancy.model")
);
const appointment_model_1 = __importDefault(
  require("../appointment/appointment.model")
);
const diagnostic_model_1 = __importDefault(
  require("../diagnostic/diagnostic.model")
);
const nursing_model_1 = __importDefault(require("../nursing/nursing.model"));
const home_appointment_model_1 = __importDefault(
  require("../homeappointment/home.appointment.model")
);
const pharmacy_model_1 = __importDefault(require("../pharmacy/pharmacy.model"));
const user_model_2 = __importDefault(require("../user/user.model"));
const utility = require("../../util/utility");
const offernew_model_1 = require("../offernew/offernew.model");
const crypto = require("crypto");
var Handlebars = require("handlebars");
var path_1 = __importDefault(require("path"));
const fs = require("fs-extra");
const pharmacist_model_1 = __importDefault(
  require("../pharmacist/pharmacist.model")
);
const push_controller_1 = require("../pushnotifications/push.controller");
const mongoose_1 = __importDefault(require("mongoose"));
const admin_model_1 = __importDefault(require("../admin/admin.model"));
const cart_model_1 = __importDefault(require("../pharmacist/pharmacist.model"));
const notification_model_1 = __importDefault(
  require("../notification/notification.model")
);
const utility_1 = require("../../util/utility");
const package_model_1 = __importDefault(require("../package/package.model"));
const socket_1 = require("../../socket");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
var axios = require("axios");
const { saveUserlog } = require("../user/user.controller");
const { stringify } = require("querystring");
// Bank funcs
exports.paymentLogin = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("REQ.QUERY", JSON.stringify(req.query));
    if (
      !req.query.amt ||
      req.query.userid ||
      !req.query.orderId ||
      !req.query.transactionType
    ) {
      res.status(400).send({
        success: false,
        msg: "Enter All Details.",
      });
    }
    console.log(
      "----------req.user---------------------------------------------",
      req.user
    );
    if (req.query.userId != req.user._id) {
      res.status(400).send({
        success: false,
        msg: "User Id does not match.",
      });
    } else {
      console.log("gyjutluiyhuDJASfcasfcw--------");
      user_model_1.default.findOne({ _id: req.query.userId }, (err, data) => {
        console.log("-------user data--------", data);
        console.log("error------------", err);
        if (err) {
          res.status(500).send({
            success: false,
            data: err,
          });
        }
        if (data && data._id) {
          const startingDay = moment_1
            .default(new Date())
            .tz("Asia/Kolkata")
            .format("MM/DD/YYYY");
          const dateObj = moment_1
            .default(new Date())
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");
          const login = "62021";
          const prodid = "SCANDEN";
          const pass = "SCANDEN@123";
          const transid = shortid_1.default.generate();
          const idBase = new Buffer(data.phone).toString("base64");
          const key = "ca449a91c50d923f24"; //"KEY1236572345o67";
          const sign =
            login +
            pass +
            "NBFundTransfer" +
            prodid +
            transid +
            req.query.amt +
            "INR";
          console.log(sign, "<----sign");
          function sig(sign, key) {
            return crypto
              .createHmac("sha512", key)
              .update(new Buffer(sign, "utf-8"))
              .digest("hex");
          }
          const signature = sig(sign, key);
          console.log("siganture in login",signature);
          const paymentData = {};
          paymentData.mer_txn = transid;
          paymentData.user = req.query.userId;
          paymentData.bankId = req.query.bankId;
          paymentData.orderId = req.query.orderId;
          paymentData.transactionType = req.query.transactionType;
          paymentData.customerAccount = req.query.custacc;
          paymentData.dateObj = dateObj;
          paymentData.amount = req.query.amt;
          const payData = new payment_model_1.default(paymentData);
          payData.save((err, data1) => {
            console.log(err, "payment data", data1);
          });
          console.log("CHECK data************", data);
          // console.log("url;------->", "https://payment.atomtech.in/paynetz/epi/fts?login=" + login + "&pass=" + pass + "&ttype=NBFundTransfer&prodid=" + prodid + "&amt=" + req.query.amt + "&txncurr=INR&txnscamt=0&clientcode=" + encodeURIComponent(idBase) + "&txnid=" + transid + "&date=" + startingDay + "&custacc=" + req.query.custacc + '&udf2=' + data.email + '&udf3=' + data.phone + "&ru=https://familycare.sia.co.in/api/v1/payment/redirect&signature=" + signature);
          const options = {
            host: "https://payment.atomtech.in",
            // port: '443',
            path:
              "/paynetz/epi/fts?login=" +
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
              "&udf1=" +
              data.fname +
              " " +
              data.lname +
              "&udf2=" +
              data.email +
              "&udf3=" +
              data.phone +
              "&ru=https://paymentapi.familycarehospitals.com/api/v1/payment/redirect&signature=" +
              signature,
            method: "POST",
          };
          const url = options["host"] + options["path"];
          console.log("ggggggggggggggggg", url);
          // res.redirect(url);
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
  });

exports.paymentLoginPack = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("REQ.QUERY", JSON.stringify(req.query) );
    if (
      !req.query.amt ||
      req.query.userid ||
      !req.query.orderId ||
      !req.query.transactionType
    ) {
      res.status(400).send({
        success: false,
        msg: "Enter All Details.",
      });
    }
    console.log(
      "----------req.user---------------------------------------------",
      req.user
    );
    if (req.query.userId != req.user._id) {
      res.status(400).send({
        success: false,
        msg: "User Id does not match.",
      });
    } else {
      console.log("gyjutluiyhuDJASfcasfcw--------");
      user_model_1.default.findOne({ _id: req.query.userId }, (err, data) => {
        console.log("-------user data--------", data);
        console.log("error------------", err);
        if (err) {
          res.status(500).send({
            success: false,
            data: err,
          });
        }
        if (data && data._id) {
          const startingDay = moment_1
            .default(new Date())
            .tz("Asia/Kolkata")
            .format("MM/DD/YYYY");
          const dateObj = moment_1
            .default(new Date())
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");
          const login = "62021";
          const prodid = "SCANDEN";
          const pass = "SCANDEN@123";
          const transid = shortid_1.default.generate();
          const idBase = new Buffer(data.phone).toString("base64");
          const key = "ca449a91c50d923f24"; //const key = "KEY1236572345o67";
          const sign =
            login +
            pass +
            "NBFundTransfer" +
            prodid +
            transid +
            req.query.amt +
            "INR";
          console.log(sign, "<----sign");
          function sig(sign, key) {
            return crypto
              .createHmac("sha512", key)
              .update(new Buffer(sign, "utf-8"))
              .digest("hex");
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
          const payData = new payment_model_1.default(paymentData); 
          payData.save((err, data1) => {
            console.log(err, "payment data", data1);
          });
          // console.log("url;------->", "https://payment.atomtech.in/paynetz/epi/fts?login=" + login + "&pass=" + pass + "&ttype=NBFundTransfer&prodid=" + prodid + "&amt=" + req.query.amt + "&txncurr=INR&txnscamt=0&clientcode=" + encodeURIComponent(idBase) + "&txnid=" + transid + "&date=" + startingDay + "&custacc=" + req.query.custacc + '&udf2=' + data.email + '&udf3=' + data.phone + "&ru=https://familycare.sia.co.in/api/v1/payment/redirect&signature=" + signature);
          const options = {
            host: "https://payment.atomtech.in",
            // port: '443',
            path:
              "/paynetz/epi/fts?login=" +
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
              "&udf1=" +
              req.query.name +
              "&udf2=" +
              data.email +
              "&udf3=" +
              data.phone +
              "&ru=https://paymentapi.familycarehospitals.com/api/v1/payment/redirectpack&signature=" +
              signature,
            method: "POST",
          };
          const url = options["host"] + options["path"];
          console.log("ggggggggggggggggg", url);
          // res.redirect(url);
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
  });

exports.paymentRefund = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("REQ.BODY======", req.body);

    const data = yield pharmacy_model_1.default.findOne({
      _id: req.query.paymentId,
    });
    if (!data || data == undefined) {
      res.status(500).send({
        success: false,
        msg: "Payment id Not Found.",
      });
    }
    user_model_1.default.findOne({ _id: data.user }, (err, dataResp) => {
      if (err) {
        res.status(500).send({
          success: false,
          data: err,
        });
      }
      if (dataResp && dataResp._id) {
        const merchantid = "62021";
        const pass = "SCANDEN@123";

        // console.log("url of REFUND------->", "https://payment.atomtech.in/paynetz/epi/rfts?merchantid=" + merchantid + "&pass=" + pass + "&atomtxnid=" + dataResp.mer_txn + "&refundamt=" + dataResp.amount + "&txndate=" + dataResp.dateObj);
        const options = {
          host: "https://payment.atomtech.in",
          // port: '443',
          path:
            "/paynetz/epi/rfts?merchantid=" +
            merchantid +
            "&pass=" +
            pass +
            "&atomtxnid=" +
            dataResp.mer_txn +
            "&refundamt=" +
            dataResp.amount +
            "&txndate=" +
            dataResp.dateObj,
          method: "POST",
        };
        const url = options["host"] + options["path"];
        console.log("Formed new URL-----------------", url);
        // res.redirect(url);
        res.status(200).send({
          success: false,
          url: url,
          // paymentId: payData._id
        });
      } else {
        res.status(417).send({
          success: false,
          data: "User not found.",
        });
      }
    });
    // }
  });

exports.redirect = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log(
      "Payment Redirected in redirect ***********************************",
      JSON,stringify(req.body)
    );
    // console.log(req.body)
    let subject;
    let content;
    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?'
    const str =
      req.body.mmp_txn +
      req.body.mer_txn +
      req.body.f_code +
      req.body.prod +
      req.body.discriminator +
      req.body.amt +
      req.body.bank_txn;
    const key = "ca449a91c50d923f24"; //'KEYRESP123657234'; //'dd05870673e1975873';
    function sig(str, key) {
      return crypto
        .createHmac("sha512", key)
        .update(new Buffer(str, "utf-8"))
        .digest("hex");
    }
    const sign = sig(str, key);
    console.log(str,"signature in redirect",sign);
    // if (req.body.signature != sign) {
    //     console.log("signature not matching");
    // }
    console.log("Response=>" + JSON.stringify(req.body));
    let status;
    const paid = yield payment_model_1.default
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
    if 
    (req.body.f_code == "Ok") {
      status = "success";
    } else if (
      paid.amount.split(".")[0] !== req.body.amt.split(".")[0] ||
      req.body.signature !== sign
    ) {
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
    payment_model_1.default.findOneAndUpdate(
      { mer_txn: req.body.mer_txn },
      { $set: condition },
      { new: true },
      (err, data) =>
        __awaiter(this, void 0, void 0, function* () {
          console.log(err, data);
          if (err) {
            const queryPrams = {
              error: err,
              tranType:data.transactionType,
              payStat:"Error"
            };
            const queryString = Object.keys(queryPrams)
              .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
              .join('&');  
            res.redirect(`${redirectUrl}${queryString}`);
            // res.status(500).send({
            //   success: false,
            //   data: err,
            // });
          }
          var newDate = new Date();
          var latestDate = moment_1
            .default(newDate)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");
          if (data) {
            let transaction;
            transaction = new transaction_model_1.default({
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
            yield transaction.save();
            console.log(transaction, "<<<<<<<<<<<<<<<<transaction");
            if (
              req.body.f_code == "Ok" &&
              // req.body.signature == sign &&
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
                    yield consultancy_model_1.liveNewConsultancySchema.findOneAndUpdate(
                      { _id: data.orderId },
                      {
                        $set: {
                          transaction: transaction._id,
                          valid: true,
                          payThrough: "bank",
                          Completed:"Completed"
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
                  console.log("New live consultancy",result);
                }
              else if (data.transactionType === "consultancy") {
                const result =
                  yield consultancy_model_1.default.findOneAndUpdate(
                    { _id: data.orderId },
                    {
                      $set: {
                        transaction: transaction._id,
                        valid: true,
                        payThrough: "bank",
                        payment_method:
                          "Credit Card/Debit Card/Netbanking Payment",
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
                //mohini date time daily sheet code
                let date = moment_timezone_1.default().format("DD-MM-YYYY");
                let time = moment_timezone_1.default().format("h:mm a");
                //console.log("Mohini See the time and date ----------", date, "--time--", time);
                var isOrderPlaced = [];
                isOrderPlaced.push({ status: "true", date: date, time: time });
                console.log(isOrderPlaced, "isOrderPlacedisOrderPlaced");
                // end code here
                const result = yield pharmacy_model_1.default.findOneAndUpdate(
                  { _id: data.orderId },
                  {
                    $set: {
                      transaction: transaction._id,
                      isOrderPlace: isOrderPlaced, //daily sheet value set
                      valid: true,
                      payThrough: "bank",
                      payment_method:
                        "Credit Card/Debit Card/Netbanking Payment",
                    },
                  },
                  { new: true }
                );
                /*result.medicines.forEach((element) => {
                        let count = 0;
                        if (element.approved === true) {
                            field = field + ++count + ". Name: " + element.name + " " + count + ". Quantity: " + element.quantity + "\n";
                        }
                    });*/
                /* subject = "Your FamilyCare " + data.transactionType + " Order Confirmation " + transaction.mmp_txn;
                    content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + req.body.amt
                       + " Total Ammount" + result.Charge;*/
                const userData = yield user_model_1.default.findOne({
                  _id: result.user,
                });
                // console.log("userData-----------888888888******************-", userData);
                const cartData = yield pharmacist_model_1.cartSchema.findOne({
                  _id: result.cartId,
                });
                console.log("cartData--------------", cartData);
                let dispatchedAddress = {};
                userData.address.forEach((element) => {
                  if (result.dispatched_address == element._id) {
                    dispatchedAddress = element;
                  }
                });
                var subject = "Your FamilyCare Pharmacy Order Placed";
                // console.log("Subject------------", subject);
                var data12 = {
                  subject: subject,
                  result: result,
                  userData: userData,
                  cartData: cartData,
                  listMedicines: cartData.medicines,
                  dispatchedAddress: dispatchedAddress,
                };
                // console.log("data------------", data12);
                addHelpers(data12);
                const content = compile(
                  "pharmacy_order_place",
                  JSON.parse(JSON.stringify(data12))
                ).then(function (response) {
                  if (response) {
                    //       console.log(response, "respnceeeeeeeeeeee")
                    utility_1.sendEmailToPatient(
                      userData.email,
                      subject,
                      "<p>" + response + "</p>",
                      "html"
                    );
                  }
                });
              } else if (data.transactionType === "nursing") {
                const result = yield nursing_model_1.default.findOneAndUpdate(
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
              } else if (data.transactionType === "home-appointment") {
                const result =
                  yield home_appointment_model_1.default.findOneAndUpdate(
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
                  yield appointment_model_1.default.findOneAndUpdate(
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
                  transaction.mmp_txn +
                  " Received on: " +
                  latestDate +
                  " \n of amount " +
                  req.body.amt;
                // sendPaymentSMS(req.body.clientcode,data,transaction);
                console.log("result>>>>>>>>>>>", result);
              } else if (data.transactionType === "diagnostic") {
                const result =
                  yield diagnostic_model_1.default.findOneAndUpdate(
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
                  yield package_model_1.packagerecords.findOneAndUpdate(
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
                //-------mail and lead data save-------------//
                const result1 = yield package_model_1.packagerecords.findOne({
                  package_records_Id: data.orderId,
                });
                console.log(result, "result---------->");
                utility_1.appointmentBookSendEmail(
                  "Package Booked",
                  "<p>" +
                    result1.patientName +
                    " has book package please check order.</p> \n Contact Number: " +
                    result1.phone,
                  "html"
                );
                // added data to lms
                const leadDatabody = {
                  name: result1.patientName,
                  contact: result1.phone,
                  alternateContact: "",
                  product: "fch lead",
                  email: result1.email,
                  leadSource: "fch web",
                  type: "Health Packages",
                };
                // doctorDetails.zoomUserId
                axios
                  .post(
                    "https://lmsapi.dealmoneyonline.com/api/v2/fch/addFchLead",
                    leadDatabody,
                    {
                      headers: {
                        // "Accept": "application/json, application/xml",
                        "Content-Type": "application/json",
                        // "Authorization": "Bearer " + tokenResp.token
                        // "User-Agent": "Zoom-api-Jwt-Request",
                        // "Host": "api.zoom.us"
                      },
                    }
                  )
                  .then(function (response) {
                    if (response) {
                      console.log("Zoom API response--", response.data);
                      console.log(JSON.stringify(response.data));
                    }
                  });
              } else if (
                data.transactionType === "offernew" ||
                data.transactionType === "offernew-home" ||
                data.transactionType === "offernew-hospital"
              ) {
                const result =
                  yield offernew_model_1.offerrecord.findOneAndUpdate(
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
                //-------mail and lead data save-------------//
                const result1 = yield offernew_model_1.offerrecord.findOne({
                  package_records_Id: data.orderId,
                });
                console.log(result, "result----------> in rdirect method payment");
                // utility_1.appointmentBookSendEmail(
                //   "Package Booked",
                //   "<p>" +
                //     result1.patientName +
                //     " has book package please check order.</p> \n Contact Number: " +
                //     result1.phone,
                //   "html"
                // );
                // added data to lms
                // const leadDatabody = {
                //   name: result1.patientName,
                //   contact: result1.phone,
                //   alternateContact: "",
                //   product: "fch lead",
                //   email: result1.email,
                //   leadSource: "fch web",
                //   type: "Offer Packages",
                // };
                // doctorDetails.zoomUserId
                // axios
                //   .post(
                //     "https://lmsapi.dealmoneyonline.com/api/v2/fch/addFchLead",
                //     leadDatabody,
                //     {
                //       headers: {
                //         // "Accept": "application/json, application/xml",
                //         "Content-Type": "application/json",
                //         // "Authorization": "Bearer " + tokenResp.token
                //         // "User-Agent": "Zoom-api-Jwt-Request",
                //         // "Host": "api.zoom.us"
                //       },
                //     }
                //   )
                //   .then(function (response) {
                //     if (response) {
                //       console.log("Zoom API response--", response.data);
                //       console.log(JSON.stringify(response.data));
                //     }
                //   });
              }
              // const user = yield user_model_2.default
              //   .findOne({ _id: data.user })
              //   .lean();
              // if (user.email) {
              //   yield utility.sendEmailForDoctor(
              //     user.email,
              //     subject,
              //     content,
              //     "text/html"
              //   );
              // }
              const queryPrams = {
                txnId: data.paytmTxnId,
                tranType:data.transactionType,
                payStat:"success"
              };
              const queryString = Object.keys(queryPrams)
                .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                .join('&');  
              res.redirect(`${redirectUrl}${queryString}`);
              // res.status(200).send({
              //   success: true,
              //   data: "Payment Successful",
              // });
            } else if (status == "pending") {
              const queryPrams = {
                txnId: data.paytmTxnId,
                tranType:data.transactionType,
                payStat:"pending"
              };
              const queryString = Object.keys(queryPrams)
                .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                .join('&');  
              res.redirect(`${redirectUrl}${queryString}`);
              // res.status(200).send({
              //   success: true,
              //   data:
              //     "Payment in Pending state. Your " +
              //     data.transactionType +
              //     " will be updated after confirming this transaction.",
              // });
            } else {
              const queryPrams = {
                txnId: data.paytmTxnId,
                tranType:data.transactionType,
                payStat:"Failed"
              };
              const queryString = Object.keys(queryPrams)
                .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                .join('&');  
              res.redirect(`${redirectUrl}${queryString}`);
              // res.status(200).send({
              //   success: false,
              //   data: "Payment failure",
              // });
            }
          } else {
            const queryPrams = {
              txnId: data.paytmTxnId,
              tranType:data.transactionType,
              payStat:"Not Found"
            };
            const queryString = Object.keys(queryPrams)
              .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
              .join('&');  
            res.redirect(`${redirectUrl}${queryString}`);
            // res.status(200).send({
            //   success: false,
            //   data: "Payment Not Found.",
            // });
          }
        })
    );
  });

exports.redirectpack = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log(
      "Payment Redirected***********************************",
      JSON.stringify(req.body)
    );
    // console.log(req.body)
    
    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?'
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
    const key = "ca449a91c50d923f24"; //'dd05870673e1975873';
    function sig(str, key) {
      return crypto
        .createHmac("sha512", key)
        .update(new Buffer(str, "utf-8"))
        .digest("hex");
    }
    const sign = sig(str, key);
    console.log(str,"signature in redirect",sign);
    // if (req.body.signature != sign) {
    //     console.log("signature not matching");
    // }
    console.log("Response=>" + JSON.stringify(req.body));
    let status;
    const paid = yield payment_model_1.default
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
    }
    else if (paid.amount !== req.body.amt || req.body.signature !== sign) {
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
    payment_model_1.default.findOneAndUpdate(
      { mer_txn: req.body.mer_txn },
      { $set: condition },
      { new: true },
      (err, data) =>
        __awaiter(this, void 0, void 0, function* () {
          console.log(err, data);
          if (err) {
            res.status(500).send({
              success: false,
              data: err,
            });
          }
          var newDate = new Date();
          var latestDate = moment_1
            .default(newDate)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");
          if (data) {
            let transaction;
            transaction = new transaction_model_1.default({
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
            yield transaction.save();
            console.log(transaction, "<<<<<<<<<<<<<<<<transaction in pack");
            if (
              req.body.f_code == "Ok" &&
              // req.body.signature == sign &&
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
                    yield consultancy_model_1.liveNewConsultancySchema.findOneAndUpdate(
                      { _id: data.orderId },
                      {
                        $set: {
                          transaction: transaction._id,
                          valid: true,
                          payThrough: "bank",
                          Completed:"Completed"
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
                  console.log("New live consultancy",result);
                }
              else if (data.transactionType === "consultancy") {
                const result =
                  yield consultancy_model_1.default.findOneAndUpdate(
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
                const result = yield pharmacy_model_1.default.findOneAndUpdate(
                  { _id: data.orderId },
                  {
                    $set: {
                      transaction: transaction._id,
                      valid: true,
                      payThrough: "bank",
                      payment_method:
                        "Credit Card/Debit Card/Netbanking Payment",
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
                // doctorDetails.zoomUserId
                axios
                  .post(
                    "https://lmsapi.dealmoneyonline.com/api/v2/fch/addFchLead",
                    leadDatabody,
                    {
                      headers: {
                        // "Accept": "application/json, application/xml",
                        "Content-Type": "application/json",
                        // "Authorization": "Bearer " + tokenResp.token
                        // "User-Agent": "Zoom-api-Jwt-Request",
                        // "Host": "api.zoom.us"
                      },
                    }
                  )
                  .then(function (response) {
                    if (response) {
                      console.log("Zoom API response--", response.data);
                      console.log(JSON.stringify(response.data));
                    }
                  });
              } else if (data.transactionType === "nursing") {
                const result = yield nursing_model_1.default.findOneAndUpdate(
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
                const result1 = yield nursing_model_1.default
                  .findOne({ _id: data.orderId })
                  .populate("user")
                  .lean();
                console.log(result, "result---------->");
                utility_1.appointmentBookSendEmail(
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
                // doctorDetails.zoomUserId
                axios
                  .post(
                    "https://lmsapi.dealmoneyonline.com/api/v2/fch/addFchLead",
                    leadDatabody,
                    {
                      headers: {
                        // "Accept": "application/json, application/xml",
                        "Content-Type": "application/json",
                        // "Authorization": "Bearer " + tokenResp.token
                        // "User-Agent": "Zoom-api-Jwt-Request",
                        // "Host": "api.zoom.us"
                      },
                    }
                  )
                  .then(function (response) {
                    if (response) {
                      console.log("Zoom API response--", response.data);
                      console.log(JSON.stringify(response.data));
                    }
                  });
              } else if (data.transactionType === "home-appointment") {
                const result =
                  yield home_appointment_model_1.default.findOneAndUpdate(
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
                  yield appointment_model_1.default.findOneAndUpdate(
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
                // sendPaymentSMS(req.body.clientcode,data,transaction);
                console.log("result>>>>>>>>>>>", result);
              } else if (data.transactionType === "diagnostic") {
                const result =
                  yield diagnostic_model_1.default.findOneAndUpdate(
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
                "package-hospital" ||
                "package-home"
              ) {
                const result =
                  yield package_model_1.packagerecords.findOneAndUpdate(
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
                "offernew-home" ||
                "offernew-hospital"
              ) {
                const result =
                  yield offernew_model_1.offerrecord.findOneAndUpdate(
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

              // const user = yield user_model_2.default
              //   .findOne({ _id: data.user })
              //   .lean();
              // if (user.email) {
              //   yield utility.sendEmailForDoctor(
              //     user.email,
              //     subject,
              //     content,
              //     "text/html"
              //   );
              // }
              // var sendData = {
              //   amount: req.body.amt,
              //   id: data.mer_txn,
              //   name: req.body.udf1,
              //   icon: "far fa-check-circle text-success",
              //   date: latestDate,
              //   urltext: "Back To Family Care Website ",
              //   url: "https://familycarehospitals.com/#/",
              //   message: "Thank You For Purchase!",
              // };
              // var sendData = { 'amount':  req.body.amt, 'id': data.mer_txn, "name": req.body.udf1,   "icon" : 'far fa-check-circle text-success',"date": latestDate, "urltext" : 'Back To Family Care Website ',  "url" : 'https://testnew.familycarehospitals.com/#/',   "message" : 'Thank You For Purchase!'}
              const queryPrams = {
                txnId: data.paytmTxnId,
                tranType:data.transactionType,
                payStat:"success"
              };
              const queryString = Object.keys(queryPrams)
                .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                .join('&');  
              res.redirect(`${redirectUrl}${queryString}`);
              // res.render("payment", { sendData: sendData });
            } else if (status === "cancelled" || status === "failed") {
              var sendData = {
                amount: req.body.amt,
                id: data.mer_txn,
                name: req.body.udf1,
                icon: " far fa-times-circle text-danger",
                date: latestDate,
                urltext: "Back To Family Care Website",
                url: "https://familycarehospitals.com/#/",
                message: "Please Try Again.",
              };
              // var sendData = { 'amount':  0, 'id': 0, "name": req.body.udf1,   "icon" : ' far fa-times-circle text-danger',"date": latestDate, "urltext" : 'Back To Family Care Website',  "url" : 'https://testnew.familycarehospitals.com/#/',   "message" : 'Please Try Again.'}
              //Added by Prakash
              if (data.transactionType === "pharmacy") {
                const cartDetails = yield cart_model_1.cartSchema
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
              const queryPrams = {
                error: err,
                tranType:data.transactionType,
                payStat:"Failed"
              };
              const queryString = Object.keys(queryPrams)
                .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                .join('&');  
              resp.redirect(`${redirectUrl}${queryString}`);
              // res.render("paymentunsuccessful", { sendData: sendData });
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
              //  var sendData = { 'amount':  0, 'id': data.mer_txn, "name": req.body.udf1,   "icon" : ' far fa-times-circle text-danger',"date": latestDate, "urltext" : 'Back To Family Care Website',  "url" : 'https://testnew.familycarehospitals.com/#/'}

              res.render("pendingurl", { sendData: sendData });
            }
          } else {
            res.status(200).send({
              success: false,
              data: "Payment Not Found.",
            });
          }
        })
    );
  });
exports.checkBankPaymentStatus = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    const merchantId = "62021";
    let subject;
    let content;
    try {
      const data = yield payment_model_1.default.findOne({
        _id: req.query.paymentId,
      });
      //const pharmacy = yield pharmacy_model_1.default.findOne({ "_id": data.orderId });
      const userData = yield user_model_1.default.findOne({ _id: data.user });
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
      }
      if (
        data &&
        (data.status == "success" ||
          data.f_code == "Ok" ||
          data.status == "cancelled" ||
          data.status == "failed")
      ) {
        if (data.status == "success" || data.f_code == "Ok") {
          var valid = true;
          //utility_1.sendEmailToAdmin('Pharmacy Order', '<p>' + pharmacy.user.fname + ' ' + pharmacy.user.lname + ' has ordered please check order.</p>', 'html');
          updateRecord(data, valid, userData, function (err, resp) {
            res.status(200).send({
              success: true,
              data: "Payment Successful..",
            });
          });
        } else if (data.status == "pending") {
          var valid = false;
          updateRecord(data, valid, userData, function (err, resp) {
            res.status(200).send({
              success: false,
              data: "Payment pending..",
            });
          });
        } 
        else {
          var valid = false;
          updateRecord(data, valid, userData, function (err, resp) {
            res.status(200).send({
              success: false,
              data: "Payment failed. Try again..",
            });
          });
        }
      } else {
        superagent_1.default
          .post(
            "https://payment.atomtech.in/paynetz/vfts?merchantid=" +
              merchantId +
              "&merchanttxnid=" +
              data.mer_txn +
              "&amt=" +
              data.amount +
              "&tdate=" +
              data.dateObj
          )
          .end(function (err, response) {
            return __awaiter(this, void 0, void 0, function* () {
              if (err) {
                res.status(421).send({
                  success: false,
                  err: err,
                });
              } else {
                console.log("STATUS: " + response.statusCode);
                let status;
                const json = xml2json_1.default.toJson(response.text);
                response = JSON.parse(json);
                console.log("status response from superagent-------", response);
                if (response.VerifyOutput.VERIFIED == "SUCCESS") {
                  status = "success";
                } else {
                  status = "failed";
                }
                data.merchant_id = response.VerifyOutput.MerchantID;
                data.mer_txn = response.VerifyOutput.MerchantTxnID;
                data.amt = response.VerifyOutput.AMT;
                data.verified = response.VerifyOutput.VERIFIED;
                data.bid = response.VerifyOutput.BID;
                data.bank_name = response.VerifyOutput.bankname;
                data.mmp_txn = response.VerifyOutput.atomtxnId;
                data.discriminator = response.VerifyOutput.discriminator;
                data.surcharge = response.VerifyOutput.surcharge;
                data.CardNumber = response.VerifyOutput.CardNumber;
                data.date = response.VerifyOutput.TxnDate;
                data.udf9 = response.VerifyOutput.UDF9;
                data.reconstatus = response.VerifyOutput.reconstatus;
                data.sdt = response.VerifyOutput.sdt;
                const transaction = new transaction_model_1.default({
                  payment: data._id,
                  TransactionId: data.mer_txn,
                  transactionType: data.transactionType,
                  amount: data.amount,
                  user: data.user,
                  orderId: data.orderId,
                  date: moment_1.default(data.date).tz("Asia/Kolkata").format(),
                  transactionStatus: "paid",
                  status: status,
                  payThrough: "bank",
                });
                yield Promise.all([transaction.save(), data.save()]);
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
                      yield consultancy_model_1.default.findOneAndUpdate(
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
                      moment_1
                        .default(req.body.date)
                        .tz("Asia/Kolkata")
                        .format("YYYY-MM-DD") +
                      " \n of amount " +
                      data.amount;
                    console.log("result CONSULTANCY>>>>>>>>>>>", result);
                    const userData = yield user_model_1.default.findOne({
                      _id: data.user,
                    });

                    //called data for mail
                    const doctorDetails =
                      yield consultancy_model_1.allDoctorSchema.findOne({
                        _id: mongoose_1.default.Types.ObjectId(result.doctor),
                      });
                    // const specialityDetails = yield consultancy_model_1.newSpecialitySchema.findOne({ "_id": mongoose_1.default.Types.ObjectId(result.speciality) });

                    const adminData = yield admin_model_1.default
                      .findOneAndUpdate(
                        {},
                        { $inc: { count: 1 } },
                        { new: true }
                      )
                      .lean();
                    //send and save notification
                    const notify = yield notification_model_1.default.findOne({
                      user: result.user,
                      appointmentId: result.consultancyId,
                    });
                    if (notify) {
                      // if (notify.assigndoctor == false) {
                      notify.assigndoctor = true;
                      notify.doctor = doctorDetails._id;
                      notify.type = "Consultancy";
                      notify.status = "Accepted"; //"In Progress";
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
                      //"Your Pharmacy order has been confirmed for " + notify.date + " at " + notify.time + " with " + pathoData.name + ", your pharmacy id: " + notify.appointmentId;
                      notify.doctormessage =
                        "Your consultancy has been confirmed for " +
                        notify.date +
                        " at " +
                        notify.time +
                        " your pharmacy id: " +
                        notify.appointmentId;
                      notify.save();
                      if (result.user) {
                        console.log("hii ravi", result.user);
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
                        //"Hi, your consultancy is currently being processed. You will receive the live consultancy confirmation shortly via email/ SMS";
                        info.type = "Consultancy";
                        info.status = "Accepted"; //"In Progress";
                        info.sendTo = "user";
                        push_controller_1.sendNotification(info);
                        // console.log("raaaa===>>", info);
                        info = {};
                        console.log(
                          "rrrrr========",
                          adminData.count,
                          adminData._id
                        );
                        const sendCount = yield socket_1.sendMessage(
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
                      yield pharmacy_model_1.default.findOneAndUpdate(
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
                    const userData = yield user_model_1.default.findOne({
                      _id: data.user,
                    });
                    const cartData =
                      yield pharmacist_model_1.cartSchema.findOne({
                        _id: result.cartId,
                      });

                    let dispatchedAddress = {};
                    userData.address.forEach((element) => {
                      if (result.dispatched_address == element._id) {
                        dispatchedAddress = element;
                      }
                    });
                    const adminData = yield admin_model_1.default
                      .findOneAndUpdate(
                        {},
                        { $inc: { count: 1 } },
                        { new: true }
                      )
                      .lean();
                    //send and save notification
                    const notify = yield notification_model_1.default.findOne({
                      user: result.user,
                      appointmentId: result.pharmacyId,
                    });
                    if (notify) {
                      // if (notify.assigndoctor == false) {
                      notify.assigndoctor = true;
                      // notify.doctor = pathoDetails._id;
                      notify.type = "Order";
                      notify.status = "In Progress";
                      notify.usermessage =
                        "Hi, your pharmacy order is currently being processed. You will receive an order confirmation shortly via email/ SMS";
                      //"Your Pharmacy order has been confirmed for " + notify.date + " at " + notify.time + " with " + pathoData.name + ", your pharmacy id: " + notify.appointmentId;
                      notify.doctormessage =
                        "Your Pharmacy order has been confirmed for " +
                        notify.date +
                        " at " +
                        notify.time +
                        ". your pharmacy id: " +
                        notify.appointmentId;
                      notify.save();
                      if (result.user) {
                        console.log("hii ravi", result.user);
                        var info = {};
                        info.userId = result.user._id;
                        info.usercount = adminData.count;
                        info.notification =
                          "Hi, your pharmacy order is currently being processed. You will receive an order confirmation shortly via email/ SMS";
                        info.type = "Order";
                        info.status = "In Progress";
                        info.sendTo = "user";
                        push_controller_1.sendNotification(info);
                        // console.log("raaaa===>>", info);
                        info = {};
                        console.log(
                          "rrrrr========",
                          adminData.count,
                          adminData._id
                        );
                        const sendCount = yield socket_1.sendMessage(
                          adminData.count,
                          result.user._id
                        );
                        console.log("sendCount ", sendCount);
                      }
                      //Added by Prakash
                      if (data.transactionType === "pharmacy") {
                        const cartDetails = yield cart_model_1.cartSchema
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
                    var subject = "Your FamilyCare Pharmacy Order Placed";
                    console.log("Subject------------", subject);

                    var data = {
                      subject: subject,
                      result: result,
                      userData: userData,
                      cartData: cartData,
                      dispatchedAddress: dispatchedAddress,
                    };
                    console.log("data------------", data);
                    //   dataHelper_1.
                    addHelpers(data);
                    console.log(
                      "data=============",
                      path_1.default.join(
                        process.cwd(),
                        "dist/templates",
                        `order_placed_mail.hbs`
                      )
                    );
                    // res.render(`order_mail.hbs`)
                    const content = compile("order_placed_mail", data)
                      .then(function (response) {
                        console.log(
                          "respozcvsxczvcxzxzxzxzxzxzxzxzxzxzxzxzxzxzxzxznse",
                          response
                        );
                        if (response) {
                          utility_1.sendEmailToPatient(
                            userData.email, //'khedekarpragati@gmail.com',
                            subject,
                            response,
                            "html"
                          );

                          // res.status(200).send({
                          //     success: true,
                          //     data: "Payment Successful",
                          // });
                        }
                      })
                      .catch(function (err) {
                        console.log(err);
                      });
                  } else if (data.transactionType === "nursing") {
                    const result =
                      yield nursing_model_1.default.findOneAndUpdate(
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
                      moment_1
                        .default(req.body.date)
                        .tz("Asia/Kolkata")
                        .format("YYYY-MM-DD") +
                      " \n of amount " +
                      data.amount;
                    console.log("result>>>>>>>>>>>", result);
                  } else if (data.transactionType === "home-appointment") {
                    const result =
                      yield home_appointment_model_1.default.findOneAndUpdate(
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
                      moment_1
                        .default(req.body.date)
                        .tz("Asia/Kolkata")
                        .format("YYYY-MM-DD") +
                      " \n of amount " +
                      data.amount;
                    console.log("result>>>>>>>>>>>", result);
                  } else if (data.transactionType === "appointment") {
                    const result =
                      yield appointment_model_1.default.findOneAndUpdate(
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
                      moment_1
                        .default(req.body.date)
                        .tz("Asia/Kolkata")
                        .format("YYYY-MM-DD") +
                      " \n of amount " +
                      data.amount;
                    console.log("result>>>>>>>>>>>", result);
                  }else if (data.transactionType === "newliveconsultancy") {
                    const result =
                      yield consultancy_model_1.liveNewConsultancySchema.findOneAndUpdate(
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
                      moment_1
                        .default(req.body.date)
                        .tz("Asia/Kolkata")
                        .format("YYYY-MM-DD") +
                      " \n of amount " +
                      data.amount;
                    console.log("bank status checked for newliveconsultancy", result);
                  }else if (data.transactionType === "diagnostic") {
                    const result =
                      yield diagnostic_model_1.default.findOneAndUpdate(
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
                      moment_1
                        .default(req.body.date)
                        .tz("Asia/Kolkata")
                        .format("YYYY-MM-DD") +
                      " \n of amount " +
                      data.amount;
                    console.log("result>>>>>>>>>>>", result);
                  }
                  const user = yield user_model_2.default
                    .findOne({ _id: data.user })
                    .lean();
                  if (user.email) {
                    yield utility.sendEmailForDoctor(
                      user.email,
                      subject,
                      content,
                      "text/html"
                    );
                  }
                  console.log(
                    "i AM GOING OUT OF THIS API",
                    content,
                    response.VerifyOutput.atomtxnId
                  );
                  res.status(200).send({
                    success: true,
                    data: "Payment Successful",
                  });
                } 
                else {
                  if (data.transactionType === "consultancy") {
                    const result =
                      yield consultancy_model_1.default.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: { transaction: transaction._id, valid: false },
                        },
                        { new: true }
                      );
                    console.log("result>>>>>>>>>>>", result);
                  } else if (data.transactionType === "pharmacy") {
                    const result =
                      yield pharmacy_model_1.default.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: { transaction: transaction._id, valid: false },
                        },
                        { new: true }
                      );
                    console.log("result>>>>>>>>>>>", result);
                    //Added by Prakash

                    const cartDetails = yield cart_model_1.cartSchema
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
                      yield nursing_model_1.default.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: { transaction: transaction._id, valid: false },
                        },
                        { new: true }
                      );
                    console.log("result>>>>>>>>>>>", result);
                  } else if (data.transactionType === "home-appointment") {
                    const result =
                      yield home_appointment_model_1.default.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: { transaction: transaction._id, valid: false },
                        },
                        { new: true }
                      );
                    console.log("result>>>>>>>>>>>", result);
                  } else if (data.transactionType === "appointment") {
                    const result =
                      yield appointment_model_1.default.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: { transaction: transaction._id, valid: false },
                        },
                        { new: true }
                      );
                    console.log("result>>>>>>>>>>>", result);
                  }else if (data.transactionType === "newliveconsultancy") {
                    const result =
                      yield consultancy_model_1.liveNewConsultancySchema.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: { transaction: transaction._id, valid: false },
                        },
                        { new: true }
                      );
                    // console.log("result>>>>>>>>>>>", result);
                    console.log("bank status checked for new live consultancy", result);
                  } else if (data.transactionType === "diagnostic") {
                    const result =
                      yield diagnostic_model_1.default.findOneAndUpdate(
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
              }
            });
          });
      }

      // zee code save userlogs
      const userlog = {
        _id: data.user,
        ModuleName:"payment",
        Action:"View",
        RowStatus:0,
        loginFrom:"Patient App"
      }
      saveUserlog(userlog)

    } catch (err) {
      res.status(500).send({
        success: false,
        error: err,
      });
    }
  });


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
      // 'Your appointment has been confirmed for ' + notify.date + ' at ' + notify.time + ' with Dr. ' + doctorData.name + ', your appointment id: ' + notify.appointmentId
      // msg:'Dear Dr.' + data.name +  'your given documents and education details correct now you can login to family care app, thank you.'
    };
    const to = "91" + smsData.mobileNo;
    const msg = smsData.msg;
    // const url = "http://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=DMMOBAPP&pwd=D3M0B@P6&sender=DMONEY&mobile=" + to + "&msg=" + msg + "&mt=0";
    //const url = "https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=" + to + "&msg=" + msg + "&mt=0";
    const url =
      "https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=" +
      to +
      "&msg=" +
      msg +
      "&mt=0";
    superagent_1.default.get(url).end(function (err, response) {
      if (err) {
        console.log("function error");
      } else {
        user_model_1.default.updateMany(
          {
            phone: phoneno,
            phoneisverified: false,
          },
          {
            $set: {
              otp: OTP,
            },
          },
          {
            new: true,
          },
          function (err, data) {
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

function sendPackageSms() {
  console.log(data);
  var phoneno = data.phone;
  if (!phoneno) {
    console.log("data not found");
  } else {
    const OTP = Math.floor(1000 + Math.random() * 9000);
    const smsData = {
      mobileNo: phoneno,
      msg: "Hi ! Thank you for using the Family Care Hospitals App. Your diagnostic test order has been received and is now being processed.",
      //"Hi, your Diagnostic Test is currently being processed. You'll soon receive an email regarding the confirmation of the order placed."
      //"Hi, thank you for using FCH app. Your pharmacy order is currently being processed. You'll soon receive an email regarding the confirmation of the order placed."
      // 'Your appointment has been confirmed for ' + notify.date + ' at ' + notify.time + ' with Dr. ' + doctorData.name + ', your appointment id: ' + notify.appointmentId
      // msg:'Dear Dr.' + data.name +  'your given documents and education details correct now you can login to family care app, thank you.'
    };
    const to = "91" + smsData.mobileNo;
    const msg = smsData.msg;
    // const url = "http://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=DMMOBAPP&pwd=D3M0B@P6&sender=DMONEY&mobile=" + to + "&msg=" + msg + "&mt=0";
    //const url = "https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=" + to + "&msg=" + msg + "&mt=0";
    const url =
      "https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=" +
      to +
      "&msg=" +
      msg +
      "&mt=0";
    superagent_1.default.get(url).end(function (err, response) {
      if (err) {
        console.log("function error");
      } else {
        user_model_1.default.updateMany(
          {
            phone: phoneno,
            phoneisverified: false,
          },
          {
            $set: {
              otp: OTP,
            },
          },
          {
            new: true,
          },
          function (err, data) {
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
    superagent_1.default.get(url).end(function (err, response) {
      if (err) {
        console.log("function error");
      } else {
        console.log("Booked consultancy Successfully");
      }
    });
  }
}

const compile = async function (templateName, data) {
  const filePath3 = path_1.default.join(
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
  // return __awaiter(this, void 0, void 0, function* () {
  Handlebars.registerHelper("pharmacyId", function (data) {
    console.log(
      "dataa.result.pharmacyId------------------",
      dataa.result.pharmacyId
    );
    return dataa.result.pharmacyId;
  });
  // Handlebars.registerHelper('status', function (data) {
  //     console.log("dataa.result.status------------------", dataa.result.status);
  //     return dataa.result.status
  // });
  Handlebars.registerHelper("fname", function (data) {
    console.log("dataa.userData.fname------------------", dataa.userData.fname);
    return dataa.userData.fname;
  });
  Handlebars.registerHelper("payment_method", function (data) {
    // console.log("dataa.result.payment_method------------------", dataa.result.payment_method);
    return "Prepaid";
  });
  Handlebars.registerHelper("lname", function (data) {
    console.log("dataa.userData.lname------------------", dataa.userData.lname);
    return dataa.userData.lname;
  });
  Handlebars.registerHelper("email", function (data) {
    console.log("dataa.userData.email------------------", dataa.userData.email);
    return dataa.userData.email;
  });
  Handlebars.registerHelper("phone", function (data) {
    console.log("dataa.userData.phone------------------", dataa.userData.phone);
    return dataa.userData.phone;
  });

  Handlebars.registerHelper("subject", function (data) {
    console.log("dataa.subject------------------", dataa.subject);
    return dataa.subject;
  });
  Handlebars.registerHelper("medicines", function (data) {
    console.log(
      "dataa.cartData.medicines------------------",
      dataa.cartData.medicines
    );
    return dataa.cartData.medicines;
  });
  Handlebars.registerHelper("ShippingCharge", function (data) {
    console.log(
      "dataa.cartData.delivery_charge------------------",
      dataa.cartData.medicines
    );
    return dataa.cartData.delivery_charge;
  });
  Handlebars.registerHelper("TotalPaidCharge", function (data) {
    console.log(
      "dataa.cartData.totalPaidAmount------------------",
      dataa.cartData.medicines
    );
    return dataa.cartData.totalPaidAmount;
  });
  Handlebars.registerHelper("totalActualAmount", function (data) {
    console.log(
      "dataa.cartData.totalActualAmount------------------",
      dataa.cartData.medicines
    );
    return dataa.cartData.totalActualAmount;
  });
  Handlebars.registerHelper("discountedValue", function (data) {
    console.log(
      "dataa.cartData.totalDiscount------------------",
      dataa.cartData.medicines
    );
    return dataa.cartData.totalDiscount;
  });
  Handlebars.registerHelper("dispatchedAddress", function (data) {
    console.log(
      "dataa.dispatchedAddress------------------",
      dataa.dispatchedAddress
    );
    return dataa.dispatchedAddress;
  });
}

function updateRecord(data, valid, userData, cb) {
  console.log(
    userData,
    "data--------in UpdateRecord---------",
    data,
    "--status-- value-----",
    valid
  );
  // Not updating transaction ID here.....for all type of status
  if (data.transactionType === "consultancy") {
    if (valid) {
      utility.sendEmailToAdmin(
        "Live Consultancy",
        "<p>" +
          userData.fname +
          " " +
          userData.lname +
          " has booked online appointment please check order.</p>",
        "html"
      );

      var result,
        userData,
        adminData,
        notify,
        doctorDetails,
        sendCount,
        notify,
        info = {};
      const transaction = new transaction_model_1.default({
        payment: data._id,
        TransactionId: data.mer_txn,
        transactionType: data.transactionType,
        amount: data.amount,
        user: data.user,
        orderId: data.orderId,
        date: moment_1.default(data.date).tz("Asia/Kolkata").format(),
        transactionStatus: "paid",
        status: data.status,
        payThrough: "bank",
      });
      transaction.save();
      console.log("transaction==========", transaction);
      consultancy_model_1.default
        .findOneAndUpdate(
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

            consultancy_model_1.allDoctorSchema.findOne(
              { _id: mongoose_1.default.Types.ObjectId(result.doctor) },
              function (error, resp) {
                console.log("Got new doctors data-------", resp);
                doctorDetails = resp;
                //content = data.transactionType + " Received Order number: " + transaction._id + " Received on: " + moment_1.default(req.body.date).tz('Asia/Kolkata').format("YYYY-MM-DD") + " \n of amount " + data.amount;
                console.log("result CONSULTANCY>>>>>>>>>>>", result);

                user_model_1.default.findOne(
                  { _id: data.user },
                  function (ee, re) {
                    userData = re;
                  }
                );
                admin_model_1.default.findOneAndUpdate(
                  {},
                  { $inc: { count: 1 } },
                  { new: true },
                  function (ee, ress) {
                    adminData = ress;
                  }
                );
                //send and save notification
                notification_model_1.default.findOne(
                  { user: result.user, appointmentId: result.consultancyId },
                  function (ee, rre) {
                    notify = rre;

                    if (notify) {
                      // if (notify.assigndoctor == false) {
                      notify.assigndoctor = true;
                      notify.doctor = doctorDetails._id;
                      notify.type = "Consultancy";
                      notify.status = "In Progress";
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
                      notify.save();
                      if (result.user) {
                        console.log("hii ravi", result.user);
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
                        info.status = "In Progress";

                        info.sendTo = "user";
                        push_controller_1.sendNotification(info);
                        // console.log("raaaa===>>", info);
                        info = {};
                        console.log(
                          "rrrrr========",
                          adminData.count,
                          adminData._id
                        );
                        var sendCount;
                        socket_1.sendMessage(
                          adminData.count,
                          result.user._id,
                          function (e, r) {
                            sendCount = r;
                          }
                        );
                        console.log("sendCount ", sendCount);
                        sendConsultancySms(doctorDetails, userData, notify);
                      }
                    } else {
                      console.log("not find any such type of notification ");
                    }
                  }
                );
                // Send SMS To Patient
                //sendConsultancySms(doctorDetails, userData, notify);
              }
            );
          }
        )
        .lean();

      var subject = "Your FamilyCare Live Consultancy Booked";
      console.log("Subject------------", subject);

      var data = {
        subject: subject,
        result: result,
        userData: userData,
        // cartData: cartData,
        // dispatchedAddress: dispatchedAddress
      };
      console.log("data------------", data);
      //   dataHelper_1.
      consultancyHelper(data);
      console.log(
        "data=============",
        path_1.default.join(
          process.cwd(),
          "dist/templates",
          `live_consultancy_mail.hbs`
        )
      );
      // res.render(`order_mail.hbs`)
      const content = compile("live_consultancy_mail", data)
        .then(function (response) {
          console.log(
            "respozcvsxczvcxzxzxzxzxzxzxzxzxzxzxzxzxzxzxzxznse",
            response
          );
          if (response) {
            utility_1.sendEmailToPatient(
              userData.email, //'khedekarpragati@gmail.com',
              subject,
              response,
              "html"
            );

            // res.status(200).send({
            //     success: true,
            //     data: "Payment Successful",
            // });
          }
        })
        .catch(function (err) {
          console.log(err);
        });
    }
    consultancy_model_1.default.findOneAndUpdate(
      { _id: data.orderId },
      {
        $set: { valid: valid, payThrough: "bank", paymentStatus: data.status },
      },
      { new: true },
      function (e, r) {
        if (e) {
          cb(e, null);
        } else {
          cb(null, r);
        }
      }
    );
  } else if (
    data.transactionType === "package" ||
    "package-hospital" ||
    "package-home"
  ) {
    if (valid) {
      utility.sendEmailToAdmin(
        "Package Book",
        "<p>" +
          userData.fname +
          " " +
          userData.lname +
          " has ordered please check order.</p>",
        "html"
      );
    }

    // const result = yield admin_model_1.default.findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true }).lean();
    // const userData = yield user_model_1.default.findOne({ "_id": data.user });
    //send and save notification
    // const notify = yield notification_model_1.default.findOne({ user: result.user, appointmentId: result.package_records_Id });

    /*  var result;
        admin_model_1.default.findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true }, function(e, r) {
            result = r;
        }).lean();
        var userData;
        user_model_1.default.findOne({ "_id": data.user }, function(ee, re) {
            userData = re;
        });
        var notify;
        notification_model_1.default.findOne({ user: result.user, appointmentId: result.package_records_Id }, function(eee, rrr) {
            notify = rrr;
        });

        if (notify) {
            // if (notify.assigndoctor == false) {
            notify.assigndoctor = true;
            // notify.doctor = pathoDetails._id;
            notify.type = "Order";
            notify.status = "Pending";
            notify.usermessage = "Hi ! Thank you for using the Family Care Hospitals App. Your diagnostic test order has been received and is now being processed.";
            //"Your Pharmacy order has been confirmed for " + notify.date + " at " + notify.time + " with " + pathoData.name + ", your pharmacy id: " + notify.appointmentId;
            notify.doctormessage = "Your package order has been confirmed for " + notify.date + " at " + notify.time + " your package order id: " + notify.appointmentId;
            notify.save();
            if (result.user) {
                console.log("hii ravi", result.user);
                info.userId = result.user._id;
                info.usercount = adminData.count;
                info.notification = "Hi ! Thank you for using the Family Care Hospitals App. Your diagnostic test order has been received and is now being processed.";
                info.type = 'Package';
                info.status = "Pending";
                info.sendTo = "user";
                push_controller_1.sendNotification(info);
                // console.log("raaaa===>>", info);
                info = {};
                console.log("rrrrr========", adminData.count, adminData._id);
               // const sendCount = yield socket_1.sendMessage(adminData.count, result.user._id);
                socket_1.sendMessage(adminData.count, result.user._id, function(e, r) {
                      console.log("sendCount-------", r);
                      sendCount = r;
                });

                console.log("sendCount ", sendCount);
            }
        }
        else {
            console.log("not find any such type of notification ");
        }
        // Send SMS To Patient
        sendPackageSms(userData,notify);

        // console.log("dispatchedAddress------------", dispatchedAddress);
        //var subject = "Your FamilyCare Package Order Placed";
        //console.log("Subject------------", subject);

        //var data = {
        //    subject: subject,
        //    result: result,
        //    userData: userData,
        //    // cartData: cartData,
        //    // dispatchedAddress: dispatchedAddress
        //};
        //console.log("data------------", data);
        //   dataHelper_1.
       // addHelpers(data);
       // console.log("data=============", path_1.default.join(process.cwd(), 'dist/templates', `order_placed_mail.hbs`));
        // res.render(`order_mail.hbs`)

        //PACKAGE ORDER PLACED EMAIL CONTENT PENDING
        // const content = compile('order_placed_mail', data).then(function (response) {
        //     console.log("respozcvsxczvcxzxzxzxzxzxzxzxzxzxzxzxzxzxzxzxznse", response)
        //     if (response) {
        //         utility_1.sendEmailToPatient(userData.email, //'khedekarpragati@gmail.com',
        //             subject,
        //             response,
        //             'html');
        //     }
        // }).catch(function (err) {
        //     console.log(err);
        // });
*/
    package_model_1.packagerecords.findOneAndUpdate(
      { _id: data.orderId },
      { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
      { new: true },
      function (e, r) {
        if (e) {
          cb(e, null);
        } else {
          cb(null, r);
        }
      }
    );
  } else if (
    data.transactionType === "offernew" ||
    "offernew-home" ||
    "offernew-hospital"
  ) {
    if (valid) {
      utility.sendEmailToAdmin(
        "Package Book",
        "<p>" +
          userData.fname +
          " " +
          userData.lname +
          " has ordered please check order.</p>",
        "html"
      );
    }
    offernew_model_1.offerrecord.findOneAndUpdate(
      { _id: data.orderId },
      { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
      { new: true },
      function (e, r) {
        if (e) {
          cb(e, null);
        } else {
          cb(null, r);
        }
      }
    );
  } else if (data.transactionType === "pharmacy") {
    /*if(valid) {
            utility.sendEmailToAdmin('Pharmacy Order', '<p>' + userData.fname + ' ' + userData.lname + ' has ordered please check order.</p> \n Contact Number: ' + userData.phone + ' \n Amount: ' +  data.TotalCharge, 'html');
        }*/
    pharmacy_model_1.default.findOneAndUpdate(
      { _id: data.orderId },
      { $set: { valid: valid, payThrough: "bank", status: "Pending" } },
      { new: true },
      function (e, r) {
        console.log("pharmacy updateRecord function=====", e, r);
        if (e) {
          cb(e, null);
        } else {
          if (valid) {
            utility.sendEmailToAdmin(
              "Pharmacy Order",
              "<p>" +
                userData.fname +
                " " +
                userData.lname +
                " has ordered please check order.</p> \n Contact Number: " +
                userData.phone +
                " \n Amount: " +
                r.TotalCharge,
              "html"
            );
          }
          cb(null, r);
        }
      }
    );
  } else if (data.transactionType === "nursing") {
    nursing_model_1.default.findOneAndUpdate(
      { _id: data.orderId },
      { $set: { valid: valid, payThrough: "bank", status: data.status } },
      { new: true },
      function (e, r) {
        if (e) {
          cb(e, null);
        } else {
          cb(null, r);
        }
      }
    );
  } else if (data.transactionType === "home-appointment") {
    home_appointment_model_1.default.findOneAndUpdate(
      { _id: data.orderId },
      { $set: { valid: valid, payThrough: "bank", status: data.status } },
      { new: true },
      function (e, r) {
        if (e) {
          cb(e, null);
        } else {
          cb(null, r);
        }
      }
    );
  } else if (data.transactionType === "appointment") {
    appointment_model_1.default.findOneAndUpdate(
      { _id: data.orderId },
      {
        $set: {
          valid: valid,
          payStatus: "completed",
          payThrough: "bank",
          status: data.status,
        },
      },
      { new: true },
      function (e, r) {
        if (e) {
          cb(e, null);
        } else {
          cb(null, r);
        }
      }
    );
  } else if (data.transactionType === "diagnostic") {
    diagnostic_model_1.default.findOneAndUpdate(
      { _id: data.orderId },
      {
        $set: {
          valid: valid,
          payThrough: "bank",
          status: data.status,
        },
      },
      { new: true },
      function (e, r) {
        if (e) {
          cb(e, null);
        } else {
          cb(null, r);
        }
      }
    );
  }
}
// wallet func
exports.walletRedirect = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    // console.log("Payment Redirected", req.body);
    // console.log(req.body)
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
    const key = "dd05870673e1975873"; // '03f7ec378b11afa941';
    function sig(str, key) {
      return crypto
        .createHmac("sha512", key)
        .update(new Buffer(str, "utf-8"))
        .digest("hex");
    }
    const sign = sig(str, key);
    console.log("Response=>" + JSON.stringify(req.body));
    let status;
    const paid = yield payment_model_1.default
      .findOne({ mer_txn: req.body.mer_txn })
      .lean();
    if (req.body.f_code == "Ok") {
      status = "success";
    } else if (req.body.f_code == "F") {
      status = "failed";
    } else if (req.body.f_code == "C") {
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
    if (paid.f_code == "F" || paid.f_code == "C") {
      res.status(200).send({
        success: false,
        data: "Payment failed. Try Again.",
      });
    } else if (paid.f_code == "Ok") {
      res.status(200).send({
        success: true,
        data: "Payment successful. Try Again.",
      });
    } else {
      console.log("condition", condition);
      payment_model_1.default.findOneAndUpdate(
        { mer_txn: req.body.mer_txn },
        { $set: condition },
        { new: true },
        (err, data) =>
          __awaiter(this, void 0, void 0, function* () {
            console.log(err, data);
            if (err) {
              res.status(500).send({
                success: false,
                data: err,
              });
            }
            if (data) {
              const transaction = new transaction_model_1.default({
                payment: data._id,
                TransactionId: data.mer_txn,
                transactionType: data.transactionType,
                amount: req.body.amt,
                user: data.user,
                date: moment_1
                  .default(req.body.date)
                  .tz("Asia/Kolkata")
                  .format(),
                transactionStatus: "add",
                status: status,
              });
              yield transaction.save();
              console.log(transaction, "<><><><><>>>>>>><<<<<<transaction");
              if (
                req.body.f_code == "Ok" &&
                req.body.signature == sign &&
                data
              ) {
                const user = yield user_model_2.default
                  .findOne({ _id: data.user })
                  .lean();
                console.log(user, "<<<<<<<<<<<<<user");
                const newBalance =
                  parseInt(user.walletBalance, 10) + parseInt(req.body.amt, 10);
                const updated = yield user_model_2.default.update(
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
                  yield utility.sendEmailForDoctor(
                    user.email,
                    subject,
                    content,
                    "text/html"
                  );
                }
                res.status(200).send({
                  success: true,
                  data: "Payment Successful. Money addded into your wallet.",
                });
              } else if (status == "pending") {
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
          })
      );
    }
  });
exports.addIntoWallet = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    if (!req.query.amt || !req.query.custacc || !req.query.userId) {
      res.status(400).send({
        success: false,
        msg: "Enter All Details.",
      });
    }
    if (req.query.userId !== req.user._id) {
      res.status(400).send({
        success: false,
        msg: "User Id dose not match.",
      });
    } else {
      user_model_1.default.findOne({ _id: req.query.userId }, (err, data) => {
        if (err) {
          res.status(500).send({
            success: false,
            data: err,
          });
        }
        if (data && data._id) {
          const startingDay = moment_1
            .default(new Date())
            .tz("Asia/Kolkata")
            .format("MM/DD/YYYY");
          const dateObj = moment_1
            .default(new Date())
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");
          const login = "62021";
          const prodid = "SCANDEN";
          const pass = "SCANDEN@123";
          const transid = shortid_1.default.generate();
          const idBase = new Buffer(data.phone).toString("base64");
          const key = "ca449a91c50d923f24";
          const sign =
            login +
            pass +
            "NBFundTransfer" +
            prodid +
            transid +
            req.query.amt +
            "INR";
          console.log(sign, "<----sign");
          function sig(sign, key) {
            return crypto
              .createHmac("sha512", key)
              .update(new Buffer(sign, "utf-8"))
              .digest("hex");
          }
          const signature = sig(sign, key);
          const paymentData = {};
          paymentData.mer_txn = transid;
          paymentData.user = req.query.userId;
          paymentData.transactionType = req.query.transactionType;
          paymentData.customerAccount = req.query.custacc;
          paymentData.dateObj = dateObj;
          paymentData.amount = req.query.amt;
          const payData = new payment_model_1.default(paymentData);
          payData.save((err, data1) => {
            console.log(err, "payment data", data1);
          });
          // console.log("url;------->", "https://payment.atomtech.in/paynetz/epi/fts?login=" + login + "&pass=" + pass + "&ttype=NBFundTransfer&prodid=" + prodid + "&amt=" + req.query.amt + "&txncurr=INR&txnscamt=0&clientcode=" + encodeURIComponent(idBase) + "&txnid=" + transid + "&date=" + startingDay + "&custacc=" + req.query.custacc + '&udf2=' + data.email + '&udf3=' + data.phone + "&ru=https://familycare.sia.co.in/api/v1/payment/redirect&signature=" + signature);
          const options = {
            host: "https://payment.atomtech.in",
            // port: '443',
            path:
              "/paynetz/epi/fts?login=" +
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
              signature,
            method: "POST",
          };
          const url = options["host"] + options["path"];
          console.log(url);
          // res.redirect(url);
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
  });
exports.payThroughWallet = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    let subject;
    let content;
    if (
      !req.body.amt ||
      !req.body.userId ||
      !req.body.orderId ||
      !req.body.transactionType
    ) {
      res.status(400).send({
        success: false,
        msg: "Enter All Details.",
      });
    }
    if (req.body.userId !== req.user._id) {
      res.status(400).send({
        success: false,
        msg: "User Id dose not match.",
      });
    } else {
      user_model_1.default.findOne({ _id: req.body.userId }, (err, data) =>
        __awaiter(this, void 0, void 0, function* () {
          console.log(err, data, "<<<<<<<<<user");
          if (err) {
            res.status(500).send({
              success: false,
              data: err,
            });
          }
          if (data && data._id) {
            if (data.walletBalance >= req.body.amt) {
              const date = moment_1
                .default(new Date())
                .tz("Asia/Kolkata")
                .format("MM/DD/YYYY");
              const transid = shortid_1.default.generate();
              const paymentData = {};
              paymentData.mer_txn = transid;
              paymentData.user = req.body.userId;
              paymentData.bankId = req.body.bankId;
              paymentData.orderId = req.body.orderId;
              paymentData.transactionType = req.body.transactionType;
              paymentData.f_code = "Ok";
              paymentData.status = "success";
              const payData = new payment_model_1.default(paymentData);
              yield payData.save();
              console.log(payData, "<<<<<<>>>>>>>>paydata");
              const transaction = new transaction_model_1.default({
                payment: payData._id,
                TransactionId: transid,
                transactionType: req.body.transactionType,
                amount: req.body.amt,
                user: req.body.userId,
                orderId: req.body.orderId,
                date: moment_1.default(new Date()).tz("Asia/Kolkata").format(),
                transactionStatus: "paid",
                status: "success",
                payThrough: "wallet",
              });
              yield transaction.save();
              console.log(transaction, "<<<<<<<<<<<transaction");
              subject =
                "Your FamilyCare " +
                req.body.transactionType +
                " Confirmation (" +
                transaction._id +
                ")";
              if (req.body.transactionType === "consultancy") {
                const result =
                  yield consultancy_model_1.default.findOneAndUpdate(
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
                  " Received on: " +
                  moment_1
                    .default(req.body.date)
                    .tz("Asia/Kolkata")
                    .toISOString() +
                  " \n of Amount " +
                  req.body.amt;
                console.log(result, "<<<<<<<<<<<<<<<<<<result");
              } else if (req.body.transactionType === "pharmacy") {
                let field = "";
                const result = yield pharmacy_model_1.default.findOneAndUpdate(
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
                  req.body.transactionType +
                  " Order Confirmation " +
                  transaction._id;
                content =
                  req.body.transactionType +
                  " Received. \n Order number: " +
                  transaction._id +
                  " Received on: " +
                  moment_1
                    .default(req.body.date)
                    .tz("Asia/Kolkata")
                    .toISOString() +
                  " \n of Amount " +
                  req.body.amt +
                  " \n Order Detail(s) \n " +
                  field +
                  " Total Ammount" +
                  result.Charge;
                console.log(result, "<<<<<<<<<<<<<<<<<<result");
              } else if (req.body.transactionType === "nursing") {
                const result = yield nursing_model_1.default.findOneAndUpdate(
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
                  " Received on: " +
                  moment_1
                    .default(req.body.date)
                    .tz("Asia/Kolkata")
                    .toISOString() +
                  " \n of Amount " +
                  req.body.amt;
                console.log(result, "<<<<<<<<<<<<<<<<<<result");
              } else if (req.body.transactionType === "home-appointment") {
                const result =
                  yield home_appointment_model_1.default.findOneAndUpdate(
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
                  " Received on: " +
                  moment_1
                    .default(req.body.date)
                    .tz("Asia/Kolkata")
                    .toISOString() +
                  " \n of Amount " +
                  req.body.amt;
                console.log(result, "<<<<<<<<<<<<<<<<<<result");
              } else if (req.body.transactionType === "appointment") {
                const result =
                  yield appointment_model_1.default.findOneAndUpdate(
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
                  " Received on: " +
                  moment_1
                    .default(req.body.date)
                    .tz("Asia/Kolkata")
                    .toISOString() +
                  " \n of Amount " +
                  req.body.amt;
                console.log(result, "<<<<<<<<<<<<<<<<<<result");
              } else if (req.body.transactionType === "diagnostic") {
                const result =
                  yield diagnostic_model_1.default.findOneAndUpdate(
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
                  " Received on: " +
                  moment_1
                    .default(req.body.date)
                    .tz("Asia/Kolkata")
                    .toISOString() +
                  " \n of Amount " +
                  req.body.amt;
                console.log(result, "<<<<<<<<<<<<<<<<<<result");
              }
              const newBalance =
                parseInt(data.walletBalance, 10) - parseInt(req.body.amt, 10);
              const updated = yield user_model_2.default.update(
                { _id: data._id },
                { $set: { walletBalance: newBalance } }
              );
              if (data.email) {
                yield utility.sendEmailForDoctor(
                  data.email,
                  subject,
                  content,
                  "text/html"
                );
              }
              console.log(updated, "<<<<<<<<<<<<<<<<<<<<<><>added balance");
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
        })
      );
    }
  });
exports.checkWalletPaymentStatus = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    const merchantId = "62021";
    let subject;
    let content;
    try {
      const data = yield payment_model_1.default.findOne({
        _id: req.query.paymentId,
      });
      console.log(
        "https://payment.atomtech.in/paynetz/vfts?merchantid=" +
          merchantId +
          "&merchanttxnid=" +
          data.mer_txn +
          "&amt=" +
          data.amount +
          "&tdate=" +
          data.dateObj
      );
      if (!data || data == undefined) {
        res.status(500).send({
          success: false,
          msg: "Payment id Not Found.",
        });
      }
      if (
        data &&
        (data.f_code == "Ok" || data.f_code == "F" || data.f_code == "C")
      ) {
        if (data.status == "success" || data.f_code == "Ok") {
          res.status(200).send({
            success: true,
            data: "Payment Successful. Money addded into your wallet.",
          });
        } else if (data.status == "pending") {
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
            data: "Payment failed. Try again.",
          });
        }
      } else {
        superagent_1.default
          .post(
            "https://payment.atomtech.in/paynetz/vfts?merchantid=" +
              merchantId +
              "&merchanttxnid=" +
              data.mer_txn +
              "&amt=" +
              data.amount +
              "&tdate=" +
              data.dateObj
          )
          .end(function (err, response) {
            return __awaiter(this, void 0, void 0, function* () {
              if (err) {
                res.status(421).send({
                  success: false,
                  err: err,
                });
              } else {
                console.log(
                  "STATUS:",
                  response.statusCode,
                  "https://payment.atomtech.in/paynetz/vfts?merchantid=" +
                    merchantId +
                    "&merchanttxnid=" +
                    data.mer_txn +
                    "&amt=" +
                    data.amount +
                    "&tdate=" +
                    data.dateObj
                );
                let status;
                const json = xml2json_1.default.toJson(response.text);
                response = JSON.parse(json);
                console.log(response, "<<<<<<<<<<respoinse");
                if (response.VerifyOutput.VERIFIED == "NODATA") {
                  status = "failed";
                } else {
                  status = "success";
                }
                data.merchant_id = response.VerifyOutput.MerchantID;
                data.mer_txn = response.VerifyOutput.MerchantTxnID;
                data.amt = response.VerifyOutput.AMT;
                data.verified = response.VerifyOutput.VERIFIED;
                data.bid = response.VerifyOutput.BID;
                data.bank_name = response.VerifyOutput.bankname;
                data.mmp_txn = response.VerifyOutput.atomtxnId;
                data.discriminator = response.VerifyOutput.discriminator;
                data.surcharge =
                  response.VerifyOutput.surcharge != "null"
                    ? response.VerifyOutput.surcharge
                    : 0;
                data.CardNumber = response.VerifyOutput.CardNumber;
                data.date = response.VerifyOutput.TxnDate
                  ? response.VerifyOutput.TxnDate
                  : data.date;
                data.udf9 = response.VerifyOutput.UDF9;
                data.reconstatus = response.VerifyOutput.reconstatus;
                data.sdt = response.VerifyOutput.sdt;
                const transaction = new transaction_model_1.default({
                  payment: data._id,
                  TransactionId: data.mer_txn,
                  transactionType: data.transactionType,
                  amount: data.amount,
                  user: data.user,
                  date: moment_1.default(data.date).tz("Asia/Kolkata").format(),
                  transactionStatus: "add",
                  status: status,
                  payThrough: "wallet",
                });
                Promise.all([yield transaction.save(), yield data.save()]);
                console.log(transaction, "<><><><><>>>>>>><<<<<<transaction");
                if (status == "success") {
                  const user = yield user_model_2.default
                    .findOne({ _id: data.user })
                    .lean();
                  console.log(user, "<<<<<<<<<<<<<user");
                  const newBalance =
                    parseInt(user.walletBalance, 10) +
                    parseInt(data.amount, 10);
                  const updated = yield user_model_2.default.update(
                    { _id: data.user },
                    { $set: { walletBalance: newBalance } }
                  );
                  console.log(">>>>>>>>>>>>>>>>>><<<<<updatedddd", updated);
                  // email send.
                  subject =
                    "Your FamilyCare " +
                    data.transactionType +
                    " Order Confirmation " +
                    transaction._id;
                  content =
                    req.body.amt +
                    " Added in your wallet successfully. Transaction Id: " +
                    transaction._id;
                  if (user.email) {
                    yield utility.sendEmailForDoctor(
                      user.email,
                      subject,
                      content,
                      "text/html"
                    );
                  }
                  res.status(200).send({
                    success: true,
                    data: "Payment Successful. Money addded into your wallet.",
                  });
                } else {
                  res.status(200).send({
                    success: false,
                    data: "Payment failed. Try again.",
                  });
                }
              }
            });
          });
      }
    } catch (err) {
      res.status(500).send({
        success: false,
        error: err,
      });
    }
  });
exports.addBackIntoWallet = function (orderId, type) {
  return __awaiter(this, void 0, void 0, function* () {
    let result;
    if (type === "consultancy") {
      result = yield consultancy_model_1.default
        .findOne({ _id: orderId, valid: true })
        .populate("transaction")
        .lean();
    } 
    else if (type === "consultancy") {
      result = yield consultancy_model_1.default
        .findOne({ _id: orderId, valid: true })
        .populate("transaction")
        .lean();
    } else if (type === "pharmacy") {
      result = yield pharmacy_model_1.default
        .findOne({ _id: orderId, valid: true })
        .populate("transaction")
        .lean();
    } else if (type === "nursing") {
      result = yield nursing_model_1.default
        .findOne({ _id: orderId, valid: true })
        .populate("transaction")
        .lean();
    } else if (type === "home-appointment") {
      result = yield home_appointment_model_1.default
        .findOne({ _id: orderId, valid: true })
        .populate("transaction")
        .lean();
    } else if (type === "appointment") {
      result = yield appointment_model_1.default
        .findOne({ _id: orderId, valid: true, payStatus: "completed" })
        .populate("transaction")
        .lean();
    } else if (type === "diagnostic") {
      result = yield diagnostic_model_1.default
        .findOne({ _id: orderId, valid: true })
        .populate("transaction")
        .lean();
    }
    if (
      result &&
      result.transaction &&
      result.transaction.status == "success"
    ) {
      const transaction = new transaction_model_1.default({
        TransactionId: shortid_1.default.generate(),
        transactionType: type,
        amount: result.Charge,
        user: result.user,
        date: moment_1.default(result.date).tz("Asia/Kolkata").format(),
        transactionStatus: "refund",
        status: "success",
        payThrough: result.payThrough,
      });
      yield transaction.save();
      // balance added
      const user = yield user_model_2.default
        .findOne({ _id: result.user })
        .lean();
      const newBalance =
        parseInt(user.walletBalance, 10) + parseInt(result.Charge, 10);
      const updated = yield user_model_2.default.update(
        { _id: result.user },
        { $set: { walletBalance: newBalance } }
      );
      // email send.
      const subject =
        "Your FamilyCare " + type + " Order cancelled " + transaction._id;
      const content =
        "Refunded amount of Rs " +
        result.amt +
        " will be Added in your wallet. Transaction Id: " +
        transaction._id;
      if (user.email) {
        yield utility.sendEmailForDoctor(
          user.email,
          subject,
          content,
          "text/html"
        );
      }
      return true;
    } else return false;
  });
};
// Bank registration Code
exports.addBankCodes = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    const bankDetail = {};
    bankDetail.bankNames = req.body.bankNames;
    bankDetail.atomBankCodes = req.body.atomBankCodes;
    const bankCodesAdd = new bankCodes_model_1.default(bankDetail);
    bankCodesAdd.save((err, data) => {
      if (err) {
        res.status(500).send({
          success: false,
          data: err,
        });
      } else {
        res.status(200).send({
          success: true,
          data: data,
        });
      }
    });
  });
exports.getBankCodes = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    try {
      const data = yield bankCodes_model_1.default.find({}).lean();
      res.status(200).send({
        success: true,
        data: data,
      });
    } catch (err) {
      res.status(500).send({
        success: false,
        error: err,
      });
    }
  });
exports.listOfPayment = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    try {
      const paymentData = yield payment_model_1.default
        .find({ user: req.query.userId })
        .sort({ _id: -1 })
        .exec();
      if (paymentData) {
        res.status(200).send({
          success: true,
          data: paymentData,
        });
      }
    } catch (Exception) {
      res.status(500).send({
        success: false,
        data: Exception,
      });
    }
  });
exports.getPaymentList = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("Inside payment list method------");
    try {
      const page = req.params.page == undefined ? 1 : req.params.page;
      const limit = 10;
      const Count = transaction_model_1.default.count({});
      const paymentData = transaction_model_1.default
        .find()
        .populate("user")
        .populate("payment")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      const result = yield Promise.all([paymentData, Count]);
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
  });

exports.getSearchField = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    try {
      let page = 1,
        limit = 10,
        skip = 0;
      if (req.query.page) {
        page = parseInt(req.query.page);
      }
      if (req.query.limit) {
        limit = parseInt(req.query.limit);
      }
      if (page > 1) {
        skip = (page - 1) * limit;
      }
      console.log("value from UI-------", page, limit, skip);
      if (req.query.name) {
        const Count = transaction_model_1.default.aggregate([
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
                // amount: { $regex: req.query.name, $options: 'i' },
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
        const paymentData = transaction_model_1.default
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
                  {
                    transactionType: { $regex: req.query.name, $options: "i" },
                  },
                  // amount: { $regex: req.query.name, $options: 'i' },
                  { status: { $regex: req.query.name, $options: "i" } },
                ],
              },
            },
          ])
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit);
        const result = yield Promise.all([paymentData, Count]);
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
  });
exports.filterPayment = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log(
      "=========Check data for filter coming in body==========",
      req.body
    );
    try {
      if (
        req.body.transaction_type == "" &&
        req.body.cust_name == "" &&
        req.body.status.length == 0 &&
        req.body.from_amt == "" &&
        req.body.to_amt == "" &&
        req.body.startDate == "" &&
        req.body.endDate == ""
      ) {
        res.status(400).send({
          success: false,
          err: "please select any given fields",
        });
      } else if (
        req.body.transaction_type == undefined &&
        req.body.cust_name == undefined &&
        req.body.status.length == 0 &&
        req.body.from_amt == undefined &&
        req.body.to_amt == undefined &&
        req.body.startDate == undefined &&
        req.body.endDate == undefined
      ) {
        res.status(400).send({
          success: false,
          err: "please select any given fields",
        });
      } else {
        const limit = 10;
        const condition = {};
        const page = req.params.page == undefined ? 1 : req.params.page;
        if (
          (req.body.startDate != "" && req.body.startDate != undefined) ||
          (req.body.endDate != "" && req.body.endDate != undefined)
        ) {
          condition.date = {};
          // condition.valid = true;
        }
        if (
          (req.body.from_amt != "" && req.body.from_amt != undefined) ||
          (req.body.to_amt != "" && req.body.to_amt != undefined)
        ) {
          condition.amount = {};
          // condition.valid = true;
        }
        if (
          req.body.transaction_type != "" &&
          req.body.transaction_type != undefined
        ) {
          condition.transactionType = new RegExp(
            req.body.transaction_type,
            "i"
          );
          // condition.transaction_type = new RegExp(req.body.transaction_type, "i");
          // condition.valid = true;
        }
        if (req.body.status.length != 0) {
          condition.status = { $in: req.body.status };
          // condition.valid = true;
        }
        if (req.body.startDate != "" && req.body.startDate != undefined) {
          // const sdateT = (req.body.startDate).split("-");
          // const dateTs = sdateT[1] + "-" + sdateT[0] + "-" + sdateT[2];
          // const sdate = moment_1.default(dateTs).startOf('day');

          const sdateT = req.body.startDate.split("-");
          const dateTs = sdateT[0] + "-" + sdateT[1] + "-" + sdateT[2];
          const time = moment_1.default(dateTs).startOf("day");
          console.log("Startdate is here-------------", time);
          condition.createdAt.$gte = time; //new Date(time + (11 / 2) * 60 * 60 * 1000);
        }
        if (req.body.endDate != "" && req.body.endDate != undefined) {
          const edateT = req.body.endDate.split("-");
          const dateTe = edateT[0] + "-" + edateT[1] + "-" + edateT[2];
          const time = moment_1.default(dateTe).endOf("day");
          console.log("Enddate is here---------------------", time);
          condition.createdAt.$lte = time; //new Date(time + (11 / 2) * 60 * 60 * 1000);
        }
        if (req.body.from_amt != "" && req.body.from_amt != undefined) {
          condition.amount.$gte = req.body.from_amt;
        }
        if (req.body.to_amt != "" && req.body.to_amt != undefined) {
          condition.amount.$lte = req.body.to_amt;
        }
        if (req.body.cust_name != "" && req.body.cust_name != undefined) {
          condition.userName = new RegExp(req.body.cust_name, "i");
          // condition.cust_name = { $elemMatch: { name: req.body.cust_name } };
        }
        console.log("condition=========", condition);
        const Count = transaction_model_1.default.count(condition);
        const paymentData = transaction_model_1.default
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
                TransactionId: { $first: "$TransactionId"           },
                transactionType: { $first: "$transactionTy pe" },
                status: { $first: "$status" }, 
                createdAt: { $first: "$created At" },
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
        const result = yield Promise.all([paymentData, Count]);
        console.log("filter final result------------", result);
        res.status(200).send({
          success: true,
          data: result[0],
          Count: result[1],
        });
      }
    } catch (error) {
      res.status(400).send({
        success: false,
        err: error,
      });
    }
  });

  