const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")

const coachingCompaniesSchema = new mongoose.Schema({
    CourseCompanyName: {
        type: String,
        required: true
    },
    CompanyOwnerName: [
        {
            type: String,
        }
    ],
    Contact_person_name: {
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
    Skills: [{
        type: mongoose.Schema.Types.ObjectId
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
    CourseCompanyLogo: {
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
    googleLocation:{
        type:String
    },
    Password: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});
module.exports = mongoose.model("CoachingCompany", coachingCompaniesSchema);
