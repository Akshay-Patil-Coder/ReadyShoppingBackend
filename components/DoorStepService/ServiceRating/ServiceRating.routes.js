const mongoose = require('mongoose')
const express = require('express')
const ServiceReviewController = require('./ServiceRating.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')




router.post("/addServiceReview", authentication, (req, res) => {
  if (req.user.role == 'User') {
    return ServiceReviewController.addServiceReview(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

router.delete('/DeleteReview', authentication, (req, res) => {
  if (req.user.role == 'Company') {
    return ServiceReviewController.DeleteReview(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })
})

router.put('/MakeResponseReview', authentication, (req, res) => {
  if (req.user.role == 'User') {
    return ServiceReviewController.MakeResponseReview(req, res)
  }
  return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

})
router.get('/getReview', (req, res) => {
  return ServiceReviewController.getReview(req, res)
})


module.exports = router