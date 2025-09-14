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
const user_model_1 = __importDefault(require("../user/user.model"));
const appointment_model_1 = __importDefault(
  require("../appointment/appointment.model")
);
const diagnostic_model_1 = __importDefault(
  require("../diagnostic/diagnostic.model")
);
const pharmacy_model_1 = __importDefault(require("../pharmacy/pharmacy.model"));
const user_model_2 = __importDefault(require("../user/user.model"));
const paytm_model_1 = __importDefault(require("./PayTm.model"));
const utility = require("../../util/utility");
const crypto = require("crypto");
const https = require("https");
const checksum_lib = require("./checksum");
const socket_1 = require("../../socket");
const utility_1 = require("../../util/utility");
const lodash_1 = __importDefault(require("lodash"));
const payment_controller_1 = require("../payment/payment.controller");
var hbs = require("express-handlebars");
var Handlebars = require("handlebars");
var path_1 = __importDefault(require("path"));
const fs = require("fs-extra");
const superagent_1 = __importDefault(require("superagent"));
const push_controller_1 = require("../pushnotifications/push.controller");
const { default: transactionModel } = require("../payment/transaction.model");
const { offerrecord } = require("../offernew/offernew.model");
const { packagerecords } = require("../package/package.model");
const { default: pharmacyModel } = require("../pharmacy/pharmacy.model");
const { ObjectId } = require("mongodb");
const transaction_model_1 = __importDefault(
  require("../payment/transaction.model")
);
const moment_1 = __importDefault(require("moment"));
const shortid_1 = __importDefault(require("shortid"));
const pharmacist_model_1 = __importDefault(
  require("../pharmacist/pharmacist.model")
);
const consultancy_model_1 = __importDefault(
  require("../liveconsultancy/liveconsultancy.model")
);
const admin_model_1 = __importDefault(require("../admin/admin.model"));
const notification_model_1 = __importDefault(
  require("../notification/notification.model")
);
const package_model_1 = __importDefault(require("../package/package.model"));
const offernew_model_1 = __importDefault(require("../offernew/offernew.model"));

const moment_timezone_1 = __importDefault(require("moment-timezone"));
const { getDb } = require("../../mongoClient/mongoClient")


const fileSystem = require('fs');
const path = require('path');
const { default: paymentModel } = require("../payment/payment.model");
const { sendPaymentEmail } = require('../EmailSend/SendEmail')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const CoachingCourceOrder = require('../CoachingOrder/CoachingOrder.model')
const PaymentTokenModel = require('./PaymentToken.model')
const CoachingGainerCompaniesModel = require('../CoachingGainerCompnay/CoachingGainerCompnay.model');
const CoachingGainerCompanyOrderModel = require("../CoachingGainerCompanyOrder/CoachingGainerCompanyOrder.model");

// Specify the file path for logging
// const logFilePath = path.join(__dirname, 'paymentLogs.txt');

// // Create a writable stream to the log file
// const logStream = fileSystem.createWriteStream(logFilePath, { flags: 'a' }); // 'a' stands for append

// // Redirect console.log to the log file
// console.log = function (message,cutom="") {
//   logStream.write(`${new Date().toISOString()} - ${message} ${cutom}\n`);
//   process.stdout.write(`${new Date().toISOString()} - ${message} ${cutom}\n`); // Optional: also log to the console
// };





exports.initiateTransaction = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("request query-------- in paytm", JSON.stringify(req.query));
    if (
      !req.query.amt ||
      !req.query.userId ||
      !req.query.orderId ||
      !req.query.transactionType
    ) {
      res.status(400).send({
        success: false,
        msg: "Enter All Details.",
      });
    }
    if (!req.query.userId) {
      res.status(400).send({
        success: false,
        msg: "User Id does not match.",
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
          const https = require("https");

          var paytmParams = {};

          paytmParams.body = {
            requestType: "Payment",

            mid: "MxRvkW87993542401257",

            websiteName: "DEFAULT",

            orderId: req.query.orderId,
            callbackUrl:
              "https://paymentapi.familycarehospitals.com/api/v1/paytm/successUrl",
            //https://www.familycarehospitals.com/paymentstatus/orderId
            // "https://testfchapi.familycarehospitals.com/api/v1/paytm/successUrl",

            // "https://fchapi.familycarehospitals.com/api/v1/paytm/successUrl",
            //https://www.familycarehospitals.com/paymentstatus/orderId

            txnAmount: {
              value: req.query.amt,
              currency: "INR",
            },

            userInfo: {
              custId: req.query.userId,
              mobile: req.query.mobileNumber,
            },
          };
          // var checksumBody = {"mid": "MxRvkW87993542401257", "orderId": req.query.orderId };
          //console.log("Before entering into checksum file======", checksumBody);
          var paytmChecksum = checksum_lib.generateSignature(
            JSON.stringify(paytmParams.body),
            "nUP1#%58yYc__uAV"
          );
          paytmChecksum
            .then(function (checksum) {
              console.log(err, "see checksum------", checksum);

              const dateObj = moment_1
                .default(new Date())
                .tz("Asia/Kolkata")
                .format("YYYY-MM-DD");
              const transid = shortid_1.default.generate();
              const paymentData = {};
              paymentData.mer_txn = transid;
              paymentData.user = req.query.userId;
              paymentData.orderId = req.query.orderId;
              paymentData.transactionType = req.query.transactionType;
              paymentData.dateObj = dateObj;
              paymentData.amount = req.query.amt;
              paymentData.checksumhash = checksum;
              // paymentData.txnToken =
              const payData = new paytm_model_1.default(paymentData);
              payData.save((err, data1) => {
                console.log(err, "payment data", data1);
              });

              paytmParams.head = {
                signature: checksum,
              };

              var post_data = JSON.stringify(paytmParams);
              console.log("post_data---------------", post_data);
              var options = {
                hostname: "securegw.paytm.in",
                // port: 443,
                path:
                  "/theia/api/v1/initiateTransaction?mid=MxRvkW87993542401257&orderId=" +
                  req.query.orderId,
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Content-Length": post_data.length,
                },
              };

              var response = "";
              console.log("options-------", options);
              var post_req = https.request(options, function (post_res) {
                post_res.on("data", function (chunk) {
                  response += chunk;
                });

                post_res.on("end", function () {
                  console.log("Response:************ ", response);
                  var sendData = JSON.parse(response);
                  console.log("initiate payment end.....");

                  res.send({
                    success: true,
                    data: sendData,
                    paymentId: payData._id,
                  });
                });
              });
              post_req.write(post_data);
              post_req.end();
            })
            .catch(function (error) {
              console.log(error);
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
  exports.initiateTransactionForEachCoachOrder = (req, res) =>
    __awaiter(this, void 0, void 0, function* () {
      console.log("request query-------- in paytm", JSON.stringify(req.query));
      if (
        !req.query.amt ||
        !req.query.userId ||
        !req.query.orderId ||
        !req.query.transactionType
      ) {
        res.status(400).send({
          success: false,
          msg: "Enter All Details.",
        });
      }
      if (!req.query.userId) {
        res.status(400).send({
          success: false,
          msg: "User Id does not match.",
        });
      } else {
        CoachingGainerCompaniesModel.findOne({ _id: req.query.userId }, async (err, data) => {
          if (err) {
            res.status(500).send({
              success: false,
              data: err,
            });
          }
          if (data && data._id) {
            const https = require("https");
  
            var paytmParams = {};
  
            paytmParams.body = {
              requestType: "Payment",
  
              mid: "MxRvkW87993542401257",
  
              websiteName: "DEFAULT",
  
              orderId: req.query.orderId,
              callbackUrl:
                "https://paymentapi.familycarehospitals.com/api/v1/paytm/successForEachCoachingOrder",
              //https://www.familycarehospitals.com/paymentstatus/orderId
              // "https://testfchapi.familycarehospitals.com/api/v1/paytm/successUrl",
  
              // "https://fchapi.familycarehospitals.com/api/v1/paytm/successUrl",
              //https://www.familycarehospitals.com/paymentstatus/orderId
  
              txnAmount: {
                value: req.query.amt,
                currency: "INR",
              },
  
              userInfo: {
                custId: req.query.userId,
                mobile: req.query.mobileNumber,
              },
            };
            // var checksumBody = {"mid": "MxRvkW87993542401257", "orderId": req.query.orderId };
            //console.log("Before entering into checksum file======", checksumBody);
            var paytmChecksum = checksum_lib.generateSignature(
              JSON.stringify(paytmParams.body),
              "nUP1#%58yYc__uAV"
            );
            paytmChecksum
              .then(function (checksum) {
                console.log(err, "see checksum------", checksum);
  
                const dateObj = moment_1
                  .default(new Date())
                  .tz("Asia/Kolkata")
                  .format("YYYY-MM-DD");
                const transid = shortid_1.default.generate();
                const paymentData = {};
                paymentData.mer_txn = transid;
                paymentData.user = req.query.userId;
                paymentData.orderId = req.query.orderId;
                paymentData.transactionType = req.query.transactionType;
                paymentData.dateObj = dateObj;
                paymentData.amount = req.query.amt;
                paymentData.checksumhash = checksum;
                // paymentData.txnToken =
                const payData = new paytm_model_1.default(paymentData);
                payData.save((err, data1) => {
                  console.log(err, "payment data", data1);
                });
  
                paytmParams.head = {
                  signature: checksum,
                };
  
                var post_data = JSON.stringify(paytmParams);
                console.log("post_data---------------", post_data);
                var options = {
                  hostname: "securegw.paytm.in",
                  // port: 443,
                  path:
                    "/theia/api/v1/initiateTransaction?mid=MxRvkW87993542401257&orderId=" +
                    req.query.orderId,
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Content-Length": post_data.length,
                  },
                };
  
                var response = "";
                console.log("options-------", options);
                var post_req = https.request(options, function (post_res) {
                  post_res.on("data", function (chunk) {
                    response += chunk;
                  });
  
                  post_res.on("end", function () {
                    console.log("Response:************ ", response);
                    var sendData = JSON.parse(response);
                    console.log("initiate payment end.....");
  
                    res.send({
                      success: true,
                      data: sendData,
                      paymentId: payData._id,
                    });
                  });
                });
                post_req.write(post_data);
                post_req.end();
              })
              .catch(function (error) {
                console.log(error);
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
exports.initiateTransactionForEmailPayment = (req, res) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("request query-------- in paytm", JSON.stringify(req.query));
    if (
      !req.query.amt ||
      !req.query.userId ||
      !req.query.orderId ||
      !req.query.transactionType
    ) {
      res.status(400).send({
        success: false,
        msg: "Enter All Details.",
      });
    }
    if (!req.query.userId) {
      res.status(400).send({
        success: false,
        msg: "User Id does not match.",
      });
    } else {
      CoachingGainerCompaniesModel.findOne({ _id: req.query.userId }, async (err, data) => {
        if (err) {
          res.status(500).send({
            success: false,
            data: err,
          });
        }
        if (data && data._id) {
          const https = require("https");

          var paytmParams = {};

          paytmParams.body = {
            requestType: "Payment",

            mid: "MxRvkW87993542401257",

            websiteName: "DEFAULT",

            orderId: req.query.orderId,
            callbackUrl:
              "https://paymentapi.familycarehospitals.com/api/v1/paytm/successForPaytmPaymentViaEmail",
            //https://www.familycarehospitals.com/paymentstatus/orderId
            // "https://testfchapi.familycarehospitals.com/api/v1/paytm/successUrl",

            // "https://fchapi.familycarehospitals.com/api/v1/paytm/successUrl",
            //https://www.familycarehospitals.com/paymentstatus/orderId

            txnAmount: {
              value: req.query.amt,
              currency: "INR",
            },

            userInfo: {
              custId: req.query.userId,
              mobile: req.query.mobileNumber,
            },
          };
          // var checksumBody = {"mid": "MxRvkW87993542401257", "orderId": req.query.orderId };
          //console.log("Before entering into checksum file======", checksumBody);
          var paytmChecksum = checksum_lib.generateSignature(
            JSON.stringify(paytmParams.body),
            "nUP1#%58yYc__uAV"
          );
          paytmChecksum
            .then(function (checksum) {
              console.log(err, "see checksum------", checksum);

              const dateObj = moment_1
                .default(new Date())
                .tz("Asia/Kolkata")
                .format("YYYY-MM-DD");
              const transid = shortid_1.default.generate();
              const paymentData = {};
              paymentData.mer_txn = transid;
              paymentData.user = req.query.userId;
              paymentData.orderId = req.query.orderId;
              paymentData.transactionType = req.query.transactionType;
              paymentData.dateObj = dateObj;
              paymentData.amount = req.query.amt;
              paymentData.checksumhash = checksum;
              // paymentData.txnToken =
              const payData = new paytm_model_1.default(paymentData);
              payData.save((err, data1) => {
                console.log(err, "payment data", data1);
              });

              paytmParams.head = {
                signature: checksum,
              };

              var post_data = JSON.stringify(paytmParams);
              console.log("post_data---------------", post_data);
              var options = {
                hostname: "securegw.paytm.in",
                // port: 443,
                path:
                  "/theia/api/v1/initiateTransaction?mid=MxRvkW87993542401257&orderId=" +
                  req.query.orderId,
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Content-Length": post_data.length,
                },
              };

              var response = "";
              console.log("options-------", options);
              var post_req = https.request(options, function (post_res) {
                post_res.on("data", function (chunk) {
                  response += chunk;
                });

                post_res.on("end", function () {
                  console.log("Response:************ ", response);
                  var sendData = JSON.parse(response);
                  console.log("initiate payment end.....");

                  res.send({
                    success: true,
                    data: sendData,
                    paymentId: payData._id,
                  });
                });
              });
              post_req.write(post_data);
              post_req.end();
            })
            .catch(function (error) {
              console.log(error);
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

exports.redirect = (req, resp) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("Redirect to callback URL========= in..", JSON.stringify(req.query));
    var bdata = { txnToken: req.query.txnToken, orderId: req.query.orderId };
    console.log("bdata-----------------", bdata);
    //addHelpers(bdata);
    resp.render("response", {
      txnToken: req.query.txnToken,
      orderId: req.query.orderId,
    });
  });

exports.sendMailForPayment = (req, resp) =>
  __awaiter(this, void 0, void 0, function* () {
    let PaymentToken;
    if (req.query.txnToken && req.query.orderId && req.query.companyId) {
      var TokenData = { txnToken: req.query.txnToken, orderId: req.query.orderId };
      PaymentToken = jwt.sign(TokenData, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '10min'
      })

    }
    if (PaymentToken) {
      let PaymentTokenSavedData = {
        companyId: req.query.companyId,
        PaymentToken: PaymentToken,
        orderId: req.query.orderId
      }
      PaymentTokenModel.PaymentTokenModel.findOne({ orderId: req.query.orderId }).then((response) => {
        if (response.PaymentStatus == 'UnMarked' || response.PaymentStatus == 'Expired') {
          PaymentTokenModel.PaymentTokenModel.deleteOne({ orderId: req.query.orderId }).then((reqsponse) => {
            if (response) {
              console.log('old order deleted')
            }
          })
        }
      })
      let savedPaymentToken = new PaymentTokenModel.PaymentTokenModel(PaymentTokenSavedData);
      savedPaymentToken = savedPaymentToken.save().then((data) => {
        console.log(data)
      })
      CoachingGainerCompanyOrderModel.CompanyGainerRequestModel.findOne({ _id: req.query.orderId }).then((response) => {
        if (response.GainerCompanyId) {
          CoachingGainerCompaniesModel.findOne({ _id: response.GainerCompanyId }).then((CompanyResponse) => {
            if (CompanyResponse && CompanyResponse.Email) {
              if (savedPaymentToken) {
                const PaymentLink = `http://localhost:5296/api/v1/paytm/redirectFromEmailToPaytm/${PaymentToken}`

                const transporter = nodemailer.createTransport({
                  host: '192.168.1.112',
                  port: 465,
                  secure: true,
                  auth: {
                    user: 'hr@onelifecapital.in',
                    pass: 'Desti@2017'
                  },
                  tls: {
                    rejectUnauthorized: false
                  }

                });

                const mailOptions = {
                  from: '"HR" hr@onelifecapital.in',
                  to: CompanyResponse.Email,
                  subject: 'Complete your payment',
                  html: `<p>Hello,</p>
                             <p>Please complete your payment by clicking the link below:</p>
                             <a href="${PaymentLink}" target="_blank">Pay Now</a>
                             <p>please make payment before 5 minutes link only available for 5 minutes`
                };
                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.error('Error sending mail:', error);
                  } else {
                    console.log('Email sent:', info.response);
                    resp.status(200).json({ message: "mail sent successfully" })
                  }
                });

              }

            }
          })
        }
      })

    }
  });

exports.redirectFromEmailToPaytm = (req, resp) =>
  __awaiter(this, void 0, void 0, function* () {
    let PaymentToken = req.params.PaymentToken;
    if (PaymentToken) {
      let findTokenData;
      PaymentTokenModel.PaymentTokenModel.findOne({ PaymentToken: PaymentToken }).then((response) => {
        findTokenData = response
        console.log(findTokenData, 'findTokenData')
        if (findTokenData) {
          let PaymentTokenData = jwt.verify(findTokenData.PaymentToken, process.env.ACCESS_TOKEN_SECRET)
          console.log(PaymentTokenData, 'findTokenData')

          if (PaymentTokenData) {
            resp.render("response", {
              txnToken: PaymentTokenData.txnToken,
              orderId: PaymentTokenData.orderId,
            });
          }
        }
        else {
          resp.status(400).json({ message: 'Transaction Not Initiated For This Token or May Be Token Is Wrong', success: false })
        }
      })

    }
    else {
      resp.status(400).json({ message: 'Payment Token Not Found', success: false })
    }

  });
// exports.redirect = (req, resp) =>
//   __awaiter(this, void 0, void 0, function* () {
//     console.log("Redirect to callback URL=========", req.query);
//     var bdata = { txnToken: req.query.txnToken, orderId: req.query.orderId };
//     console.log("bdata-----------------", bdata);
//     //addHelpers(bdata);
//     //resp.redirect(`https://www.familycarehospitals.com/`);

//     const redirectUrl = 'https://www.familycarehospitals.com/payment-status?'
//     const data = {
//       txnId: '125634ccfgf222d', //data.paytmTxnId
//       tranType: 'newliveconsultancy', //data.transactionType
//     };
//     const queryString = Object.keys(data)
//       .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
//       .join('&');  

//       console.log("${redirectUrl}${queryString}", redirectUrl, queryString)
//       resp.render("paytm/error");
//     resp.status(200).redirect(`${redirectUrl}${queryString}`);
//     // resp.render("response", {
//     //   txnToken: req.query.txnToken,
//     //   orderId: req.query.orderId,
//     // });
//   });

exports.success = (req, resp) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("Paytm Payment SuccessUrl=======", JSON.stringify(req.body));
    // console.log("req.body in success---------", req.body);
    const data = yield paytm_model_1.default.findOne({
      orderId: req.body.ORDERID,
    });
    console.log("data-------------------", data);

    let status;
    let subject;
    var paytmParams = {};
    let content;

    paytmParams["MID"] = "MxRvkW87993542401257";

    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?'

    paytmParams["ORDERID"] = data.orderId;

    paytmParams["CHECKSUMHASH"] = data.checksumhash;

    var post_data = JSON.stringify(paytmParams);

    var options = {
      hostname: "securegw.paytm.in",
      // port: 443,
      path: "/order/status/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    var sendData = "";
    var response = "";
    var post_req = https.request(options, function (post_res) {
      post_res.on("data", function (chunk) {
        response += chunk;
      });

      post_res.on("end", function () {
        console.log("Response: ", response);
        sendData = JSON.parse(response);
        console.log(
          "RESPONSE SEND TO PAYTM***************sendData-----------",
          sendData
        );

        if (sendData.STATUS == "PENDING") {
          status = "pending";
        } else if (sendData.STATUS == "TXN_SUCCESS") {
          status = "success";
        } else if (sendData.STATUS == "TXN_FAILURE") {
          status = "failed";
        }
        // if (sendData.STATUS == "TXN_CANCELLED") {
        //     status = "cancelled";
        // }

        paytm_model_1.default.findOneAndUpdate(
          { _id: data._id },
          {
            $set: {
              paytmTxnId: sendData.TXNID,
              BankTxnID: sendData.BANKTXNID,
              status: status,
              TxnType: sendData.TXNTYPE,
              gatewayname: sendData.GATEWAYNAME,
              bankname: sendData.BANKNAME,
              paymentMode: sendData.PAYMENTMODE,
              payment_method: "credit Card/Debit Card/Netbanking Payment",
            },
          },
          { new: true },
          (err, data) =>
            __awaiter(this, void 0, void 0, function* () {
              console.log(err, data);
              if (err) {
                const queryPrams = {
                  error: err,
                  tranType: data.transactionType,
                  payStat: "Failed"
                };
                const queryString = Object.keys(queryPrams)
                  .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                  .join('&');
                resp.redirect(`${redirectUrl}${queryString}`);
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
                  amount: data.amount,
                  user: data.user,
                  orderId: data.orderId,
                  date: latestDate,
                  transactionStatus: "paid",
                  status: status,
                  payThrough: "bank",
                  paymentGateway: "Paytm",
                  mmp_txn: data.paytmTxnId, // paytmTxnId: sendData.TXNID
                });
                yield transaction.save();
                console.log(
                  transaction,
                  "<<<<<<<<<<<<<<<<transaction    SUCCESS ",
                  data.transactionType
                );
                if (status == "success") {
                  subject =
                    "Your Family Care " +
                    data.transactionType +
                    " Confirmation (" +
                    transaction.mmp_txn +
                    ")";
                  console.log("STATUS ------------------------ SUCESSSS");
                  if (data.transactionType === "newliveconsultancy") {
                    const result =
                      yield consultancy_model_1.liveNewConsultancySchema.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: {
                            transaction: transaction._id,
                            valid: true,
                            payThrough: "bank",
                            paystatus: "completed",
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
                    console.log("payment status New live consultancy", result);
                  } else if (data.transactionType === "consultancy") {
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
                      data.amount;
                    console.log(
                      "result>>>>>>>>>>> success Consultantion",
                      result
                    );
                  } else if (data.transactionType === "pharmacy") {
                    let field = "";
                    // mohini date time daily sheet code
                    let date = moment_timezone_1.default().format("DD-MM-YYYY");
                    let time = moment_timezone_1.default().format("h:mm a");
                    //console.log("Mohini See the time and date ----------", date, "--time--", time);
                    var isOrderPlaced = [];
                    isOrderPlaced.push({
                      status: "true",
                      date: date,
                      time: time,
                    });
                    console.log(isOrderPlaced, "isOrderPlacedisOrderPlaced");
                    //end code here
                    const result =
                      yield pharmacy_model_1.default.findOneAndUpdate(
                        { pharmacyId: data.orderId },
                        {
                          $set: {
                            transaction: transaction._id,
                            isOrderPlace: isOrderPlaced,
                            valid: true,
                            payThrough: "bank",
                            payment_method:
                              "Credit Card/Debit Card/Netbanking Payment",
                          },
                        },
                        { new: true }
                      );
                    console.log("FOREACH===============", result);
                    // subject = "Your FamilyCare " + data.transactionType + " Order Confirmation " + transaction.mmp_txn;
                    // content = data.transactionType + " Received Order number: " + transaction.mmp_txn + " Received on: " + latestDate + " \n of amount " + data.amount

                    const userData = yield user_model_1.default.findOne({
                      _id: result.user,
                    });
                    // console.log("userData-----------888888888******************-", userData);
                    const cartData =
                      yield pharmacist_model_1.cartSchema.findOne({
                        _id: result.cartId,
                      });
                    console.log("cartData--------------", cartData);

                    let dispatchedAddress = {};
                    userData.address.forEach((element) => {
                      if (result.dispatched_address == element._id) {
                        dispatchedAddress = element;
                      }
                    });

                    var subject1 = "Your FamilyCare Pharmacy Order Placed";
                    // console.log("Subject------------", subject1);

                    var dataa = {
                      subject: subject1,
                      result: result,
                      userData: userData,
                      cartData: cartData,
                      listMedicines: cartData.medicines,
                      dispatchedAddress: dispatchedAddress,
                      paymentType: req.body.paymentType,
                    };
                    // console.log("data------------", dataa);
                    addEmailHelpers(dataa);
                    const content = compile(
                      "pharmacy_order_place",
                      JSON.parse(JSON.stringify(dataa))
                    ).then(function (response) {
                      // console.log("respozcvsxczvcxzxzxzxzxzxzxzxzxzxzxzxzxzxzxzxznse", response)
                      if (response) {
                        utility_1.sendEmailToPatient(
                          userData.email,
                          subject1,
                          "<p>" + response + "</p>",
                          "html"
                        );
                      }
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
                      transaction.mmp_txn +
                      " Received on: " +
                      latestDate +
                      " \n of amount " +
                      data.amount;
                    console.log("result>>>>>>>>>>> success nursing", result);
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
                      data.amount;
                    console.log(
                      "result>>>>>>>>>>> success home-appoitnment",
                      result
                    );
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
                      data.amount;
                    // sendPaymentSMS(req.body.clientcode,data,transaction);
                    console.log(
                      "result>>>>>>>>>>> success appointment",
                      result
                    );
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
                      data.amount;
                    console.log("result>>>>>>>>>>> success diagnostic", result);
                  } else if (
                    data.transactionType === "offernew-hospital" ||
                    data.transactionType === "offernew" ||
                    data.transactionType === "offernew-home"
                  ) {
                    console.log(
                      "I AM HERE ||||||||||||||||||||||||||||||||||||||||||||"
                    );
                    /////////////////////////////////////////////////////////////////////////
                    const collection = yield getDb('package_attribute_services')
                    const offerDetails = yield offernew_model_1.offerrecord.findById(req.body.ORDERID)
                    let packageId = offerDetails.package
                    let query = { packageId: packageId, key: "Validity in Days" }
                    const packageDetails = yield collection.findOne(query)//.toArray() 
                    let totalValidityDays = parseInt(packageDetails.value) + (offerDetails.renewed ? parseInt(offerDetails.remainingDays) : 0)

                    const expiryDate = new Date(offerDetails.createdAt.getTime() + totalValidityDays * 24 * 60 * 60 * 1000);
                    // const expiryDate = moment_1.default(new Date(offerRecordCreation.createdAt.getTime() + noOfDays * 24 * 60 * 60 * 1000)).tz("Asia/Kolkata").format("DD-MM-YYYY");

                    if (offerDetails.renewed) {
                      const oldOfferDetails = yield offernew_model_1.offerrecord.findOneAndUpdate({ _id: offerDetails.oldOrderId }, {
                        $set: {
                          status: "Expired",
                          paystatus: "Expired"
                        }
                      }, { new: true })

                    }


                    // Update Offer Record with Transaction
                    // yield offernew_model_1.offerrecord.findByIdAndUpdate(offerRecordCreation._id, {
                    //   $set: { transaction: txn._id, expiryDate }
                    // });
                    /////////////////////////////////////////////////////////////////////////
                    const result =
                      yield offernew_model_1.offerrecord.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: {
                            transaction: transaction._id,
                            valid: true,
                            payThrough: "Paytm",
                            paystatus: "Completed",
                            payment_method: "Paytm",
                            status: "Completed",
                            expiryDate

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
                      data.amount;
                    console.log(
                      "result>>>>>>>>>>> Success OFER NEW PLEASE FIND",
                      result
                    );
                    ////////////////////////////////////////////////////////////////////////////////////////////////////
                    const userData = yield user_model_1.default.findById(result.user);
                    // console.log("sending EMAIL", userData);
                    try {
                      if (userData && userData.email && userData.email.trim()) {
                        sendPaymentEmail(userData.email.trim(), result.package);
                      }
                    } catch (error) {
                      console.log("error while sending email from paytm controller", error)

                    }

                    try {
                      if (userData && userData.phone && userData.fname) {
                        // successPkgSms(userData.phone, userData.fname);
                        successPkgSms(userData.phone, userData.fname);
                      }
                    } catch (error) {
                      console.log("error while sending SMS from paytm controller", error)

                    }


                    //                      if(userData.email != null || userData.email != "" || userData.email != " " || userData.email != undefined){
                    //                        userData.email.trim()

                    //                     
                    //                      }

                    //                      successPkgSms(userData.phone, userData.fname) 
                    ////////////////////////////////////////////////////////////////////////////////////////////////////
                  } else if (
                    data.transactionType === "package" ||
                    "package-home" ||
                    "package-hospital"
                  ) {
                    console.log(
                      data.transactionType,
                      "PACKAGE DATA TRASCATIONSSNS"
                    );
                    const result =
                      yield package_model_1.packagerecords.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: {
                            transaction: transaction._id,
                            valid: true,
                            payThrough: "bank",
                            paystatus: "Completed",
                            status: "Completed",
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
                      data.amount;
                    console.log("result>>>>>>>>>>> success package", result);
                  }

                  // const user = yield user_model_2.default
                  //   .findOne({ _id: data.user })
                  //   .lean();
                  // if (user.email) {
                  //   try {
                  //     yield utility.sendEmailForDoctor(
                  //       user.email,
                  //       subject,
                  //       content,
                  //       "text/html"
                  //     );
                  //   } catch (error) {
                  //     console.log("error while sending mail",error);
                  //   }
                  // }

                  const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "success"
                  };
                  const queryString = Object.keys(queryPrams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                    .join('&');
                  resp.redirect(`${redirectUrl}${queryString}`);
                  // resp.status(200).send({
                  //   success: true,
                  //   data: "Payment Successful",
                  // });
                } else if (status == "pending") {
                  const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "pending"
                  };
                  const queryString = Object.keys(queryPrams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                    .join('&');
                  resp.redirect(`${redirectUrl}${queryString}`);
                  // resp.status(200).send({
                  //   success: true,
                  //   data:
                  //     "Payment in Pending state. Your " +
                  //     data.transactionType +
                  //     " will be updated after confirming this transaction.",
                  // });
                } else {
                  const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "Failed"
                  };
                  const queryString = Object.keys(queryPrams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                    .join('&');
                  resp.redirect(`${redirectUrl}${queryString}`);
                  // resp.render("paytm/error");
                  /*resp.status(200).send({
                            success: false,
                            data: "Payment failure"
                        });*/
                }
              } else {

                const queryPrams = {
                  txnId: "",
                  tranType: "",
                  payStat: "Payment Not Found."
                };
                const queryString = Object.keys(queryPrams)
                  .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                  .join('&');
                resp.redirect(`${redirectUrl}${queryString}`);
                // resp.status(200).send({
                //   success: false,
                //   data: "Payment Not Found.",
                // });
              }
            })
        );
      });
    });

    post_req.write(post_data);
    post_req.end();
  });
exports.successForPaytmPaymentViaEmail = (req, resp) =>
  __awaiter(this, void 0, void 0, function* () {
    const data = yield paytm_model_1.default.findOne({
      orderId: req.body.ORDERID,
    });
    let status;
    let PaymentStatus;
    var paytmParams = {};
    let content;

    paytmParams["MID"] = "MxRvkW87993542401257";

    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?'

    paytmParams["ORDERID"] = data.orderId;

    paytmParams["CHECKSUMHASH"] = data.checksumhash;

    var post_data = JSON.stringify(paytmParams);

    var options = {
      hostname: "securegw.paytm.in",
      path: "/order/status/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    var sendData = "";
    var response = "";
    var post_req = https.request(options, function (post_res) {
      post_res.on("data", function (chunk) {
        response += chunk;
      });

      post_res.on("end", function () {
        sendData = JSON.parse(response);
        if (sendData.STATUS == "PENDING") {
          status = "pending";
          PaymentStatus = 'UnMarked'
        } else if (sendData.STATUS == "TXN_SUCCESS") {
          status = "success";
          PaymentStatus = 'Marked'
        } else if (sendData.STATUS == "TXN_FAILURE") {
          status = "failed";
          PaymentStatus = 'Expired'
        }

        paytm_model_1.default.findOneAndUpdate(
          { _id: data._id },
          {
            $set: {
              paytmTxnId: sendData.TXNID,
              BankTxnID: sendData.BANKTXNID,
              status: status,
              TxnType: sendData.TXNTYPE,
              gatewayname: sendData.GATEWAYNAME,
              bankname: sendData.BANKNAME,
              paymentMode: sendData.PAYMENTMODE,
              payment_method: "credit Card/Debit Card/Netbanking Payment",
            },
          },
          { new: true },
          (err, data) =>
            __awaiter(this, void 0, void 0, async function* () {
              console.log(err, data);
              if (err) {
                const queryPrams = {
                  error: err,
                  tranType: data.transactionType,
                  payStat: "Failed"
                };
                const queryString = Object.keys(queryPrams)
                  .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                  .join('&');
                resp.redirect(`${redirectUrl}${queryString}`);
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
                  amount: data.amount,
                  user: data.user,
                  orderId: data.orderId,
                  date: latestDate,
                  transactionStatus: "paid",
                  status: status,
                  payThrough: "bank",
                  paymentGateway: "Paytm",
                  mmp_txn: data.paytmTxnId,
                });
                yield transaction.save();
                console.log(
                  transaction,
                  "<<<<<<<<<<<<<<<<transaction    SUCCESS ",
                  data.transactionType
                );
                if (status == "success") {
                  let PendingAmount;
                  let valid = false;
                  let FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId })
                  let TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET)
                  if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
                    let FindCource = await CoachingGainerCompanyOrderModel.CompanyGainerRequestModel.findOne({ _id: req.body.ORDERID })
                    let TokenOfCource = jwt.sign({ UserId: FindCource.GainerCompanyId, CourceIds: FindCource.CourceIds, PaymentId: transaction._id, Status: 'Completed' }, process.env.ACCESS_TOKEN_SECRET)
                    if (transaction.amount == FindCource.NegotiatedAmount) {
                      PendingAmount = null;
                      status = 'Completed',
                        valid = true;
                    }
                    else {
                      PendingAmount = Long(FindCource.NegotiatedAmount) - Long(transaction.amount)
                      status = 'PendingAmount'
                      TokenOfCource = jwt.sign({ UserId: FindCource.GainerCompanyId, CourceIds: FindCource.CourceIds, PaymentId: transaction._id, Status: 'PendingAmount' }, process.env.ACCESS_TOKEN_SECRET)

                    }
                    if (FindCource) {
                      let UpdateResultOfCourceOrder = await CoachingGainerCompanyOrderModel.CompanyGainerRequestModel.findOneAndUpdate({
                        _id: data.orderId
                      },
                        {
                          $set: {
                            PaymentStatus: status,
                            PaymentMethod: 'Paytm',
                            Transaction: transaction._id,
                            OrderDate: transaction.createdAt.split('T')[0],
                            OrderTime: transaction.createdAt.split('T')[1].split('.')[0],
                            PaidAmount: transaction.amount,
                            PendingAmount: PendingAmount,
                            valid: valid,
                            TokenOfCource: TokenOfCource
                          }
                        },
                        {
                          new: true
                        }
                      )
                    }
                    let updateThePaymentTokenStatus = await PaymentTokenModel.findOneAndUpdate({
                      orderId: data.orderId
                    },
                      {
                        $set: {
                          PaymentStatus: PaymentStatus
                        }
                      },
                      {
                        new: true
                      }
                    )


                    const queryPrams = {
                      txnId: data.paytmTxnId,
                      tranType: data.transactionType,
                      payStat: "success"
                    };
                    const queryString = Object.keys(queryPrams)
                      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                      .join('&');
                    resp.redirect(`${redirectUrl}${queryString}`);

                  }
                  else {
                    return resp.status(400).json({ message: 'order id not be matched', success: false })
                  }

                } else if (status == "pending") {
                  let FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId })
                  let TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET)
                  if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
                    let FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID })
                    let TokenOfCource = jwt.sign({ UserId: FindCource.UserId, CourceId: FindCource.CourceId, PaymentId: transaction._id, Status: 'In Progress' }, process.env.ACCESS_TOKEN_SECRET)
                    if (FindCource) {
                      let UpdateResultOfCourceOrder = await CoachingCourceOrder.findOneAndUpdate({
                        _id: data.orderId
                      },
                        {
                          $set: {
                            PaymentStatus: 'In Progress',
                            PaymentMethod: 'Paytm',
                            Transaction: transaction._id,
                            OrderDate: transaction.createdAt.split('T')[0],
                            OrderTime: transaction.createdAt.split('T')[1].split('.')[0],
                            TokenOfCource: TokenOfCource
                          }
                        },
                        {
                          new: true
                        }
                      )
                    }
                    let updateThePaymentTokenStatus = await PaymentTokenModel.findOneAndUpdate({
                      orderId: data.orderId
                    },
                      {
                        $set: {
                          PaymentStatus: PaymentStatus
                        }
                      },
                      {
                        new: true
                      }
                    )


                    const queryPrams = {
                      txnId: data.paytmTxnId,
                      tranType: data.transactionType,
                      payStat: "pending"
                    };
                    const queryString = Object.keys(queryPrams)
                      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                      .join('&');
                    resp.redirect(`${redirectUrl}${queryString}`);

                  }
                  else {
                    return resp.status(400).json({ message: 'order id not be matched', success: false })
                  }


                }
                else if (status == 'failed') {
                  let FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId })
                  let TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET)
                  if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
                    let FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID })
                    let TokenOfCource = jwt.sign({ UserId: FindCource.UserId, CourceId: FindCource.CourceId, PaymentId: transaction._id, Status: 'Cancelled' }, process.env.ACCESS_TOKEN_SECRET)
                    if (FindCource) {
                      let UpdateResultOfCourceOrder = await CoachingCourceOrder.findOneAndUpdate({
                        _id: data.orderId
                      },
                        {
                          $set: {
                            PaymentStatus: 'Cancelled',
                            PaymentMethod: 'Paytm',
                            Transaction: transaction._id,
                            OrderDate: transaction.createdAt.split('T')[0],
                            OrderTime: transaction.createdAt.split('T')[1].split('.')[0],
                            TokenOfCource: TokenOfCource
                          }
                        },
                        {
                          new: true
                        }
                      )
                    }
                    let updateThePaymentTokenStatus = await PaymentTokenModel.findOneAndUpdate({
                      orderId: data.orderId
                    },
                      {
                        $set: {
                          PaymentStatus: PaymentStatus
                        }
                      },
                      {
                        new: true
                      }
                    )

                    const queryPrams = {
                      txnId: data.paytmTxnId,
                      tranType: data.transactionType,
                      payStat: "failed"
                    };
                    const queryString = Object.keys(queryPrams)
                      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                      .join('&');
                    resp.redirect(`${redirectUrl}${queryString}`);

                  }

                }
                else {
                  const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "Failed"
                  };
                  const queryString = Object.keys(queryPrams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                    .join('&');
                  resp.redirect(`${redirectUrl}${queryString}`);

                }
              }

              else {

                const queryPrams = {
                  txnId: "",
                  tranType: "",
                  payStat: "Payment Not Found."
                };
                const queryString = Object.keys(queryPrams)
                  .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                  .join('&');
                resp.redirect(`${redirectUrl}${queryString}`);
              }
            })
        );
      });
    });

    post_req.write(post_data);
    post_req.end();
  });
exports.successForEachCoachingOrder = (req, resp) =>
  __awaiter(this, void 0, void 0, function* () {
    const data = yield paytm_model_1.default.findOne({
      orderId: req.body.ORDERID,
    });
    let status;
    let PaymentStatus;
    var paytmParams = {};
    let content;

    paytmParams["MID"] = "MxRvkW87993542401257";

    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?'

    paytmParams["ORDERID"] = data.orderId;

    paytmParams["CHECKSUMHASH"] = data.checksumhash;

    var post_data = JSON.stringify(paytmParams);

    var options = {
      hostname: "securegw.paytm.in",
      path: "/order/status/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    var sendData = "";
    var response = "";
    var post_req = https.request(options, function (post_res) {
      post_res.on("data", function (chunk) {
        response += chunk;
      });

      post_res.on("end", function () {
        sendData = JSON.parse(response);
        if (sendData.STATUS == "PENDING") {
          status = "pending";
          PaymentStatus = 'UnMarked'
        } else if (sendData.STATUS == "TXN_SUCCESS") {
          status = "success";
          PaymentStatus = 'Marked'
        } else if (sendData.STATUS == "TXN_FAILURE") {
          status = "failed";
          PaymentStatus = 'Expired'
        }

        paytm_model_1.default.findOneAndUpdate(
          { _id: data._id },
          {
            $set: {
              paytmTxnId: sendData.TXNID,
              BankTxnID: sendData.BANKTXNID,
              status: status,
              TxnType: sendData.TXNTYPE,
              gatewayname: sendData.GATEWAYNAME,
              bankname: sendData.BANKNAME,
              paymentMode: sendData.PAYMENTMODE,
              payment_method: "credit Card/Debit Card/Netbanking Payment",
            },
          },
          { new: true },
          (err, data) =>
            __awaiter(this, void 0, void 0, async function* () {
              console.log(err, data);
              if (err) {
                const queryPrams = {
                  error: err,
                  tranType: data.transactionType,
                  payStat: "Failed"
                };
                const queryString = Object.keys(queryPrams)
                  .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                  .join('&');
                resp.redirect(`${redirectUrl}${queryString}`);
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
                  amount: data.amount,
                  user: data.user,
                  orderId: data.orderId,
                  date: latestDate,
                  transactionStatus: "paid",
                  status: status,
                  payThrough: "bank",
                  paymentGateway: "Paytm",
                  mmp_txn: data.paytmTxnId,
                });
                yield transaction.save();
                console.log(
                  transaction,
                  "<<<<<<<<<<<<<<<<transaction    SUCCESS ",
                  data.transactionType
                );
                if (status == "success") {
                  let PendingAmount;
                  let valid = false;
                  let FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId })
                  let TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET)
                  if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
                    let FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID })
                    let TokenOfCource = jwt.sign({ UserId: FindCource.UserId, CourceId: FindCource.CourceId, PaymentId: transaction._id, Status: 'Completed' }, process.env.ACCESS_TOKEN_SECRET)
                    if (transaction.amount == FindCource.TotalAmount) {
                      PendingAmount = null;
                      status = 'Completed',
                        valid = true;
                    }
                    else {
                      PendingAmount = Long(FindCource.TotalAmount) - Long(transaction.amount)
                      status = 'PendingAmount'
                      TokenOfCource = jwt.sign({ UserId: FindCource.UserId, CourceId: FindCource.CourceId, PaymentId: transaction._id, Status: 'PendingAmount' }, process.env.ACCESS_TOKEN_SECRET)

                    }
                    if (FindCource) {
                      let UpdateResultOfCourceOrder = await CoachingCourceOrder.findOneAndUpdate({
                        _id: data.orderId
                      },
                        {
                          $set: {
                            PaymentStatus: status,
                            PaymentMethod: 'Paytm',
                            Transaction: transaction._id,
                            OrderDate: transaction.createdAt.split('T')[0],
                            OrderTime: transaction.createdAt.split('T')[1].split('.')[0],
                            PaidAmount: transaction.amount,
                            PendingAmount: PendingAmount,
                            valid: valid,
                            TokenOfCource: TokenOfCource
                          }
                        },
                        {
                          new: true
                        }
                      )
                    }
                    let updateThePaymentTokenStatus = await PaymentTokenModel.findOneAndUpdate({
                      orderId: data.orderId
                    },
                      {
                        $set: {
                          PaymentStatus: PaymentStatus
                        }
                      },
                      {
                        new: true
                      }
                    )


                    const queryPrams = {
                      txnId: data.paytmTxnId,
                      tranType: data.transactionType,
                      payStat: "success"
                    };
                    const queryString = Object.keys(queryPrams)
                      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                      .join('&');
                    resp.redirect(`${redirectUrl}${queryString}`);

                  }
                  else {
                    return resp.status(400).json({ message: 'order id not be matched', success: false })
                  }

                } else if (status == "pending") {
                  let FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId })
                  let TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET)
                  if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
                    let FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID })
                    let TokenOfCource = jwt.sign({ UserId: FindCource.UserId, CourceId: FindCource.CourceId, PaymentId: transaction._id, Status: 'In Progress' }, process.env.ACCESS_TOKEN_SECRET)
                    if (FindCource) {
                      let UpdateResultOfCourceOrder = await CoachingCourceOrder.findOneAndUpdate({
                        _id: data.orderId
                      },
                        {
                          $set: {
                            PaymentStatus: 'In Progress',
                            PaymentMethod: 'Paytm',
                            Transaction: transaction._id,
                            OrderDate: transaction.createdAt.split('T')[0],
                            OrderTime: transaction.createdAt.split('T')[1].split('.')[0],
                            TokenOfCource: TokenOfCource
                          }
                        },
                        {
                          new: true
                        }
                      )
                    }
                    let updateThePaymentTokenStatus = await PaymentTokenModel.findOneAndUpdate({
                      orderId: data.orderId
                    },
                      {
                        $set: {
                          PaymentStatus: PaymentStatus
                        }
                      },
                      {
                        new: true
                      }
                    )


                    const queryPrams = {
                      txnId: data.paytmTxnId,
                      tranType: data.transactionType,
                      payStat: "pending"
                    };
                    const queryString = Object.keys(queryPrams)
                      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                      .join('&');
                    resp.redirect(`${redirectUrl}${queryString}`);

                  }
                  else {
                    return resp.status(400).json({ message: 'order id not be matched', success: false })
                  }


                }
                else if (status == 'failed') {
                  let FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId })
                  let TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET)
                  if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
                    let FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID })
                    let TokenOfCource = jwt.sign({ UserId: FindCource.UserId, CourceId: FindCource.CourceId, PaymentId: transaction._id, Status: 'Cancelled' }, process.env.ACCESS_TOKEN_SECRET)
                    if (FindCource) {
                      let UpdateResultOfCourceOrder = await CoachingCourceOrder.findOneAndUpdate({
                        _id: data.orderId
                      },
                        {
                          $set: {
                            PaymentStatus: 'Cancelled',
                            PaymentMethod: 'Paytm',
                            Transaction: transaction._id,
                            OrderDate: transaction.createdAt.split('T')[0],
                            OrderTime: transaction.createdAt.split('T')[1].split('.')[0],
                            TokenOfCource: TokenOfCource
                          }
                        },
                        {
                          new: true
                        }
                      )
                    }
                    let updateThePaymentTokenStatus = await PaymentTokenModel.findOneAndUpdate({
                      orderId: data.orderId
                    },
                      {
                        $set: {
                          PaymentStatus: PaymentStatus
                        }
                      },
                      {
                        new: true
                      }
                    )

                    const queryPrams = {
                      txnId: data.paytmTxnId,
                      tranType: data.transactionType,
                      payStat: "failed"
                    };
                    const queryString = Object.keys(queryPrams)
                      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                      .join('&');
                    resp.redirect(`${redirectUrl}${queryString}`);

                  }

                }
                else {
                  const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "Failed"
                  };
                  const queryString = Object.keys(queryPrams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                    .join('&');
                  resp.redirect(`${redirectUrl}${queryString}`);

                }
              }

              else {

                const queryPrams = {
                  txnId: "",
                  tranType: "",
                  payStat: "Payment Not Found."
                };
                const queryString = Object.keys(queryPrams)
                  .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                  .join('&');
                resp.redirect(`${redirectUrl}${queryString}`);
              }
            })
        );
      });
    });

    post_req.write(post_data);
    post_req.end();
  });
exports.successNewForBulk = (req, resp) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("bulk 911 subcribe success called....", JSON.stringify(req.body));
    // console.log("req.body in success---------", req.body);
    const data = yield paytm_model_1.default.findOne({
      orderId: req.body.ORDERID,
    });
    console.log("bulk 911 data..", data);

    let status;
    let subject;
    var paytmParams = {};
    let content;

    paytmParams["MID"] = "MxRvkW87993542401257";

    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?'

    paytmParams["ORDERID"] = data.orderId;

    paytmParams["CHECKSUMHASH"] = data.checksumhash;

    var post_data = JSON.stringify(paytmParams);
    console.log("bulk 911 post data...........", post_data);

    var options = {
      hostname: "securegw.paytm.in",
      // port: 443,
      path: "/order/status/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    var sendData = "";
    var response = "";
    var post_req = https.request(options, function (post_res) {
      post_res.on("data", function (chunk) {
        response += chunk;
      });

      post_res.on("end", function () {
        console.log("bulk 911 Response: ", response);
        sendData = JSON.parse(response);
        console.log("bulk 911 send data........", JSON.stringify(sendData));

        if (sendData.STATUS == "PENDING") {
          status = "pending";
        } else if (sendData.STATUS == "TXN_SUCCESS") {
          status = "success";
        } else if (sendData.STATUS == "TXN_FAILURE") {
          status = "failed";
        }
        // if (sendData.STATUS == "TXN_CANCELLED") {
        //     status = "cancelled";
        // }

        paytm_model_1.default.findOneAndUpdate(
          { _id: data._id },
          {
            $set: {
              paytmTxnId: sendData.TXNID,
              BankTxnID: sendData.BANKTXNID,
              status: status,
              TxnType: sendData.TXNTYPE,
              gatewayname: sendData.GATEWAYNAME,
              bankname: sendData.BANKNAME,
              paymentMode: sendData.PAYMENTMODE,
              payment_method: "credit Card/Debit Card/Netbanking Payment",
            },
          },
          { new: true },
          (err, data) =>
            __awaiter(this, void 0, void 0, function* () {
              console.log(err, data);
              if (err) {
                const queryPrams = {
                  error: err,
                  tranType: data.transactionType,
                  payStat: "Failed"
                };
                const queryString = Object.keys(queryPrams)
                  .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                  .join('&');
                resp.redirect(`${redirectUrl}${queryString}`);
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
                  amount: data.amount,
                  user: data.user,
                  orderId: data.orderId,
                  date: latestDate,
                  transactionStatus: "paid",
                  status: status,
                  payThrough: "bank",
                  paymentGateway: "Paytm",
                  mmp_txn: data.paytmTxnId, // paytmTxnId: sendData.TXNID
                });
                yield transaction.save();
                console.log("in bulk 911 transaction data...", transaction);
                if (status == "success") {
                  subject =
                    "Your Family Care " +
                    data.transactionType +
                    " Confirmation (" +
                    transaction.mmp_txn +
                    ")";
                  console.log("bulk 911 The status is sucess............");
                  if (
                    data.transactionType === "offernew-hospital" ||
                    data.transactionType === "offernew" ||
                    data.transactionType === "offernew-home"
                  ) {
                    console.log("in bulk 911 updating offer record.....");
                    const result =
                      yield offernew_model_1.offerrecord.findOneAndUpdate(
                        { _id: data.orderId },
                        {
                          $set: {
                            transaction: transaction._id,
                            valid: true,
                            payThrough: "Paytm",
                            paystatus: "Completed",
                            payment_method: "Paytm",
                            status: "Completed",

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
                      data.amount;
                    console.log(
                      "in bulk 911 result>>>>>>>>>>> Success OFER NEW PLEASE FIND",
                      result
                    );
                  }
                  // const user = yield user_model_2.default
                  //   .findOne({ _id: data.user })
                  //   .lean();
                  // if (user.email) {
                  //   try {
                  //     yield utility.sendEmailForDoctor(
                  //       user.email,
                  //       subject,
                  //       content,
                  //       "text/html"
                  //     );
                  //   } catch (error) {
                  //     console.log("error while sending mail",error);
                  //   }
                  // }

                  const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "success"
                  };
                  const queryString = Object.keys(queryPrams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                    .join('&');
                  resp.redirect(`${redirectUrl}${queryString}`);
                  // resp.status(200).send({
                  //   success: true,
                  //   data: "Payment Successful",
                  // });
                } else if (status == "pending") {
                  const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "pending"
                  };
                  const queryString = Object.keys(queryPrams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                    .join('&');
                  resp.redirect(`${redirectUrl}${queryString}`);
                  // resp.status(200).send({
                  //   success: true,
                  //   data:
                  //     "Payment in Pending state. Your " +
                  //     data.transactionType +
                  //     " will be updated after confirming this transaction.",
                  // });
                } else {
                  const queryPrams = {
                    txnId: data.paytmTxnId,
                    tranType: data.transactionType,
                    payStat: "Failed"
                  };
                  const queryString = Object.keys(queryPrams)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                    .join('&');
                  resp.redirect(`${redirectUrl}${queryString}`);
                  // resp.render("paytm/error");
                  /*resp.status(200).send({
                            success: false,
                            data: "Payment failure"
                        });*/
                }
              } else {

                const queryPrams = {
                  txnId: "",
                  tranType: "",
                  payStat: "Payment Not Found."
                };
                const queryString = Object.keys(queryPrams)
                  .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryPrams[key])}`)
                  .join('&');
                resp.redirect(`${redirectUrl}${queryString}`);
                // resp.status(200).send({
                //   success: false,
                //   data: "Payment Not Found.",
                // });
              }
            })
        );
      });
    });

    post_req.write(post_data);
    post_req.end();
  });

exports.checkBankPaymentStatus = (req, resp) =>
  __awaiter(this, void 0, void 0, function* () {
    console.log("req.query--------------", req.query.paymentId);
    let content;
    const data = yield paytm_model_1.default.findOne({
      _id: req.query.paymentId,
    });
    console.log(
      "Getting Pharmacy data-----PLEASE CHECK STATUS HERE------",
      data
    );
    const transaction = yield transaction_model_1.default.findOne({
      TransactionId: data.mer_txn,
    });
    console.log("data-------------------", data);
    if (!data) {
      resp.status(421).send({
        success: false,
        err: "Payment record not found!",
      });
    } else {
      let status;
      if (data.status == "success") {
        console.log("SUCCESS STATUS_________");
        status = "success";
        subject =
          "Your FamilyCare " +
          data.transactionType +
          " Confirmation (" +
          transaction._id +
          ")";
        console.log(
          transaction,
          "<<<<<<<<<<<<<<<<transaction     BANK CHECK",
          data.transactionType
        );
        if (data.transactionType === "consultancy") {
          const result = yield consultancy_model_1.default.findOneAndUpdate(
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
        } else if (data.transactionType === "newliveconsultancy") {
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
        } else if (
          data.transactionType === "package" ||
          "package-home" ||
          "package-hospital"
        ) {
          const result = yield admin_model_1.default
            .findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true })
            .lean();
          const userData = yield user_model_1.default.findOne({
            _id: data.user,
          });
          //send and save notification
          const notify = yield notification_model_1.default.findOne({
            user: result.user,
            appointmentId: result.package_records_Id,
          });
          if (notify) {
            // if (notify.assigndoctor == false) {
            notify.assigndoctor = true;
            // notify.doctor = pathoDetails._id;
            notify.type = "Order";
            notify.status = "Pending";
            notify.usermessage =
              "Hi ! Thank you for using the Family Care Hospitals App. Your test order has been received and is now being processed.";
            notify.doctormessage =
              "Your package order has been confirmed for " +
              notify.date +
              " at " +
              notify.time +
              " your package order id: " +
              notify.appointmentId;
            notify.save();
            if (result.user) {
              console.log("hii ravi", result.user);
              info.userId = result.user._id;
              info.usercount = adminData.count;
              info.notification =
                "Hi ! Thank you for using the Family Care Hospitals App. Your test order has been received and is now being processed.";
              info.type = "Package";
              info.status = "Pending";
              info.sendTo = "user";
              push_controller_1.sendNotification(info);
              // console.log("raaaa===>>", info);
              info = {};
              console.log("rrrrr========", adminData.count, adminData._id);
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
          // sendPackageSms(userData, notify);

          // console.log("dispatchedAddress------------", dispatchedAddress);
          var subject = "Your FamilyCare Package Order Placed";
          console.log("Subject------------", subject);

          var ndata = {
            subject: subject,
            result: result,
            userData: userData,
            // cartData: cartData,
            // dispatchedAddress: dispatchedAddress
          };
          console.log("ndata------------", ndata);
          //   dataHelper_1.
          addEmailHelpers(ndata);
          console.log(
            "ndata=============",
            path_1.default.join(
              process.cwd(),
              "dist/templates",
              `order_placed_mail.hbs`
            )
          );
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
        } else if (
          data.transactionType === "offernew-hospital" ||
          data.transactionType === "offernew" ||
          data.transactionType === "offernew-home"
        ) {
          console.log(
            "IM AT OFFER NEWwwwwwwwwwwwwwwwwwwwwww -------------|||||||||||-----------"
          );

          const result = yield admin_model_1.default
            .findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true })
            .lean();
          const userData = yield user_model_1.default.findOne({
            _id: data.user,
          });
          //send and save notification
          const notify = yield notification_model_1.default.findOne({
            user: result.user,
            appointmentId: result.package_records_Id,
          });
          if (notify) {
            // if (notify.assigndoctor == false) {
            notify.assigndoctor = true;
            // notify.doctor = pathoDetails._id;
            notify.type = "Order";
            notify.status = "Pending";
            notify.usermessage =
              "Hi ! Thank you for using the Family Care Hospitals App. Your test order has been received and is now being processed.";
            notify.doctormessage =
              "Your package order has been confirmed for " +
              notify.date +
              " at " +
              notify.time +
              " your package order id: " +
              notify.appointmentId;
            notify.save();
            if (result.user) {
              console.log("hii ravi", result.user);
              info.userId = result.user._id;
              info.usercount = adminData.count;
              info.notification =
                "Hi ! Thank you for using the Family Care Hospitals App. Your test order has been received and is now being processed.";
              info.type = "Package";
              info.status = "Pending";
              info.sendTo = "user";
              push_controller_1.sendNotification(info);
              // console.log("raaaa===>>", info);
              info = {};
              console.log("rrrrr========", adminData.count, adminData._id);
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
          // sendPackageSms(userData, notify);

          // console.log("dispatchedAddress------------", dispatchedAddress);
          var subject = "Your FamilyCare Package Order Placed";
          console.log("Subject------------", subject);

          var ndata = {
            subject: subject,
            result: result,
            userData: userData,
            // cartData: cartData,
            // dispatchedAddress: dispatchedAddress
          };
          console.log("ndata------------", ndata);
          //   dataHelper_1.
          addEmailHelpers(ndata);
          console.log(
            "ndata=============",
            path_1.default.join(
              process.cwd(),
              "dist/templates",
              `order_placed_mail.hbs`
            )
          );
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
        } else if (data.transactionType === "pharmacy") {
          const result = yield pharmacy_model_1.default.findOneAndUpdate(
            { pharmacyId: data.orderId },
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
          const cartData = yield pharmacist_model_1.cartSchema.findOne({
            user: data.user,
          });

          let dispatchedAddress = {};
          userData.address.forEach((element) => {
            if (result.dispatched_address == element._id) {
              dispatchedAddress = element;
            }
          });

          const adminData = yield admin_model_1.default
            .findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true })
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
            notify.doctormessage =
              "Your Pharmacy order has been confirmed for " +
              notify.date +
              " at " +
              notify.time +
              " your pharmacy id: " +
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
              console.log("rrrrr========", adminData.count, adminData._id);
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
          sendSms(userData, notify);
          console.log("dispatchedAddress------------", dispatchedAddress);
          var subject = "Your FamilyCare Pharmacy Order Placed";
          console.log("Subject------------", subject);

          var pdata = {
            subject: subject,
            result: result,
            userData: userData,
            cartData: cartData,
            dispatchedAddress: dispatchedAddress,
          };
          console.log("pdata------------", pdata);
          addEmailHelpers(pdata);
          console.log(
            "pdata=============",
            path_1.default.join(
              process.cwd(),
              "dist/templates",
              `order_placed_mail.hbs`
            )
          );
          const content = compile("order_placed_mail", data)
            .then(function (response) {
              console.log(
                "respozcvsxczvcxzxzxzxzxzxzxzxzxzxzxzxzxzxzxzxznse",
                response
              );
              if (response) {
                utility_1.sendEmailToPatient(
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
            transaction._id +
            " Received on: " +
            moment_1
              .default(req.body.date)
              .tz("Asia/Kolkata")
              .format("YYYY-MM-DD") +
            " \n of amount " +
            data.amount;
          console.log("result>>>>>>>>>>>  nursing", result);
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
          console.log("result>>>>>>>>>>> home-appointment", result);
        } else if (data.transactionType === "appointment") {
          const result = yield appointment_model_1.default.findOneAndUpdate(
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
          console.log("result>>>>>>>>>>> appointment", result);
        } else if (data.transactionType === "diagnostic") {
          const result = yield diagnostic_model_1.default.findOneAndUpdate(
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
          console.log("result>>>>>>>>>>> diagnostic", result);
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
        // console.log("i AM GOING OUT OF THIS API", content, response.VerifyOutput.atomtxnId);
        resp.status(200).send({
          success: true,
          data: "Payment Successful",
        });
        // callback(null, {success: true, data: "Payment Successful"});
        // save payment in userlogs
        const userlog = {
          _id: data.user,
          ModuleName: "payment",
          Action: "View",
          RowStatus: 0,
          loginFrom: "Patient App"
        }
        saveUserlog(userlog)
      } else {
        console.log("FAILED STATUS_________");
        status = "failed";
        if (data.transactionType === "newliveconsultancy") {
          const result = yield consultancy_model_1.liveNewConsultancySchema.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { transaction: transaction._id, valid: false } },
            { new: true }
          );
          console.log("result>>>>>>>>>>> failed new liveconsultancyyyyyy", result);
        }
        else if (data.transactionType === "consultancy") {
          const result = yield consultancy_model_1.default.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { transaction: transaction._id, valid: false } },
            { new: true }
          );
          console.log("result>>>>>>>>>>> failed consultancy", result);
        } else if (
          data.transactionType === "package" ||
          "package-home" ||
          "package-hospital"
        ) {
          const result = yield package_model_1.packagerecords.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { transaction: transaction._id, valid: false } },
            { new: true }
          );
          console.log("result>>>>>>>>>>> failed package", result);
        } else if (
          data.transactionType == "offernew-hospital" ||
          "offernew" ||
          "offernew-home"
        ) {
          const result = yield offernew_model_1.offerrecord.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { transaction: transaction._id, valid: false } },
            { new: true }
          );
          console.log(
            "result>>>>>>>>>>> failed offernewoffernewoffernewoffernew",
            result
          );
        } else if (data.transactionType === "pharmacy") {
          const result = yield pharmacy_model_1.default.findOneAndUpdate(
            { pharmacyId: data.orderId },
            { $set: { transaction: transaction._id, valid: false } },
            { new: true }
          );
          console.log("result>>>>>>>>>>> failed pharmacy", result);
        } else if (data.transactionType === "nursing") {
          const result = yield nursing_model_1.default.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { transaction: transaction._id, valid: false } },
            { new: true }
          );
          console.log("result>>>>>>>>>>> failed nursing", result);
        } else if (data.transactionType === "home-appointment") {
          const result =
            yield home_appointment_model_1.default.findOneAndUpdate(
              { _id: data.orderId },
              { $set: { transaction: transaction._id, valid: false } },
              { new: true }
            );
          console.log("result>>>>>>>>>>> failed home-appointment", result);
        } else if (data.transactionType === "appointment") {
          const result = yield appointment_model_1.default.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { transaction: transaction._id, valid: false } },
            { new: true }
          );
          console.log("result>>>>>>>>>>> failed appointment", result);
        } else if (data.transactionType === "diagnostic") {
          const result = yield diagnostic_model_1.default.findOneAndUpdate(
            { _id: data.orderId },
            { $set: { transaction: transaction._id, valid: false } },
            { new: true }
          );
          console.log("result>>>>>>>>>>> failed diagnostic", result);
        }
        resp.status(200).send({
          success: false,
          data: "Payment failure",
        });
        // callback(null, {success: false, data: "Payment failure"});
      }
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

function addEmailHelpers(dataa) {
  console.log("function called addEmailHelpers-----------", dataa);
  // return __awaiter(this, void 0, void 0, function* () {
  Handlebars.registerHelper("pharmacyId", function (data) {
    console.log(
      "dataa.result.pharmacyId------------------",
      dataa.result.pharmacyId
    );
    return dataa.result.pharmacyId;
  });
  Handlebars.registerHelper("fname", function (data) {
    console.log("dataa.userData.fname------------------", dataa.userData.fname);
    return dataa.userData.fname;
  });
  Handlebars.registerHelper("lname", function (data) {
    // console.log("dataa.userData.fname------------------", dataa.userData.fname);
    return dataa.userData.lname;
  });
  Handlebars.registerHelper("payment_method", function (data) {
    console.log(
      "dataa.result.payment_method------------------",
      dataa.result.payment_method
    );
    return dataa.result.payment_method;
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

function addHelpers(dataa) {
  console.log(
    "checking data for helper?????????sssssssssssssssssssssssssssssssssssssssss??",
    dataa
  );
  Handlebars.registerHelper("orderId", function (data) {
    console.log(
      "dataa.orderId============>>>>>>>>>>------------",
      dataa.orderId
    );
    return dataa.orderId;
  });
  Handlebars.registerHelper("txnToken", function (data) {
    console.log("dataa.txnToken=====-------------", dataa.txnToken);
    return datas.txnToken;
  });
  // Handlebars.registerHelper('actionUrl', function (data) {
  //  console.log("dataa.actionUrl=====-------------", 'https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=MxRvkW87993542401257&orderId=' + dataa.orderId);
  // return 'https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=MxRvkW87993542401257&orderId=' + dataa.orderId;

  //});
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

exports.getTransactionsByUserId = async (req, res) => {
  // console.log("userId",req.params.userId);
  if (!req.params.userId) {
    return res.status(400).json({ success: false, msg: "Please provide user id." })
  }
  try {
    const userTransactions = await transactionModel.find({ user: req.params.userId })
    // console.log("user transactions",userTransactions);
    res.status(200).json({ success: true, userTransactions })
  } catch (error) {
    console.log("error while fetching user transactions.", error);
    res.status(500).json({ success: false, error })
  }
}


exports.getTransactionsDetailsById = async (req, res) => {
  // console.log("transactionId",req.params.transactionId);
  if (!req.params.transactionId) {
    return res.status(400).json({ success: false, msg: "Please provide transactionId." })
  }
  try {
    const transactionDetails = await transactionModel.findOne({ mmp_txn: req.params.transactionId }).populate('user').lean()
    // console.log("transactionDetails....",transactionDetails);
    let orders = []
    if (transactionDetails.transactionType == "newliveconsultancy") {
      let orderDetails = {}
      orderDetails['description'] = "Live Consultancy"
      orderDetails.price = transactionDetails.amount
      orders.push(orderDetails)
      // console.log(orderDetails);
    } else if (transactionDetails.transactionType == "offernew") {
      let orderDetails = {}
      const offerRecord = await offerrecord.findById(transactionDetails.orderId)
      const offerPackage = await offernew_model_1.default.findById(offerRecord.package)
      orderDetails['description'] = offerPackage.name
      orderDetails['price'] = offerRecord.price
      orders.push(orderDetails)
      // orderDetails['sampleCollectionCharge'] = offerPackage.sampleCollectionCharge
    } else if (transactionDetails.transactionType == "package") {
      let orderDetails = {}
      const packageRecord = await packagerecords.findById(transactionDetails.orderId)
      const package_ = await package_model_1.default.findById(packageRecord.package)
      orderDetails['description'] = package_.name
      orderDetails['price'] = packageRecord.price
      orders.push(orderDetails)
      // orderDetails['sampleCollectionCharge'] = offerPackage.sampleCollectionCharge
    } else if (transactionDetails.transactionType == "pharmacy") {
      let orderDetails = {}
      const pharmacyOrder = await pharmacyModel.findById(transactionDetails.orderId).populate('cartId').lean()
      if (pharmacyOrder.cartId.medicines) {
        for (let med of pharmacyOrder.cartId.medicines) {
          orderDetails['description'] = med.ProductName
          orderDetails['price'] = med.totalCost
          orders.push(orderDetails)
          orderDetails = {}
        }
      }
      if (pharmacyOrder.cartId.labTest) {
        for (let lab of pharmacyOrder.cartId.labTest) {
          orderDetails['description'] = lab.testName
          orderDetails['price'] = lab.cost
          orders.push(orderDetails)
          orderDetails = {}
        }
      }
    }
    transactionDetails.orderItems = orders
    // console.log(orders);
    res.status(200).json({ success: true, transactionDetails })
  } catch (error) {
    console.log("error while fetching transactionDetails.", error);
    res.status(500).json({ success: false, error })
  }
}

exports.getAllPaytmTransaction = async (req, res) => {
  try {
    const limit = 20;
    const page = req.query.page == undefined ? 1 : req.query.page;
    const skipCount = (page - 1) * limit
    // const paytmTransactions = await paytm_model_1.default.find({}).skip((page - 1) * limit).limit(limit);
    let paytmTransactions = await paytm_model_1.default.aggregate([
      // {
      //   $match: {$and:[{ _id: ObjectId(req.params.paytmId) }]}
      // },
      // {
      //   $lookup : {
      //     from : "transactions",
      //     localField : "_id",
      //     foreignField : "payment",
      //     as : "paytmTransactionDetails"
      //   }
      // },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      // {
      //   $skip: skipCount, // Skip the specified number of documents
      // },
      // {
      //   $limit: limit, // Limit the number of documents returned
      // },
      {
        $sort: {
          createdAt: -1, // Sort by 'createdAt' field in descending order (newest first)
        },
      },
    ])
    console.log("paytm", paytmTransactions.length);
    const paymentRecords = await paymentModel.aggregate([
      // {
      //   $match: {$and:[{ _id: ObjectId(req.params.paytmId) }]}
      // },
      // {
      //   $lookup : {
      //     from : "transactions",
      //     localField : "_id",
      //     foreignField : "payment",
      //     as : "paytmTransactionDetails"
      //   }
      // },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      // {
      //   $skip: skipCount, // Skip the specified number of documents
      // },
      // {
      //   $limit: limit, // Limit the number of documents returned
      // },
      {
        $sort: {
          createdAt: -1, // Sort by 'createdAt' field in descending order (newest first)
        },
      },
    ])
    paytmTransactions = paytmTransactions.concat(paymentRecords)
    console.log("payments", paymentRecords.length);
    console.log("user transactions", paytmTransactions.length);
    res.status(200).json({ success: true, paytmTransactions })
  } catch (error) {
    console.log("error while fetching user paytm transactions.", error);
    res.status(500).json({ success: false, error })
  }
}

exports.updatePaytmRecordTransaction = async (req, res) => {
  if (!req.params.paytmId) {
    return res.status(400).json({ success: false, msg: "Please provide paytm id." })
  }
  try {
    if (req.body.paymentType === "card") {
      const bank_txn = req.body.BankTxnID
      // const TxnType = req.body.TxnType == "" ? "SALE":req.body.TxnType
      const bankname = req.body.bankname == "" ? null : req.body.bankname
      const gatewayname = req.body.gatewayname == "" ? "PPBLC" : req.body.gatewayname
      const paymentMode = req.body.paymentMode == "" ? "Atom" : req.body.paymentMode
      // const paytmTxnId = req.body.paytmTxnId
      const prod = "SCANDEN"
      const merchant_id = "62021"
      const status = req.body.status

      const paytmUpdatedRecord = await paymentModel.findOneAndUpdate(
        { _id: req.params.paytmId },
        {
          $set: {
            bank_txn, bankname, gatewayname, paymentMode, prod, status, merchant_id,
            "udf1": req.body.name == "" ? req.body.name : "",
            "udf2": "null",
            "udf3": req.body.phone == "" ? req.body.phone : "",
            "udf4": "null",
            "udf5": "null",
            "udf6": "null",
            "udf9": "null"
          }
        }, { new: true },
      )
      // console.log("paytmUpdatedRecord",paytmUpdatedRecord);
      const newTransaction = new transactionModel({
        paymentGateway: "bank",
        payment: req.params.paytmId,
        TransactionId: paytmUpdatedRecord.mer_txn,
        transactionType: paytmUpdatedRecord.transactionType,
        user: paytmUpdatedRecord.user,
        orderId: paytmUpdatedRecord.orderId,
        date: paytmUpdatedRecord.dateObj,
        transactionStatus: "paid",
        status: status,
        payThrough: "bank",
        mmp_txn: bank_txn

      })
      // console.log("transaction..",newTransaction);
      await newTransaction.save()
      const offerRecordUpdate = await offernew_model_1.default.findOneAndUpdate(
        { _id: paytmUpdatedRecord.orderId },
        { status: "Completed", paystatus: "Completed" }
      )
    } else {
      const BankTxnID = req.body.BankTxnID
      const TxnType = req.body.TxnType == "" ? "SALE" : req.body.TxnType
      const bankname = req.body.bankname == "" ? null : req.body.bankname
      const gatewayname = req.body.gatewayname == "" ? "PPBLC" : req.body.gatewayname
      const paymentMode = req.body.paymentMode == "" ? "UPI" : req.body.paymentMode
      const paytmTxnId = req.body.paytmTxnId
      const status = req.body.status
      const paytmUpdatedRecord = await paytm_model_1.default.findOneAndUpdate(
        { _id: req.params.paytmId },
        {
          $set: {
            BankTxnID, TxnType, bankname, gatewayname, paymentMode, paytmTxnId, status
          }
        }, { new: true },
      )
      // console.log("paytmUpdatedRecord",paytmUpdatedRecord);
      const newTransaction = new transactionModel({
        paymentGateway: "bank",
        payment: req.params.paytmId,
        TransactionId: paytmUpdatedRecord.mer_txn,
        transactionType: paytmUpdatedRecord.transactionType,
        user: paytmUpdatedRecord.user,
        orderId: paytmUpdatedRecord.orderId,
        date: paytmUpdatedRecord.dateObj,
        transactionStatus: "paid",
        status: status,
        payThrough: "bank",
        mmp_txn: paytmTxnId

      })
      // console.log("transaction..",newTransaction);
      await newTransaction.save()
      const offerRecordUpdate = await offernew_model_1.default.findOneAndUpdate(
        { _id: paytmUpdatedRecord.orderId },
        { status: "Completed", paystatus: "Completed" }
      )

    }
    res.status(201).json({ success: true, msg: "successfully updated" })
  } catch (error) {
    console.log("error while updating paytm transactions.", error);
    res.status(500).json({ success: false, error })
  }
}
exports.getPaytmTransactionByUserId = async (req, res) => {
  // console.log("userId",req.params.userId);
  if (!req.params.userId) {
    return res.status(400).json({ success: false, msg: "Please provide user id." })
  }
  try {
    const userPaytmTransactions = await paytm_model_1.default.find({ user: req.params.userId })
    // console.log("user transactions",userPaytmTransactions);
    res.status(200).json({ success: true, userPaytmTransactions })
  } catch (error) {
    console.log("error while fetching user paytm transactions.", error);
    res.status(500).json({ success: false, error })
  }
}

exports.getPaytmTransactionDetails = async (req, res) => {
  if (!req.params.paytmId) {
    return res.status(400).json({ success: false, msg: "Please provide paytm id." })
  }
  try {
    // console.log("id..",ObjectId(req.params.paytmId));
    // const paytmTransaction = await paytm_model_1.default.find({_id:req.params.paytmId})
    let paytmTransactionDetails;
    if (!req.params.paytmId) {
      paytmTransactionDetails = await paytm_model_1.default.aggregate([
        // {
        //   $match: {$and:[{ _id: ObjectId(req.params.paytmId) }]}
        // },
        {
          $lookup: {
            from: "transactions",
            localField: "_id",
            foreignField: "payment",
            as: "paytmTransactionDetails"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        }
      ])
    } else {
      paytmTransactionDetails = await paytm_model_1.default.aggregate([
        {
          $match: { $and: [{ _id: ObjectId(req.params.paytmId) }] }
        },
        {
          $lookup: {
            from: "transactions",
            localField: "_id",
            foreignField: "payment",
            as: "paytmTransactionDetails"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        }
      ])
    }
    // console.log("user transactions",paytmTransactionDetails);
    res.status(200).json({ success: true, paytmTransactionDetails })
  } catch (error) {
    console.log("error while fetching user paytm transactions details.", error);
    res.status(500).json({ success: false, error })
  }
}

function successPkgSms(phone, name) {
  name = name.trim()
  // console.log(`roshandsf jkkkkkkkkkkkkkkkl${name}dsfds`)

  if (!phone) {
    console.log("phone no is not present ")
  } else {
    try {

      const to = "91" + parseInt(phone);
      //  const msg = "Dear "+ _.startCase(userDetails.name.trim()) +", the online video consultation report is ready on FamilyCare site."   
      const msg = `Dear ${name}, Thank you for your payment! Your Familycare package is now active. Enjoy seamless access to consultations, medicine orders, and blood tests anytime via our website or app to get started.
`

      // const url = "https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=" + to + "&msg=" + msg + "&mt=0&tempId=1007790058238925829";   
      // console.log("usrl", url); 

      ///////////////////////////////////////////////////////////////////
      const url =
        "https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=" +
        to +
        "&msg=" +
        msg +
        "&mt=0&tempId=1007162508660598707";
      console.log("url", url)
      ///////////////////////////////////////////////////////////////////

      superagent_1.default
        .get(url)
        .end(function (err, response) {
          if (err) {
            console.log(" error", err);
            // res.status(500).json({
            //   "error": err
            // });
          } else {
            console.log("package sms has sent successfully.  ");
          }
        });

    } catch (error) {
      console.log("error", error)

    }
  }
}


// successPkgSms("9924279484", "roshan ")
// successPkgSms("9819289042", "sagar")