// CoachingAdminChat.controller.js
const { AdminChat, AdminMessage } = require("./CoachingChatBoxForGainerCompany.model");
const mongoose = require("mongoose");

const accessChat = async (req, res) => {
    try {
        const coachingCompanyId = req.user._id;

        let chat = await AdminChat.aggregate([
            {
                $match: {
                    coachingCompanyId: new mongoose.Types.ObjectId(coachingCompanyId)
                }
            },
            {
                $lookup: {
                    from: "coachingcompanygainers",
                    localField: "coachingCompanyId",
                    foreignField: "_id",
                    as: "coachingCompanyId",
                    pipeline: [
                        { $project: { password: 0 } }
                    ]
                }
            },
            { $unwind: { path: "$coachingCompanyId", preserveNullAndEmpty: true } },
            {
                $lookup: {
                    from: "coachingadminmessages",
                    localField: "latestMessage",
                    foreignField: "_id",
                    as: "latestMessage",
                    pipeline: [
                        {
                            $lookup: {
                                from: "coachingcompanygainers",
                                localField: "sender",
                                foreignField: "_id",
                                as: "sender",
                                pipeline: [
                                    { $project: { password: 0 } }
                                ]
                            }
                        },
                        { $unwind: { path: "$sender", preserveNullAndEmpty: true } }
                    ]
                }
            },
            { $unwind: { path: "$latestMessage", preserveNullAndEmpty: true } }
        ]);

        if (chat.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Chat fetched successfully",
                data: chat[0]
            });
        }

        const newChat = await AdminChat.create({
            chatName: `Chat_${coachingCompanyId}`,
            coachingCompanyId
        });

        const fullChat = await AdminChat.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(newChat._id)
                }
            },
            {
                $lookup: {
                    from: "coachingcompanygainers",
                    localField: "coachingCompanyId",
                    foreignField: "_id",
                    as: "coachingCompanyId",
                    pipeline: [
                        { $project: { password: 0 } }
                    ]
                }
            },
            { $unwind: { path: "$coachingCompanyId", preserveNullAndEmpty: true } }
        ]);

        return res.status(201).json({
            success: true,
            message: "Chat created successfully",
            data: fullChat[0]
        });

    } catch (error) {
        console.log("accessChat error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
};

const fetchAllChatsForAdmin = async (req, res) => {
    try {
        const chats = await AdminChat.aggregate([
            { $sort: { updatedAt: -1 } },
            {
                $lookup: {
                    from: "coachingcompanygainers",
                    localField: "coachingCompanyId",
                    foreignField: "_id",
                    as: "coachingCompanyId",
                    pipeline: [
                        { $project: { password: 0 } }
                    ]
                }
            },
            { $unwind: { path: "$coachingCompanyId", preserveNullAndEmpty: true } },
            {
                $lookup: {
                    from: "coachingadminmessages",
                    localField: "latestMessage",
                    foreignField: "_id",
                    as: "latestMessage",
                    pipeline: [
                        {
                            $lookup: {
                                from: "coachingcompanygainers",
                                localField: "sender",
                                foreignField: "_id",
                                as: "sender",
                                pipeline: [
                                    { $project: { password: 0 } }
                                ]
                            }
                        },
                        { $unwind: { path: "$sender", preserveNullAndEmpty: true } }
                    ]
                }
            },
            { $unwind: { path: "$latestMessage", preserveNullAndEmpty: true } },
            {
                $lookup: {
                    from: "coachingadminmessages",
                    let: { chatId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$chat", "$$chatId"] },
                                        { $eq: ["$isRead", false] },
                                        { $eq: ["$senderType", "CoachingCompany"] }
                                    ]
                                }
                            }
                        },
                        { $count: "count" }
                    ],
                    as: "unreadMessages"
                }
            },
            {
                $addFields: {
                    unreadCount: {
                        $ifNull: [{ $arrayElemAt: ["$unreadMessages.count", 0] }, 0]
                    }
                }
            },
            { $project: { unreadMessages: 0 } }
        ]);

        return res.status(200).json({
            success: true,
            message: "All chats fetched successfully",
            data: chats
        });

    } catch (error) {
        console.log("fetchAllChatsForAdmin error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
};

const fetchChatForCoachingCompany = async (req, res) => {
    try {
        const coachingCompanyId = req.user._id;

        const chat = await AdminChat.aggregate([
            {
                $match: {
                    coachingCompanyId: new mongoose.Types.ObjectId(coachingCompanyId)
                }
            },
            {
                $lookup: {
                    from: "coachingcompanygainers",
                    localField: "coachingCompanyId",
                    foreignField: "_id",
                    as: "coachingCompanyId",
                    pipeline: [
                        { $project: { password: 0 } }
                    ]
                }
            },
            { $unwind: { path: "$coachingCompanyId", preserveNullAndEmpty: true } },
            {
                $lookup: {
                    from: "coachingadminmessages",
                    localField: "latestMessage",
                    foreignField: "_id",
                    as: "latestMessage",
                    pipeline: [
                        {
                            $lookup: {
                                from: "coachingcompanygainers",
                                localField: "sender",
                                foreignField: "_id",
                                as: "sender",
                                pipeline: [
                                    { $project: { password: 0 } }
                                ]
                            }
                        },
                        { $unwind: { path: "$sender", preserveNullAndEmpty: true } }
                    ]
                }
            },
            { $unwind: { path: "$latestMessage", preserveNullAndEmpty: true } },
            {
                $lookup: {
                    from: "coachingadminmessages",
                    let: { chatId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$chat", "$$chatId"] },
                                        { $eq: ["$isRead", false] },
                                        { $eq: ["$senderType", "Admin"] }
                                    ]
                                }
                            }
                        },
                        { $count: "count" }
                    ],
                    as: "unreadMessages"
                }
            },
            {
                $addFields: {
                    unreadCount: {
                        $ifNull: [{ $arrayElemAt: ["$unreadMessages.count", 0] }, 0]
                    }
                }
            },
            { $project: { unreadMessages: 0 } }
        ]);

        if (!chat.length) {
            return res.status(404).json({
                success: false,
                message: "No chat found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Chat fetched successfully",
            data: chat[0]
        });

    } catch (error) {
        console.log("fetchChatForCoachingCompany error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { content, chatId } = req.body;

        if (!content || !chatId) {
            return res.status(400).json({
                success: false,
                message: "Please provide content and chatId"
            });
        }

        const chat = await AdminChat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }

        const senderType = req.user.role === "Admin" ? "Admin" : "CoachingCompany";

        const newMessage = await AdminMessage.create({
            sender: req.user._id,
            senderType,
            content,
            chat: chatId
        });

        await AdminChat.findByIdAndUpdate(chatId, {
            latestMessage: newMessage._id,
            updatedAt: new Date()
        });

        // Aggregate full message with chat details
        const fullMessage = await AdminMessage.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(newMessage._id)
                }
            },
            {
                $lookup: {
                    from: "coachingadminchats",
                    localField: "chat",
                    foreignField: "_id",
                    as: "chat",
                    pipeline: [
                        {
                            $lookup: {
                                from: "coachingcompanygainers",
                                localField: "coachingCompanyId",
                                foreignField: "_id",
                                as: "coachingCompanyId",
                                pipeline: [
                                    { $project: { password: 0 } }
                                ]
                            }
                        },
                        { $unwind: { path: "$coachingCompanyId", preserveNullAndEmpty: true } }
                    ]
                }
            },
            { $unwind: { path: "$chat", preserveNullAndEmpty: true } }
        ]);

        const io = req.app.get("io");
        io.to(chatId).emit("newMessage", {
            success: true,
            data: fullMessage[0]
        });

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: fullMessage[0]
        });

    } catch (error) {
        console.log("sendMessage error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
};

const getAllMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await AdminChat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }

        const messages = await AdminMessage.aggregate([
            {
                $match: {
                    chat: new mongoose.Types.ObjectId(chatId)
                }
            },
            { $sort: { createdAt: 1 } },
            {
                $lookup: {
                    from: "coachingadminchats",
                    localField: "chat",
                    foreignField: "_id",
                    as: "chat",
                    pipeline: [
                        {
                            $lookup: {
                                from: "coachingcompanygainers",
                                localField: "coachingCompanyId",
                                foreignField: "_id",
                                as: "coachingCompanyId",
                                pipeline: [
                                    { $project: { password: 0 } }
                                ]
                            }
                        },
                        { $unwind: { path: "$coachingCompanyId", preserveNullAndEmpty: true } }
                    ]
                }
            },
            { $unwind: { path: "$chat", preserveNullAndEmpty: true } },
            // Group by date for chat UI date separators
            {
                $addFields: {
                    messageDate: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    }
                }
            }
        ]);

        // Mark messages as read
        await AdminMessage.updateMany(
            { chat: chatId, sender: { $ne: req.user._id }, isRead: false },
            { $set: { isRead: true } }
        );

        return res.status(200).json({
            success: true,
            message: "Messages fetched successfully",
            data: messages
        });

    } catch (error) {
        console.log("getAllMessages error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const { chatId } = req.params;

        const result = await AdminMessage.aggregate([
            {
                $match: {
                    chat: new mongoose.Types.ObjectId(chatId),
                    sender: { $ne: new mongoose.Types.ObjectId(req.user._id) },
                    isRead: false
                }
            },
            {
                $count: "unreadCount"
            }
        ]);

        return res.status(200).json({
            success: true,
            message: "Unread count fetched successfully",
            data: { unreadCount: result[0]?.unreadCount || 0 }
        });

    } catch (error) {
        console.log("getUnreadCount error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
};

module.exports = {
    accessChat,
    fetchAllChatsForAdmin,
    fetchChatForCoachingCompany,
    sendMessage,
    getAllMessages,
    getUnreadCount
};