const mongoose = require('mongoose');
const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: 'Username is required',
        unique: true,
        dropDups: true
    },
    name: {
        type: String,
        required: 'Name is a required field',
    },
    password: {
        type: String,
        required: true
    },
    permission: {
        appointment: {
            type: Boolean,
            default: true
        }
    },
    image: {
        type: String
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },
    passwordResetToken: {
        token: String,
        expiry: Date,
    },
    lastlogintime: {
        type: String,
        default: ""
    },
    count: {
        type: Number,
        default: 0
    },
    role: {
        type: String
    },

}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
