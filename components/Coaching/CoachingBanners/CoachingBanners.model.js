const mongoose = require('mongoose')

const coachingBannerSchema = new mongoose.Schema({
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
    HeadCourceCatId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    SubCourceCatId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    AdvertiserId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    AdvertiserType: {
        type:mongoose.Schema.Types.ObjectId,
    },
    Position: {
        type: String,
        default: "SUB",
        required: true
    },
    BannerType: {
        type: String,
        default: 'Skill',
        required: true,
    },
    SkillId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    OfferPercentage: {
        type: Number,
        default: 0
    },
    CourcesId: [
        {
            type: mongoose.Schema.Types.ObjectId,
        }
    ],
    IsActive: {
        type: Boolean,
        default: true
    }
},
    {
        timeStamp: true
    })
module.exports = mongoose.model('CoachingBanner', coachingBannerSchema)