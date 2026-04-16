
const mongoose = require('mongoose');

const serviceCartSchema = new mongoose.Schema({

    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    Services: [
        {
            ServiceProductId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ServiceProducts",
                required: true
            },

            ProviderId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ServiceProvider",
                required: true
            },

            AppointmentId: {
                type:mongoose.Schema.Types.ObjectId,
                required:true
            },

            TotalPrice: {
                type: Number,
                required: true
            },

            DiscountPrice: {
                type: Number,
                default: 0
            },

            Parts: [
                {
                    partName: String,
                    partPrice: Number,
                    selected: {
                        type: Boolean,
                        default: true
                    }
                }
            ],

            PartsTotal: {
                type: Number,
                default: 0
            },

            FinalPrice: {
                type: Number,
                required: true
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

    FinalCartPrice: {
        type: Number,
        default: 0
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });
const serviceProductCartModel =mongoose.model("ServiceCart", serviceCartSchema)
module.exports.serviceProductCartModel = serviceProductCartModel ;
const mongoose = require("mongoose");

const serviceOrderSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        UserId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User"
        },

        Services: [
            {
                ServiceProductId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ServiceProduct",
                    required: true
                },

                ProviderId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ServiceProvider",
                    required: true
                },

                AppointmentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true
                },

                Parts: [
                    {
                        partId: mongoose.Schema.Types.ObjectId,
                        partName: String,
                        partPrice: Number,
                        selected: Boolean
                    }
                ],

                PartsTotal: {
                    type: Number,
                    default: 0
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

                OrderStatus: [
                    {
                        Status: {
                            type: String,
                            enum: [
                                "INITIATED",
                                "CONFIRMED",
                                "IN_PROGRESS",
                                "COMPLETED",
                                "CANCELLED"
                            ],
                            default: "INITIATED"
                        },
                        StatusAt: {
                            type: Date,
                            default: Date.now
                        }
                    }
                ]
            }
        ],

        UserDetails: {
            UserName: String,
            Email: String,
            Phone: String
        },

        TotalCartPrice: {
            type: Number,
            default: 0
        },

        DiscountCartPrice: {
            type: Number,
            default: 0
        },

        FinalCartPrice: {
            type: Number,
            default: 0
        },

        PaymentSession: {
            orderId: String,
            txnId: String,
            status: {
                type: String,
                enum: ["INITIATED", "SUCCESS", "FAILED"],
                default: "INITIATED"
            },
            amount: Number,
            paymentGateway: {
                type: String,
                default: "Paytm"
            }
        },

        ReservationStartedAt: {
            type: Date,
            default: Date.now
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ServiceOrder", serviceOrderSchema);