const express = require('express')
const router = express.Router()
const cartsController = require('./ProductCart.controller')
const { authentication } = require('../../Middleware/Middleware.controller')


router.post('/addtocart',(req,res)=>{
    cartsController.addtocart(req,res)
})


router.get('/getCart',(req,res)=>{
    cartsController.getCart(req,res)
})
module.exports = router