
const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const multer = require('multer')
const CoachingCourceController = require('./CoachingCource.controller')
const { authentication } = require('../../Middleware/Middleware.controller')

const storage2 = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'public', 'CourceTemporarlyData');

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

router.post('/addCoachingCource', upload2.fields([
    { name: 'CourceThumbnail', maxCount: 1 },
    { name: 'ContentVideos', maxCount: 100000 },
    { name: 'VideoAudioLanguages', maxCount: 10000000 },
    { name: 'VideoSubtitles', maxCount: 10000000 },
    { name: 'CertificateTemplate', maxCount: 1 }
]), (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourceController.addCoachingCourse(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.get('/getCoachingCource', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourceController.getCoachingCource(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.delete('/deleteCoachingCource', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourceController.DeleteCoachingCource(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/updateCourceDetail', upload2.fields([
    { name: 'CourceThumbnail', maxCount: 1 },
    { name: 'CertificateTemplate', maxCount: 1 }
]), (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourceController.UpdateCourceDetail(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/updatePlaylistHeading', upload2.fields([
    { name: 'ContentVideos', maxCount: 100000 },
    { name: 'VideoAudioLanguages', maxCount: 10000000 },
    { name: 'VideoSubtitles', maxCount: 10000000 },
]), (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourceController.UpdatePlaylistHeading(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/updateVideoAndQuizes', upload2.fields([
    { name: 'ContentVideos', maxCount: 100000 },
    { name: 'VideoAudioLanguages', maxCount: 10000000 },
    { name: 'VideoSubtitles', maxCount: 10000000 },
]), (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourceController.UpdateVideoAndQuizes(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.get('/getVideoContent',authentication,(req,res)=>{
    if(req.user.role === 'Admin' || req.user.role === 'User'){
         return CoachingCourceController.AccessCourceContent(req,res)
    }
    else if(req.user.role === 'Company'){
        if(req.user.companyId == req.query.companyId){
            return res.status(401).json({message:'you cannot access other data without authentication'})
        }
         return CoachingCourceController.AccessCourceContent(req,res)
    }
  
})




// router.get('/getServiceProductByData', (req, res) => {
//     CoachingCourceController.getServiceProductByData(req, res);
// });


// router.put('/updateSericeParts', authentication, (req, res) => {
//     if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
//         return CoachingCourceController.updateServiceParts(req, res)
//     }
//     res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

// })

// router.delete('/deleteServiceProducts/:id', authentication, (req, res) => {
//     if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
//         return CoachingCourceController.deleteServiceProducts(req, res);
//     }
//     res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

// });
// router.put('/deleteServiceImage/:id', authentication, (req, res) => {
//     if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
//         return CoachingCourceController.deleteServiceImage(req, res);
//     }
//     res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

// });

// router.get('/getserviceproducts', (req, res) => {
//     CoachingCourceController.getproducts(req, res);
// });
module.exports = router
