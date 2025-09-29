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
        AddressType:{
            type:String
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
    Gender:{
        type:String
    },
    DOB:{
        type:String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    ActiveOtp: {
        type: String
    },
    OtpTime:{
        type:Date
    },
    PhoneIsVerfied:{
        type:Boolean,
        default:false
    }
},
    {
        timestamps: true
    }
)
const User = mongoose.model('User', UserSchema);

// const userSchema = new mongoose.Schema({
//     userid: { type: String, default: "", unique: true },
//     companyId: { type: mongoose.Schema.Types.ObjectId },
//     otptime: { type: Date },
//     email: { type: String },
//     followup_details: [
//         {
//             comment: { type: String, default: "" },
//             calling_status: { type: String, default: "" },
//             createdAt: { type: Date }
//         }
//     ],
//     password: { type: String, default: "" },
//     phone: { type: String, minlength: 10, maxlength: 10, default: "" },
//     phoneisverified: { type: Boolean, default: false },
//     name: { type: String, default: "" },
//     fname: { type: String, default: "" },
//     lname: { type: String, default: "" },
//     img: { type: String, default: "" },
//     address: [
//         {
//             Type: { type: String, default: "" },
//             pincode: { type: String, default: "" },
//             localityortown: { type: String, default: "" },
//             landmark: { type: String, default: "" },
//             city: { type: String, default: "" },
//             state: { type: String, default: "" }
//         }
//     ],
//     gender: { type: String, default: "" },
//     dob: { type: Date, default: "" },
//     otp: { type: Number },
//     active: { type: Boolean, default: false },
//     profilestatus: { type: Boolean, default: false },
//     type: { type: String, default: "" },
//     scheme: {
//         category: { type: String },
//         payment: { type: Boolean }
//     },
//     Identification: { type: String, default: 0 }
// }, { timestamps: true });

// userSchema.methods.generateHash = function (password) {
//     return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
// };
// userSchema.methods.comparePassword = function (password) {
//     return bcrypt.compare(password, this.password);
// };


// const smsContentSchema = new mongoose.Schema({
//     counter: { type: Number },
//     content: { type: String },
//     time: { type: String },
//     page: { type: String },
//     image_url: { type: String }
// }, { timestamps: true });

// const SmsContent = mongoose.model('smscontents', smsContentSchema);

// const userLogSchema = new mongoose.Schema({
//     userid: { type: String, default: "" },
//     email: { type: String },
//     phone: { type: String, minlength: 10, maxlength: 10, default: "" },
//     name: { type: String, default: "" },
//     fname: { type: String, default: "" },
//     lname: { type: String, default: "" },
//     ModuleName: { type: String, default: "" },
//     Action: { type: String, default: "" },
//     loginFrom: { type: String, default: "Website" },
//     RowStatus: { type: Number, default: 0 }
// }, { timestamps: true });

// const UserLogs = mongoose.model('Userlogs', userLogSchema);


module.exports = {
    User,
    // SmsContent,
    // UserLogs,
};
