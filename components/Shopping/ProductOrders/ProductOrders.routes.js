const express = require('express')
const router  = express.Router()
const productordersController = require('./ProductOrders.controller')
const { authentication } = require('../../Middleware/Middleware.controller')

router.post('/addorders',(req,res)=>{
    productordersController.addorders(req,res)
})

router.get('/getorders',(req,res)=>{
    productordersController.getorders(req,res)
})

router.get('/getorderdeatils',(req,res)=>{
    productordersController.getorderdeatils(req,res)
})

router.put('/updateorders/:_id',(req,res)=>{
    productordersController.upadteorders(req,res)
})

router.delete('/deleteorders/:id',(req,res)=>{
    productordersController.deleteorders(req,res)
})

module.exports = router
