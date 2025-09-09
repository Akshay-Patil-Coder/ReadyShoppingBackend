const mongoose = require('mongoose')
const express = require('express')
const CoachingCompaniesController = require('./CoachingCompanies.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'coachingCompany-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post("/addCoachingCompanies", upload.single('CourseCompanyLogo'), (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingCompaniesController.addCoachingCompanies(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});

router.get('/getCoachingCompaniesByData', (req, res) => {
  CoachingCompaniesController.getCoachingCompaniesByData(req, res)
})

router.put('/updateSubCourceCategoryList', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingCompaniesController.updateSubCourceCategoryList(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})

router.put('/updateHeadCourceCategoryList', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingCompaniesController.updateHeadCourceCategoryList(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.put('/updateCompanyOwnerNameList', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingCompaniesController.updateCompanyOwnerNameList(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})

router.put('/updateCoachingCompanyDetail',  upload.single('CourseCompanyLogo'), (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingCompaniesController.updateCoachingCompanyDetail(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.delete('/deleteCoachingCompany/:id',  (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingCompaniesController.deleteCoachingCompany(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})

router.post('/loginCoachingCompany', (req, res) => {
  CoachingCompaniesController.loginCoachingCompany(req, res);
});

module.exports = router  