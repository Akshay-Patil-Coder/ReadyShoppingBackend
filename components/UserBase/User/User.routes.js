const mongoose = require('mongoose')
const express = require('express')
const userController = require("./User.controller");
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

//multer  
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'UserImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'User-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)).replace(/\s+/g, '-') + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  if (!allowedTypes.includes(file.mimetype)) {
    return req.res.status(400).json({
      success: false,
      message: 'Only image (jpeg, png, gif, jpg), video (mp4, mkv, webm, ogg), and CSV files are allowed'
    });
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

router.post("/verify", (req, res) => {
  return userController.Verify(req, res)
});

router.post('/loginViaPhone', (req, res) => {
  userController.LoginViaPhone(req, res)
})
router.post('/loginViaExternalApps', (req, res) => {
  userController.LoginViaExternalApps(req, res)
})

router.post('/resendotpforsignup', (req, res) => {
  return userController.ResendOtpForSignup(req, res)
})

router.post('/addProfile', upload.single('UserProfile'), (req, res) => {
  return userController.addProfile(req, res)
})
router.post('/updateDetail', (req, res) => {
  return userController.updateDetail(req, res)
})

router.post('/getCurrentLocation', (req, res) => {
  return userController.getCurrentLocation(req, res)
})
router.post('/updateUserAddress', (req, res) => {
  return userController.updateUserAddress(req, res)
})
router.post('/getUserDetail', (req, res) => {
  return userController.getUserDetail(req, res)
})
router.post('/getUserDetailByData', (req, res) => {
  return userController.getUserDetailByData(req, res)
})

module.exports = router