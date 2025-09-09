const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")

const coachingUniversitySchema = new mongoose.Schema({
    UniversityName: {
        type: String,
        required: true
    },
    HeadCourceCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    SubCourceCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true,
    },
    Skills:[{
        type:mongoose.Schema.Types.ObjectId
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
    Contact_person_name: {
        type: String,
        required: true
    },
    UniversityLogo: {
        type: String,
        required: true
    },
    ProviderType: {
        type: mongoose.Schema.Types.ObjectId,
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
    },
    googleLocation: {
        type: String,
        required: true
    },
}, {
    timestamps: true
});
module.exports = mongoose.model("CoachingUniversity", coachingUniversitySchema);
