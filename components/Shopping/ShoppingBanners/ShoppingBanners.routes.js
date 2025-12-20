const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const bannersController = require('./ShoppingBanners.controller')
const { authentication } = require('../../Middleware/Middleware.controller')

//multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'BannerImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'Banner-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post('/addbanner',authentication, upload.single('BannerImage'), (req, res) => {
   if (req.user.role == 'Company' || req.user.role == 'Admin') {
      return bannersController.addbanner(req, res);
    }
   
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
  
})
router.get('/getBannersById', (req, res) => {
  bannersController.getBannersById(req, res)
})
router.put('/updateProductsById',authentication, (req, res) => {
  if (req.user.role == 'Company' ||req.user.role == 'Admin') {
      return bannersController.updateProductsById(req, res);
    }
   
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
  
})
router.put('/updateBannerDetails',authentication, upload.single('BannerImage'), (req, res) => {
   if (req.user.role == 'Company' || req.user.role == 'Admin') {
      return bannersController.updateBannerDetails(req, res);
    }
   
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
  
})
router.delete('/deleteBanner',authentication, (req, res) => {
   if (req.user.role == 'Company' || req.user.role == 'Admin') {
      return bannersController.deleteBanner(req, res);
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
 
 })



module.exports = router