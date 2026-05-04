'use strict';

const express  = require('express');
const router   = express.Router();
const ctrl     = require('./CoachingCart.controller');
const {  authentication} = require('../../Middleware/Middleware.controller');

router.get('/cart',  authentication, ctrl.getCoachingCart);
router.post('/cart', authentication, ctrl.addCourseToCart);


router.post('/checkout/cart',   authentication, ctrl.proceedToPaymentForCoachingCart);
router.post('/checkout/single', authentication, ctrl.proceedToPaymentForSingleCourse);

router.post('/handlePaymentStatus', ctrl.handleCoachingPaymentStatus);

router.get('/orders',     authentication, ctrl.getCoachingOrders);
router.get('/orders/all', authentication, ctrl.getAllCoachingOrders);

module.exports = router;