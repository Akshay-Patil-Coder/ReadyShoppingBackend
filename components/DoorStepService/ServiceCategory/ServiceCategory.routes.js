const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const serviceCategoryController = require('./ServiceCategory.controller')
const {authentication} = require('../middleware/middleware.controller')


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
  
      cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'ServiceCategory-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname)); 
    }
  });

 const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif','image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Only image files (jpeg, png, gif,jpg) are allowed'), false);
    }
    cb(null, true);
};

const upload= multer({ 
    storage: storage, 
    fileFilter: fileFilter 
});

router.post('/addServiceCategory',authentication, upload.single('serviceImage'), (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
      return  serviceCategoryController.addCategory(req, res);
      }
      res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});


router.get('/getServiceCategory', (req, res) => {
    serviceCategoryController.getCategory(req, res);
});

router.get('/getServiceCategoryTree', (req, res) => {
    serviceCategoryController.getCategoryTree(req, res);
});

router.put('/updateServiceCategory/:id',authentication, upload.single('serviceImage'), (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return serviceCategoryController.updateCategory(req, res);
        }
        res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});

router.post('/toggleServiceCategoryStatus',authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return  serviceCategoryController.toggleCategoriesStatus(req, res);
        }
        res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});

router.delete('/deleteServiceCategory/:id',authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return   serviceCategoryController.deleteCategories(req, res);
        }
        res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
});

module.exports = router;