const mongoose = require('mongoose');

const ProductRatingSchema = new mongoose.Schema({
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    ProductId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    ReviewImages: {
        type: [String],
        default: []
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


const ProductRating = mongoose.model("ProductRating", ProductRatingSchema);
module.exports = { ProductRating };
