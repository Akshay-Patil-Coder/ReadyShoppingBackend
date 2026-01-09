const fs = require('fs');
const path = require('path');
const CoachingSkillsModel = require('./CoachingSkills.model');
const mongoose = require('mongoose');

module.exports = {

    addCoachingSkills: async (req, res) => {
        try {
            const { SkillName, HeadCourseCatId,SubCourseCatId,companyId} = req.body;
            console.log(req.body,'body')
            if (!SkillName || !HeadCourseCatId || !SubCourseCatId || !companyId) {
                res.status(400).json({ message: 'please filled all fields', success: false })
            }
            const CourseSkillData = {
                SkillName,
                HeadCourseCatId,
                SubCourseCatId,
                companyId
            }
           
            const newCoachingSkills = new CoachingSkillsModel(CourseSkillData);

            const savedCoachingSkills = await newCoachingSkills.save();

            if (!savedCoachingSkills) {
               
                return res.status(400).json({ message: 'Something went wrong while saving the coaching skill', success: false });
            }

            res.status(200).json({
                success: true,
                message: "skills successfully added",
                data: savedCoachingSkills
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message,message:"Internl Server Error" });
        }
    },

    getCoachingSkillData: async (matchCondition) => {
         return await CoachingSkillsModel.aggregate([
             { $match: matchCondition },
             {
                 $lookup: {
                     from: "coachingcategories",
                     localField: "HeadCourseCatId",
                     foreignField: "_id",
                     as: "HeadCoachingCategories",
                 }
             },
             {
                 $lookup: {
                     from: "coachingcategories",
                     localField: "SubCourseCatId",
                     foreignField: "_id",
                     as: "SubCoachingCategories",
                 }
             },
         ]);
     },
 
     getCoachingSkillByData: async (req, res) => {
         const { HeadCourseCatId, SubCourseCatId, companyId, SkillId } = req.query;
 
         try {
             let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };
 
             if (HeadCourseCatId) {
                 if (!mongoose.Types.ObjectId.isValid(HeadCourseCatId)) {
                     return res.status(400).json({ message: 'Invalid ID format', success: false });
                 }
                 matchCondition.HeadCourseCatId = { $in: [mongoose.Types.ObjectId.createFromHexString(HeadCourseCatId)] };
             }
            
             if (SubCourseCatId) {
                 if (!mongoose.Types.ObjectId.isValid(SubCourseCatId)) {
                     return res.status(400).json({ message: 'Invalid ID format', success: false });
                 }
                 matchCondition.SubCourseCatId = { $in: [mongoose.Types.ObjectId.createFromHexString(SubCourseCatId)] };
             }
            
             if (SkillId) {
                 if (!mongoose.Types.ObjectId.isValid(SkillId)) {
                     return res.status(400).json({ message: 'Invalid ID format', success: false });
                 }
                 matchCondition._id = mongoose.Types.ObjectId.createFromHexString(SkillId);
             }
 
             const data = await module.exports.getCoachingSkillData(matchCondition);
 
             if (data.length === 0) {
                 return res.status(404).json({ message: 'No skill Found', success: false });
             }
 
             return res.status(200).json({ data: data, success: true,message:"skills fetched" });
 
         } catch (error) {
             res.status(400).json({ error: error.message, success: false,message:"Interna Server Error" });
         }
     },

  deleteCoachingSkills: async (req, resp) => {
         try {
             if (!req.params.id) {
                 return resp.status(400).json({ message: "please provide id of skill", success: false })
             }
             const coachingskillsdata = await CoachingSkillsModel.findById(req.params.id)
             if (coachingskillsdata) {
                 const result = await CoachingSkillsModel.deleteOne({ _id: req.params.id })
                 if (!result) {
                     return resp.status(400).json({ message: "Coaching skill cannot be deleted", success: false })
                 }
                 // const deleteServiceProduct = await serviceProductsModel.serviceProductsModel.deleteMany({ ProviderId: req.params.id })
 
                 // const deleteServiceAppointment = await ServiceAppointmentModel.ServiceAppointmentModel.deleteMany({ ServiceProviderId: req.params.id })
 
 
                 return resp.status(200).json({ message: "Coaching skill deleted", success: true, data: result })
             }
             else {
                 return resp.status(400).json({ message: "please cannot found", success: false })
             }
 
 
         } catch (error) {
             return resp.status(400).json({ error: error.message, success: false ,message:'internal Server Error'});
 
         }
     },
     updateCoachingSkillsDetail:async (req,resp)=>{
        try {
            let {SkillId,SkillName}= req.body;
            let companyId = req.query.companyId;
            console.log(SkillId,SkillName,companyId)
            if(!SkillId || !SkillName || !companyId){
            return resp.status(400).json({ message:'please provide all data', success: false });

            }
            let updateResult = await CoachingSkillsModel.findOneAndUpdate({
               companyId:companyId,_id:SkillId
            },{
                $set:{
                    SkillName:SkillName
                }
            })
            if(!updateResult){
            return resp.status(400).json({ message:'data not updated', success: false });
            }
            return resp.status(200).json({ message:'data updated', success: true,data:updateResult });
            
        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false ,message:"Internal Server Error"});
            
        }
     }
};
