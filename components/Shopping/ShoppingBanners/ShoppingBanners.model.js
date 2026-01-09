const mongoose = require('mongoose')

const bannersSchema = new mongoose.Schema({
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
    SubCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    HeadCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    BrandId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    Position: {
        type: String,
        default: "SUB",
        required: true
    },
    VariantsProductsIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
        }
    ],
    OfferPercentage: {
        type: Number,
        default: 0
    },
    BannerType: {
        type: String,
        default: 'Brand',
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isActiveBy: {
        type: String,
        default: 'Self'
    },
}
    , {
        timeStamp: true
    })
module.exports = mongoose.model('master_banners', bannersSchema)