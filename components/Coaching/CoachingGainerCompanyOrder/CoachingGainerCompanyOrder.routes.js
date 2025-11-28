
const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const CoachingGainerCompanyOrderController = require('./CoachingGainerCompanyOrder.controller')
const { authentication } = require('../../Middleware/Middleware.controller')


router.post('/requestToOrder',(req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.addCoachingGainerCompanyOrder(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/updateOrderNegotiatePayment',(req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.updateCoachingNegotiatePayment(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.get('/generateBlankCSVWithPredifinedPassword', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.generateBlankCSVForEmployessListWithPredifinedEmailAndPassword(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.get('/generateBlankCSVWithAutomaticPassword', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.generateBlankCSVForEmployessListWithAutomaticIdAndPassword(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.post('/uploadCSvWithPredifinedPassword', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.uploadEmployeesListCsvForPredifinedEmailAndPassword(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

}); 
router.post('/uploadCSvWithAutomaticPassword', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.uploadEmployeesListCsvForAutomaticEmailAndPassword(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.post('/employeeLogin', (req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.employeeLoginSystem(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.get('/getCoachingCourse',(req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.getCoachingCourse(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.put('/changeStateOfCourseContent',(req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.changeStateOfCourseContent(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.post('/generateCoachingCertificate',(req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.generateCoachingCertificate(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});
router.post('/verifyCertificate',(req, res) => {
    // if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.role === 'Service Provider') {
        return CoachingGainerCompanyOrderController.verifyCertificate(req, res)
    // }
    // res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

});

module.exports = router
