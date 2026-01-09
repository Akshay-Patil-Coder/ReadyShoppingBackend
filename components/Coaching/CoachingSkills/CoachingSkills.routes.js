const express = require('express');
const router = express.Router();
const CoachingSkillsController = require('./CoachingSkills.controller')
const fs = require('fs');
const path = require('path');
const { authentication } = require('../../Middleware/Middleware.controller')

router.post('/addCoachingSkills', (req, res) => {
   return CoachingSkillsController.addCoachingSkills(req, res);
});

router.get('/getCoachingSkillByData', (req, res) => {
   return CoachingSkillsController.getCoachingSkillByData(req, res);
});
router.delete('/deleteCoachingSkills/:id', (req, res) => {
        return CoachingSkillsController.deleteCoachingSkills(req, res);
});
router.put('/updateCoachingSkillsDetail', (req, res) => {
   return CoachingSkillsController.updateCoachingSkillsDetail(req, res);
});
// router.delete('/deletemasterusers/:id', masteruserController.deletemasterusers);

module.exports = router;
