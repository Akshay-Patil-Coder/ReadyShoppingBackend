const mongoose = require('mongoose');

const ProductServiceSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    HeadCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    SubCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ServiceName: {
        type: String,
        required: true,
        trim: true
    },
    Description: {

        Head: {
            type: String
        },
        Points: [{
            type: String
        }],
        TextDescription: {
            type: String
        }

    },
    ServiceImages: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const ProductService = mongoose.model('ProductService', ProductServiceSchema);

module.exports = { ProductService };
