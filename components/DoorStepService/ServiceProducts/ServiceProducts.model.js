
const mongoose = require('mongoose');

const serviceProductsSchema = mongoose.Schema(
    {

        ServiceName: {
            type: String,
            required: true,
        },
        serviceImages: [{
            type: String
        }],

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        HeadServiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MasterServiceCategory',
            required: true,
        },
        SubServiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MasterServiceCategory',
            required: true
        },
        ProviderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceProvider',
            required: true
        },
        service_description: {
            type: String,
            required: true
        },
        service_parts: [{
            partName: {
                type: String,
            },
            partPrice: {
                type: Number
            }
        }],
        service_base_price: {
            type: Number,
            default: null
        },
        offerPercentage: {
            type: Number,
            default: null
        },
        serviceTime: {
            type: Number,
            default: null
        },
        googleLocation: {
            type: String,
            required: true
        },
        RatingIds: [{
            type: mongoose.Schema.Types.ObjectId
        }],
        RatingStar: {
            type: Number,
            default: 0
        },
        TotalReviews: { type: Number, default: 0 },
        RatingDistribution: {
            1: { type: Number, default: 0 },
            2: { type: Number, default: 0 },
            3: { type: Number, default: 0 },
            4: { type: Number, default: 0 },
            5: { type: Number, default: 0 }
        },
        isActive: {
            type: Boolean,
            default: true,

        }
    }, {
    timestamps: true
}
)
const serviceProductsModel = mongoose.model('ServiceProducts', serviceProductsSchema)
module.exports.serviceProductsModel = serviceProductsModel;
