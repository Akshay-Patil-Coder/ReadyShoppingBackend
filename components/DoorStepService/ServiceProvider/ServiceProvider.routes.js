const mongoose = require('mongoose')
const express = require('express')
const ServiceProviderController = require('./ServiceProvider.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const serviceProviderController = require('./ServiceProvider.controller')
const router = express.Router()
const { authentication } = require('../middleware/middleware.controller')
const { success } = require('../paytm/paytm.controller')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'ServiceProviderImage');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'serviceProvider-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post("/addServiceProvider", authentication, upload.single('ProviderImage'), (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  ServiceProviderController.addServiceProvider(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});

router.get('/getServiceProviderByData', (req, res) => {
  ServiceProviderController.getServiceProviderByData(req, res)
})

router.put('/updateSubServiceList', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  ServiceProviderController.updateSubServiceList(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})

router.put('/updateHeadServiceList', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  ServiceProviderController.updateHeadServiceList(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.put('/updateServiceProviderDetail', authentication, upload.single('ProviderImage'), (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  ServiceProviderController.updateServiceProviderDetail(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.delete('/deleteServiceProvider/:id', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
  return  ServiceProviderController.deleteServiceProvider(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})

router.post('/loginServiceProvider', (req, res) => {
  ServiceProviderController.loginServiceProvider(req, res);
});

module.exports = router