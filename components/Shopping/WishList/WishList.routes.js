const mongoose = require('mongoose')
const  express = require('express')
const WishListController  = require('./WishList.controller')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const { authentication } = require('../../Middleware/Middleware.controller')

router.post("/addWishlist",(req,res)=>{
    return   WishListController.addWishlist(req,res)
  });

router.get('/getWishlistById',(req,res)=>{
    WishListController.getWishlistById(req,res)
})




module.exports = router