const mongoose = require("mongoose");

const DeletedCompanySchema = new mongoose.Schema({
    CompanyName: {
        type: String,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    CompanyDomain: {
        type: String,
    },
    PredifinedDomain: {
        type: String,
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
    },
    Phone: {
        type: String,
    },
    PanCardNo: {
        type: String,
    },
    GstNo: {
        type: String,
    },
    Contact_person_name: {
        type: String,
    },
    CompanyLogo: {
        type: String,
        required: true
    },
    Password: {
        type: String,
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
    },
    deletedAt: {
        type: Date,
        default: Date.now()
    }
}, {
    timestamps: true
});
module.exports = mongoose.model("DeletedCompany", DeletedCompanySchema);
