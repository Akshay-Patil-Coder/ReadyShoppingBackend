"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const paytm = __importStar(require("./PayTm.controller"));
const permission_1 = require("../../util/permission");
const { getTransactionsByUserId, getTransactionsDetailsById, getPaytmTransactionByUserId, getPaytmTransactionDetails, getAllPaytmTransaction, updatePaytmRecordTransaction, successNewForBulk } = require("./PayTm.controller");
const router = express.Router();

router.get("/redirect", (req, res) => {
    console.log("called redirect method-------");
    paytm.redirect(req, res);
});

router.get("/redirectFromEmailToPaytm/:PaymentToken", (req, res) => {
    console.log("called redirect method-------");
    paytm.redirectFromEmailToPaytm(req, res);
});

router.get("/login",  (req, res) => {
    console.log("Called method------login paytm------initiateTransaction");
    paytm.initiateTransaction(req, res);
});
router.get("/emailPaymentlogin",  (req, res) => {
    console.log("Called method------login paytm------initiateTransaction");
    paytm.initiateTransactionForEmailPayment(req, res);
});
router.post("/successUrl", (req, res) => {
    paytm.success(req, res);
});
router.post("/successForPaytmPaymentViaEmail", (req, res) => {
    paytm.successForPaytmPaymentViaEmail(req, res);
});
router.post("/successForEachCoachingOrder", (req, res) => {
    paytm.successForEachCoachingOrder(req, res);
});
router.get("/sendMailForPayment", (req, res) => {
    paytm.sendMailForPayment(req, res);
});
router.get("/bankpaymentstatus", (req, res) => {
    paytm.checkBankPaymentStatus(req, res);
});

router.get("/getTransactionByUserId/:userId", (req, res) => {
    getTransactionsByUserId(req, res)
})

router.get("/getTransactionDetailsById/:transactionId", (req, res) => {
    getTransactionsDetailsById(req, res)
})

router.get("/getPaytmTransactionByUserId/:userId", (req, res) => {
    getPaytmTransactionByUserId(req, res)
})

router.get("/getPaytmTransactionDetails/:paytmId", (req, res) => {
    getPaytmTransactionDetails(req, res)
})

router.get("/getAllPaytmTransaction", (req, res) => {
    getAllPaytmTransaction(req, res)
})

router.put("/updatePaytmRecord/:paytmId", (req, res) => {
    updatePaytmRecordTransaction(req, res)
})

router.post("/successNewForBulk", (req, res) => {
    successNewForBulk(req, res);
});

exports.default = router;
