const mongoose = require('mongoose')
const express = require('express')
const ProductReviewController = require('./ProductRating.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'ProductSRatingImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ProductReviewImage-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post("/addProductReview", authentication, upload.array('ReviewImages', 10), (req, res) => {
  if (req.user.role == 'User') {
    req.body.UserId = req.user.UserId
    req.body.companyId = req.user.companyId
    return ProductReviewController.addProductReview(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

router.delete('/DeleteReview', authentication, (req, res) => {
  if (req.user.role == 'Company') {
    req.body.companyId = req.user.companyId
    return ProductReviewController.DeleteReview(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
})

router.put('/MakeResponseReview', authentication, (req, res) => {
  if (req.user.role == 'User') {
    req.body.UserId = req.user.UserId
    req.body.companyId = req.user.companyId
    return ProductReviewController.MakeResponseReview(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.get('/getReview', (req, res) => {
  return ProductReviewController.getReview(req, res)
})


module.exports = router