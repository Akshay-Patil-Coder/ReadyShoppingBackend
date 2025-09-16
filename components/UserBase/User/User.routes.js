const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const userController = require("./User.controller");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'UserImage');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.params.userid;
    const fileName = userId + path.extname(file.originalname);
    cb(null, fileName);
  },
});
const upload = multer({ storage });
const uploadFile = multer({ dest: path.join(__dirname, "../../../uploads") });

router.post("/loginViaPhone", userController.LoginViaPhone);
router.post("/verify", userController.Verify);
router.post("/resendotpforsignup", userController.ResendOtpForSignup);
module.exports = router;
