
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  cartId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'carts'
  },
  cartData:[],
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
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  // isAccepted: [
  //   {
  //     status: {
  //       type: Boolean,
  //       default: false,
  //     },
  //     date: {
  //       type: String,
  //     },
  //     time: {
  //       type: String,
  //     },
  //   },
  // ],
  // isOutForCollection: [
  //   {
  //     status: {
  //       type: Boolean,
  //       default: false,
  //     },
  //     date: {
  //       type: String,
  //     },
  //     time: {
  //       type: String,
  //     },
  //   },
  // ],
  // isOrderShipped: [
  //   {
  //     status: {
  //       type: Boolean,
  //       default: false,
  //     },
  //     date: {
  //       type: String,
  //     },
  //     time: {
  //       type: String,
  //     },
  //   },
  // ],
  // isOrderInProcess: [
  //   {
  //     status: {
  //       type: Boolean,
  //       default: false,
  //     },
  //     date: {
  //       type: String,
  //     },
  //     time: {
  //       type: String,
  //     },
  //   },
  // ],
  // isOrderCompleted: [
  //   {
  //     status: {
  //       type: Boolean,
  //       default: false,
  //     },
  //     date: {
  //       type: String,
  //     },
  //     time: {
  //       type: String,
  //     },
  //   },
  // ],
  bookFrom: {
    type: String,
    default: "shoppingapp"
  },
},
{
  timestamps: true,
});

module.exports = mongoose.model('Orders', OrderSchema);

