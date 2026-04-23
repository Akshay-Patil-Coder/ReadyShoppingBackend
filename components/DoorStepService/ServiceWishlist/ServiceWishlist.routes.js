const express = require('express');
const router = express.Router()
const ServiceWishlistController = require('./ServiceWishlist.controller')

router.post("/addWishlistService", (req, res) => {
    return ServiceWishlistController.addWishlistService(req, res)
});
router.get("/getWishlist", (req, res) => {
    return ServiceWishlistController.getWishlist(req, res)
});
module.exports = router;