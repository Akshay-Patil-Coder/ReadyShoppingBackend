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
        ref: 'Categgggory',
        required: true
    },
    HeadCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categgggory',
        required: true
    },
    BrandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'brands'
    },
    Position: {
        type: String,
        default: "SUB",
        required: true
    },
    ProductsId: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products',
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
    IsActive: {
        type: Boolean,
        default: true
    }
}
    , {
        timeStamp: true
    })
module.exports = mongoose.model('master_banners', bannersSchema)