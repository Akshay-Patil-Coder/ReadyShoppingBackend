
const express = require('express')
const { accessChats, fetchChats } = require('./CoachingChatBoxForGainerCompany.controller');
const router = express.Router();
const { sendMessage, allMessage } = require('./CoachingChatBoxForGainerCompany.controller');
const { authentication } = require('../../Middleware/Middleware.controller')



router.get('/accessChats', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return accessChats(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})

router.post('/fetchChats', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return fetchChats(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})
router.post('/allMessage/:chatId', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return allMessage(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})
router.post('/sendMessage', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return sendMessage(req, res);
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})


module.exports = router;