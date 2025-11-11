const mongoose = require('mongoose')
const  express = require('express')
const VariantController  = require('./Variants.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

router.post("/addVariant",(req,res)=>{
    return   VariantController.addVariant(req,res)
  });

router.get('/getVariantsById',(req,res)=>{
    VariantController.getVariantsById(req,res)
})
router.get('/getAvailableFilters',(req,res)=>{
    VariantController.getAvailableFilters(req,res)
})
router.put('/updateVariantDetails',(req,res)=>{
    return   VariantController.updateVariantDetails(req,res)
})



module.exports = router