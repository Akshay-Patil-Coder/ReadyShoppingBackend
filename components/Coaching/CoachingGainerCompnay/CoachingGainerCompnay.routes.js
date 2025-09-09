const mongoose = require('mongoose')
const express = require('express')
const CoachingGainerCompaniesController = require('./CoachingGainerCompnay.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'CoachingGainerCompanyImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'coachingGainerCompany-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post("/addCoachingGainerCompanies", upload.single('CoachingGainerCompanyLogo'), (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingGainerCompaniesController.addCoachingGainerCompanies(req, res)
  // }
  // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});

router.get('/getCoachingGainerCompaniesByData', (req, res) => {
    CoachingGainerCompaniesController.getCoachingGainerCompaniesByData(req, res)
})

router.put('/updateGainerCompanyOwnerNameList',(req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingGainerCompaniesController.updateGainerCompanyOwnerNameList(req, res)
  // }

})
router.put('/updateEmployeeListInGainerCompany',(req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingGainerCompaniesController.updateEmployeeListInGainerCompany(req, res)
  // }

})
router.put('/updateGainerCoachingCompanyDetail',  upload.single('CoachingGainerCompanyLogo'), (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingGainerCompaniesController.updateGainerCoachingCompanyDetail(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.delete('/deleteGainerCoachingCompany/:id',  (req, res) => {
  // if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return CoachingGainerCompaniesController.deleteGainerCoachingCompany(req, res)
  // }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})

router.post('/loginGainerCoachingCompany', (req, res) => {
    CoachingGainerCompaniesController.loginGainerCoachingCompany(req, res);
});

module.exports = router  