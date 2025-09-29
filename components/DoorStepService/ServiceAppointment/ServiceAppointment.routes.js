const express = require('express')
const router = express.Router()
const serviceAppointment = require('./ServiceAppointment.controller')
const { authentication } = require('../../Middleware/Middleware.controller')


router.post('/addAppointments', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.Role === 'Service Provider') {
        return serviceAppointment.addAppointments(req, res)
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})

router.put('/updateTimeSlotsBooking',authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.Role === 'Service Provider') {
        return serviceAppointment.updateTimeSlotsBooking(req, res)
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.delete('/deleteTimeSlotsBooking', authentication, (req, res) => {
    if (req.user.role === 'Admin' || req.user.role === 'Company' || req.user.Role === 'Service Provider') {
        return serviceAppointment.deleteTimeSlotsBooking(req, res)
    }
    res.status(400).json({ message: "Authentication Failed only admin or company eligible to add data", success: false })

})
router.get('/getAppointments', (req, res) => {
    serviceAppointment.getAppointments(req, res)
})

module.exports = router