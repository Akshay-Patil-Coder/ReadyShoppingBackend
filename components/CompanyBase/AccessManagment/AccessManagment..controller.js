const mongoose = require('mongoose');
const adminuserschema = require('./AccessManagment.model');
const Company = require('../Company/Company.model');


module.exports = {
    addadminusers: async (req, res) => {
        try {
            let { companyId, assignvalues } = req.body;
            console.log(req.body);
    
            const findata = await adminuserschema.findOne({ companyId });
    
            if (!findata) {
                const add = new adminuserschema(req.body);
                const data = await add.save();
    
                res.status(200).json({
                    success: true,
                    message: "Successfully added",
                    data: data
                });
            } else {
                let updatedResult = await adminuserschema.findOneAndUpdate(
                    { companyId },
                    { $addToSet: { assignvalues: { $each: assignvalues } } },
                    { new: true } 
                );
    
                res.status(200).json({
                    success: true,
                    message: "Successfully added",
                    data: updatedResult
                });
            }
    
        } catch (error) {
            res.status(400).json({
                success: false,
                message: "Unsuccessfully added",
                error: error.message
            });
        }
    },
    
    getadminusers: async (req, res) => {
        try {
            let query = {};
            if(req.query.companyId){
                query.companyId =  mongoose.Types.ObjectId.createFromHexString(req.query.companyId)
            }

            const users = await adminuserschema.find(query)
                .populate({
                    path: "assignvalues",
                    model: "masterusers"
                });
            const companyData = await Company.find({_id:req.query.companyId})
               

            res.status(200).json({
                success: true,
                message: users.length ? "Users fetched successfully" : "No users found",
                data: users,
                companyData:companyData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching users",
                error: error.message
            });
        }
    },

    deleteFunctionallity: async (req, res) => {
        try {
            let  {companyId,assignvalues}= req.body;
            if(!companyId || !assignvalues){
              response.status(400).json({message:"please provide required data",success:false})
              return;
            }
              let updatedResult = await adminuserschema.findOneAndUpdate(
                  { companyId: companyId },
                  { $pull: { assignvalues: { $in: assignvalues } } },
                  { new: true }
              );
              res.status(200).json({
                  success: true,
                  message: "Successfully deleted",
                  data: updatedResult
              });
          } catch (error) {
              res.status(500).json({
                  success: false,
                  message: "Unsuccessfully deleted",
                  error: error.message
              });
          }
    },

    deleteadminusers: async (req, res) => {
        try {
            const data = await adminuserschema.findByIdAndDelete(req.params.id);

            res.status(200).json({
                success: true,
                message: "Successfully deleted",
                data: data
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Unsuccessfully deleted",
                error: error.message
            });
        }
    },
    getadminusersforallcompany:async(req,resp)=>{
        try {
            const data = await  adminuserschema.aggregate([
                {
                    $lookup: {
                        from: "companies",
                        localField: "companyId",
                        foreignField: "_id",
                        as: "CompanyData"
                    }
                },
                {
                    $lookup: {
                        from: "masterusers",
                        localField: "assignvalues",
                        foreignField: "_id",
                        as: "assignValues"
                    }
                },
            ])
            return resp.status(200).json({data:data, success: true });

        } catch (error) {
            return resp.status(404).json({ message: 'Something went wrong', success: false, error: error.message });
            
        }
    }
};
