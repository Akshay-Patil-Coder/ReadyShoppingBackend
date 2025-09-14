const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const userSchema = new mongoose.Schema(
  {
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
        createdAt: { type: Date },
      },
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
        state: { type: String, default: "" },
      },
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
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    otp: { type: Number },
    family: [
      {
        name: { type: String, default: "" },
        relation: { type: String, default: "" },
        Age: { type: String, default: "" },
        BloodGroup: { type: String, default: "" },
        Weight: { type: Number, default: "" },
        Dob: { type: Date, default: "" },
        gender: { type: String, default: "" },
        profileComplete: { type: Boolean, default: false },
        phone: { type: String, minlength: 10, maxlength: 10, default: "" },
        email: { type: String },
      },
    ],
    profilePercentage: { type: Number, default: 0 },
    active: { type: Boolean, default: false },
    feedback: [
      {
        message: { type: String },
        date: { type: String },
        img: { type: String },
        name: { type: String },
      },
    ],
    count: { type: Number, default: 0 },
    profilestatus: { type: Boolean, default: false },
    empCode: { type: String, default: "" },
    empName: { type: String, default: "" },
    hms_phone: { type: String, default: "" },
    type: { type: String, default: "" },
    scheme: { category: { type: String }, payment: { type: Boolean } },
    loginFrom: { type: String, default: "Patient App" },
    RowStatus: { type: Number, default: 0 },
    Identification: { type: String, default: 0 },
  },
  { timestamps: true }
);

// ✅ Password Hashing Methods
userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
};

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// ✅ User Model
const User = mongoose.model("User", userSchema);

// ✅ Hospital Contact Schema
const hospitalcontactSchema = new mongoose.Schema(
  {
    isValid: { type: Boolean, default: false },
    phone: { type: String, minlength: 10, maxlength: 10, default: "" },
  },
  { timestamps: true }
);
const HospitalContact = mongoose.model("hospitalcontacts", hospitalcontactSchema);

// ✅ App Version Schema
const appversionSchema = new mongoose.Schema(
  {
    android_version: { type: String },
    ios_version: { type: String },
  },
  { timestamps: true }
);
const AppVersion = mongoose.model("appversions", appversionSchema);

// ✅ SMS Content Schema
const smscontentSchema = new mongoose.Schema(
  {
    counter: { type: Number },
    content: { type: String },
    time: { type: String },
    page: { type: String },
    image_url: { type: String },
  },
  { timestamps: true }
);
const SMSContent = mongoose.model("smscontents", smscontentSchema);

// ✅ Banner Schema
const bannerimagesSchema = new mongoose.Schema(
  {
    banner_url: { type: String },
    link: { type: String },
    valid: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Banner = mongoose.model("banners", bannerimagesSchema);

// ✅ User Logs Schema
const userlogSchema = new mongoose.Schema(
  {
    userid: { type: String, default: "" },
    email: { type: String },
    phone: { type: String, minlength: 10, maxlength: 10, default: "" },
    name: { type: String, default: "" },
    fname: { type: String, default: "" },
    lname: { type: String, default: "" },
    ModuleName: { type: String, default: "" },
    Action: { type: String, default: "" },
    loginFrom: { type: String, default: "Website" },
    RowStatus: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const UserLogs = mongoose.model("Userlogs", userlogSchema);

// ✅ NineOneUser Schema
const nineOneUserSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subscriptionFrom: { type: Date, required: true },
    subscriptionTo: { type: Date, required: true },
    family: [
      {
        name: { type: String, default: "" },
        userid: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);
const NineOneUser = mongoose.model("NineOneUser", nineOneUserSchema);

// ✅ Export All Models
module.exports = {
  User,
  HospitalContact,
  AppVersion,
  SMSContent,
  Banner,
  UserLogs,
  NineOneUser,
};
