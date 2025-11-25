const { ObjectId } = require('mongodb');
const { ProductService } = require('./ProductServices.model');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

module.exports = {
    addProductService: async (req, res) => {
        const cleanupFiles = (files) => {
            if (!files) return;
            files.forEach(file => {
                const filePath = path.join(__dirname, '..', '..', 'public', 'ProductServiceImage', file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        };

        try {
            const { companyId, HeadCategoryId, SubCategoryId, ServiceName, Description } = req.body;

            if (!companyId || !HeadCategoryId || !SubCategoryId || !ServiceName) {
                cleanupFiles(req.files);
                return res.status(400).json({
                    success: false,
                    message: 'Please fill in all required fields'
                });
            }

            let ServiceImages = [];
            if (req.files?.length) {
                ServiceImages = req.files.map(file => file.filename);
            }

            const ProductServiceData = {
                companyId,
                HeadCategoryId,
                SubCategoryId,
                ServiceName,
                ...(Description && { Description }),
                ...(ServiceImages.length && { ServiceImages })
            };

            const newProductService = new ProductService(ProductServiceData);
            const result = await newProductService.save();

            if (!result) {
                cleanupFiles(req.files);
                return res.status(400).json({
                    success: false,
                    message: 'Product Service not added'
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Product Service added successfully',
                data: result
            });

        } catch (error) {
            console.error("ProductServiceAddError:", error);
            cleanupFiles(req.files);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },


    getProductServicesData: async (matchCondition) => {
        return await ProductService.aggregate([
            { $match: matchCondition },
            {
                $lookup: {
                    from: 'categgggories',
                    localField: 'HeadCategoryId',
                    foreignField: '_id',
                    as: 'HeadCategory',
                },
            },
            {
                $lookup: {
                    from: 'categgggories',
                    localField: 'SubCategoryId',
                    foreignField: '_id',
                    as: 'SubCategories',
                },
            },
        ]);
    },

    getProductServicesById: async (req, res) => {
        try {
            const { HeadCategoryId, SubCategoryId, companyId, ProductServiceId, ServiceName } = req.query;

            if (!companyId) {
                return res.status(400).json({ message: 'companyId is required', success: false });
            }

            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (HeadCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCategoryId)) {
                    return res.status(400).json({ message: 'Invalid HeadCategoryId format', success: false });
                }
                matchCondition.HeadCategoryId = mongoose.Types.ObjectId.createFromHexString(HeadCategoryId);
            }

            if (SubCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
                    return res.status(400).json({ message: 'Invalid SubCategoryId format', success: false });
                }
                matchCondition.SubCategoryId = mongoose.Types.ObjectId.createFromHexString(SubCategoryId);
            }

            if (ProductServiceId) {
                if (!mongoose.Types.ObjectId.isValid(ProductServiceId)) {
                    return res.status(400).json({ message: 'Invalid ProductServiceId format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId.createFromHexString(ProductServiceId);
            }

            if (ServiceName) matchCondition.ServiceName = { $regex: ServiceName, $options: 'i' };

            const data = await module.exports.getProductServicesData(matchCondition);

            if (!data || data.length === 0) {
                return res.status(404).json({ message: 'No Product Service found for this criteria', success: false });
            }

            return res.status(200).json({ data, success: true, message: 'Product Service fetched successfully' });

        } catch (error) {
            console.error("getProductServiceByIdError:", error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message, success: false });
        }
    },
    updateProductsService: async (req, res) => {
        const cleanupFiles = (files) => {
            if (!files) return;
            files.forEach(file => {
                const filePath = path.join(__dirname, '..', '..', 'public', 'ProductServiceImage', file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        };

        try {
            const { ServiceName, Description, ServiceProductId } = req.body;
            const { companyId } = req.query;

            if (!ServiceProductId || !ServiceName || !companyId) {
                cleanupFiles(req.files);
                return res.status(400).json({ message: 'Please insert valid data', success: false });
            }

            let updateData = { $set: { ServiceName } };
            if (Description) updateData.$set.Description = Description;

            if (req.files?.length) {
                const serviceImages = req.files.map(file => file.filename);
                updateData.$push = { ServiceImages: { $each: serviceImages } };
            }

            const updatedResult = await ProductService.findOneAndUpdate(
                { _id: ServiceProductId, companyId },
                updateData,
                { new: true }
            );

            if (!updatedResult) {
                cleanupFiles(req.files);
                return res.status(400).json({ message: 'Product Service not updated', success: false });
            }

            return res.status(200).json({ data: updatedResult, success: true, message: 'Updated successfully' });

        } catch (error) {
            cleanupFiles(req.files);
            console.error('UpdateServiceProductError:', error)
            return res.status(500).json({ error: error.message, success: false, message: 'Internal Server Error' });
        }
    },
    deleteProductServiceImage: async (req, res) => {
        try {
            const { ServiceImages, companyId } = req.body;
            const { id } = req.params;
            if (!companyId) {
                return res.status(400).json({ message: 'CompanyN Not Found', success: false })
            }
            if (!ServiceImages || !id) {
                return res.status(400).json({ message: "Product Service ID and image(s) are required", success: false });
            }

            const imagesToDelete = Array.isArray(ServiceImages) ? ServiceImages : [ServiceImages];

            const serviceProduct = await ProductService.findById(id);
            if (!serviceProduct) {
                return res.status(404).json({ message: "Product Service not found", success: false });
            }

            const updatedService = await ProductService.findOneAndUpdate(
                { _id: id,companyId },
                { $pull: { ServiceImages: { $in: imagesToDelete } } },
                { new: true }
            );

            if (!updatedService) {
                return res.status(400).json({ message: "Product Service image(s) cannot be deleted", success: false });
            }

            imagesToDelete.forEach(file => {
                const imagePath = path.join(__dirname, '..', '..', 'public', 'ProductServiceImage', file);
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            });

            return res.status(200).json({ message: "Product Service image(s) deleted successfully", success: true, data: updatedService });

        } catch (error) {
            console.error('ProductServiceImageDeletingError:', error);
            return res.status(500).json({ error: error.message, success: false, message: "Internal Server Error" });
        }
    },

};
