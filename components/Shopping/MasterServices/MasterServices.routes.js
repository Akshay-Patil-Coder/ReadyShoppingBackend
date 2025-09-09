const mongoose = require('mongoose')
const express = require('express')
const multer = require("multer");
const path = require('path')
const fs = require('fs')
const router = express.Router()
const servicesController = require('./MasterServices.controller')
const { authentication } = require('../../Middleware/Middleware.controller')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../public/master_services');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`); 
    }
});

const upload = multer({ storage });

router.post('/addservices', upload.single('image'),(req,res)=>{
    servicesController.addservices(req,res)
})

router.get('/getservices',(req,res)=>{
    servicesController.getservices(req,res)
})
router.get('/getservicesTree',(req,res)=>{
    servicesController.getservicesTree(req,res)
})
router.post('/toggleservicesStatus',(req,res)=>{
    servicesController.toggleservicesStatus(req,res)
})
router.delete('/deleteservices/:id',(req,res)=>{
    servicesController.deleteservices(req,res)
})
router.put('/updateservices/:id',upload.single('image'),(req,res)=>{
    servicesController.updateservices(req,res)
})


module.exports = router