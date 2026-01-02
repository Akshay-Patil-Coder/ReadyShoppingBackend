const mongoose = require('mongoose')

const serviceCategorySchema = new mongoose.Schema({

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    serviceCategoryName: {
        type: String,
        required: true
    },
    serviceParentCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    serviceLevel: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isActiveBy: {
        type: String,
        default: 'Self'
    },
    serviceImage: {
        type: String
    },
    Description: {
        type: String
    },
}, {
    timestamps: true

});

const ServiceCategory = mongoose.model('MasterServiceCategory', serviceCategorySchema);

module.exports = ServiceCategory;
