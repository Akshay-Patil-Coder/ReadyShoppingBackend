const fs = require('fs');
const path = require('path');
const master_services = require('./MasterServices.model');
const { default: mongoose } = require('mongoose');

module.exports = {
   addservices: async (req, res) => {
        try {
            let { 
                companyId, 
                categoryId, 
                parentServiceId, 
                serviceCategoryLevel = 0, 
                service_name, 
                service_type, 
                description, 
                price, 
                duration, 
                isActive 
            } = req.body;

            let imageName = '';

            if (req.file) {
                const fileExtension = req.file.originalname.split('.').pop();
                imageName = `${service_name}.${fileExtension}`;
                const oldPath = path.join(req.file.destination, req.file.filename);
                const newPath = path.join(req.file.destination, imageName);

                console.log("Old Path:", oldPath);
                console.log("New Path:", newPath);

                fs.renameSync(oldPath, newPath);
            }

            if (serviceCategoryLevel != 0 && !parentServiceId) {
                return res.status(400).send({ 
                    success: false, 
                    message: "Please provide parentServiceId for subcategories" 
                });
            }

            const parentServiceIdObj = parentServiceId ? mongoose.Types.ObjectId.createFromHexString(parentServiceId) : null; // Changed to new ObjectId()

            const newService = new master_services({
                companyId,
                categoryId,
                service_name,
                // service_type,
                price: price ? Number(price) : undefined,
                parentServiceId: parentServiceIdObj,
                serviceCategoryLevel,
                imageName,
                duration,
                description,
                isActive
            });

            const data = await newService.save();

            res.status(200).send({
                success: true,
                message: "Successfully added",
                data: data
            });
        } catch (error) {
            res.status(500).send({
                success: false,
                message: "Unsuccessfully added service",
                error: error.message
            });
        }
  },

    getservices: async (req, res) => {
        try {
            const { parentServiceId, companyId, service_name } = req.query;
        
            const query = {
                parentServiceId: parentServiceId ? mongoose.Types.ObjectId.createFromHexString(parentServiceId) : undefined, // Changed to new ObjectId()
                companyId: companyId ? mongoose.Types.ObjectId.createFromHexString(companyId) : undefined, // Changed to new ObjectId()
                service_name: service_name ? new RegExp(service_name, 'i') : undefined,
            };
    
            Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);
    
            const data = await master_services.find(query);
    
            res.status(200).send({
                success: true,
                message: "Successfully fetched",
                data
            });
        } catch (error) {
            console.log("error", error);
            res.status(500).send({
                success: false,
                message: "Unsuccessful fetched",
                error: error.message
            });
        }
    },
  
 
    getservicesTree: async (req, res) => {
        try {
            const { companyId, categoryId, _id } = req.query;
    
            // Validate companyId
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide companyId",
                });
            }
    
            let categories;
    
            // Fetch only the top-level services if no specific _id or categoryId is provided
            if (_id) {
                categories = await master_services.find({ companyId, _id, isActive: true }).lean();
            } else if (categoryId) {
                categories = await master_services.find({ companyId, categoryId, parentServiceId: null, isActive: true }).lean();
            } else {
                categories = await master_services.find({ companyId, parentServiceId: null, isActive: true }).lean();
            }
    
            // Recursive function to build the nested service structure
            const buildServiceTree = async (parentId) => {
                const subServices = await master_services.find({
                    companyId,
                    parentServiceId: parentId,
                    isActive: true
                }).lean();
    
                return await Promise.all(
                    subServices.map(async (service) => ({
                        ...service,
                        subservicecategories: await buildServiceTree(service._id)  // Recursive call
                    }))
                );
            };
    
            // Build the tree structure starting from top-level services
            const categoryTree = await Promise.all(
                categories.map(async (category) => ({
                    ...category,
                    subservicecategories: await buildServiceTree(category._id)  // Populate subservices
                }))
            );
    
            return res.status(200).json({
                success: true,
                message: "Success",
                data: categoryTree,
            });
        } catch (error) {
            console.error("Error fetching service tree:", error);
            return res.status(500).json({
                success: false,
                message: "Something went wrong",
                error: error.message,
            });
        }
    },
    
    
    toggleservicesStatus : async (req,res)=>{
        try {
          let id = req.body.id
          const details = await master_services.findById(id)
          const data = await master_services.findByIdAndUpdate(id, {
            $set : {
              isActive :!details.isActive
            }
          },{new : true})
    
          res.status(200).send({
            success : true,
            message : "success",
            data
          })
    
          
        } catch (error) {
          console.error("error", error);
          return res.status(500).send({
            success: false,
            message: "Something went wrong",
            error: error.message,
          });
        }
    },
      
    deleteservices:async(req,res)=>{
       try {
        const data = await master_services.findOneAndDelete({_id:req.params.id})

        res.status(200).send({
            success:true,
            message:"Successfully deleted",
            data:data
        })
       } catch (error) {
        res.status(400).send({
            success:false,
            message:"UnSuccessfully deleted",
            error:error.message
        })
       }
    },
   
    updateservices: async (req, res) => {
        try {
            const { service_name } = req.body; 
      
            const service = await master_services.findOne({
                $or: [
                    { _id: req.params.id },
                    { service_name: service_name } 
                ]
            });
      
            if (!service) {
                return res.status(404).send({ success: false, message: "service not found" });
            }
      
            let updatedData = { ...req.body, updatedAt: new Date() };
      
            if (req.file) {
                const fileExtension = path.extname(req.file.filename);
                const newImageName = `${service_name}${fileExtension}`; 
      
                if (service.imageName) {
                    const oldFilePath = path.join(__dirname, '../../public/master_services', service.imageName);
      
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                }
      
                const newFilePath = path.join(__dirname, '../../public/master_services', newImageName);
                const currentFilePath = path.join(__dirname, '../../public/master_services', req.file.filename);
      
                fs.renameSync(currentFilePath, newFilePath); 
      
                updatedData.imageName = newImageName; 
            }
           
          
      
            const updatedservice = await master_services.findOneAndUpdate(
                { _id: service._id },  
                { $set: updatedData },   
                { new: true }           
            );
            
            res.status(200).send({
                success: true,
                message: "Successfully updated services",
                data: updatedservice
            });
      
        } catch (error) {
            console.log("error", error);
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },
};