
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
            ref: 'MasterServiceCategory',
            required: true,
        }],
        SubServiceId: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'MasterServiceCategory',
                required: true
            }
        ],
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
            unique:true
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
        isActive: {
            type: Boolean,
            default: true,

        },
        Password:{
            type:String,
            required:true
        }
    }, {
    timestamps: true
}
)
const serviceProviderModel = mongoose.model('ServiceProvider', serviceProviderSchema)
module.exports.serviceProviderModel = serviceProviderModel;
