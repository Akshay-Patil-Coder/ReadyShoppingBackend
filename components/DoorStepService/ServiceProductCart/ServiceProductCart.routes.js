const express = require('express')
const router = express.Router()
const serviceProductCart = require('./ServiceProductCart.controller')


router.post('/addServiceToCart',(req,res)=>{
    serviceProductCart.addServiceToCart(req,res)
})

router.post('/proceedToPaymentForServiceCart',(req,res)=>{
    serviceProductCart.proceedToPaymentForServiceCart(req,res)
})
router.post('/proceedToPaymentForSingleService',(req,res)=>{
    serviceProductCart.proceedToPaymentForSingleService(req,res)
})
router.post('/handleServicePaymentStatus',(req,res)=>{
    serviceProductCart.handleServicePaymentStatus(req,res)
})
router.get('/getServiceCart',(req,res)=>{
    serviceProductCart.getServiceCart(req,res)
})
router.get('/getServiceOrders',(req,res)=>{
    serviceProductCart.getServiceOrders(req,res)
})
router.get('/getAllServiceOrders',(req,res)=>{
    serviceProductCart.getAllServiceOrders(req,res)
})
module.exports = router