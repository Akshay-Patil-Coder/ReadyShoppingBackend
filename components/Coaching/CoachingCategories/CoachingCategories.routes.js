const multer = require("multer");
const path = require("path");
const fs = require('fs');
const { authentication } = require('../../Middleware/Middleware.controller')
const express = require('express')
const router = express.Router()
const CoachingCategoriesController = require("./CoachingCategories.controller");

const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        const uploadDir = path.join(__dirname, '..', '..','public','CoachingCategoryImage');
        
        if(!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, {recursive:true})
            console.log("Upload directory created successfully.");
        }

        console.log("****uploadDir*****",uploadDir)
        cb(null, uploadDir);
    },

    filename: (req,file,cb)=>{
        const uniqueSuffix = Date.now()+'-'+Math.round(Math.random()*1E9)
        cb(null,'CoachingCategory-'+ uniqueSuffix + path.basename(file.originalname,path.extname(file.originalname)) + path.extname(file.originalname));
    }
})

const fileFilter = (req, file, cb) =>{
    const allowedTypes = ['image/jpeg','image/png','image/gif','image/jpg']

    if(!allowedTypes.includes(file.mimetype)){
        return cb(new Error('Only image files (jpeg,jpg,gif,png) are allowed'),false)
    }
    cb(null,true)
}

const upload = multer({
    storage:storage,
    fileFilter:fileFilter
})

router.post('/addCoachingCategory', upload.single('CoachingImage'),(req,res)=>{
    // if(req.user.role ==='Admin' || req.user.role === 'Company'){
        return CoachingCategoriesController.addCoachingCategory(req,res);
    // }
    // res.status(400).json({
    //     success:false,
    //     Message:"Authentication Failed only Admin and Company can add data"
    // })
})
// router.post('/addCoachingCategory',authentication, upload.single('CoachingImage'),(req,res)=>{
//     if(req.user.role ==='Admin' || req.user.role === 'Company'){
//         return CoachingCategoriesController.addCoachingCategory(req,res);
//     }
//     res.status(400).json({
//         success:false,
//         Message:"Authentication Failed only Admin and Company can add data"
//     })
// })

router.get('/getCoachingCategory', (req,res)=>{
    CoachingCategoriesController.getCoachingCategory(req,res);
})

router.get('/getCoachingCategoryTree', (req,res)=>{
    CoachingCategoriesController.getCoachingCategoryTree(req,res);
})

router.put('/updateCoachingCategory/:id', upload.single('CoachingImage'), (req,res)=>{
// router.put('/updateCoachingCategory/:id',authentication, upload.single('CoachingImage'), (req,res)=>{
    // if(req.user.role === 'Admin' || req.user.role ==='Company'){
       return CoachingCategoriesController.updateCoachingCategory(req,res);
    // }
    // res.status(400).json({
    //    success:false,
    //    Message:"Authentication Failed, Only Admin and Company can upadate" 
    // })
})

router.post('/toggleCoachingCategoryStatus', (req,res)=>{
// router.post('/toggleCoachingCategoryStatus',authentication, (req,res)=>{
    // if(req.user.role === 'Admin' || req.user.role === 'Company'){
        return CoachingCategoriesController.toggleCoachingCategoryStatus(req,res)
    // }

    // return res.status(404).json({
    //     success:false,
    //     Message:"Authentication Failed, Only Admin and Company Cand Toggle Status"
    // })
} )

router.delete('/deleteCoachingCategory/:id', (req,res)=>{
// router.delete('/deleteCoachingCategory',authentication, (req,res)=>{
    // if(req.user.role === "Admin" || req.user.role === "Company"){
        return CoachingCategoriesController.deleteCoachingCategory(req,res)
    // }
    // return res.status(404).json({
    //     success:false,
    //     Message:"Authentication Failed, only Admin and Company can Delete "
    // })
})

module.exports = router;