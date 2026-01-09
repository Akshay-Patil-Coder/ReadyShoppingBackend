const mongoose = require("mongoose");

const paytmPaymentSchema = new mongoose.Schema(
  {
    paymentMode: {
      type: String,
    },
    orderId: {
      type: String,
    },
    bankname: {
      type: String,
    },
    dateObj: {
      type: String,
    },
    amount: {
      type: String,
    },
    transactionType: {
      type: String,
      enum: [
        "appointment",
        "diagnostic",
        "home-appointment",
        "consultancy",
        "pharmacy",
        "nursing",
        "wallet",
        "package",
        "package-home",
        "offernew",
        "offernew-home",
        "package-hospital",
        "offernew-hospital",
        "newliveconsultancy",
      ],
    },
    gatewayname: {
      type: String,
    },
    TxnType: {
      type: String,
    },
    BankTxnID: {
      type: String,
    },
    paytmTxnId: {
      type: String,
    },
    mer_txn: {
      type: String,
    },
    amt: {
      type: Number,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    checksumhash: {
      type: String,
    },
    status: {
      type: String,
      enum: ["success", "failed", "cancelled", "pending"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("paytmPayment", paytmPaymentSchema);
