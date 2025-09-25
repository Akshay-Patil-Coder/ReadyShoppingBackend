const mongoose = require('mongoose')
const express = require('express')
const trendingproductsController = require('./TrendingProducts.controller')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

router.post("/addtrendingproducts", (req, res) => {
    return trendingproductsController.addtrendingproducts(req, res)
})


router.get('/gettrendingproducts', (req, res) => {
  trendingproductsController.gettrendingproducts(req, res)
})

router.put('/deletetrendingproducts', (req, res) => {
    return trendingproductsController.deletetrendingproducts(req, res)
})

// router.delete('/deletetrendingproductsList/:id',(req,res)=>{
//   trendingproductsController.deletetrendingproductsList(req,res)
// })

module.exports = router