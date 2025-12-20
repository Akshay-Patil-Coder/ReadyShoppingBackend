const mongoose = require('mongoose')
const express = require('express')
const brandController = require('./ProductsBrand.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

//multer  
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'BrandImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'brand-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post("/addbrands", authentication, upload.single('BrandImage'), (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return brandController.addbrands(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

router.get('/getBrandsById', (req, res) => {
  brandController.getBrandsById(req, res)
})

router.put('/updateSubCategoryList', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return brandController.updateSubCategoryList(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.put('/updateBrandDetails', authentication, upload.single('BrandImage'), (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return brandController.updateBrandDetails(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.get('/previewDeleteBrand', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return brandController.previewDeleteBrand(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.get('/ToggleStatusOfBrand', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return brandController.ToggleStatusOfBrand(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.get('/deleteBrand', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return brandController.deleteBrand(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})

module.exports = router