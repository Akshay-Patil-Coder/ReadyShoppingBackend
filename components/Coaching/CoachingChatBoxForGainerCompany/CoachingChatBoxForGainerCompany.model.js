// CoachingAdminChat.model.js
const mongoose = require('mongoose');

const adminChatSchema = mongoose.Schema({
    chatName: { type: String, trim: true },
    coachingCompanyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CoachingCompanyGainer",
        required: true,
        unique: true  // one chat per company
    },
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CoachingAdminMessage",
    },
}, { timestamps: true });

const AdminChat = mongoose.model('CoachingAdminChat', adminChatSchema);
module.exports.AdminChat = AdminChat;

const adminMessageSchema = mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    senderType: {
        type: String,
        enum: ["CoachingCompany", "Admin"],
        required: true
    },
    content: { type: String, trim: true },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CoachingAdminChat",
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const AdminMessage = mongoose.model("CoachingAdminMessage", adminMessageSchema);
module.exports.AdminMessage = AdminMessage;