const express = require('express')
const router = express.Router()
const cartsController = require('./ProductCart.controller')
const { authentication } = require('../../Middleware/Middleware.controller')


router.post('/addtocart', authentication, (req, res) => {
    if (req.user.role == 'User') {
        return cartsController.addtocart(req, res)
    }
    return res.status(400).json({ message: 'User Not Found', success: false })
})
router.post('/proceedToPaymentForSingleProduct', authentication, (req, res) => {
    if (req.user.role == 'User') {
        return cartsController.proceedToPaymentForSingleProduct(req, res)
    }
    return res.status(400).json({ message: 'User Not Found', success: false })
})
router.get('/getCart', authentication, (req, res) => {
    if (req.user.role == 'User') {
        return cartsController.getCart(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
})

router.post('/proceedToPaymentForCart', authentication, (req, res) => {
    if (req.user.role == 'User') {
        return cartsController.proceedToPaymentForCart(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
})
router.post('/handlePaymentStatus',  (req, res) => {
        return cartsController.handlePaymentStatus(req, res)

})
router.get('/getOrders', authentication, (req, res) => {
    if (req.user.role == 'User' || req.user.role == 'Company' ||req.user.role == 'Admin' ) {
        return cartsController.getOrders(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.get('/getAllOrders', authentication, (req, res) => {
    if (req.user.role == 'Company' || req.user.role == 'Admin') {
        return cartsController.getAllOrders(req, res)
    }
    
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
})
router.post('/requestOtp/:orderId/:productId', authentication, (req, res) => {
    cartsController.requestOtp(req, res)
})
router.post('/verifyOtpAndComplete/:orderId/:productId', authentication, (req, res) => {
    cartsController.verifyOtpAndComplete(req, res)
})
router.post('/resendOtp/:orderId/:productId', authentication, (req, res) => {
    cartsController.resendOtp(req, res)
})
router.post('/updateServiceStatus/:orderId/:productId', authentication, (req, res) => {
    cartsController.updateServiceStatus(req, res)
})
router.post('/:orderId/products/:productId/request-otp', authentication, cartsController.requestOtp);
router.post('/:orderId/products/:productId/resend-otp',  authentication, cartsController.resendOtp);
router.post('/:orderId/products/:productId/verify-otp',  authentication, cartsController.verifyOtpAndComplete);
 
router.post('/:orderId/request-otp', authentication, cartsController.requestOtpFullOrder);
router.post('/:orderId/resend-otp',  authentication, cartsController.resendOtpFullOrder);
router.post('/:orderId/verify-otp',  authentication, cartsController.verifyOtpFullOrder);
module.exports = router