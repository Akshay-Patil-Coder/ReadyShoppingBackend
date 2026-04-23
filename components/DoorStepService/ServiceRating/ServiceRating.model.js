const mongoose = require('mongoose');

const ServiceRatingSchema = new mongoose.Schema({
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    ServiceProductId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    ReviewText: {
        type: String,
        default: ""
    },
    ResponseOnReview: [{
        UserId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        LikeOrDislike: {
            type: String,
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    RatingStar: {
        type: Number,
        default: 0
    },
    TotalLike: {
        type: Number,
        default: 0
    },
    TotalDislike: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
     isActiveBy: {
        type: String,
        default: 'Self'
    },
}, {
    timestamps: true
});


const ServiceRating = mongoose.model("ServiceRating", ServiceRatingSchema);
module.exports = { ServiceRating };
