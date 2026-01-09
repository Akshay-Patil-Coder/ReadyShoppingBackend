const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    categoryName: {
        type: String,
        required: true
    },
    parentCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    categoryLevel: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isActiveBy:{
        type:String,
        default:'Self'
    },
    imageName: {
        type: String
    },
    Description: {
        type: String
    },
}, {
    timestamps: true

});

const Category = mongoose.model('Categgggory', categorySchema);

module.exports = Category;
