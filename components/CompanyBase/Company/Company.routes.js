const express = require('express');
const router = express.Router();
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const companiesController = require('./Company.controller');
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'CompanyLogos');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'company-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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
router.post('/addcompanies', upload.single('CompanyLogo'), (req, res) => {
    return companiesController.addcompanies(req, res);
});

router.get('/getcompanies', (req, res) => {
 return companiesController.getcompanies(req, res);
});

router.put('/updatecompanies', authentication, upload.single('CompanyLogo'), (req, res) => {
  if (req.user.role === 'Admin') {
    return companiesController.updatecompanies(req, res);
  }
  res.status(400).json({ message: "Authentication Failed only admin  eligible to add data", success: false })
});

router.delete('/deletecompanies/:_id', authentication, (req, res) => {
  if (req.user.role === 'Admin') {
    return companiesController.deletecompanies(req, res);
  }
  res.status(400).json({ message: "Authentication Failed only admin  eligible to add data", success: false })
});
router.post('/logincompany', (req, res) => {
  companiesController.loginCompnay(req, res);
});
router.post('/verifyToken', (req, res) => {
  companiesController.verifyToken(req, res);
})
module.exports = router;
