const express = require("express");
const multer = require("multer");
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dynamicCategoryController = require("./ProductCategories.controller");
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', '..', 'public', 'ProductCategories');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'ShoppingCategory-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));

    }
});


const upload = multer({ storage });

router.post('/addCategory', authentication, upload.single('image'), (req, res) => {
    if (req.user.role == 'Company'  || req.user.role == 'Admin') {  
        return dynamicCategoryController.addCategory(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
});


router.get('/getCategory', (req, res) => {
    dynamicCategoryController.getCategory(req, res);
});

router.get('/getCategoryTree', (req, res) => {
    dynamicCategoryController.getCategoryTree(req, res);
});
router.get('/getCategoryWithLeafNodes', (req, res) => {
    dynamicCategoryController.getCategoryWithLeafNodes(req, res);
});
router.get('/getCategoryWithHeadAndLeafParentNodes', (req, res) => {
    dynamicCategoryController.getCategoryWithHeadAndLeafParentNodes(req, res);
});
router.put('/updateCategory/:id', authentication, upload.single('image'), (req, res) => {
    if (req.user.role == 'Company' || req.user.role == 'Admin') {
        return dynamicCategoryController.updateCategory(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

router.post('/toggleCategoriesStatus', (req, res) => {
    return dynamicCategoryController.toggleCategoriesStatus(req, res);
});

router.delete('/deleteCategories', authentication, (req, res) => {
    if (req.user.role == 'Company' || req.user.role == 'Admin') {
        return dynamicCategoryController.deleteCategories(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

  
});

module.exports = router;
