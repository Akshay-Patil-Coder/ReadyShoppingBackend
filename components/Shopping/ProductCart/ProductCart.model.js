
const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    Products: [
        {
            ProductId: {
                type: mongoose.Schema.Types.ObjectId
            },
            VariantProductId: {
                type: mongoose.Schema.Types.ObjectId
            },
            ProductServices: [
                {
                    ProductServiceId: {
                        type: mongoose.Schema.Types.ObjectId
                    },
                    ServiceActive: {
                        type: Boolean,
                        default: true
                    }
                }
            ],
            ProductFreeServices: [
                {
                    type: mongoose.Schema.Types.ObjectId
                }
            ],
            Quantity: {
                type: Number,
                default: 1
            },
            TotalPrice: {
                type: Number,
                default: 0
            },
            DiscountPrice: {
                type: Number,
                default: 0
            },
            FinalPrice: {
                type: Number,
                default: 0
            },
            IsActive: {
                type: Boolean,
                default: true
            }

        }
    ],
    TotalCartPrice: {
        type: Number,
        default: 0
    },
    DiscountCartPrice: {
        type: Number,
        default: 0
    },
    ShippingCharges: {
        type: Number,
        default: 0
    },
    FinalCartPrice: {
        type: Number,
        default: 0
    },
    CartType: {
        type: String,
        default: 'Regular'
    },
}, {
    timestamps: true
});
const ProductCart = mongoose.model("ProductCart", cartSchema);

module.exports = { ProductCart }