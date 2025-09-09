const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const serviceBannersController = require('./ServiceBanners.controller')
const { authentication } = require('../middleware/middleware.controller')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'serviceBanner-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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

router.post('/addbanner', authentication, upload.single('BannerImage'), (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return serviceBannersController.addbanner(req, res)
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.get('/getBannersById', (req, res) => {
    serviceBannersController.getBannersById(req, res)
})
router.put('/updateProductsById', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return serviceBannersController.updateProductsById(req, res)
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.put('/updateBannerDetails', authentication, upload.single('BannerImage'), (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return serviceBannersController.updateBannerDetails(req, res)
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.delete('/deleteBanner', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company') {
        return serviceBannersController.deleteBanner(req, res)
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})



module.exports = router