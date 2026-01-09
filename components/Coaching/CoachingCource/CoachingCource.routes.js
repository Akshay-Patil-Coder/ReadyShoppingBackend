
const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const multer = require('multer')
const CoachingCourseController = require('./CoachingCourse.controller')
const { authentication } = require('../../Middleware/Middleware.controller')

const storage2 = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'public', 'CourseTemporarlyData');

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

router.post('/addCoachingCourse', upload2.fields([
    { name: 'CourseThumbnail', maxCount: 1 },
    { name: 'ContentVideos', maxCount: 100000 },
    { name: 'VideoAudioLanguages', maxCount: 10000000 },
    { name: 'VideoSubtitles', maxCount: 10000000 },
    { name: 'CertificateTemplate', maxCount: 1 }
]), (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourseController.addCoachingCourse(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.get('/getCoachingCourse', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourseController.getCoachingCourse(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.delete('/deleteCoachingCourse', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourseController.DeleteCoachingCourse(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/updateCourseDetail', upload2.fields([
    { name: 'CourseThumbnail', maxCount: 1 },
    { name: 'CertificateTemplate', maxCount: 1 }
]), (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourseController.UpdateCourseDetail(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/updatePlaylistHeading', upload2.fields([
    { name: 'ContentVideos', maxCount: 100000 },
    { name: 'VideoAudioLanguages', maxCount: 10000000 },
    { name: 'VideoSubtitles', maxCount: 10000000 },
]), (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourseController.UpdatePlaylistHeading(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/updateVideoAndQuizes', upload2.fields([
    { name: 'ContentVideos', maxCount: 100000 },
    { name: 'VideoAudioLanguages', maxCount: 10000000 },
    { name: 'VideoSubtitles', maxCount: 10000000 },
]), (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingCourseController.UpdateVideoAndQuizes(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.get('/getVideoContent',authentication,(req,res)=>{
    if(req.user.role === 'Admin' || req.user.role === 'User'){
         return CoachingCourseController.AccessCourseContent(req,res)
    }
    else if(req.user.role === 'Company'){
        if(req.user.companyId == req.query.companyId){
            return res.status(401).json({message:'you cannot access other data without authentication'})
        }
         return CoachingCourseController.AccessCourseContent(req,res)
    }
  
})


module.exports = router
