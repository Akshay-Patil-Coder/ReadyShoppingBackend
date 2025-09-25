import pharmacystModel from "../pharmacist/pharmacist.model"
import userModel from "../user/user.model.js";
import pharmacyModel from "../pharmacy/pharmacy.model.js";
import paytmModel from "./PayTm.model.js";
import { sendEmailToPatient } from "../../util/utility.js";
import https from "https";
import checksumLib from "./checksum.js";
import { sendMessage } from "../../socket.js";
import _ from "lodash";
import Handlebars from "handlebars";
import path from "path";
import fs from "fs-extra";
import superagent from "superagent";
import { sendNotification } from "../pushnotifications/push.controller.js";
import transactionModel from "../payment/transaction.model.js";
import { offerrecord } from "../offernew/offernew.model.js";
import moment from "moment";
import shortid from "shortid";
import consultancyModel from "../liveconsultancy/liveconsultancy.model.js";
import adminModel from "../admin/admin.model.js";
import notificationModel from "../notification/notification.model.js";
import offernewModel from "../offernew/offernew.model.js";
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import CoachingCourceOrder from '../CoachingOrder/CoachingOrder.model.js';
import { PaymentTokenModel } from './PaymentToken.model.js';
import CoachingGainerCompaniesModel from '../CoachingGainerCompnay/CoachingGainerCompnay.model.js';
import { CompanyGainerRequestModel } from "../CoachingGainerCompanyOrder/CoachingGainerCompanyOrder.model.js";
import package_model from "../package/package.model";
import mongoose from "mongoose";

export const initiateTransaction = async (req, res) => {
  console.log("request query-------- in paytm", JSON.stringify(req.query));
  
  if (!req.query.amt || !req.query.userId || !req.query.orderId || !req.query.transactionType) {
    return res.status(400).send({
      success: false,
      msg: "Enter All Details.",
    });
  }
  
  if (!req.query.userId) {
    return res.status(400).send({
      success: false,
      msg: "User Id does not match.",
    });
  }

  try {
    const data = await userModel.findOne({ _id: req.query.userId });
    if (!data || !data._id) {
      return res.status(417).send({
        success: false,
        data: "User not found.",
      });
    }

    const paytmParams = {
      body: {
        requestType: "Payment",
        mid: "MxRvkW87993542401257",
        websiteName: "DEFAULT",
        orderId: req.query.orderId,
        callbackUrl: "https://paymentapi.familycarehospitals.com/api/v1/paytm/successUrl",
        txnAmount: {
          value: req.query.amt,
          currency: "INR",
        },
        userInfo: {
          custId: req.query.userId,
          mobile: req.query.mobileNumber,
        },
      }
    };

    try {
      const checksum = await checksumLib.generateSignature(
        JSON.stringify(paytmParams.body),
        "nUP1#%58yYc__uAV"
      );

      const dateObj = moment(new Date()).tz("Asia/Kolkata").format("YYYY-MM-DD");
      const transid = shortid.generate();
      
      const paymentData = {
        mer_txn: transid,
        user: req.query.userId,
        orderId: req.query.orderId,
        transactionType: req.query.transactionType,
        dateObj: dateObj,
        amount: req.query.amt,
        checksumhash: checksum,
      };

      const payData = new paytmModel(paymentData);
      await payData.save();

      paytmParams.head = {
        signature: checksum,
      };

      const post_data = JSON.stringify(paytmParams);
      const options = {
        hostname: "securegw.paytm.in",
        path: `/theia/api/v1/initiateTransaction?mid=MxRvkW87993542401257&orderId=${req.query.orderId}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": post_data.length,
        },
      };

      let response = "";
      const postReq = https.request(options, (postRes) => {
        postRes.on("data", (chunk) => {
          response += chunk;
        });

        postRes.on("end", () => {
          console.log("Response:************ ", response);
          const sendData = JSON.parse(response);
          res.send({
            success: true,
            data: sendData,
            paymentId: payData._id,
          });
        });
      });

      postReq.write(post_data);
      postReq.end();
    } catch (error) {
      console.error("Error in initiateTransaction:", error);
      res.status(500).send({ success: false, error: error.message });
    }
  } catch (err) {
    res.status(500).send({
      success: false,
      data: err,
    });
  }
};

export const initiateTransactionForEachCoachOrder = async (req, res) => {
  console.log("request query-------- in paytm", JSON.stringify(req.query));
  
  if (!req.query.amt || !req.query.userId || !req.query.orderId || !req.query.transactionType) {
    return res.status(400).send({
      success: false,
      msg: "Enter All Details.",
    });
  }

  try {
    const data = await CoachingGainerCompaniesModel.findOne({ _id: req.query.userId });
    if (!data || !data._id) {
      return res.status(417).send({
        success: false,
        data: "User not found.",
      });
    }

    const paytmParams = {
      body: {
        requestType: "Payment",
        mid: "MxRvkW87993542401257",
        websiteName: "DEFAULT",
        orderId: req.query.orderId,
        callbackUrl: "https://paymentapi.familycarehospitals.com/api/v1/paytm/successForEachCoachingOrder",
        txnAmount: {
          value: req.query.amt,
          currency: "INR",
        },
        userInfo: {
          custId: req.query.userId,
          mobile: req.query.mobileNumber,
        },
      }
    };

    const checksum = await checksumLib.generateSignature(
      JSON.stringify(paytmParams.body),
      "nUP1#%58yYc__uAV"
    );

    const dateObj = moment(new Date()).tz("Asia/Kolkata").format("YYYY-MM-DD");
    const transid = shortid.generate();
    
    const paymentData = {
      mer_txn: transid,
      user: req.query.userId,
      orderId: req.query.orderId,
      transactionType: req.query.transactionType,
      dateObj: dateObj,
      amount: req.query.amt,
      checksumhash: checksum,
    };

    const payData = new paytmModel(paymentData);
    await payData.save();

    paytmParams.head = {
      signature: checksum,
    };

    const post_data = JSON.stringify(paytmParams);
    const options = {
      hostname: "securegw.paytm.in",
      path: `/theia/api/v1/initiateTransaction?mid=MxRvkW87993542401257&orderId=${req.query.orderId}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    let response = "";
    const postReq = https.request(options, (postRes) => {
      postRes.on("data", (chunk) => {
        response += chunk;
      });

      postRes.on("end", () => {
        console.log("Response:************ ", response);
        const sendData = JSON.parse(response);
        res.send({
          success: true,
          data: sendData,
          paymentId: payData._id,
        });
      });
    });

    postReq.write(post_data);
    postReq.end();
  } catch (error) {
    console.error("Error in initiateTransactionForEachCoachOrder:", error);
    res.status(500).send({
      success: false,
      data: error.message,
    });
  }
};

export const initiateTransactionForEmailPayment = async (req, res) => {
  console.log("request query-------- in paytm", JSON.stringify(req.query));
  
  if (!req.query.amt || !req.query.userId || !req.query.orderId || !req.query.transactionType) {
    return res.status(400).send({
      success: false,
      msg: "Enter All Details.",
    });
  }

  try {
    const data = await CoachingGainerCompaniesModel.findOne({ _id: req.query.userId });
    if (!data || !data._id) {
      return res.status(417).send({
        success: false,
        data: "User not found.",
      });
    }

    const paytmParams = {
      body: {
        requestType: "Payment",
        mid: "MxRvkW87993542401257",
        websiteName: "DEFAULT",
        orderId: req.query.orderId,
        callbackUrl: "https://paymentapi.familycarehospitals.com/api/v1/paytm/successForPaytmPaymentViaEmail",
        txnAmount: {
          value: req.query.amt,
          currency: "INR",
        },
        userInfo: {
          custId: req.query.userId,
          mobile: req.query.mobileNumber,
        },
      }
    };

    const checksum = await checksumLib.generateSignature(
      JSON.stringify(paytmParams.body),
      "nUP1#%58yYc__uAV"
    );

    const dateObj = moment(new Date()).tz("Asia/Kolkata").format("YYYY-MM-DD");
    const transid = shortid.generate();
    
    const paymentData = {
      mer_txn: transid,
      user: req.query.userId,
      orderId: req.query.orderId,
      transactionType: req.query.transactionType,
      dateObj: dateObj,
      amount: req.query.amt,
      checksumhash: checksum,
    };

    const payData = new paytmModel(paymentData);
    await payData.save();

    paytmParams.head = {
      signature: checksum,
    };

    const post_data = JSON.stringify(paytmParams);
    const options = {
      hostname: "securegw.paytm.in",
      path: `/theia/api/v1/initiateTransaction?mid=MxRvkW87993542401257&orderId=${req.query.orderId}`,
      method: "POST",
      headers: {
        "Content-Type": "application",
        "Content-Length": post_data.length,
      },
    };

    let response = "";
    const postReq = https.request(options, (postRes) => {
      postRes.on("data", (chunk) => {
        response += chunk;
      });

      postRes.on("end", () => {
        console.log("Response:************ ", response);
        const sendData = JSON.parse(response);
        res.send({
          success: true,
          data: sendData,
          paymentId: payData._id,
          });
      });
    });

    postReq.write(post_data);
    postReq.end();
  } catch (error) {
    console.error("Error in initiateTransactionForEmailPayment:", error);
    res.status(500).send({
      success: false,
      data: error.message,
    });
  }
};

export const redirect = (req, resp) => {
  console.log("Redirect to callback URL========= in..", JSON.stringify(req.query));
  const bdata = { txnToken: req.query.txnToken, orderId: req.query.orderId };
  console.log("bdata-----------------", bdata);
  
  resp.render("response", {
    txnToken: req.query.txnToken,
    orderId: req.query.orderId,
  });
};

export const sendMailForPayment = async (req, resp) => {
  if (!req.query.txnToken || !req.query.orderId || !req.query.companyId) {
    return resp.status(400).json({ message: "Missing required parameters", success: false });
  }

  try {
    const TokenData = { txnToken: req.query.txnToken, orderId: req.query.orderId };
    const PaymentToken = jwt.sign(TokenData, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '10min'
    });

    if (!PaymentToken) {
      return resp.status(500).json({ message: "Failed to generate payment token", success: false });
    }

    const PaymentTokenSavedData = {
      companyId: req.query.companyId,
      PaymentToken: PaymentToken,
      orderId: req.query.orderId
    };

    const existingToken = await PaymentTokenModel.findOne({ orderId: req.query.orderId });
    if (existingToken && (existingToken.PaymentStatus === 'UnMarked' || existingToken.PaymentStatus === 'Expired')) {
      await PaymentTokenModel.deleteOne({ orderId: req.query.orderId });
      console.log('Old order deleted');
    }

    const savedPaymentToken = new PaymentTokenModel(PaymentTokenSavedData);
    await savedPaymentToken.save();

    const order = await CompanyGainerRequestModel.findOne({ _id: req.query.orderId });
    if (!order || !order.GainerCompanyId) {
      return resp.status(404).json({ message: "Order not found", success: false });
    }

    const company = await CoachingGainerCompaniesModel.findOne({ _id: order.GainerCompanyId });
    if (!company || !company.Email) {
      return resp.status(404).json({ message: "Company not found or missing email", success: false });
    }

    const PaymentLink = `http://localhost:5296/api/v1/paytm/redirectFromEmailToPaytm/${PaymentToken}`;

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
      to: company.Email,
      subject: 'Complete your payment',
      html: `<p>Hello,</p>
             <p>Please complete your payment by clicking the link below:</p>
             <a href="${PaymentLink}" target="_blank">Pay Now</a>
             <p>Please make payment within 5 minutes. This link is only available for 5 minutes.</p>`
    };

    await transporter.sendMail(mailOptions);
    resp.status(200).json({ message: "Mail sent successfully", success: true });
  } catch (error) {
    console.error('Error sending mail:', error);
    resp.status(500).json({ message: "Failed to send email", success: false, error: error.message });
  }
};

export const redirectFromEmailToPaytm = async (req, resp) => {
  const PaymentToken = req.params.PaymentToken;
  if (!PaymentToken) {
    return resp.status(400).json({ message: 'Payment Token Not Found', success: false });
  }

  try {
    const findTokenData = await PaymentTokenModel.findOne({ PaymentToken });
    if (!findTokenData) {
      return resp.status(400).json({ message: 'Transaction Not Initiated For This Token or Token Is Wrong', success: false });
    }

    const PaymentTokenData = jwt.verify(findTokenData.PaymentToken, process.env.ACCESS_TOKEN_SECRET);
    if (!PaymentTokenData) {
      return resp.status(400).json({ message: 'Invalid Token', success: false });
    }

    resp.render("response", {
      txnToken: PaymentTokenData.txnToken,
      orderId: PaymentTokenData.orderId,
    });
  } catch (error) {
    console.error('Error in redirectFromEmailToPaytm:', error);
    resp.status(400).json({ message: 'Invalid or Expired Token', success: false });
  }
};

export const success = async (req, resp) => {
  console.log("Paytm Payment SuccessUrl=======", JSON.stringify(req.body));
  
  try {
    const data = await paytmModel.findOne({ orderId: req.body.ORDERID });
    if (!data) {
      const queryParams = {
        txnId: "",
        tranType: "",
        payStat: "Payment Not Found."
      };
      const queryString = new URLSearchParams(queryParams).toString();
      return resp.redirect(`https://www.familycarehospitals.com/payment-status?${queryString}`);
    }

    let status;
    const paytmParams = {};

    paytmParams["MID"] = "MxRvkW87993542401257";
    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?';

    paytmParams["ORDERID"] = data.orderId;
    paytmParams["CHECKSUMHASH"] = data.checksumhash;

    const post_data = JSON.stringify(paytmParams);
    const options = {
      hostname: "securegw.paytm.in",
      path: "/order/status/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    const response = await new Promise((resolve, reject) => {
      let responseData = "";
      const postReq = https.request(options, (postRes) => {
        postRes.on("data", (chunk) => {
          responseData += chunk;
        });

        postRes.on("end", () => {
          resolve(responseData);
        });
      });

      postReq.on("error", (err) => {
        reject(err);
      });

      postReq.write(post_data);
      postReq.end();
    });

    console.log("Response: ", response);
    const sendData = JSON.parse(response);

    if (sendData.STATUS == "PENDING") {
      status = "pending";
    } else if (sendData.STATUS == "TXN_SUCCESS") {
      status = "success";
    } else if (sendData.STATUS == "TXN_FAILURE") {
      status = "failed";
    }

    const updatedData = await paytmModel.findOneAndUpdate(
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
      { new: true }
    );

    const newDate = new Date();
    const latestDate = moment(newDate).tz("Asia/Kolkata").format("YYYY-MM-DD");

    if (updatedData) {
      const transaction = new transactionModel({
        payment: updatedData._id,
        TransactionId: updatedData.mer_txn,
        transactionType: updatedData.transactionType,
        amount: updatedData.amount,
        user: updatedData.user,
        orderId: updatedData.orderId,
        date: latestDate,
        transactionStatus: "paid",
        status: status,
        payThrough: "bank",
        paymentGateway: "Paytm",
        mmp_txn: updatedData.paytmTxnId,
      });

      await transaction.save();

      if (status == "success") {
        const queryParams = {
          txnId: updatedData.paytmTxnId,
          tranType: updatedData.transactionType,
          payStat: "success"
        };
        const queryString = new URLSearchParams(queryParams).toString();
        return resp.redirect(`${redirectUrl}${queryString}`);
      } else if (status == "pending") {
        const queryParams = {
          txnId: updatedData.paytmTxnId,
          tranType: updatedData.transactionType,
          payStat: "pending"
        };
        const queryString = new URLSearchParams(queryParams).toString();
        return resp.redirect(`${redirectUrl}${queryString}`);
      } else {
        const queryParams = {
          txnId: updatedData.paytmTxnId,
          tranType: updatedData.transactionType,
          payStat: "Failed"
        };
        const queryString = new URLSearchParams(queryParams).toString();
        return resp.redirect(`${redirectUrl}${queryString}`);
      }
    }
  } catch (error) {
    console.error("Error in success handler:", error);
    const queryParams = {
      error: error.message,
      tranType: "",
      payStat: "Error"
    };
    const queryString = new URLSearchParams(queryParams).toString();
    resp.redirect(`https://www.familycarehospitals.com/payment-status?${queryString}`);
  }
};
export const successForPaytmPaymentViaEmail = async (req, resp) => {
  try {
    const data = await paytmModel.findOne({ orderId: req.body.ORDERID });
    let status;
    let PaymentStatus;
    const paytmParams = {};

    paytmParams["MID"] = "MxRvkW87993542401257";
    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?';

    paytmParams["ORDERID"] = data.orderId;
    paytmParams["CHECKSUMHASH"] = data.checksumhash;

    const post_data = JSON.stringify(paytmParams);
    const options = {
      hostname: "securegw.paytm.in",
      path: "/order/status/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    const response = await new Promise((resolve, reject) => {
      let responseData = "";
      const postReq = https.request(options, (postRes) => {
        postRes.on("data", (chunk) => {
          responseData += chunk;
        });

        postRes.on("end", () => {
          resolve(responseData);
        });
      });

      postReq.on("error", (err) => {
        reject(err);
      });

      postReq.write(post_data);
      postReq.end();
    });

    const sendData = JSON.parse(response);
    if (sendData.STATUS == "PENDING") {
      status = "pending";
      PaymentStatus = 'UnMarked';
    } else if (sendData.STATUS == "TXN_SUCCESS") {
      status = "success";
      PaymentStatus = 'Marked';
    } else if (sendData.STATUS == "TXN_FAILURE") {
      status = "failed";
      PaymentStatus = 'Expired';
    }

    const updatedData = await paytmModel.findOneAndUpdate(
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
      { new: true }
    );

    const newDate = new Date();
    const latestDate = moment(newDate).tz("Asia/Kolkata").format("YYYY-MM-DD");

    if (updatedData) {
      const transaction = new transactionModel({
        payment: updatedData._id,
        TransactionId: updatedData.mer_txn,
        transactionType: updatedData.transactionType,
        amount: updatedData.amount,
        user: updatedData.user,
        orderId: updatedData.orderId,
        date: latestDate,
        transactionStatus: "paid",
        status: status,
        payThrough: "bank",
        paymentGateway: "Paytm",
        mmp_txn: updatedData.paytmTxnId,
      });

      await transaction.save();

      if (status == "success") {
        let PendingAmount;
        let valid = false;
        const FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId });
        const TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET);
        
        if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
          const FindCource = await CompanyGainerRequestModel.findOne({ _id: req.body.ORDERID });
          let TokenOfCource = jwt.sign({ 
            UserId: FindCource.GainerCompanyId, 
            CourceIds: FindCource.CourceIds, 
            PaymentId: transaction._id, 
            Status: 'Completed' 
          }, process.env.ACCESS_TOKEN_SECRET);
          
          if (transaction.amount == FindCource.NegotiatedAmount) {
            PendingAmount = null;
            status = 'Completed';
            valid = true;
          } else {
            PendingAmount = FindCource.NegotiatedAmount - transaction.amount;
            status = 'PendingAmount';
            TokenOfCource = jwt.sign({ 
              UserId: FindCource.GainerCompanyId, 
              CourceIds: FindCource.CourceIds, 
              PaymentId: transaction._id, 
              Status: 'PendingAmount' 
            }, process.env.ACCESS_TOKEN_SECRET);
          }
          
          if (FindCource) {
            await CompanyGainerRequestModel.findOneAndUpdate({
              _id: data.orderId
            }, {
              $set: {
                PaymentStatus: status,
                PaymentMethod: 'Paytm',
                Transaction: transaction._id,
                OrderDate: transaction.createdAt.toISOString().split('T')[0],
                OrderTime: transaction.createdAt.toISOString().split('T')[1].split('.')[0],
                PaidAmount: transaction.amount,
                PendingAmount: PendingAmount,
                valid: valid,
                TokenOfCource: TokenOfCource
              }
            }, { new: true });
          }
          
          await PaymentTokenModel.findOneAndUpdate({
            orderId: data.orderId
          }, {
            $set: {
              PaymentStatus: PaymentStatus
            }
          }, { new: true });

          const queryParams = {
            txnId: data.paytmTxnId,
            tranType: data.transactionType,
            payStat: "success"
          };
          const queryString = new URLSearchParams(queryParams).toString();
          return resp.redirect(`${redirectUrl}${queryString}`);
        } else {
          return resp.status(400).json({ message: 'order id not be matched', success: false });
        }
      } else if (status == "pending") {
        const FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId });
        const TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET);
        
        if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
          const FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID });
          const TokenOfCource = jwt.sign({ 
            UserId: FindCource.UserId, 
            CourceId: FindCource.CourceId, 
            PaymentId: transaction._id, 
            Status: 'In Progress' 
          }, process.env.ACCESS_TOKEN_SECRET);
          
          if (FindCource) {
            await CoachingCourceOrder.findOneAndUpdate({
              _id: data.orderId
            }, {
              $set: {
                PaymentStatus: 'In Progress',
                PaymentMethod: 'Paytm',
                Transaction: transaction._id,
                OrderDate: transaction.createdAt.toISOString().split('T')[0],
                OrderTime: transaction.createdAt.toISOString().split('T')[1].split('.')[0],
                TokenOfCource: TokenOfCource
              }
            }, { new: true });
          }
          
          await PaymentTokenModel.findOneAndUpdate({
            orderId: data.orderId
          }, {
            $set: {
              PaymentStatus: PaymentStatus
            }
          }, { new: true });

          const queryParams = {
            txnId: data.paytmTxnId,
            tranType: data.transactionType,
            payStat: "pending"
          };
          const queryString = new URLSearchParams(queryParams).toString();
          return resp.redirect(`${redirectUrl}${queryString}`);
        } else {
          return resp.status(400).json({ message: 'order id not be matched', success: false });
        }
      } else if (status == 'failed') {
        const FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId });
        const TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET);
        
        if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
          const FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID });
          const TokenOfCource = jwt.sign({ 
            UserId: FindCource.UserId, 
            CourceId: FindCource.CourceId, 
            PaymentId: transaction._id, 
            Status: 'Cancelled' 
          }, process.env.ACCESS_TOKEN_SECRET);
          
          if (FindCource) {
            await CoachingCourceOrder.findOneAndUpdate({
              _id: data.orderId
            }, {
              $set: {
                PaymentStatus: 'Cancelled',
                PaymentMethod: 'Paytm',
                Transaction: transaction._id,
                OrderDate: transaction.createdAt.toISOString().split('T')[0],
                OrderTime: transaction.createdAt.toISOString().split('T')[1].split('.')[0],
                TokenOfCource: TokenOfCource
              }
            }, { new: true });
          }
          
          await PaymentTokenModel.findOneAndUpdate({
            orderId: data.orderId
          }, {
            $set: {
              PaymentStatus: PaymentStatus
            }
          }, { new: true });

          const queryParams = {
            txnId: data.paytmTxnId,
            tranType: data.transactionType,
            payStat: "failed"
          };
          const queryString = new URLSearchParams(queryParams).toString();
          return resp.redirect(`${redirectUrl}${queryString}`);
        }
      } else {
        const queryParams = {
          txnId: data.paytmTxnId,
          tranType: data.transactionType,
          payStat: "Failed"
        };
        const queryString = new URLSearchParams(queryParams).toString();
        return resp.redirect(`${redirectUrl}${queryString}`);
      }
    } else {
      const queryParams = {
        txnId: "",
        tranType: "",
        payStat: "Payment Not Found."
      };
      const queryString = new URLSearchParams(queryParams).toString();
      return resp.redirect(`${redirectUrl}${queryString}`);
    }
  } catch (error) {
    console.error("Error in successForPaytmPaymentViaEmail:", error);
    const queryParams = {
      error: error.message,
      tranType: "",
      payStat: "Error"
    };
    const queryString = new URLSearchParams(queryParams).toString();
    return resp.redirect(`https://www.familycarehospitals.com/payment-status?${queryString}`);
  }
};

export const successForEachCoachingOrder = async (req, resp) => {
  try {
    const data = await paytmModel.findOne({ orderId: req.body.ORDERID });
    let status;
    let PaymentStatus;
    const paytmParams = {};

    paytmParams["MID"] = "MxRvkW87993542401257";
    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?';

    paytmParams["ORDERID"] = data.orderId;
    paytmParams["CHECKSUMHASH"] = data.checksumhash;

    const post_data = JSON.stringify(paytmParams);
    const options = {
      hostname: "securegw.paytm.in",
      path: "/order/status/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    const response = await new Promise((resolve, reject) => {
      let responseData = "";
      const postReq = https.request(options, (postRes) => {
        postRes.on("data", (chunk) => {
          responseData += chunk;
        });

        postRes.on("end", () => {
          resolve(responseData);
        });
      });

      postReq.on("error", (err) => {
        reject(err);
      });

      postReq.write(post_data);
      postReq.end();
    });

    const sendData = JSON.parse(response);
    if (sendData.STATUS == "PENDING") {
      status = "pending";
      PaymentStatus = 'UnMarked';
    } else if (sendData.STATUS == "TXN_SUCCESS") {
      status = "success";
      PaymentStatus = 'Marked';
    } else if (sendData.STATUS == "TXN_FAILURE") {
      status = "failed";
      PaymentStatus = 'Expired';
    }

    const updatedData = await paytmModel.findOneAndUpdate(
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
      { new: true }
    );

    const newDate = new Date();
    const latestDate = moment(newDate).tz("Asia/Kolkata").format("YYYY-MM-DD");

    if (updatedData) {
      const transaction = new transactionModel({
        payment: updatedData._id,
        TransactionId: updatedData.mer_txn,
        transactionType: updatedData.transactionType,
        amount: updatedData.amount,
        user: updatedData.user,
        orderId: updatedData.orderId,
        date: latestDate,
        transactionStatus: "paid",
        status: status,
        payThrough: "bank",
        paymentGateway: "Paytm",
        mmp_txn: updatedData.paytmTxnId,
      });

      await transaction.save();

      if (status == "success") {
        let PendingAmount;
        let valid = false;
        const FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId });
        const TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET);
        
        if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
          const FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID });
          let TokenOfCource = jwt.sign({ 
            UserId: FindCource.UserId, 
            CourceId: FindCource.CourceId, 
            PaymentId: transaction._id, 
            Status: 'Completed' 
          }, process.env.ACCESS_TOKEN_SECRET);
          
          if (transaction.amount == FindCource.TotalAmount) {
            PendingAmount = null;
            status = 'Completed';
            valid = true;
          } else {
            PendingAmount = FindCource.TotalAmount - transaction.amount;
            status = 'PendingAmount';
            TokenOfCource = jwt.sign({ 
              UserId: FindCource.UserId, 
              CourceId: FindCource.CourceId, 
              PaymentId: transaction._id, 
              Status: 'PendingAmount' 
            }, process.env.ACCESS_TOKEN_SECRET);
          }
          
          if (FindCource) {
            await CoachingCourceOrder.findOneAndUpdate({
              _id: data.orderId
            }, {
              $set: {
                PaymentStatus: status,
                PaymentMethod: 'Paytm',
                Transaction: transaction._id,
                OrderDate: transaction.createdAt.toISOString().split('T')[0],
                OrderTime: transaction.createdAt.toISOString().split('T')[1].split('.')[0],
                PaidAmount: transaction.amount,
                PendingAmount: PendingAmount,
                valid: valid,
                TokenOfCource: TokenOfCource
              }
            }, { new: true });
          }
          
          await PaymentTokenModel.findOneAndUpdate({
            orderId: data.orderId
          }, {
            $set: {
              PaymentStatus: PaymentStatus
            }
          }, { new: true });

          const queryParams = {
            txnId: data.paytmTxnId,
            tranType: data.transactionType,
            payStat: "success"
          };
          const queryString = new URLSearchParams(queryParams).toString();
          return resp.redirect(`${redirectUrl}${queryString}`);
        } else {
          return resp.status(400).json({ message: 'order id not be matched', success: false });
        }
      } else if (status == "pending") {
        const FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId });
        const TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET);
        
        if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
          const FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID });
          const TokenOfCource = jwt.sign({ 
            UserId: FindCource.UserId, 
            CourceId: FindCource.CourceId, 
            PaymentId: transaction._id, 
            Status: 'In Progress' 
          }, process.env.ACCESS_TOKEN_SECRET);
          
          if (FindCource) {
            await CoachingCourceOrder.findOneAndUpdate({
              _id: data.orderId
            }, {
              $set: {
                PaymentStatus: 'In Progress',
                PaymentMethod: 'Paytm',
                Transaction: transaction._id,
                OrderDate: transaction.createdAt.toISOString().split('T')[0],
                OrderTime: transaction.createdAt.toISOString().split('T')[1].split('.')[0],
                TokenOfCource: TokenOfCource
              }
            }, { new: true });
          }
          
          await PaymentTokenModel.findOneAndUpdate({
            orderId: data.orderId
          }, {
            $set: {
              PaymentStatus: PaymentStatus
            }
          }, { new: true });

          const queryParams = {
            txnId: data.paytmTxnId,
            tranType: data.transactionType,
            payStat: "pending"
          };
          const queryString = new URLSearchParams(queryParams).toString();
          return resp.redirect(`${redirectUrl}${queryString}`);
        } else {
          return resp.status(400).json({ message: 'order id not be matched', success: false });
        }
      } else if (status == 'failed') {
        const FindedTokenOfPayment = await PaymentTokenModel.findOne({ orderId: data.orderId });
        const TokenData = jwt.verify(FindedTokenOfPayment.PaymentToken, process.env.ACCESS_TOKEN_SECRET);
        
        if (TokenData.orderId == data.orderId && TokenData.orderId == FindedTokenOfPayment.orderId && data.orderId == FindedTokenOfPayment.orderId) {
          const FindCource = await CoachingCourceOrder.findOne({ _id: req.body.ORDERID });
          const TokenOfCource = jwt.sign({ 
            UserId: FindCource.UserId, 
            CourceId: FindCource.CourceId, 
            PaymentId: transaction._id, 
            Status: 'Cancelled' 
          }, process.env.ACCESS_TOKEN_SECRET);
          
          if (FindCource) {
            await CoachingCourceOrder.findOneAndUpdate({
              _id: data.orderId
            }, {
              $set: {
                PaymentStatus: 'Cancelled',
                PaymentMethod: 'Paytm',
                Transaction: transaction._id,
                OrderDate: transaction.createdAt.toISOString().split('T')[0],
                OrderTime: transaction.createdAt.toISOString().split('T')[1].split('.')[0],
                TokenOfCource: TokenOfCource
              }
            }, { new: true });
          }
          
          await PaymentTokenModel.findOneAndUpdate({
            orderId: data.orderId
          }, {
            $set: {
              PaymentStatus: PaymentStatus
            }
          }, { new: true });

          const queryParams = {
            txnId: data.paytmTxnId,
            tranType: data.transactionType,
            payStat: "failed"
          };
          const queryString = new URLSearchParams(queryParams).toString();
          return resp.redirect(`${redirectUrl}${queryString}`);
        }
      } else {
        const queryParams = {
          txnId: data.paytmTxnId,
          tranType: data.transactionType,
          payStat: "Failed"
        };
        const queryString = new URLSearchParams(queryParams).toString();
        return resp.redirect(`${redirectUrl}${queryString}`);
      }
    } else {
      const queryParams = {
        txnId: "",
        tranType: "",
        payStat: "Payment Not Found."
      };
      const queryString = new URLSearchParams(queryParams).toString();
      return resp.redirect(`${redirectUrl}${queryString}`);
    }
  } catch (error) {
    console.error("Error in successForEachCoachingOrder:", error);
    const queryParams = {
      error: error.message,
      tranType: "",
      payStat: "Error"
    };
    const queryString = new URLSearchParams(queryParams).toString();
    return resp.redirect(`https://www.familycarehospitals.com/payment-status?${queryString}`);
  }
};

export const successNewForBulk = async (req, resp) => {
  console.log("bulk 911 subcribe success called....", JSON.stringify(req.body));
  
  try {
    const data = await paytmModel.findOne({ orderId: req.body.ORDERID });
    console.log("bulk 911 data..", data);

    let status;
    const paytmParams = {};

    paytmParams["MID"] = "MxRvkW87993542401257";
    const redirectUrl = 'https://www.familycarehospitals.com/payment-status?';

    paytmParams["ORDERID"] = data.orderId;
    paytmParams["CHECKSUMHASH"] = data.checksumhash;

    const post_data = JSON.stringify(paytmParams);
    console.log("bulk 911 post data...........", post_data);

    const options = {
      hostname: "securegw.paytm.in",
      path: "/order/status/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length,
      },
    };

    const response = await new Promise((resolve, reject) => {
      let responseData = "";
      const postReq = https.request(options, (postRes) => {
        postRes.on("data", (chunk) => {
          responseData += chunk;
        });

        postRes.on("end", () => {
          resolve(responseData);
        });
      });

      postReq.on("error", (err) => {
        reject(err);
      });

      postReq.write(post_data);
      postReq.end();
    });

    console.log("bulk 911 Response: ", response);
    const sendData = JSON.parse(response);
    console.log("bulk 911 send data........", JSON.stringify(sendData));

    if (sendData.STATUS == "PENDING") {
      status = "pending";
    } else if (sendData.STATUS == "TXN_SUCCESS") {
      status = "success";
    } else if (sendData.STATUS == "TXN_FAILURE") {
      status = "failed";
    }

    const updatedData = await paytmModel.findOneAndUpdate(
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
      { new: true }
    );

    const newDate = new Date();
    const latestDate = moment(newDate).tz("Asia/Kolkata").format("YYYY-MM-DD");

    if (updatedData) {
      const transaction = new transactionModel({
        payment: updatedData._id,
        TransactionId: updatedData.mer_txn,
        transactionType: updatedData.transactionType,
        amount: updatedData.amount,
        user: updatedData.user,
        orderId: updatedData.orderId,
        date: latestDate,
        transactionStatus: "paid",
        status: status,
        payThrough: "bank",
        paymentGateway: "Paytm",
        mmp_txn: updatedData.paytmTxnId,
      });

      await transaction.save();
      console.log("in bulk 911 transaction data...", transaction);

      if (status == "success") {
        console.log("bulk 911 The status is sucess............");
        
        if (updatedData.transactionType === "offernew-hospital" || updatedData.transactionType === "offernew" || updatedData.transactionType === "offernew-home") {
          console.log("in bulk 911 updating offer record.....");
          await offerrecord.findOneAndUpdate(
            { _id: updatedData.orderId },
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
        }

        const queryParams = {
          txnId: updatedData.paytmTxnId,
          tranType: updatedData.transactionType,
          payStat: "success"
        };
        const queryString = new URLSearchParams(queryParams).toString();
        return resp.redirect(`${redirectUrl}${queryString}`);
      } else if (status == "pending") {
        const queryParams = {
          txnId: updatedData.paytmTxnId,
          tranType: updatedData.transactionType,
          payStat: "pending"
        };
        const queryString = new URLSearchParams(queryParams).toString();
        return resp.redirect(`${redirectUrl}${queryString}`);
      } else {
        const queryParams = {
          txnId: updatedData.paytmTxnId,
          tranType: updatedData.transactionType,
          payStat: "Failed"
        };
        const queryString = new URLSearchParams(queryParams).toString();
        return resp.redirect(`${redirectUrl}${queryString}`);
      }
    } else {
      const queryParams = {
        txnId: "",
        tranType: "",
        payStat: "Payment Not Found."
      };
      const queryString = new URLSearchParams(queryParams).toString();
      return resp.redirect(`${redirectUrl}${queryString}`);
    }
  } catch (error) {
    console.error("Error in successNewForBulk:", error);
    const queryParams = {
      error: error.message,
      tranType: "",
      payStat: "Error"
    };
    const queryString = new URLSearchParams(queryParams).toString();
    return resp.redirect(`https://www.familycarehospitals.com/payment-status?${queryString}`);
  }
};
export const checkBankPaymentStatus = async (req, resp) => {
  try {
    console.log("req.query--------------", req.query.paymentId);

    const data = await paytmModel.findOne({ _id: req.query.paymentId });
    console.log("Payment data fetched:", data);

    if (!data) {
      return resp.status(421).send({
        success: false,
        err: "Payment record not found!",
      });
    }

    const transaction = await transactionModel.findOne({
      TransactionId: data.mer_txn,
    });
    console.log("Transaction fetched:", transaction);

    let status;
    let subject;
    let content;

    if (data.status === "success") {
      console.log("SUCCESS STATUS_________");
      status = "success";
      subject = `Your FamilyCare ${data.transactionType} Confirmation (${transaction._id})`;

      if (data.transactionType === "consultancy") {
        const result = await consultancyModel.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: true, payThrough: "bank" } },
          { new: true }
        );
        content = `${data.transactionType} Received Order number: ${transaction._id} Received on: ${moment(req.body.date).tz("Asia/Kolkata").format("YYYY-MM-DD")} \n of amount ${data.amount}`;
        console.log("result CONSULTANCY>>>>>>>>>>>", result);
      } else if (data.transactionType === "newliveconsultancy") {
        const result = await consultancyModel.liveNewConsultancySchema.findOneAndUpdate(
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
        content = `${data.transactionType} Received Order number: ${transaction._id} Received on: ${moment(req.body.date).tz("Asia/Kolkata").format("YYYY-MM-DD")} \n of amount ${data.amount}`;
        console.log("bank status checked for newliveconsultancy", result);
      } else if (
        data.transactionType === "package" ||
        data.transactionType === "package-home" ||
        data.transactionType === "package-hospital"
      ) {
        const adminData = await adminModel
          .findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true })
          .lean();
        const userData = await userModel.findOne({ _id: data.user });
        const notify = await notificationModel.findOne({
          user: adminData.user,
          appointmentId: adminData.package_records_Id,
        });

        if (notify) {
          notify.assigndoctor = true;
          notify.type = "Order";
          notify.status = "Pending";
          notify.usermessage = "Hi ! Thank you for using the Family Care Hospitals App. Your test order has been received and is now being processed.";
          notify.doctormessage = `Your package order has been confirmed for ${notify.date} at ${notify.time} your package order id: ${notify.appointmentId}`;
          await notify.save();
          if (adminData.user) {
            let info = {
              userId: adminData.user._id,
              usercount: adminData.count,
              notification: "Hi ! Thank you for using the Family Care Hospitals App. Your test order has been received and is now being processed.",
              type: "Package",
              status: "Pending",
              sendTo: "user",
            };
            sendNotification(info);
            await sendMessage(adminData.count, adminData.user._id);
          }
        }

        const subject = "Your FamilyCare Package Order Placed";
        const ndata = { subject, result: adminData, userData };
        addEmailHelpers(ndata);
      } else if (
        data.transactionType === "offernew-hospital" ||
        data.transactionType === "offernew" ||
        data.transactionType === "offernew-home"
      ) {
        const adminData = await adminModel
          .findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true })
          .lean();
        const userData = await userModel.findOne({ _id: data.user });
        const notify = await notificationModel.findOne({
          user: adminData.user,
          appointmentId: adminData.package_records_Id,
        });

        if (notify) {
          notify.assigndoctor = true;
          notify.type = "Order";
          notify.status = "Pending";
          notify.usermessage = "Hi ! Thank you for using the Family Care Hospitals App. Your test order has been received and is now being processed.";
          notify.doctormessage = `Your package order has been confirmed for ${notify.date} at ${notify.time} your package order id: ${notify.appointmentId}`;
          await notify.save();
          if (adminData.user) {
            let info = {
              userId: adminData.user._id,
              usercount: adminData.count,
              notification: "Hi ! Thank you for using the Family Care Hospitals App. Your test order has been received and is now being processed.",
              type: "Package",
              status: "Pending",
              sendTo: "user",
            };
            sendNotification(info);
            await sendMessage(adminData.count, adminData.user._id);
          }
        }

        const subject = "Your FamilyCare Package Order Placed";
        const ndata = { subject, result: adminData, userData };
        addEmailHelpers(ndata);
      } else if (data.transactionType === "pharmacy") {
        const result = await pharmacyModel.findOneAndUpdate(
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
        const userData = await userModel.findOne({ _id: data.user });
        const cartData = await pharmacystModel.cartSchema.findOne({ user: data.user });

        let dispatchedAddress = {};
        userData.address.forEach((element) => {
          if (result.dispatched_address == element._id) {
            dispatchedAddress = element;
          }
        });

        const adminData = await adminModel
          .findOneAndUpdate({}, { $inc: { count: 1 } }, { new: true })
          .lean();
        const notify = await notificationModel.findOne({
          user: result.user,
          appointmentId: result.pharmacyId,
        });

        if (notify) {
          notify.assigndoctor = true;
          notify.type = "Order";
          notify.status = "In Progress";
          notify.usermessage = "Hi, your pharmacy order is currently being processed. You will receive an order confirmation shortly via email/ SMS";
          notify.doctormessage = `Your Pharmacy order has been confirmed for ${notify.date} at ${notify.time} your pharmacy id: ${notify.appointmentId}`;
          await notify.save();
          if (result.user) {
            let info = {
              userId: result.user._id,
              usercount: adminData.count,
              notification: "Hi, your pharmacy order is currently being processed. You will receive an order confirmation shortly via email/ SMS",
              type: "Order",
              status: "In Progress",
              sendTo: "user",
            };
            sendNotification(info);
            await sendMessage(adminData.count, result.user._id);
          }
        }

        sendSms(userData, notify);
        const subject = "Your FamilyCare Pharmacy Order Placed";
        const pdata = { subject, result, userData, cartData, dispatchedAddress };
        addEmailHelpers(pdata);

        const compiledContent = await compile("order_placed_mail", data);
        if (compiledContent) {
          await sendEmailToPatient(userData.email, subject, compiledContent, "html");
        }
      } else if (data.transactionType === "nursing") {
        const result = await nursing_model.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: true, payThrough: "bank" } },
          { new: true }
        );
        content = `${data.transactionType} Received Order number: ${transaction._id} Received on: ${moment(req.body.date).tz("Asia/Kolkata").format("YYYY-MM-DD")} \n of amount ${data.amount}`;
        console.log("result>>>>>>>>>>>  nursing", result);
      } else if (data.transactionType === "home-appointment") {
        const result = await home_appointment_model.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: true, payThrough: "bank" } },
          { new: true }
        );
        content = `${data.transactionType} Received Order number: ${transaction._id} Received on: ${moment(req.body.date).tz("Asia/Kolkata").format("YYYY-MM-DD")} \n of amount ${data.amount}`;
        console.log("result>>>>>>>>>>> home-appointment", result);
      } else if (data.transactionType === "appointment") {
        const result = await appointment_model.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: true, payStatus: "completed", payThrough: "bank" } },
          { new: true }
        );
        content = `${data.transactionType} Received Order number: ${transaction._id} Received on: ${moment(req.body.date).tz("Asia/Kolkata").format("YYYY-MM-DD")} \n of amount ${data.amount}`;
        console.log("result>>>>>>>>>>> appointment", result);
      } else if (data.transactionType === "diagnostic") {
        const result = await diagnostic_model.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: true, payThrough: "bank" } },
          { new: true }
        );
        content = `${data.transactionType} Received Order number: ${transaction._id} Received on: ${moment(req.body.date).tz("Asia/Kolkata").format("YYYY-MM-DD")} \n of amount ${data.amount}`;
        console.log("result>>>>>>>>>>> diagnostic", result);
      }

      const user = await userModel.findOne({ _id: data.user }).lean();
      if (user?.email) {
        await utility.sendEmailForDoctor(user.email, subject, content, "text/html");
      }

      const userlog = {
        _id: data.user,
        ModuleName: "payment",
        Action: "View",
        RowStatus: 0,
        loginFrom: "Patient App",
      };
      saveUserlog(userlog);

      return resp.status(200).send({ success: true, data: "Payment Successful" });
    } else {
      console.log("FAILED STATUS_________");
      status = "failed";

      if (data.transactionType === "newliveconsultancy") {
        await consultancyModel.liveNewConsultancySchema.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: false } },
          { new: true }
        );
      } else if (data.transactionType === "consultancy") {
        await consultancyModel.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: false } },
          { new: true }
        );
      } else if (
        data.transactionType === "package" ||
        data.transactionType === "package-home" ||
        data.transactionType === "package-hospital"
      ) {
        await package_model.packagerecords.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: false } },
          { new: true }
        );
      } else if (
        data.transactionType === "offernew-hospital" ||
        data.transactionType === "offernew" ||
        data.transactionType === "offernew-home"
      ) {
        await offernewModel.offerrecord.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: false } },
          { new: true }
        );
      } else if (data.transactionType === "pharmacy") {
        await pharmacyModel.findOneAndUpdate(
          { pharmacyId: data.orderId },
          { $set: { transaction: transaction._id, valid: false } },
          { new: true }
        );
      } else if (data.transactionType === "nursing") {
        await nursing_model.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: false } },
          { new: true }
        );
      } else if (data.transactionType === "home-appointment") {
        await home_appointment_model.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: false } },
          { new: true }
        );
      } else if (data.transactionType === "appointment") {
        await appointment_model.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: false } },
          { new: true }
        );
      } else if (data.transactionType === "diagnostic") {
        await diagnostic_model.findOneAndUpdate(
          { _id: data.orderId },
          { $set: { transaction: transaction._id, valid: false } },
          { new: true }
        );
      }

      return resp.status(200).send({ success: false, data: "Payment failure" });
    }
  } catch (err) {
    console.error("Error in checkBankPaymentStatus:", err);
    resp.status(500).send({ success: false, error: err.message });
  }
};
function sendSms(data, notify) {
  console.log(data);
  const phoneno = data.phone;
  if (!phoneno) {
    console.log("data not found");
    return;
  }
  const OTP = Math.floor(1000 + Math.random() * 9000);
  const msg = "Hi, thank you for using FCH app. Your pharmacy order is currently being processed. You'll soon receive an email regarding the confirmation of the order placed.";
  const url = `https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=91${phoneno}&msg=${msg}&mt=0`;

  superagent.get(url).end((err) => {
    if (!err) {
      userModel.updateMany({ phone: phoneno, phoneisverified: false }, { $set: { otp: OTP } }, { new: true }, () =>
        console.log("Booked Pharmacy Successfully")
      );
    }
  });
}

function sendPackageSms(data) {
  console.log(data);
  const phoneno = data.phone;
  if (!phoneno) {
    console.log("data not found");
    return;
  }
  const OTP = Math.floor(1000 + Math.random() * 9000);
  const msg = "Hi ! Thank you for using the Family Care Hospitals App. Your diagnostic test order has been received and is now being processed.";
  const url = `https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=91${phoneno}&msg=${msg}&mt=0`;

  superagent.get(url).end((err) => {
    if (!err) {
      userModel.updateMany({ phone: phoneno, phoneisverified: false }, { $set: { otp: OTP } }, { new: true }, () =>
        console.log("Booked Pharmacy Successfully")
      );
    }
  });
}
function addEmailHelpers(dataa) {
  console.log("function called addEmailHelpers-----------", dataa);

  Handlebars.registerHelper("pharmacyId", () => dataa?.result?.pharmacyId);
  Handlebars.registerHelper("fname", () => dataa?.userData?.fname);
  Handlebars.registerHelper("lname", () => dataa?.userData?.lname);
  Handlebars.registerHelper("payment_method", () => dataa?.result?.payment_method);
  Handlebars.registerHelper("email", () => dataa?.userData?.email);
  Handlebars.registerHelper("phone", () => dataa?.userData?.phone);
  Handlebars.registerHelper("subject", () => dataa?.subject);
  Handlebars.registerHelper("medicines", () => dataa?.cartData?.medicines);
  Handlebars.registerHelper("ShippingCharge", () => dataa?.cartData?.delivery_charge);
  Handlebars.registerHelper("TotalPaidCharge", () => dataa?.cartData?.totalPaidAmount);
  Handlebars.registerHelper("totalActualAmount", () => dataa?.cartData?.totalActualAmount);
  Handlebars.registerHelper("discountedValue", () => dataa?.cartData?.totalDiscount);
  Handlebars.registerHelper("dispatchedAddress", () => dataa?.dispatchedAddress);
}

function addHelpers(dataa) {
  console.log("checking data for helper----------------", dataa);

  Handlebars.registerHelper("orderId", () => dataa?.orderId);
  Handlebars.registerHelper("txnToken", () => dataa?.txnToken); // ✅ Fixed typo (was datas.txnToken)
}
const compile = async (templateName, data) => {
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

export const getTransactionsByUserId = async (req, res) => {
  if (!req.params.userId) {
    return res.status(400).json({ success: false, msg: "Please provide user id." });
  }
  
  try {
    const userTransactions = await transactionModel.find({ user: req.params.userId });
    res.status(200).json({ success: true, userTransactions });
  } catch (error) {
    console.log("error while fetching user transactions.", error);
    res.status(500).json({ success: false, error });
  }
};

export const getTransactionsDetailsById = async (req, res) => {
  if (!req.params.transactionId) {
    return res.status(400).json({ success: false, msg: "Please provide transactionId." });
  }
  
  try {
    const transactionDetails = await transactionModel.findOne({ mmp_txn: req.params.transactionId }).populate('user').lean();
    let orders = [];
    
    if (transactionDetails.transactionType == "newliveconsultancy") {
      let orderDetails = {};
      orderDetails['description'] = "Live Consultancy";
      orderDetails.price = transactionDetails.amount;
      orders.push(orderDetails);
    } else if (transactionDetails.transactionType == "offernew") {
      let orderDetails = {};
      const offerRecord = await offerrecord.findById(transactionDetails.orderId);
      const offerPackage = await offernewModel.findById(offerRecord.package);
      orderDetails['description'] = offerPackage.name;
      orderDetails['price'] = offerRecord.price;
      orders.push(orderDetails);
    }
    
    transactionDetails.orderItems = orders;
    res.status(200).json({ success: true, transactionDetails });
  } catch (error) {
    console.log("error while fetching transactionDetails.", error);
    res.status(500).json({ success: false, error });
  }
};

export const getAllPaytmTransaction = async (req, res) => {
  try {
    const limit = 20;
    const page = req.query.page == undefined ? 1 : req.query.page;
    const skipCount = (page - 1) * limit;
    
    let paytmTransactions = await paytmModel.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    
    const paymentRecords = await paymentModel.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    
    paytmTransactions = paytmTransactions.concat(paymentRecords);
    res.status(200).json({ success: true, paytmTransactions });
  } catch (error) {
    console.log("error while fetching user paytm transactions.", error);
    res.status(500).json({ success: false, error });
  }
};





export const updatePaytmRecordTransaction = async (req, res) => {
  if (!req.params.paytmId) {
    return res.status(400).json({ success: false, msg: "Please provide paytm id." });
  }

  try {
    if (req.body.paymentType === "card") {
      const bank_txn = req.body.BankTxnID;
      const bankname = req.body.bankname || null;
      const gatewayname = req.body.gatewayname || "PPBLC";
      const paymentMode = req.body.paymentMode || "Atom";
      const prod = "SCANDEN";
      const merchant_id = "62021";
      const status = req.body.status;

      const paytmUpdatedRecord = await paymentModel.findOneAndUpdate(
        { _id: req.params.paytmId },
        {
          $set: {
            bank_txn,
            bankname,
            gatewayname,
            paymentMode,
            prod,
            status,
            merchant_id,
            udf1: req.body.name || "",
            udf2: "null",
            udf3: req.body.phone || "",
            udf4: "null",
            udf5: "null",
            udf6: "null",
            udf9: "null",
          },
        },
        { new: true }
      );

      const newTransaction = new transactionModel({
        paymentGateway: "bank",
        payment: req.params.paytmId,
        TransactionId: paytmUpdatedRecord.mer_txn,
        transactionType: paytmUpdatedRecord.transactionType,
        user: paytmUpdatedRecord.user,
        orderId: paytmUpdatedRecord.orderId,
        date: paytmUpdatedRecord.dateObj,
        transactionStatus: "paid",
        status,
        payThrough: "bank",
        mmp_txn: bank_txn,
      });

      await newTransaction.save();

      await offernewModel.findOneAndUpdate(
        { _id: paytmUpdatedRecord.orderId },
        { status: "Completed", paystatus: "Completed" }
      );

    } else {
      const BankTxnID = req.body.BankTxnID;
      const TxnType = req.body.TxnType || "SALE";
      const bankname = req.body.bankname || null;
      const gatewayname = req.body.gatewayname || "PPBLC";
      const paymentMode = req.body.paymentMode || "UPI";
      const paytmTxnId = req.body.paytmTxnId;
      const status = req.body.status;

      const paytmUpdatedRecord = await paytmModel.findOneAndUpdate(
        { _id: req.params.paytmId },
        {
          $set: {
            BankTxnID,
            TxnType,
            bankname,
            gatewayname,
            paymentMode,
            paytmTxnId,
            status,
          },
        },
        { new: true }
      );

      const newTransaction = new transactionModel({
        paymentGateway: "bank",
        payment: req.params.paytmId,
        TransactionId: paytmUpdatedRecord.mer_txn,
        transactionType: paytmUpdatedRecord.transactionType,
        user: paytmUpdatedRecord.user,
        orderId: paytmUpdatedRecord.orderId,
        date: paytmUpdatedRecord.dateObj,
        transactionStatus: "paid",
        status,
        payThrough: "bank",
        mmp_txn: paytmTxnId,
      });

      await newTransaction.save();

      await offernew_model_1.findOneAndUpdate(
        { _id: paytmUpdatedRecord.orderId },
        { status: "Completed", paystatus: "Completed" }
      );
    }

    res.status(201).json({ success: true, msg: "successfully updated" });
  } catch (error) {
    console.error("error while updating paytm transactions.", error);
    res.status(500).json({ success: false, error });
  }
};

export const getPaytmTransactionByUserId = async (req, res) => {
  if (!req.params.userId) {
    return res.status(400).json({ success: false, msg: "Please provide user id." });
  }
  try {
    const userPaytmTransactions = await paytmModel.find({ user: req.params.userId });
    res.status(200).json({ success: true, userPaytmTransactions });
  } catch (error) {
    console.error("error while fetching user paytm transactions.", error);
    res.status(500).json({ success: false, error });
  }
};

export const getPaytmTransactionDetails = async (req, res) => {
  if (!req.params.paytmId) {
    return res.status(400).json({ success: false, msg: "Please provide paytm id." });
  }
  try {
    const paytmTransactionDetails = await paytmModel.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId.createFromHexString(req.params.paytmId) },
      },
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "payment",
          as: "paytmTransactionDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
    ]);

    res.status(200).json({ success: true, paytmTransactionDetails });
  } catch (error) {
    console.error("error while fetching user paytm transactions details.", error);
    res.status(500).json({ success: false, error });
  }
};
const successPkgSms = (phone, name) => {
  name = name.trim();
  
  if (!phone) {
    console.log("phone no is not present ");
    return;
  }
  
  try {
    const to = "91" + parseInt(phone);
    const msg = `Dear ${name}, Thank you for your payment! Your Familycare package is now active. Enjoy seamless access to consultations, medicine orders, and blood tests anytime via our website or app to get started.`;
    
    const url = `https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=${to}&msg=${msg}&mt=0&tempId=1007162508660598707`;
    console.log("url", url);
    
    superagent.get(url).end(function (err, response) {
      if (err) {
        console.log(" error", err);
      } else {
        console.log("package sms has sent successfully.");
      }
    });
  } catch (error) {
    console.log("error", error);
  }
};