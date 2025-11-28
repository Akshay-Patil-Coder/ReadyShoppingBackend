const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")

const coachingTutorScema = new mongoose.Schema({
    TutorName: {
        type: String,
        required: true
    },
    HeadCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    SubCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    Skills: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    isActive: {
        type: Boolean,
        default: true,
        required: true,
    },
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
    TutorImage: {
        type: String,
        required: true
    },
    ProviderType: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    googleLocation: {
        type: String,
        required: true
    },
    ConnectedWith: [{
        connectedType: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        connectedIds: [{
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        }]
    }],
    Password: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});
module.exports = mongoose.model("CoachingTutor", coachingTutorScema);
