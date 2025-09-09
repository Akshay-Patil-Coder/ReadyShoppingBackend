const mongoose = require('mongoose')
const express = require('express')
const CoachingUniversityController = require('./CoachingUniversity.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'coachingUniversity-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only image files (jpeg, png, gif,jpg) are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

router.post("/addCoachingUniversity",  upload.single('UniversityLogo'), (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingUniversityController.addCoachingUniversity(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});

router.get('/getCoachingUniversityByData', (req, res) => {
  CoachingUniversityController.getCoachingUniversityByData(req, res)
})

router.put('/updateSubCourceCategoryList', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingUniversityController.updateSubCourceCategoryList(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})

router.put('/updateHeadCourceCategoryList', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingUniversityController.updateHeadCourceCategoryList(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})

router.put('/updateCoachingUniversityDetail',  upload.single('UniversityLogo'), (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingUniversityController.updateCoachingUniversityDetail(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.delete('/deleteCoachingUniversity/:id',  (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingUniversityController.deleteCoachingUniversity(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})

router.post('/loginCoachingUniversity', (req, res) => {
  CoachingUniversityController.loginCoachingUniversity(req, res);
});

module.exports = router  