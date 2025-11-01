
const mongoose = require('mongoose');

const couponSchema = mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        CouponCodeType: {
            type: String,
            required: true,
        },
        UserUsageLimit: {
            type: Number,
            default: null
        },
        GlobalUsageLimit: {
            type: Number,
            default: null
        },
        GlobalUsedCount: {
            type: Number,
            default: 0
        },
        Description: {
            Head: {
                type: String
            },
            Points: [{
                type: String,
                 default: [] 
            }],
            TextDescription: {
                type: String
            }
        },
        CouponName: {
            type: String,
            required: true
        },
        RefferalUserId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        HeadCategoryIds: [{
            type: mongoose.Schema.Types.ObjectId,
            default: []
        }],
        SubCategoryIds: [{
            type: mongoose.Schema.Types.ObjectId,
            default: []
        }],
        ExpiryDate: {
            type: Date,
        },
        ProductIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: []
            }
        ],
        PriceLimit: {
            type: Number,
            default:0
        },
        DiscountPrice: {
            type: Number,
            default: 0
        },
        DiscountOfferPercentage: {
            type: Number,
            default: 0
        },
        Conditions: [{
            type: String,
            default: []
        }],
        UserSpecific: {
            UserSpecificIsOrNot: {
                type: Boolean,
                default: false
            },
            SpecificUserIds: [{
                type: mongoose.Schema.Types.ObjectId,
                default: [] 
            }]
        },
        isActive: {
            type: Boolean,
            default: true,

        }
    }, {
    timestamps: true
}
)
const Couponmodel = mongoose.model('Coupon', couponSchema)
module.exports.Couponmodel = Couponmodel;
const mongoose = require('mongoose');

