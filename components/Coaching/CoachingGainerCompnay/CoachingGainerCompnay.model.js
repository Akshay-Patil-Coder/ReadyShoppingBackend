const mongoose = require("mongoose");
const { ObjectId, Mongos } = require("mongodb");
const { type } = require("os");

const coachingCompaniesSchema = new mongoose.Schema({
    CompanyGainerName: {
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
    Password: {
        type: String,
        required: true
    },
    CoachingGainerCompanyLogo: {
        type: String
    },
    Employees: [{
        EmployeeName: {
            type: String
        },
        EmployeeEmail: {
            type: String
        },
        EmployeePassword: {
            type: String
        },
        EmployeeMobileNo: {
            type: Number
        },
        EmployeePic:{
            type:String
        }
    }],
    googleLocation:{
        type:String
    }
    
}, {
    timestamps: true
});
module.exports = mongoose.model("CoachingCompanyGainer", coachingCompaniesSchema);






