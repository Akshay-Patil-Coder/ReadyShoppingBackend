const mongoose = require('mongoose')
const express = require('express')
const VariantProductController = require('./VariantsProducts.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;

    if (file.mimetype.startsWith('image/')) {
      uploadDir = path.join(__dirname, '..', '..', 'public', 'ProductImage');
    } else if (file.mimetype.startsWith('video/')) {
      uploadDir = path.join(__dirname, '..', '..', 'public', 'ProductVideo');
    } else {
      return cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    const extension = path.extname(file.originalname);

    const prefix = file.mimetype.startsWith('video/') ? 'ProductVideo-' : 'ProductImage-';

    cb(null, `${prefix}${uniqueSuffix}-${baseName}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  const allowedVideoTypes = ['video/mp4', 'video/mkv', 'video/webm', 'video/ogg'];

  if (
    !allowedImageTypes.includes(file.mimetype) &&
    !allowedVideoTypes.includes(file.mimetype)
  ) {
    return cb(new Error('Only image (jpeg, png, gif, jpg) and video (mp4, mkv, webm, ogg) files are allowed'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

router.post(
  "/addVariantProduct",
  upload.fields([
    { name: 'ProductImages', maxCount: 1000 },
    { name: 'ProductVideos', maxCount: 5 }
  ]),
  (req, res) => {
    return VariantProductController.addVariantProduct(req, res);
  }
);

router.put("/UpdateVariantProduct", upload.array('ProductImages', 100), (req, res) => {
  return VariantProductController.UpdateVariantProduct(req, res)
});
router.put("/UpdateProductDetail", (req, res) => {
  return VariantProductController.UpdateProductDetail(req, res)
});
router.put("/UpdateCommonImages", upload.array('ProductImages', 100), (req, res) => {
  return VariantProductController.UpdateCommonImages(req, res)
});
router.delete("/DeleteProductWithVariant", (req, res) => {
  return VariantProductController.DeleteProductWithVariant(req, res)
});
router.post('/getProductsById', (req, res) => {
  VariantProductController.getProductsById(req, res)
})

router.put('/updateVariantDetails', (req, res) => {
  return VariantProductController.updateVariantDetails(req, res)
})
const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'BatchImages');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'Batch-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
  }
});

const fileFilter2 = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only image files (jpeg, png, gif,jpg) are allowed'), false);
  }
  cb(null, true);
};

const upload2 = multer({
  storage: storage2,
  fileFilter: fileFilter2
});
router.post("/addBatch", upload2.single('BatchLogo'), (req, res) => {
  return VariantProductController.addBatch(req, res)
});
router.get("/getBatch", (req, res) => {
  return VariantProductController.getBatch(req, res)
});
router.put("/updateBatch", upload2.single('BatchLogo'), (req, res) => {
  return VariantProductController.updateBatch(req, res)
});
router.post("/EditBatchOfVariantProduct", (req, res) => {
  return VariantProductController.EditBatchOfVariantProduct(req, res)
});

module.exports = router