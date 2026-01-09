// const asyncHandler = require("express-async-handler");
const {Chat,Message} = require("./CoachingChatBoxForGainerCompany.model.");

const accessChats = async (req, resp) => {
    const { userId } = req.body;
    if (!userId) {
        console.log("userid cannot get");
        return resp.sendStatus(400);
    }
    var isChat = await Chat.find({
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } },
            { users: { $elemMatch: { $eq: userId } } },
        ],
    })
        .populate("readyshoppingusers", "-password")
        .populate("latestMessage");

    isChat = await User.default.populate(isChat, {
        path: "latestMessage.sender",
        select: "-password",
    });
    if (isChat.length > 0) { 
        resp.send(isChat[0]);
    } else {
        var chatData = {
            chatName: "sender",
            users: [req.user._id, userId],
        };
        try {
            const createChat = await Chat.create(chatData);
            const fullChat = await Chat.findOne({ _id: createChat._id }).populate(
                "readyshoppingusers",
                "-password"
            );
            resp.status(200).send(fullChat);
        } catch (error) {
            resp.status(400);
            throw new Error("chat error");
        }
    }
};

const fetchChats = async (req, resp) => {
    try {
        Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate("users", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: "latestMessage.sender",
                    select: "-password",
                });
                resp.status(200).send(results);
            });
    } catch (error) {
        resp.status(400);
        throw new Error(error.message);
    }
};

const sendMessage = async (req, resp) => {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
        console.log("Invalid data passed into request");
        return resp.sendStatus(400);
    }

    const newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
    };

    try {
        let message = await Message.create(newMessage);
        message = await message.populate("sender", "-password");
        message = await message.populate("chat");
        message = await User.populate(message, {
            path: "chat.users",
            select: "-password",
        });

        await Chat.findByIdAndUpdate(chatId, {
            latestMessage: message,
        });

        resp.json(message);
    } catch (error) {
        resp.status(400).json({ error: error.message });
    }
};

const allMessage = async (req, resp) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId }).populate("sender", "name pic email").populate("chat")
        resp.json(messages)

    } catch (error) {
        resp.status(400).json({ error: error.message });

    }
};

module.exports = {
    accessChats,
    fetchChats,
    sendMessage,
    allMessage
};
