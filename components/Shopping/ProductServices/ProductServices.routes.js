const mongoose = require('mongoose')
const express = require('express')
const ProductServiceController = require('./ProductServices.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'ProductServiceImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ProductServiceImage-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)).replace(/\s+/g, '-') + path.extname(file.originalname));
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

router.post("/addProductService", authentication, upload.array('ProductServiceImages', 10), (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return ProductServiceController.addProductService(req, res)
  }

  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })


});

router.get('/getProductServicesById', (req, res) => {
  ProductServiceController.getProductServicesById(req, res)
})

router.put('/updateProductsService', authentication, upload.array('ProductServiceImages', 10), (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return ProductServiceController.updateProductsService(req, res)
  }

  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.delete('/deleteProductServiceImage/:id', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return ProductServiceController.deleteProductServiceImage(req, res)
  }

  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.post('/toggleProductService', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return ProductServiceController.toggleProductService(req, res)
  }

  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.delete('/deleteProductService', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return ProductServiceController.deleteProductService(req, res)
  }

  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})

module.exports = router