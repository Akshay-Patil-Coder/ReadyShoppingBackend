
const mongoose = require('mongoose')

const trendingSchema = mongoose.Schema(
    {

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        HeadCategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        SubCategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        VariantsProductsIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
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
const trendingsproducts = mongoose.model('trendingsproducts', trendingSchema)
module.exports.trendingsproducts = trendingsproducts;
