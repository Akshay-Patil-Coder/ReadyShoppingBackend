const mongoose = require('mongoose')

const serviceBannerSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    BannerImage: {
        type: String,
        required: true
    },
    BannerName: {
        type: String,
        required: true
    },
    SubServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MasterServiceCategory',
        required: true
    },
    HeadServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MasterServiceCategory',
        required: true
    },
    ProviderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceProvider'
    },
    Position: {
        type: String,
        default: "SUB",
        required: true
    },
    ServicesId: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceProducts',
        }
    ],
    OfferPercentage: {
        type: Number,
        default: 0
    },
    BannerType: {
        type: String,
        default: 'Offer',
        required: true,
    },
    IsActive: {
        type: Boolean,
        default: true
    }
}
    , {
        timeStamp: true
    })
module.exports = mongoose.model('ServiceBanner', serviceBannerSchema)