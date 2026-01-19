const express = require('express');
const router = express.Router();
const masteruserController = require('./Functionallity.controller');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'public', 'FunctionallityLogos');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'functionallity-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)).replace(/\s+/g, '-') + path.extname(file.originalname));
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


router.post('/addmasterusers', authentication, upload.single('FunctionallityLogo'), (req, res) => {
    if (req.user.role == 'Admin') {
        return masteruserController.addmasterusers(req, res);
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

router.get('/getmasterusers', (req, res) => {
    return masteruserController.getmasterusers(req, res);
});
router.put('/updatemasterusers/:id', authentication, upload.single('FunctionallityLogo'), (req, res) => {
    if (req.user.role == 'Admin') {
        return masteruserController.updatemasterusers(req, res);
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});


module.exports = router;
