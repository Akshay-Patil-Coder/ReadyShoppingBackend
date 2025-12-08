const express = require('express')
const router = express.Router()
const cartsController = require('./ProductCart.controller')
const { authentication } = require('../../Middleware/Middleware.controller')
const { authenticate } = require('passport')


router.post('/addtocart', authentication, (req, res) => {
    if (req.user.role == 'User') {
        return cartsController.addtocart(req, res)
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
module.exports = router