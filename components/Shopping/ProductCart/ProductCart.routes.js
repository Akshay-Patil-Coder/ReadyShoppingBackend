const express = require('express')
const router = express.Router()
const cartsController = require('./ProductCart.controller')
const { authentication } = require('../../Middleware/Middleware.controller')
const { authenticate } = require('passport')


router.post('/addtocart', authentication, (req, res) => {
    if (req.user.role == 'User') {
        req.body.UserId = req.user.UserId
        req.body.companyId = req.user.companyId
        return cartsController.addtocart(req, res)
    }
    return res.status(400).json({ message: 'User Not Found', success: false })

})


router.get('/getCart', authentication, (req, res) => {
    if (req.user.role == 'User') {
        req.query.UserId = req.user.UserId
        req.query.companyId = req.user.companyId
        return cartsController.getCart(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
})

router.post('/proceedToPaymentForCart', authentication, (req, res) => {
    if (req.user.role == 'User') {
        req.body.UserId = req.user.UserId
        req.body.companyId = req.user.companyId
        return cartsController.proceedToPaymentForCart(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
})
router.post('/handlePaymentStatus', authentication, (req, res) => {
    if (req.user.role == 'User') {
        req.body.UserId = req.user.UserId
        req.body.companyId = req.user.companyId
        return cartsController.handlePaymentStatus(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.get('/getOrders', authentication, (req, res) => {
    if (req.user.role == 'User') {
        req.query.UserId = req.user.UserId
        req.query.companyId = req.user.companyId
        console.log(req.query,'req.user')
        return cartsController.getOrders(req, res)
    }
    if (req.user.role == 'Company') {
        req.query.companyId = req.user.companyId
        return cartsController.getAllOrders(req, res)
    }
    if (req.user.role == 'Admin') {
        return cartsController.getAllOrders(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.get('/getAllOrders', authentication, (req, res) => {
    if (req.user.role == 'Company') {
        req.query.companyId = req.user.companyId
        return cartsController.getAllOrders(req, res)
    }
    if (req.user.role == 'Admin') {
        return cartsController.getAllOrders(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
module.exports = router