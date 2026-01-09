const express = require('express')
const router = express.Router()
const serviceOrders = require('./ServiceOrder.controller')


router.post('/addorders',(req,res)=>{
    serviceOrders.addorders(req,res)
})

router.get('/getorders',(req,res)=>{
    console.log("ioioi getorders")
    serviceOrders.getorders(req,res)
})

router.put('/updateorders/:_id',(req,res)=>{
    serviceOrders.upadteorders(req,res)
})

router.put('/updateScheduleTime',(req,res)=>{
    serviceOrders.updateScheduleTime(req,res)
})

router.delete('/deleteorders/:id',(req,res)=>{
    serviceOrders.deleteorders(req,res)
})

module.exports = router