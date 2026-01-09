const express = require('express');
const router = express.Router();
const CoachingProviderTypeController = require('./CoachingProviderType.controller');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'public', 'CourseProviderTypeImages');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'CourseProviderTypeImage-' + uniqueSuffix + path.basename(file.originalname, path.extname(file.originalname)) + path.extname(file.originalname));
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


router.post('/addcoachingProviderType',upload.single('CourseProviderTypeImage'), (req, res) => {
    //  if (req.user.role === 'Admin') {
        return CoachingProviderTypeController.addcoachingProviderType(req, res);
    //   }
      res.status(400).json({ message: "Authentication Failed only admin eligible to add data", success: false }) 
});

router.get('/getCoachingProviderType', (req, res) => {
    return CoachingProviderTypeController.getCoachingProviderType(req, res);
});
router.put('/updateCoachingProviderTypeDetails/:id',authentication,upload.single('CourseProviderTypeImage'), (req, res) => {
    if (req.user.role === 'Admin') {
        return CoachingProviderTypeController.updateCoachingProviderTypeDetails(req, res);
      }
      res.status(400).json({ message: "Authentication Failed only admin eligible to add data", success: false }) 
});

// router.delete('/deletemasterusers/:id', masteruserController.deletemasterusers);

module.exports = router;
