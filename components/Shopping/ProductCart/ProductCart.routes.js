const express = require('express')
const router = express.Router()
const cartsController = require('./ProductCart.controller')
const { authentication } = require('../../Middleware/Middleware.controller')


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

router.post('/proceedToPaymentForCart', (req, res) => {
    if (req.user.role == 'User') {
        req.body.UserId = req.user.UserId
        req.body.companyId = req.user.companyId
        return cartsController.proceedToPaymentForCart(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
})
router.post('/handlePaymentStatus', (req, res) => {
    if (req.user.role == 'User') {
        req.body.UserId = req.user.UserId
        req.body.companyId = req.user.companyId
        return cartsController.handlePaymentStatus(req, res)
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
module.exports = router