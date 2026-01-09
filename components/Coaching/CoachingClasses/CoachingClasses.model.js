const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")

const coachingClassesSchema = new mongoose.Schema({
    ClassName: {
        type: String,
        required: true
    },
    ClassOwnerName: [
        {
            type: String,
        }
    ],
    HeadCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    SubCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    ProviderType: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true,
    },
    Skills: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    Street: {
        type: String,
        required: true
    },
    City: {
        type: String,
        required: true
    },
    State: {
        type: String,
        required: true
    },
    Country: {
        type: String,
    },
    PostalCode: {
        type: String,
        required: true
    },
    Email: {
        type: String,
        required: true,
        unique: true
    },
    Phone: {
        type: String,
        required: true

    },
    PanCardNo: {
        type: String,
        required: true
    },
    GstNo: {
        type: String,
        required: true
    },
    googleLocation: {
        type: String,
        required: true
    },
    ClassLogo: {
        type: String,
        required: true
    },
    Password: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});
module.exports = mongoose.model("CoachingClass", coachingClassesSchema);
