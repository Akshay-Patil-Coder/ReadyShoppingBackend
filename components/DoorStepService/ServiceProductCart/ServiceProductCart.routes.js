const express = require('express')
const router = express.Router()
const serviceProductCart = require('./ServiceProductCart.controller')


router.post('/addServiceToCart',(req,res)=>{
    serviceProductCart.addServiceToCart(req,res)
})

router.post('/proceedToPaymentForServiceCart',(req,res)=>{
    serviceProductCart.proceedToPaymentForServiceCart(req,res)
})

router.post('/handleServicePaymentStatus',(req,res)=>{
    serviceProductCart.handleServicePaymentStatus(req,res)
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