const mongoose = require('mongoose')
const express = require('express')
const nodeCronController = require("./NodeCron.controller");

const router = express.Router()



router.post("/processOrders", async(req, res) => {
  return await nodeCronController.processOrders(req, res)
});


module.exports = router