"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const paytmPaymentSchema = new mongoose_1.default.Schema(
  {
    // txnToken: {
    //     type: String
    // },
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
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "User",
    },
    // prod: {
    //     type: String
    // },
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
exports.default = mongoose_1.default.model("paytmPayment", paytmPaymentSchema);

// const transactionSchema = new mongoose_1.default.Schema({
//     TransactionId: {
//         type: String
//     },
//     transactionType: {
//         type: String,
//         enum: ["appointment", "diagnostic", "home-appointment", "consultancy", "pharmacy", "nursing", "wallet","package"]
//     },
//     amount: {
//         type: String
//     },
//     user: {
//         type: mongoose_1.default.Schema.Types.ObjectId,
//         ref: 'User'
//     },
//     orderId: {
//         type: String
//     },
//     date: {
//         type: String
//     },
//     status: {
//         type: String,
//         enum: ['success', 'failed', 'cancelled', "pending"]
//     },
//     transactionStatus: {
//         type: String,
//         enum: ["paid", "add", "refund"]
//     },
//     payThrough: {
//         type: String,
//         enum: ["wallet", "bank"]
//     },
//     payment: {
//         type: mongoose_1.default.Schema.Types.ObjectId,
//         ref: 'Payment'
//     },
//     mmp_txn: {
//         type: String
//     },
// }, {
//     timestamps: true
// });
// exports.paytmtrans = mongoose_1.default.model('PaytmTransaction', transactionSchema);
