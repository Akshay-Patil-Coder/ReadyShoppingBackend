
const mongoose = require('mongoose')

const coachingTrendingProductSchema = mongoose.Schema(
    {

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
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
        CoursesId: [
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
const coachingtrendingsproducts = mongoose.model('CoachingTrendingProduct', coachingTrendingProductSchema)
module.exports.coachingtrendingsproducts = coachingtrendingsproducts;
