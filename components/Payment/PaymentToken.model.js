const mongoose = require('mongoose')

const PaymentTokenSchema = mongoose.Schema({
    companyId:{
        type:mongoose.Schema.Types.ObjectId
    },
    PaymentToken:{
        type:String
    },
    orderId:{
        type:mongoose.Schema.Types.ObjectId
    },
    PaymentStatus:{
        type:String,
        default:"UnMarked"
    }
})
 const PaymentTokenModel = mongoose.model('PaymentToken',PaymentTokenSchema)
 module.exports.PaymentTokenModel = PaymentTokenModel