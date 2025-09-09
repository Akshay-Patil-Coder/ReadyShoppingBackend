
const mongoose = require('mongoose');

const brandsSchema = mongoose.Schema(
    { 

        BrandName: {
            type: String,
            required: true,
        },
        BrandImage: {
            type: String,
            required: true
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        HeadCategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Categgggory',
            required: true,
        },
        SubCategoryId: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Categgggory',
                required:true
            }
        ],
        isActive: {
            type: Boolean,
            default: true,

        }
    }, {
    timestamps: true
}
)
const brandmodel = mongoose.model('brands', brandsSchema)
module.exports.brandmodel = brandmodel;
