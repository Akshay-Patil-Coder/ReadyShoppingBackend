const express = require('express')
const router = express.Router()
const cartsController = require('./ProductCart.controller')
const { authentication } = require('../../Middleware/Middleware.controller')


router.post('/addtocart',(req,res)=>{
    cartsController.addtocart(req,res)
})

router.put('/updatecart/:id',(req,res)=>{
    cartsController.updatecart(req,res)
})

router.delete('/deletetocart/:id',(req,res)=>{
    cartsController.deletetocart(req,res)
})

router.get('/gettocart',(req,res)=>{
    cartsController.gettocart(req,res)
})
module.exports = router