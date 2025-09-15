const mongoose = require('mongoose');

// Define the schema for Admin
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    dropDups: true, // ensures duplicates are removed on unique index creation
  },
  name: {
    type: String,
    required: [true, 'Name is a required field'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  permission: {
    appointment: {
      type: Boolean,
      default: true, // By default, admins have appointment permission
    },
  },
  image: {
    type: String, // Optional profile image URL
  },
  isActive: {
    type: Boolean,
    default: true, // Default active status
  },
  passwordResetToken: {
    token: { type: String }, // Optional password reset token
    expiry: { type: Date },  // Optional expiry date for token
  },
  lastLoginTime: {
    type: String, // Optional last login time, can store as string or Date if needed
    default: "",
  },
  count: {
    type: Number,
    default: 0, // Optional counter for logins or other tracking
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// Create the model from the schema
const Admin = mongoose.model('Admin', adminSchema);

// Export the model
module.exports = Admin;
