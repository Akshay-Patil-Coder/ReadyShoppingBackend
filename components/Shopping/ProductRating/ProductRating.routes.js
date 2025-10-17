const mongoose = require('mongoose')
const  express = require('express')
const ProductReviewController  = require('./ProductRating.controller')
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

router.post("/addProductReview",upload.array('ReviewImages', 10),(req,res)=>{
    return   ProductReviewController.addProductReview(req,res)
  });

router.delete('/DeleteReview',(req,res)=>{
    ProductReviewController.DeleteReview(req,res)
})

router.put('/MakeResponseReview',(req,res)=>{
    return   ProductReviewController.MakeResponseReview(req,res)
})
router.get('/getReview',(req,res)=>{
    return   ProductReviewController.getReview(req,res)
})


module.exports = router