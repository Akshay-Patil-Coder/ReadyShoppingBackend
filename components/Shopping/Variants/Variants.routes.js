const mongoose = require('mongoose')
const express = require('express')
const VariantController = require('./Variants.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'VariantImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'Variant-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post("/addVariant", authentication,upload.single("VariantImage"), (req, res) => {
    if (req.user.role == 'Company' ||req.user.role == 'Admin') {
        return VariantController.addVariant(req, res)
    }
    
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

router.get('/getVariantsById', (req, res) => {
    VariantController.getVariantsById(req, res)
})
router.get('/getAvailableFilters', (req, res) => {
    VariantController.getAvailableFilters(req, res)
})
router.put('/updateVariantDetails', authentication,upload.single("VariantImage"), (req, res) => {
    if (req.user.role == 'Company' ||req.user.role == 'Admin') {
        return VariantController.updateVariantDetails(req, res)
    }
   
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})



module.exports = router