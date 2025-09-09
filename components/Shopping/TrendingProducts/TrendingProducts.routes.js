const mongoose = require('mongoose')
const express = require('express')
const trendingproductsController = require('./TrendingProducts.controller')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

router.post("/addtrendingproducts", authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return trendingproductsController.addtrendingproducts(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})


router.get('/gettrendingproducts', (req, res) => {
  trendingproductsController.gettrendingproducts(req, res)
})

router.put('/deletetrendingproducts', authentication, (req, res) => {
  if (req.user.role === 'Admin' || req.user.role === 'Company') {
    return trendingproductsController.deletetrendingproducts(req, res)
  }
  res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })
})

// router.delete('/deletetrendingproductsList/:id',(req,res)=>{
//   trendingproductsController.deletetrendingproductsList(req,res)
// })

module.exports = router