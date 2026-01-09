const mongoose = require('mongoose')

const chatSchema = mongoose.Schema({
    chatName: { type: String, trim: true },
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CoachingCompanyGainer",
        },
    ],
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CoachingMessage",
    },
},
    {
        timestamps: true,
    }
);
const Chat = mongoose.model('CoachingChat', chatSchema);

module.exports.Chat = Chat;


const messageSchema = mongoose.Schema({

    sender: { type: mongoose.Schema.Types.ObjectId, ref: "CoachingCompanyGainer" },

    content: { type: String, trim: true },

    chat: { type: mongoose.Schema.Types.ObjectId, ref: "CoachingChat" }
},

    {
        timestamps: true,
    });
const Message = mongoose.model("CoachingMessage", messageSchema);

module.exports.Message = Message;

