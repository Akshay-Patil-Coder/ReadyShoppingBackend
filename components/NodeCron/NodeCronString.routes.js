const mongoose = require('mongoose')
const express = require('express')
const nodeCronController = require("./NodeCron.controller");

const router = express.Router()



router.post("/processOrders", async(req, res) => {
  return await nodeCronController.processOrders(req, res)
});

router.post("/processServiceOrders", async(req, res) => {
  return await nodeCronController.processServiceOrders(req, res)
});


module.exports = router