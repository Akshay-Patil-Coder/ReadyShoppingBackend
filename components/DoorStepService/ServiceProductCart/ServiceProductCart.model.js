const mongoose = require("mongoose");

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
            Reserved: {
                type: Boolean,
                default: false
            },
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
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            TotalPrice: {
                type: Number,
                default: 0
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
    FinalCartPrice: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const ServiceCart = mongoose.model("ServiceCart", serviceCartSchema);

// ─────────────────────────────────────────────

const serviceOrderSchema = new mongoose.Schema({
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    UserDetails: {
        UserName: { type: String },
        Email: { type: String },
        Phone: { type: Number,required:true },
        AddresserName: { type: String, default: "Guest" },
        AddresserNumber: { type: Number },
        AddressType: { type: String, default: "Home" },
        Street: { type: String },
        City: { type: String },
        State: { type: String },
        Country: { type: String },
        PostalCode: { type: Number },
        Latitude: { type: Number },
        Longitude: { type: Number },
        ManualAddress: { type: String }
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    CartId: {
        type: mongoose.Schema.Types.ObjectId
    },
    Services: [
        {
            CartServiceId: {
                type: mongoose.Schema.Types.ObjectId
            },
            OrderStatus: [
                {
                    Status: {
                        type: String,
                        enum: ['INITIATED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
                        default: 'INITIATED'
                    },
                    StatusAt: { type: Date },
                    AssignedTo: { type: mongoose.Schema.Types.ObjectId },
                    Reason: { type: String }
                }
            ],
            CreatedAt: {
                type: Date,
                default: Date.now
            },
            ActiveOtp: {
                type: String
            },
            OtpTime: {
                type: Date
            },
            ServiceData: {
                ServiceInfo: {
                    ServiceProductId: { type: mongoose.Schema.Types.ObjectId },
                    ServiceName: { type: String },
                    Description: {
                        Head: { type: String },
                        Points: { type: [String], default: [] },
                        TextDescription: { type: String }
                    },
                    Images: { type: [String], default: [] },
                    BasePrice: { type: Number },
                    OfferPercentage: { type: Number, default: null }
                },
                ProviderInfo: {
                    ProviderId: { type: mongoose.Schema.Types.ObjectId },
                    ProviderName: { type: String },
                    Phone: { type: String }
                },
                AppointmentInfo: {
                    AppointmentId: { type: mongoose.Schema.Types.ObjectId },
                    Date: { type: String },
                    Day: { type: String },
                    StartTime: { type: String },
                    EndTime: { type: String }
                }
            },
            Parts: [
                {
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
    ReservationStartedAt: { type: Date },
    ReservationExpiresAt: { type: Date },
    PaymentSession: {
        orderId: { type: String },
        txnId: { type: String },
        status: {
            type: String,
            enum: ['INITIATED', 'SUCCESS', 'FAILED', 'PENDING', 'EXPIRED'],
            default: 'INITIATED'
        },
        amount: { type: Number },
        paymentGateway: { type: String, default: 'Paytm' }
    }
}, { timestamps: true });

const ServiceOrder = mongoose.model("ServiceOrder", serviceOrderSchema);

module.exports = { ServiceCart, ServiceOrder };