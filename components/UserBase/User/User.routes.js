const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { decodeToken, refreshtoken } = require('../../util/permission');
const userController = require('./User.controller');
const appPath = require('../../app');

const uploadFile = multer({ dest: path.join(__dirname, '../../../uploads') });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(undefined, appPath.paths.userImagefilePath);
  },
  filename: function (req, file, cb) {
    const userId = req.params.userid;
    const extension = userId + path.extname(file.originalname);
    cb(null, extension);
  },
});
const upload = multer({ storage });

const router = express.Router();

// 🔹 Authentication Routes
router.post('/loginViaPhone', userController.loginViaPhone);
router.post('/register', userController.register);
router.get('/checkVersion', userController.checkVersion);
router.post('/verify', userController.verify);
router.post('/login', userController.login);
router.post('/facebooklogin', userController.facebookLogin);

// 🔹 User Profile Routes
router.put('/filluserdetails/:taskId', decodeToken, userController.filluserdetails);
router.put('/AddMember/:taskId', decodeToken, userController.AddMember);
router.get('/GetUserById/:taskId', decodeToken, userController.GetUserById);
router.get('/GetPhoneNumber', userController.GetPhoneNumber);
router.get('/GetMemberById/:patient', userController.MyMember);
router.get('/wallet', decodeToken, userController.walletDetails);
router.get('/checkprofile/:taskId', userController.checkUserDetails);
router.get('/MyMembers/:taskId', decodeToken, userController.MyMembers);
router.put('/UpdateMemberProfile', userController.UpdateMemberProfile);
router.put('/removeMember', decodeToken, userController.removeMember);

// 🔹 Address Routes
router.put('/AddAddress/:taskId', decodeToken, userController.AddAddress);
router.get('/MyAllAddress/:taskId', decodeToken, userController.MyAllAddress);
router.put('/UpdateAddress', decodeToken, userController.UpdateAddress);
router.put('/removeAddress/:taskId', decodeToken, userController.removeAddress);
router.delete('/deleteAddressId/:taskId/:AddresId', userController.deleteAddressId);

// 🔹 Image Upload & Retrieval
router.post('/convertbase64toimage/:userId', userController.base64toimage);
router.get('/getImageById/:userid', userController.getImageById);
router.post('/uploaduserimg/:userid', upload.single('img'), userController.uploaduserimg);

// 🔹 Feedback Routes
router.post('/verifyemailandphoneno', userController.verifyemailandphoneno);
router.post('/feedback', decodeToken, userController.feedback);
router.get('/feedback', decodeToken, userController.getFeedback);
router.get('/allFeedback', userController.getAllFeedback);

// 🔹 User Info
router.get('/getmemberprofile', decodeToken, userController.getmemberprofile);
router.get('/getAddress', decodeToken, userController.getAddress);
router.get('/getalluser', decodeToken, userController.getAllUser);

// 🔹 Password & OTP
router.post('/forgetpassword', userController.forgetpassword);
router.post('/resetpassword/:taskId', userController.resetpassword);
router.post('/resendotpforsignup', userController.resendotpforsignup);
router.post('/sendSms', userController.sendSms);
router.post('/refreshtoken', refreshtoken);
router.post('/testing', userController.testing);

// 🔹 Banners
router.get('/getbanners', userController.getBannerImages);
router.post('/loginWithoutOtp', userController.loginWithoutOtp);

// 🔹 911 User Routes
router.put('/AddNineOneUserMember/:taskId', decodeToken, userController.AddNineOneUserMember);
router.post('/nineone', decodeToken, userController.nineOneUser);
router.post('/newUsers', userController.newUser);
router.get('/userMember', userController.userMembers);
router.get('/NineOneMember', userController.nineOneMember);
router.put('/UpdateMemberUser', userController.updateUserMember);
router.put('/updateUserPersonalDeatail', userController.updateUserPersonalDeatail);
router.put('/updateUserDetails/:userId', decodeToken, userController.updateUserDetails);
router.post('/GetMemberById/:taskId', decodeToken, userController.GetMemberById);
router.get('/getNineOneActiveUser', userController.getNineOneActiveUser);

// 🔹 Bulk Upload & Excel
router.post('/bulkUserCreation', userController.bulkUserCreation);
router.post('/fetchExcelData', uploadFile.single('file'), userController.fetchExcelData);
router.post('/userDetails/:page', userController.userDetails);
router.post('/userDetails', userController.userDetails);
router.post('/userAndPkgDetails', userController.userAndPkgDetails);
router.get('/alluserFCH', userController.alluserFCH);
router.post('/sendPkgExpiryMsg', userController.sendPkgExpiryMsg);

// 🔹 Additional Excel Uploads
router.post('/userCreationFromExcel', uploadFile.single('sandeepSirFile'), userController.userCreationFromExcel);
router.post('/countUserExist', uploadFile.single('countuser'), userController.countUserExist);
router.post('/addingUHIds', uploadFile.single('addingUHIds'), userController.addingUHIds);

module.exports = router;
