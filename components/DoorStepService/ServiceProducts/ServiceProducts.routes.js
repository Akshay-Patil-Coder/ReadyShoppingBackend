
const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const multer = require('multer')
const serviceController = require('./ServiceProducts.controller');
const { authentication } = require('../middleware/middleware.controller')
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'serviceProduct-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post('/addserviceproduct', authentication, upload.array('serviceImages', 10), (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return serviceController.addserviceproduct(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.post('/generateBlankCSVServiceProducts', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
   return serviceController.generateBlankCSVServiceProducts(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});

const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
});
const upload2 = multer({ storage: storage2 })
router.post('/uploadServiceProductsCsv', authentication, upload2.fields([
  { name: 'csvFile', maxCount: 1 },
  { name: 'serviceImages', maxCount: 10 }
]), (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return serviceController.uploadServiceProductsCsv(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});

router.get('/getServiceProductByData', (req, res) => {
  serviceController.getServiceProductByData(req, res);
});

router.put('/updateServiceProducts', authentication, upload.array('serviceImages', 10), (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return serviceController.updateServiceProducts(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.put('/updateSericeParts', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return serviceController.updateServiceParts(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})

router.delete('/deleteServiceProducts/:id', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return serviceController.deleteServiceProducts(req, res);
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/deleteServiceImage/:id', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return serviceController.deleteServiceImage(req, res);
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});

router.get('/getserviceproducts', (req, res) => {
  serviceController.getproducts(req, res);
});
module.exports = router
