
const mongoose = require("mongoose");
const {ObjectId} = require("mongodb")

const productSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId, 
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        default: 0
    }
});

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId, 
        required: true
    },
    products: {
        type: [productSchema],  
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Cart", cartSchema);
