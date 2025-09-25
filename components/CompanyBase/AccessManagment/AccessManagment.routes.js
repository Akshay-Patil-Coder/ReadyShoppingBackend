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
router.put('/deleteFunctionallity', async (req, res) => {
        return await adminUserController.deleteFunctionallity(req, res);
});

router.delete('/deleteadminusers/:id', async (req, res) => {
        return await adminUserController.deleteadminusers(req, res);
});

module.exports = router;
