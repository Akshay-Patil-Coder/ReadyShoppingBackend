const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    UserName: {
        type: String
    },
    Email: {
        type: String
    },
    Phone: {
        type: Number
    },
    UserProfile: {
        type: String
    },
    Address: [{
        AddresserName: {
            type: String,
            default: "Guest"
        },
        AddresserNumber:{
            type:Number
        },
        DefaultAddress: {
            type: Boolean,
            default: false
        },
        AddressType: {
            type: String,
            default: "Home",
        },
        Street: {
            type: String
        },
        City: {
            type: String
        },
        State: {
            type: String
        },
        Country: {
            type: String
        },
        PostalCode: {
            type: Number
        },
        Latitude: {
            type: Number
        },
        Longitude: {
            type: Number
        },
        ManualAddress: {
            type: String
        }
    }],
    Gender: {
        type: String,
    },
    DOB: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    ActiveOtp: {
        type: String
    },
    OtpTime: {
        type: Date
    },
    PhoneIsVerfied: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    }
)
const User = mongoose.model('ReadyShoppingUser', UserSchema);


module.exports = {
    User,
};
