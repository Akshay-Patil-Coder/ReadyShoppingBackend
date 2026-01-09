const mongoose = require('mongoose')
const express = require('express')
const CoachingClassesController = require('./CoachingClasses.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'coachingClass-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post("/addCoachingClasses",  upload.single('ClassLogo'), (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  CoachingClassesController.addCoachingClasses(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});

router.get('/getCoachingClassesByData', (req, res) => {
    CoachingClassesController.getCoachingClassesByData(req, res)
})

router.put('/updateSubCourseCategoryList', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  CoachingClassesController.updateSubCourseCategoryList(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})

router.put('/updateHeadCourseCategoryList', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  CoachingClassesController.updateHeadCourseCategoryList(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.put('/updateClassOwnerNameList', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return  CoachingClassesController.updateClassOwnerNameList(req, res)
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
  
  })
router.put('/updateCoachingClassDetail', upload.single('ClassLogo'), (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  CoachingClassesController.updateCoachingClassDetail(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.delete('/deleteCoachingClass/:id', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  CoachingClassesController.deleteCoachingClass(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})

router.post('/loginCoachingClass', (req, res) => {
    CoachingClassesController.loginCoachingClass(req, res);
});

module.exports = router