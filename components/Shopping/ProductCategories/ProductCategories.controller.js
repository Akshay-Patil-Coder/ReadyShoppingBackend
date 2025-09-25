const { ObjectId } = require("mongodb");
const dynamicCategoriesModel = require("./ProductCategories.model");
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const master_services = require('../MasterServices/MasterServices.model');
const ProductsModel = require('../Products/Products.model');
const { default: mongoose } = require("mongoose");

module.exports = {
    addCategory: async (req, res) => {
        try {
            let { companyId, categoryName, parentCategoryId, categoryLevel, Description } = req.body;
            if (!companyId || !categoryName || !categoryLevel || !Description) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return res.status(400).json({
                    success: false,
                    message: 'Please Provide all Fields'
                })
            }
            categoryLevel = Number(categoryLevel)
            if (categoryLevel !== 0 && !parentCategoryId) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({
                    success: false,
                    message: 'Please Provide parentCategoryId'
                })
            }

            let ShoppingCategoryData = {
                companyId,
                categoryName,
                categoryLevel,
                Description,
            }

            if (parentCategoryId) {
                ShoppingCategoryData.parentCategoryId = parentCategoryId;
            }

            if (req.file?.filename) {
                ShoppingCategoryData.imageName = req.file.filename
            }

            let newCategory = new dynamicCategoriesModel(ShoppingCategoryData);

            const categoryData = await newCategory.save();

            res.status(200).json({
                success: true,
                message: "Shopping Category Added Successfully",
                data: categoryData
            })

        } catch (error) {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
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
            const { parentCategoryId, companyId, categoryName } = req.query;

            const query = { isActive: true };

            if (parentCategoryId) query.parentCategoryId = mongoose.Types.ObjectId.createFromHexString(parentCategoryId);
            if (companyId) query.companyId = mongoose.Types.ObjectId.createFromHexString(companyId);
            if (categoryName) query.categoryName = new RegExp(categoryName, 'i'); // Case-insensitive regex search

            const data = await dynamicCategoriesModel.find(query);

            res.status(200).send({
                success: true,
                message: "Successfully fetched",
                data: data.length ? data : null // Return data or null if empty
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
            let { parentCategoryId, companyId, _id } = req.query;

            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId",
                });
            }

            let categories;

            if (_id) {
                categories = await dynamicCategoriesModel.find({ companyId, _id, isActive: true });
            } else if (parentCategoryId) {
                categories = await dynamicCategoriesModel.find({ companyId, parentCategoryId, isActive: true });
            } else {
                categories = await dynamicCategoriesModel.find({ companyId, parentCategoryId: null, isActive: true });
            }

            const buildCategoryTree = async (categories) => {
                return Promise.all(
                    categories.map(async (category) => ({
                        ...category._doc,
                        subcategories: await getCategoryTreeRecursive(companyId, category._id),
                    }))
                );
            };

            const getCategoryTreeRecursive = async (companyId, parentCategoryId) => {
                const subCategories = await dynamicCategoriesModel.find({ companyId, parentCategoryId, isActive: true });
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
            const { categoryName } = req.body;

            const category = await dynamicCategoriesModel.findOne({
                $or: [
                    { _id: req.params.id },
                    { categoryName: categoryName }
                ]
            });

            if (!category) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(404).send({ success: false, message: "Category not found" });
            }
            let updatedData = { ...req.body, updatedAt: new Date() };

            if (req.file?.filename) {
                if (category?.imageName) {
                    const oldFilePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', category?.imageName);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath)
                    }
                }
                updatedData.imageName = req.file.filename;
            }

            const updatedCategory = await dynamicCategoriesModel.findOneAndUpdate(
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
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            console.log("error", error);
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },

    toggleCategoriesStatus: async (req, res) => {
        try {
            let id = req.body.id;
            const details = await dynamicCategoriesModel.findById(id);
            const data = await dynamicCategoriesModel.findByIdAndUpdate(id, {
                $set: {
                    isActive: !details.isActive
                }
            }, { new: true });

            res.status(200).send({
                success: true,
                message: "success",
                data
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

    deleteCategories: async (req, res) => {
        try {
            const { id } = req.params;

            const category = await dynamicCategoriesModel.findById(id);

            if (!category) {
                return res.status(404).send({ success: false, message: "Category not found" });
            }

            const productData = await ProductsModel.Products.find({ categoryId: id });
            let deletedProduct = '';

            if (productData && productData.length > 0) {
                const deleteProduct = await ProductsModel.Products.deleteMany({ categoryId: id });
                deletedProduct = deleteProduct;
            }

            const result = await dynamicCategoriesModel.deleteOne({ _id: id });

            if (result.deletedCount === 0) {
                return res.status(400).json({ message: 'CATEGORY NOT DELETED', success: false });
            }
            if (category?.imageName) {
                const oldFilePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', category?.imageName);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath)
                }
            }
            res.status(200).json({ success: true, message: "category and product both deleted", data: result, deletedProduct: deletedProduct });

        } catch (error) {
            console.error("error", error);
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },
};