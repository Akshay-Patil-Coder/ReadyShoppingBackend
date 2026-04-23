const mongoose = require('mongoose');

const WhishListSchema = new mongoose.Schema({
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ServiceProductsIds: [
        {
            type: mongoose.Schema.Types.ObjectId
        }
    ]
}, {
    timestamps: true
});
const ServiceWishlist = mongoose.model('ServiceWishlist', WhishListSchema);

module.exports = { ServiceWishlist };
