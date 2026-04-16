
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

module.exports = mongoose.model("ServiceCart", serviceCartSchema);