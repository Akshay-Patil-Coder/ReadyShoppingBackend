
const mongoose = require("mongoose");
const { type } = require("os");

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
            Reserved: {
                type: Boolean,
                default: false
            },
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
            createdAt:{
                type:Date,
                default:Date.now()
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


}, {
    timestamps: true
});
const ProductCart = mongoose.model("ProductCart", cartSchema);

const OrderSchema = new mongoose.Schema({
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    CartId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    Products: [
        {
            CartProductId: {
                type: mongoose.Schema.Types.ObjectId
            },
            OrderStatus: [
                {
                    Status: {
                        type: String,
                        enum: ['INITIATED', 'PENDING', 'SHIPPED', 'OUTFORDELIVERY', 'CANCELED', 'ASSIGNED'],
                        default: 'INITIATED'
                    },
                    StatusAt: {
                        type: Date
                    },
                    AssignedTo: {
                        type: mongoose.Schema.Types.ObjectId
                    },
                    Reason: {
                        type: String
                    }
                }
            ],
            CreatedAt: {
                type: Date,
                default: Date.now()
            },
            ProductData: {
                ProductInfo: {
                    ProductId: {
                        type: mongoose.Schema.Types.ObjectId
                    },
                    ProductName: {
                        type: String,
                        default: null
                    },
                    CommonImages: {
                        type: [String],
                        default: []
                    },
                    CommonVideos: {
                        type: [String],
                        default: []
                    },
                    CommonDescription: {
                        Head: {
                            type: String,
                            default: ""
                        },
                        Points: {
                            type: [String],
                            default: []
                        },
                        TextDescription: {
                            type: String,
                            default: ""
                        }
                    },
                    BrandId: {
                        type: mongoose.Schema.Types.ObjectId
                    },
                    BrandName: {
                        type: String
                    }
                },
                VariantProductInfo: {

                    VariantProductId: {
                        type: mongoose.Schema.Types.ObjectId
                    },
                    VariantProductName: {
                        type: String,
                    },
                    VariantFields: [{
                        VariantName: {
                            type: String
                        },
                        VariantValue: {
                            type: mongoose.Schema.Types.Mixed
                        },
                        Extension: {
                            type: String
                        }

                    }],
                    OfferPercentage: {
                        type: Number,
                        default: null
                    },
                    Price: {
                        type: Number,
                    },
                    Specification: [{
                        SpecificationKey: {
                            type: String
                        },
                        SpecificationValue: {
                            type: String
                        }
                    }],
                    AboutProduct: {
                        Head: {
                            type: String,
                            default: ""
                        },
                        Points: {
                            type: [String],
                            default: []
                        },
                        TextDescription: {
                            type: String,
                            default: ""
                        }
                    },
                }
            },

            ProductServices: [
                {
                    ProductServiceId: {
                        type: mongoose.Schema.Types.ObjectId
                    },

                    ServiceName: {
                        type: String
                    },
                    Description: {

                        Head: {
                            type: String
                        },
                        Points: [{
                            type: String
                        }],
                        TextDescription: {
                            type: String
                        }

                    },
                    ServiceImages: {
                        type: [String],
                        default: []
                    },
                    ProductServiceAmount: {
                        type: Number,
                        default: 0
                    },
                    ExpiryDate: {
                        Hour: { type: Number, default: 0 },
                        Minute: { type: Number, default: 0 },
                        Second: { type: Number, default: 0 },
                        Day: { type: Number, default: 0 },
                        Week: { type: Number, default: 0 },
                        Month: { type: Number, default: 0 },
                        Year: { type: Number, default: 0 }
                    },
                    UsedAt: {
                        type: Date
                    }
                },

            ],
            ProductFreeServices: [
                {
                    ProductServiceId: {
                        type: mongoose.Schema.Types.ObjectId
                    },
                    ServiceName: {
                        type: String
                    },
                    Description: {

                        Head: {
                            type: String
                        },
                        Points: [{
                            type: String
                        }],
                        TextDescription: {
                            type: String
                        }

                    },
                    ServiceImages: {
                        type: [String],
                        default: []
                    },
                    ProductServiceAmount: {
                        type: Number,
                        default: 0
                    },
                    ExpiryDate: {
                        Hour: { type: Number, default: 0 },
                        Minute: { type: Number, default: 0 },
                        Second: { type: Number, default: 0 },
                        Day: { type: Number, default: 0 },
                        Week: { type: Number, default: 0 },
                        Month: { type: Number, default: 0 },
                        Year: { type: Number, default: 0 }
                    },
                    UsedAt: {
                        type: Date
                    }
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

    ReservationStartedAt: {
        type: Date
    },
    ReservationExpiresAt: {
        type: Date
    },


    PaymentSession: {
        orderId: { type: String },
        txnId: { type: String },
        status: { type: String, enum: ['INITIATED', 'SUCCESS', 'FAILED'], default: 'INITIATED' },
        amount: { type: Number },
        paymentGateway: { type: String, default: 'Paytm' }
    }

}, {
    timestamps: true
}
)
const ProductOrder = mongoose.model("ProductOrder", OrderSchema);

module.exports = { ProductCart, ProductOrder }