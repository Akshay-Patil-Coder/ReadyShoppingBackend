const mongoose = require('mongoose');

const WhishListSchema = new mongoose.Schema({
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
            },
            createdAt: {
                type: Date,
                default: Date.now
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
    FolderName: {
        type: String,
        default: 'Your Liked Items'
    }
}, {
    timestamps: true
});
const Wishlist = mongoose.model('Wishlist', WhishListSchema);

module.exports = { Wishlist };
