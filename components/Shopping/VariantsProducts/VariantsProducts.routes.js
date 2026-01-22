const mongoose = require('mongoose')
const express = require('express')
const VariantProductController = require('./VariantsProducts.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')
const { searchSuggestions, getProductsById_ES, getWishlistES} = require('../ElasticSearch/elastic/search.controller')
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;

    if (file.mimetype.startsWith('image/')) {
      uploadDir = path.join(__dirname, '..', '..', 'public', 'ProductImage');

    } else if (file.mimetype.startsWith('video/')) {
      uploadDir = path.join(__dirname, '..', '..', 'public', 'ProductVideo');

    } else if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      uploadDir = path.join(__dirname, '..', '..', 'public', 'ProductCsv');

    } else {
      return cb(
        new Error('Invalid file type. Only images, videos, and CSV files are allowed.'),
        false
      );
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const baseName = path
      .basename(file.originalname, path.extname(file.originalname))
    const extension = path.extname(file.originalname);

    let prefix = 'File-';
    if (file.mimetype.startsWith('image/')) prefix = 'ProductImage-';
    else if (file.mimetype.startsWith('video/')) prefix = 'ProductVideo-';
    else prefix = 'ProductCSV-';

    cb(null, `${prefix}${uniqueSuffix}-${baseName}${extension}`);
  }
});


const fileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/jpg'
  ];

  const allowedVideoTypes = [
    'video/mp4',
    'video/mkv',
    'video/webm',
    'video/ogg'
  ];

  const allowedCsvTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel' 
  ];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedVideoTypes.includes(file.mimetype) ||
    allowedCsvTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only image (jpeg, png, gif, jpg), video (mp4, mkv, webm, ogg), and CSV files are allowed'
      ),
      false
    );
  }
};


const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

router.post(
  "/addVariantProduct",
  authentication,
  upload.fields([
    { name: 'ProductImages', maxCount: 1000 },
    { name: 'ProductVideos', maxCount: 5 },
  ]),
  (req, res) => {
    if (req.user.role == 'Company' || req.user.role == 'Admin') {
      return VariantProductController.addVariantProduct(req, res);
    }
   
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

  }
);

router.post(
  "/addVariantProductCSV",
  authentication,
  upload.fields([
    { name: 'ProductImages', maxCount: 10000 },
    { name: 'ProductVideos', maxCount: 1000 },
    { name: 'CSVFile', maxCount: 1 }
  ]),
  (req, res) => {
    if (req.user.role == 'Company' || req.user.role == 'Admin') {
      return VariantProductController.addVariantProductCSV(req, res);
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

  }
);

router.post(
  "/addMultipleVariantProduct",
  upload.fields([
    { name: 'ProductImages', maxCount: 10000 },
    { name: 'ProductVideos', maxCount: 1000 }
  ]),
  (req, res) => {
      return VariantProductController.addMultipleVariantProduct(req, res);

  }
);
router.post(
  "/previewVariantProductCSV",
  upload.fields([
    { name: 'CSVFile', maxCount: 1 }
  ]),
  (req, res) => {
      return VariantProductController.previewVariantProductCSV(req, res);
   
  }
);

router.get(
  "/getVariantProductCsv",
  (req, res) => {
    return VariantProductController.getVariantProductCsv(req, res);
  }
);
router.put("/UpdateVariantProduct", authentication, upload.array('ProductImages', 100), (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return VariantProductController.UpdateVariantProduct(req, res);
  }
 
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })


});
router.put("/UpdateProductDetail", authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return VariantProductController.UpdateProductDetail(req, res);
  }
 
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.put("/UpdateCommonImages", authentication, upload.array('ProductImages', 100), (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return VariantProductController.UpdateCommonImages(req, res);
  }
 
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.put("/UpdateCommonVideos", authentication, upload.array('ProductVideos', 10), (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return VariantProductController.UpdateCommonVideos(req, res);
  }

  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.delete("/DeleteProductOrVariants", authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return VariantProductController.DeleteProductOrVariants(req, res);
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.post("/ToggleProductOrVariants", authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return VariantProductController.ToggleProductOrVariants(req, res);
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.post('/getProductsById', (req, res) => {
  VariantProductController.getProductsById(req, res)
})

router.put('/updateVariantDetails', authentication, (req, res) => {
  if (req.user.role == 'Company' || req.user.role == 'Admin') {
    return VariantProductController.updateVariantDetails(req, res);
  }
  
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })


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
router.post("/addBatch", authentication, upload2.single('BatchLogo'), (req, res) => {

  if (req.user.role == 'Admin') {
    return VariantProductController.addBatch(req, res);
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.get("/getBatch", (req, res) => {
  return VariantProductController.getBatch(req, res)
});
router.put("/updateBatch", authentication, upload2.single('BatchLogo'), (req, res) => {
  if (req.user.role == 'Admin') {
    return VariantProductController.updateBatch(req, res);
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});
router.post("/EditBatchOfVariantProduct", authentication, (req, res) => {
   if (req.user.role == 'Company') {
    req.body.companyId = req.user.companyId
    return VariantProductController.EditBatchOfVariantProduct(req, res);
  }
  else if (req.user.role == 'Admin') {
    return VariantProductController.EditBatchOfVariantProduct(req, res);

  }
  return VariantProductController.EditBatchOfVariantProduct(req, res)
});

router.get('/suggest', searchSuggestions);
router.post('/getproductsbyes', getProductsById_ES);
router.get('/getwishlistofes', getWishlistES);

module.exports = router