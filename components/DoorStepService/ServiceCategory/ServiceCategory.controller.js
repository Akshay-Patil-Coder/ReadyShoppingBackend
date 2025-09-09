const { ObjectId } = require("mongodb")
const serviceCategoryModel = require('./ServiceCategory.model')
const fs = require('fs');
const path = require('path');


module.exports = {


    addCategory: async (req, res) => {
        try {
            let { companyId, serviceCategoryName, serviceParentCategoryId, serviceLevel, Description } = req.body;

            serviceLevel = Number(serviceLevel);

            if (!companyId || !serviceCategoryName || serviceLevel < 0 || !Description) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
                return res.status(400).json({ message: 'please provide all fields', success: false })
            }

            if (serviceLevel !== 0 && !serviceParentCategoryId) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
                return res.status(400).send({ message: "Please provide parentCategoryId for subservices" });
            }
            const ServiceCategoryData = {
                companyId,
                serviceCategoryName,
                serviceLevel,
                Description,
            };
            if (serviceParentCategoryId) {
                ServiceCategoryData.serviceParentCategoryId = serviceParentCategoryId;
            }
            if (req.file) {
                ServiceCategoryData.serviceImage = req.file.filename;
            }
            const newCategory = new serviceCategoryModel(ServiceCategoryData);

            const categoryData = await newCategory.save();

            res.status(200).send({
                success: true,
                message: "service category added successfully",
                data: categoryData,
            });

        } catch (error) {
            console.error("Error:", error);
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },


    getCategory: async (req, res) => {
        try {
            const { serviceParentCategoryId, companyId, serviceCategoryName } = req.query;

            const query = { isActive: true };

            if (serviceParentCategoryId) query.serviceParentCategoryId = new ObjectId(serviceParentCategoryId);
            if (companyId) query.companyId = new ObjectId(companyId);
            if (serviceCategoryName) query.serviceCategoryName = new RegExp(serviceCategoryName, 'i'); // Case-insensitive regex search

            const data = await serviceCategoryModel.find(query);

            res.status(200).send({
                success: true,
                message: "Successfully fetched",
                data: data.length ? data : null
            });
        } catch (error) {
            console.log("error", error);
            res.status(500).send({
                success: false,
                message: "Unsuccessful fetch",
                error: error.message
            });
        }
    },

    getCategoryTree: async (req, res) => {
        try {
            let { serviceParentCategoryId, companyId, _id } = req.query;

            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId",
                });
            }

            let categories;

            if (_id) {
                categories = await serviceCategoryModel.find({ companyId, _id, isActive: true });
            } else if (serviceParentCategoryId) {
                categories = await serviceCategoryModel.find({ companyId, serviceParentCategoryId, isActive: true });
            } else {
                categories = await serviceCategoryModel.find({ companyId, serviceParentCategoryId: null, isActive: true });
            }

            const buildCategoryTree = async (categories) => {
                return Promise.all(
                    categories.map(async (category) => ({
                        ...category._doc,
                        subcategories: await getCategoryTreeRecursive(companyId, category._id),
                    }))
                );
            };

            const getCategoryTreeRecursive = async (companyId, serviceParentCategoryId) => {
                const subCategories = await serviceCategoryModel.find({ companyId, serviceParentCategoryId, isActive: true });
                if (!subCategories || subCategories.length === 0) {
                    return [];
                }
                return buildCategoryTree(subCategories);
            };

            const categoryTree = await buildCategoryTree(categories);

            return res.status(200).send({
                success: true,
                message: "Success",
                data: categoryTree,
            });
        } catch (error) {
            console.error("error", error);
            return res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message,
            });
        }
    },

    updateCategory: async (req, res) => {
        try {
            console.log(req.body, 'body')

            const { serviceCategoryName } = req.body;
            const category = await serviceCategoryModel.findOne({
                $or: [
                    { _id: req.params.id },
                    { serviceCategoryName: serviceCategoryName }
                ]
            });
            console.log(category, 'category')
            if (!category) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
                return res.status(404).send({ success: false, message: "Category not found" });
            }

            let updatedData = { ...req.body, updatedAt: new Date() };
            console.log(updatedData, 'updated data')

            if (req.file) {
                if (category && category.serviceImage) {
                    const oldImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage', category.serviceImage);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }

                updatedData.serviceImage = req.file.filename;
            }



            const updatedCategory = await serviceCategoryModel.findOneAndUpdate(
                { _id: category._id },
                { $set: updatedData },
                { new: true }
            );

            res.status(200).send({
                success: true,
                message: "Successfully updated category",
                data: updatedCategory
            });

        } catch (error) {
            console.log("error", error);
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        } 
    },

    toggleCategoriesStatus: async (req, res) => {
        try {
            let id = req.body.id
            const details = await serviceCategoryModel.findById(id)
            const data = await serviceCategoryModel.findByIdAndUpdate(id, {
                $set: {
                    isActive: !details.isActive
                }
            }, { new: true })

            res.status(200).send({
                success: true,
                message: "success",
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

    deleteCategories: async (req, res) => {
        try {
            const { id } = req.params;

            const category = await serviceCategoryModel.findById(id);

            if (!category) {
                return res.status(404).send({ success: false, message: "Category not found" });
            }

            if (!category.isActive) {
                return res.status(400).send({ success: false, message: "Category is already inactive" });
            }



            // const productData = await ProductsModel.Products.find({ categoryId: id })
            // let deletedProduct = '';
            // if (productData) {
            //     const deleteProduct = await ProductsModel.Products.deleteMany({ categoryId: id })
            //     deletedProduct = deleteProduct
            // }

            const result = await serviceCategoryModel.deleteOne({ _id: id })
            if (!result) {
                res.status(400).json({ message: 'CATEGORY NOT DELETED', success: false })
            }

            res.status(200).json({ success: true, message: "category and services both deleted", data: result });

        } catch (error) {
            console.error("error", error);
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },

}


