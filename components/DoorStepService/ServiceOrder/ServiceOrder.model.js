
const mongoose = require('mongoose');

const ServiceOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // productId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Product', 
  // },
  cartId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'carts'
  },
  companyId:{
    type: mongoose.Schema.Types.ObjectId
  },
  deliverycharges:{
    type:Number
  },
  discountamount:{
    type:Number
  },
  totalcartprice: {
    type: Number,
  },
  YouPay: {
    type: Number,
  },

  status: {
    type: String,
    enum: ['Pending', 'success', 'Cancelled', 'In Progress', 'Accepted', 'Expired'],
  },
    date: {
      type: String,
    },
    time: {
      type: String,
    },
  paystatus: {
    type: String,
    enum: ['Pending', 'success', 'Cancelled', 'In Progress', 'Expired'],
  },
    valid: {
      type: Boolean,
      default: false,
    },               
    payment_method: {
      type: String,
      default: 'Cash on Delivery',
    },
    bookFrom: {
      type: String,
      default: "shoppingapp"
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  UpdatedCartData:[],
  isAccepted: [
    {
      status: {
        type: Boolean,
        default: false,
      },
      date: {
        type: String,
      },
      time: {
        type: String,
      },
    },
  ],
  isOutForCollection: [
    {
      status: {
        type: Boolean,
        default: false,
      },
      date: {
        type: String,
      },
      time: {
        type: String,
      },
    },
  ],
  isOrderShipped: [
    {
      status: {
        type: Boolean,
        default: false,
      },
      date: {
        type: String,
      },
      time: {
        type: String,
      },
    },
  ],
  isOrderInProcess: [
    {
      status: {
        type: Boolean,
        default: false,
      },
      date: {
        type: String,
      },
      time: {
        type: String,
      },
    },
  ],
  isOrderCompleted: [
    {
      status: {
        type: Boolean,
        default: false,
      },
      date: {
        type: String,
      },
      time: {
        type: String,
      },
    },
  ],
},
{
  timestamps: true,
});

module.exports = mongoose.model('serviceorders', ServiceOrderSchema);

