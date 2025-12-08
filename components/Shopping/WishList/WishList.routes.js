const mongoose = require('mongoose')
const express = require('express')
const WishListController = require('./WishList.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

router.post("/addWishlist", authentication, (req, res) => {
  if (req.user.role == 'User') {
    return WishListController.addWishlist(req, res)
  }
  return res.status(400).json({ message: 'User Not Found', success: false })

});

router.get('/getWishList', authentication, (req, res) => {
  if (req.user.role == 'User') {
  return WishListController.getWishList(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})

router.post('/proceedToPaymentForWishList', authentication, (req, res) => {
   if (req.user.role == 'User') {
  return WishListController.proceedToPaymentForWishList(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})

module.exports = router
