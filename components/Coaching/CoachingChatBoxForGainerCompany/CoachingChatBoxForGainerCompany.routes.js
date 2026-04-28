// CoachingAdminChat.routes.js
const express = require('express');
const router = express.Router();
const CoachingAdminChatController = require('./CoachingChatBoxForGainerCompany.controller');
const { authentication } = require('../../Middleware/Middleware.controller');

router.post('/accessChat', authentication, (req, res) => {
    return CoachingAdminChatController.accessChat(req, res);
});

router.get('/fetchAllChatsForAdmin', authentication, (req, res) => {
    return CoachingAdminChatController.fetchAllChatsForAdmin(req, res);
});

router.get('/fetchChatForCoachingCompany', authentication, (req, res) => {
    return CoachingAdminChatController.fetchChatForCoachingCompany(req, res);
});

router.post('/sendMessage', authentication, (req, res) => {
    return CoachingAdminChatController.sendMessage(req, res);
});

router.get('/getAllMessages/:chatId', authentication, (req, res) => {
    return CoachingAdminChatController.getAllMessages(req, res);
});

router.get('/getUnreadCount/:chatId', authentication, (req, res) => {
    return CoachingAdminChatController.getUnreadCount(req, res);
});

module.exports = router;