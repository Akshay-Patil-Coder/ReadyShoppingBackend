const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    userid: { type: String, default: "", unique: true },
    company_id: { type: mongoose.Schema.Types.ObjectId },
    addedByPruthvi: { type: String },
    counter: { type: Number, default: 1 },
    isPharmaCount: { type: Number, default: 0 },
    otptime: { type: Date },
    email: { type: String },
    followup_details: [
        {
            comment: { type: String, default: "" },
            calling_status: { type: String, default: "" },
            createdAt: { type: Date }
        }
    ],
    password: { type: String, default: "" },
    facebook: { type: String, default: "" },
    phone: { type: String, minlength: 10, maxlength: 10, default: "" },
    phoneisverified: { type: Boolean, default: false },
    name: { type: String, default: "" },
    fname: { type: String, default: "" },
    lname: { type: String, default: "" },
    img: { type: String, default: "" },
    address: [
        {
            Type: { type: String, default: "" },
            pincode: { type: String, default: "" },
            localityortown: { type: String, default: "" },
            landmark: { type: String, default: "" },
            city: { type: String, default: "" },
            state: { type: String, default: "" }
        }
    ],
    gender: { type: String, default: "" },
    dob: { type: Date, default: "" },
    height: { type: String, default: "" },
    weight: { type: String, default: "" },
    bloodGroup: { type: String, default: "" },
    medicalHistory: { type: String, default: "" },
    allergies: { type: String, default: "" },
    walletBalance: { type: Number, default: 0 },
    isParent: { type: Boolean, default: true },
    relation: { type: String, default: "self" },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    otp: { type: Number },
    family: [
        {
            name: { type: String, default: "" },
            relation: { type: String, default: "" },
            Age: { type: String, default: "" },
            BloodGroup: { type: String, default: "" },
            Weight: { type: Number, default: 0 },
            Dob: { type: Date, default: "" },
            gender: { type: String, default: "" },
            profileComplete: { type: Boolean, default: false },
            phone: { type: String, minlength: 10, maxlength: 10, default: "" },
            email: { type: String }
        }
    ],
    profilePercentage: { type: Number, default: 0 },
    active: { type: Boolean, default: false },
    feedback: [
        {
            message: { type: String },
            date: { type: String },
            img: { type: String },
            name: { type: String }
        }
    ],
    count: { type: Number, default: 0 },
    profilestatus: { type: Boolean, default: false },
    empCode: { type: String, default: "" },
    empName: { type: String, default: "" },
    hms_phone: { type: String, default: "" },
    type: { type: String, default: "" },
    scheme: {
        category: { type: String },
        payment: { type: Boolean }
    },
    loginFrom: { type: String, default: "Patient App" },
    RowStatus: { type: Number, default: 0 },
    Identification: { type: String, default: 0 }
}, { timestamps: true });

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
};
userSchema.methods.comparePassword = function(password) {
    return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

const smsContentSchema = new mongoose.Schema({
    counter: { type: Number },
    content: { type: String },
    time: { type: String },
    page: { type: String },
    image_url: { type: String }
}, { timestamps: true });

const SmsContent = mongoose.model('smscontents', smsContentSchema);

const userLogSchema = new mongoose.Schema({
    userid: { type: String, default: "" },
    email: { type: String },
    phone: { type: String, minlength: 10, maxlength: 10, default: "" },
    name: { type: String, default: "" },
    fname: { type: String, default: "" },
    lname: { type: String, default: "" },
    ModuleName: { type: String, default: "" },
    Action: { type: String, default: "" },
    loginFrom: { type: String, default: "Website" },
    RowStatus: { type: Number, default: 0 }
}, { timestamps: true });

const UserLogs = mongoose.model('Userlogs', userLogSchema);


module.exports = {
    User,
    SmsContent,
    UserLogs,
};
