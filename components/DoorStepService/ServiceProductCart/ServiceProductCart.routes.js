const express = require('express')
const router = express.Router()
const serviceProductCart = require('./ServiceProductCart.controller')
const { authentication } = require('../../Middleware/Middleware.controller')


router.post('/addServiceToCart', (req, res) => {
    serviceProductCart.addServiceToCart(req, res)
})

router.post('/proceedToPaymentForServiceCart', (req, res) => {
    serviceProductCart.proceedToPaymentForServiceCart(req, res)
})
router.post('/proceedToPaymentForSingleService', (req, res) => {
    serviceProductCart.proceedToPaymentForSingleService(req, res)
})
router.post('/handleServicePaymentStatus', (req, res) => {
    serviceProductCart.handleServicePaymentStatus(req, res)
})
router.get('/getServiceCart', (req, res) => {
    serviceProductCart.getServiceCart(req, res)
})
router.get('/getServiceOrders', (req, res) => {
    serviceProductCart.getServiceOrders(req, res)
})
router.get('/getAllServiceOrders', (req, res) => {
    serviceProductCart.getAllServiceOrders(req, res)
})
router.post('/requestOtp/:orderId/:serviceId', authentication, (req, res) => {
    serviceProductCart.requestOtp(req, res)
})
router.post('/verifyOtpAndComplete/:orderId/:serviceId', authentication, (req, res) => {
    serviceProductCart.verifyOtpAndComplete(req, res)
})
router.post('/resendOtp/:orderId/:serviceId', authentication, (req, res) => {
    serviceProductCart.resendOtp(req, res)
})
router.post('/updateServiceStatus/:orderId/:serviceId', authentication, (req, res) => {
    serviceProductCart.updateServiceStatus(req, res)
})
module.exports = router