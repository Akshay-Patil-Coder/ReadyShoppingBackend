const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")

const companySchema = new mongoose.Schema({
    CompanyName: {
        type: String,
        required: true
    },
    CompanyDomain: {
        type: String,
        unique: true
    },
    PredifinedDomain: {
        type: String,
        unique: true
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
    Latitude: {
        type: Number
    },
    Longitude: {
        type: Number
    },
    Email: {
        type: String,
        required: true,
        unique: true
    },
    Phone: {
        type: String,
        unique: true,
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
    CompanyLogo: {
        type: String,
        required: true
    },
    Password: {
        type: String,
        required: true
    },
    BankDetails: {
        IFSC: {
            type: String
        },
        AccountNumber: {
            type: String
        },
        BankName: {
            type: String
        },
        BranchName: {
            type: String
        },
        MICR: {
            type: String
        },
        Address: {
            type: String
        },
        BankState: {
            type: String
        }
    }
}, {
    timestamps: true
});
module.exports = mongoose.model("Company", companySchema);
