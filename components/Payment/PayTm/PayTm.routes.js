const express = require("express");
const paytm = require("./PayTm.controller");

const {
  getTransactionsByUserId,
  getTransactionsDetailsById,
  getPaytmTransactionByUserId,
  getPaytmTransactionDetails,
  getAllPaytmTransaction,
  updatePaytmRecordTransaction,
  successNewForBulk,
} = require("./PayTm.controller");

const router = express.Router();

// Redirect routes
router.get("/redirect", (req, res) => {
  console.log("called redirect method-------");
  paytm.redirect(req, res);
});

router.get("/redirectFromEmailToPaytm/:PaymentToken", (req, res) => {
  console.log("called redirect method-------");
  paytm.redirectFromEmailToPaytm(req, res);
});

// Login and transaction initiation
router.get("/login", (req, res) => {
  console.log("Called method------login paytm------initiateTransaction");
  paytm.initiateTransaction(req, res);
});

router.get("/emailPaymentlogin", (req, res) => {
  console.log("Called method------login paytm------initiateTransaction");
  paytm.initiateTransactionForEmailPayment(req, res);
});

// Success callbacks
router.post("/successUrl", (req, res) => {
  paytm.success(req, res);
});

router.post("/successForPaytmPaymentViaEmail", (req, res) => {
  paytm.successForPaytmPaymentViaEmail(req, res);
});

router.post("/successForEachCoachingOrder", (req, res) => {
  paytm.successForEachCoachingOrder(req, res);
});

// Mail routes
router.get("/sendMailForPayment", (req, res) => {
  paytm.sendMailForPayment(req, res);
});

// Bank payment status
router.get("/bankpaymentstatus", (req, res) => {
  paytm.checkBankPaymentStatus(req, res);
});

// Transaction details
router.get("/getTransactionByUserId/:userId", (req, res) => {
  getTransactionsByUserId(req, res);
});

router.get("/getTransactionDetailsById/:transactionId", (req, res) => {
  getTransactionsDetailsById(req, res);
});

router.get("/getPaytmTransactionByUserId/:userId", (req, res) => {
  getPaytmTransactionByUserId(req, res);
});

router.get("/getPaytmTransactionDetails/:paytmId", (req, res) => {
  getPaytmTransactionDetails(req, res);
});

router.get("/getAllPaytmTransaction", (req, res) => {
  getAllPaytmTransaction(req, res);
});

// Update Paytm record
router.put("/updatePaytmRecord/:paytmId", (req, res) => {
  updatePaytmRecordTransaction(req, res);
});

// Bulk success route
router.post("/successNewForBulk", (req, res) => {
  successNewForBulk(req, res);
});

module.exports = router;
