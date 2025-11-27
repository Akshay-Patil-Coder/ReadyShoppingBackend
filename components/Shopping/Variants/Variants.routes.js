const mongoose = require('mongoose')
const express = require('express')
const VariantController = require('./Variants.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

router.post("/addVariant", authentication, (req, res) => {
    if (req.user.role == 'Company' ||req.user.role == 'Admin') {
        return VariantController.addVariant(req, res)
    }
    
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

router.get('/getVariantsById', (req, res) => {
    VariantController.getVariantsById(req, res)
})
router.get('/getAvailableFilters', (req, res) => {
    VariantController.getAvailableFilters(req, res)
})
router.put('/updateVariantDetails', authentication, (req, res) => {
    if (req.user.role == 'Company' ||req.user.role == 'Admin') {
        return VariantController.updateVariantDetails(req, res)
    }
   
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})



module.exports = router