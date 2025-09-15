const express = require("express");
const payment = require("./payment.controller");
const { decodeToken } = require("../../util/permission");

const router = express.Router();

router.post("/redirect", (req, res) => {
  payment.redirect(req, res);
});

router.get("/login", decodeToken, (req, res) => {
  payment.paymentLogin(req, res);
});

router.post("/redirectpack", (req, res) => {
  payment.redirectpack(req, res);
  payment.redirectpack(req, res);
});

router.get("/loginpack", decodeToken, (req, res) => {
  payment.paymentLoginPack(req, res);
});

router.get("/refund", decodeToken, (req, res) => {
  payment.paymentRefund(req, res);
});

router.get("/addWallet", decodeToken, (req, res) => {
  payment.addIntoWallet(req, res);
});

router.post("/walletredirect", (req, res) => {
  payment.walletRedirect(req, res);
});

router.post("/walletpay", decodeToken, (req, res) => {
  payment.payThroughWallet(req, res);
});

router.get("/status", decodeToken, (req, res) => {
  payment.checkWalletPaymentStatus(req, res);
});

router.get("/bankstatus", decodeToken, (req, res) => {
  payment.checkBankPaymentStatus(req, res);
});

router.get("/bank", decodeToken, (req, res) => {
  payment.getBankCodes(req, res);
});

router.get("/list", (req, res) => {
  payment.listOfPayment(req, res);
});

router.get("/getPaymentList/:page", (req, res) => {
  payment.getPaymentList(req, res);
});

router.get("/getSearchField", (req, res) => {
  payment.getSearchField(req, res);
});

router.post("/filterPayment/:page", (req, res) => {
  payment.filterPayment(req, res);
});

module.exports = router;
