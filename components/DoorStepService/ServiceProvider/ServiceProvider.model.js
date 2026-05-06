
const mongoose = require('mongoose');

const serviceProviderSchema = mongoose.Schema(
    {

        FirstName: {
            type: String,
            required: true,
        },
        LastName: {
            type: String,
            required: true,
        },
        ProviderImage: {
            type: String,
            required: true
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        HeadServiceId: [{
            type: mongoose.Schema.Types.ObjectId,
        }],
        SubServiceId: [{
            type: mongoose.Schema.Types.ObjectId,
        }],
        Staff: [{
            type: mongoose.Schema.Types.ObjectId,
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
            required: true
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
            LocationName: {
                type: String
            },
            Lattitude: {
                type: Number
            },
            Longitude: {
                type: Number
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isActiveBy: {
            type: String,
            default: 'Self'
        },
        Password: {
            type: String,
            required: true
        }
    }, {
    timestamps: true
}
)
const serviceProviderModel = mongoose.model('ServiceProvider', serviceProviderSchema)
module.exports.serviceProviderModel = serviceProviderModel;

const serviceProviderStaffSchema = mongoose.Schema(
    {
        ProviderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        StaffFirstName: {
            type: String,
            required: true,
        },
        StaffLastName: {
            type: String,
            required: true,
        },
        StaffImage: {
            type: String,
            required: true
        },
        StaffStreet: {
            type: String,
            required: true
        },
        StaffCity: {
            type: String,
            required: true
        },
        StaffState: {
            type: String,
            required: true
        },
        StaffCountry: {
            type: String,
            required: true
        },
        StaffPostalCode: {
            type: String,
            required: true
        },
        StaffPhone: {
            type: String,
            required: true
        },
        StaffLattitude: {
            type: Number
        },
        StaffLongitude: {
            type: Number
        },
        StaffIsActive: {
            type: Boolean,
            default: true,
        },
    }, {
    timestamps: true
}
)
const serviceProviderStaffModel = mongoose.model('ServiceProviderStaff', serviceProviderStaffSchema)
module.exports.serviceProviderStaffModel = serviceProviderStaffModel;