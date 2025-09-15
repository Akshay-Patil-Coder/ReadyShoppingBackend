const express = require('express');

const dashController = require('./Admin.controller');
const { decodeToken } = require('../../util/permission');

const router = express.Router();




// =================== login ======================
router.post("/create", (req, res) => dashController.createAdmin(req, res));
router.get('/list', decodeToken, (req, res) => dashController.getAdminList(req, res));
router.post('/login', (req, res) => dashController.adminLogin(req, res));
router.get("/getUnread", decodeToken, (req, res) => dashController.getUnread(req, res));

// =================== Users ====================
router.get('/userslist/:page', (req, res) => dashController.getUsers(req, res));
router.post('/getUsersName/:page', (req, res) => dashController.getUsersName(req, res));
router.post('/filterUser', (req, res) => dashController.filterUser(req, res));
router.post('/userdetails', (req, res) => dashController.getuserdetails(req, res));
router.post('/userFamily', (req, res) => dashController.getuserFamily(req, res));

module.exports = router;
