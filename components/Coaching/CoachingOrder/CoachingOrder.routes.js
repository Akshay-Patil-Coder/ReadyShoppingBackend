
const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const CoachingOrderController = require('./CoachingOrder.controller')
const { authentication } = require('../../Middleware/Middleware.controller')

router.post('/addCoachingCourseOrder', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingOrderController.addCoachingCourseOrder(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.get('/getCoachingCourseOrder', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingOrderController.getCoachingCourseOrder(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});

router.put('/updateCoachingPaymentStatus', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingOrderController.updateCoachingPaymentStatus(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/getTokenOfCourse', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingOrderController.getTokenOfCourse(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/changeStateOfCourseContent', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingOrderController.changeStateOfCourseContent(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.post('/generateCoachingCertificate', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingOrderController.generateCoachingCertificate(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.post('/verifyCertificate', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
    return CoachingGainerCompanyOrderController.verifyCertificate(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});

module.exports =


    module.exports = router
