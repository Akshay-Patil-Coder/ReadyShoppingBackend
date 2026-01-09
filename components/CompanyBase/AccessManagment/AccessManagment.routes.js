const express = require('express');
const router = express.Router();
const { authentication } = require('../../Middleware/Middleware.controller')

const adminUserController = require('./AccessManagment..controller');


router.post('/addadminusers', (req, res) => {
    return adminUserController.addadminusers(req, res);
});

router.get('/getadminusers', async (req, res) => {
    await adminUserController.getadminusers(req, res);
});
router.get('/getadminusersforallcompany', async (req, res) => {
    await adminUserController.getadminusersforallcompany(req, res);
});
router.put('/deleteFunctionallity', authentication, async (req, res) => {
    if (req.user.role == 'Company' ||req.user.role == 'Admin') {
        return await adminUserController.deleteFunctionallity(req, res);
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

router.delete('/deleteadminusers/:id', authentication, async (req, res) => {
    if (req.user.role == 'Admin') {
        return await adminUserController.deleteadminusers(req, res);
    }
    return res.status(400).json({ message: 'Authenticate User Not Found To Make Operation', success: false })

});

module.exports = router;
