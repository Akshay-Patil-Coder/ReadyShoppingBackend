const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
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
    VariantImage: {
        type:String
    },
    VariantName: {
        type: String,
        required: true,
        trim: true
    },
    VariantType: {
        type: String,
        enum: ["String", "Number", "Date"],
        required: true,
        trim: true
    },
    VariantValues: [
        {
            Value: {
                type: mongoose.Schema.Types.Mixed
            },
            Count: {
                type: Number
            }
        }
    ],
    Extension: {
        type: String
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

const Variant = mongoose.model('Variant', VariantSchema);

module.exports = { Variant };
