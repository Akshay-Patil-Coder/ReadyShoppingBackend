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
    cb(null, 'company-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)).replace(/\s+/g, '-') + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  if (!allowedTypes.includes(file.mimetype)) {
   return req.res.status(400).json({
      success: false,
      message: 'Only image files (jpeg, png, gif, jpg) are allowed'
    });
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
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return companiesController.updatecompanies(req, res);
  }

  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

router.delete('/deletecompanies/:_id', authentication, (req, res) => {
  if (req.user.role == 'Admin') {
    return companiesController.deletecompanies(req, res);
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.put('/addBankDetailOfCompany', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return companiesController.addBankDetailOfCompany(req, res);
  }

  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.delete('/deleteBankDetailOfCompany', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return companiesController.deleteBankDetailOfCompany(req, res);
  }

  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.post('/logincompany', (req, res) => {
  companiesController.loginCompnay(req, res);
});
router.post('/verifyToken', (req, res) => {
  companiesController.verifyToken(req, res);
})
router.get('/previewDeleteCompany', authentication, (req, res) => {
  if (req.user.role == 'Admin') {
    return companiesController.previewDeleteCompany(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.get('/ToggleStatusOfCompany', authentication, (req, res) => {
  if (req.user.role == 'Admin') {
    return companiesController.ToggleStatusOfCompany(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.delete('/DeleteCompany', authentication, (req, res) => {
  if (req.user.role == 'Admin') {
    return companiesController.DeleteCompany(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })


})
router.get('/resetPassword', (req, res) => {
  companiesController.resetPassword(req, res)
})
module.exports = router;
