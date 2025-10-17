const mongoose = require('mongoose');

const WhishListSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    VariantProductIds: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Wishlist = mongoose.model('Wishlist', WhishListSchema);

module.exports = { Wishlist };
