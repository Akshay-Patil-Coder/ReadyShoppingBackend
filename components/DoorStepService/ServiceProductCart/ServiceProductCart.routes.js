const express = require('express')
const router = express.Router()
const serviceProductCart = require('./ServiceProductCart.controller')


router.post('/addtocart',(req,res)=>{
    serviceProductCart.addtocart(req,res)
})

router.put('/updateCartServiceParts',(req,res)=>{
    serviceProductCart.updateCartServiceParts(req,res)
})

router.put('/deletetocart',(req,res)=>{
    console.log("^^^^^^^",)
    serviceProductCart.deletetocart(req,res)
})

router.get('/gettocart',(req,res)=>{
    serviceProductCart.gettocart(req,res)
})
module.exports = router