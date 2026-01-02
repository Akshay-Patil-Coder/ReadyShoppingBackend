const { ObjectId } = require("mongodb")
const serviceCategoryModel = require('./ServiceCategory.model')
const fs = require('fs');
const path = require('path');
const { default: mongoose } = require("mongoose");
const { serviceProductsModel } = require('../ServiceProducts/ServiceProducts.model')


module.exports = {


    addCategory: async (req, res) => {
        const cleanupServiceImage = async (req) => {
            if (req.file?.filename) {
                const imagePath = path.join(
                    __dirname,
                    '..',
                    '..',
                    'public',
                    'ServiceCategoryImage',
                    req.file.filename
                );
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        }
        try {
            let {
                companyId,
                serviceCategoryName,
                serviceParentCategoryId,
                Description
            } = req.body;

            if (req.user.companyId) companyId = req.user.companyId;

            if (!companyId || !serviceCategoryName || !Description) {
                await cleanupServiceImage(req);
                return res.status(400).json({
                    success: false,
                    message: "Please provide companyId, serviceCategoryName, and Description"
                });
            }

            let serviceLevel = 0;

            if (serviceParentCategoryId) {
                let parentCategory = await serviceCategoryModel.findOne({
                    _id: serviceParentCategoryId,
                    companyId
                });

                if (!parentCategory) {
                    await cleanupServiceImage(req);
                    return res.status(404).json({
                        success: false,
                        message: "Parent service category not found for this company"
                    });
                }

                let existingService = await serviceProductsModel.findOne({
                    companyId,
                    SubServiceId: serviceParentCategoryId
                });

                if (existingService) {
                    await cleanupServiceImage(req);
                    return res.status(400).json({
                        success: false,
                        message: "Category not added because parent is already a leaf category"
                    });
                }

                serviceLevel = parentCategory.serviceLevel + 1;

            } else {
                const existingRoot = await serviceCategoryModel.findOne({
                    companyId,
                    serviceLevel: 0
                });

                if (existingRoot) {
                    await cleanupServiceImage(req);
                    return res.status(400).json({
                        success: false,
                        message: "Only one root (level-0) service category is allowed per company"
                    });
                }
            }

            let serviceCategoryData = {
                companyId,
                serviceCategoryName,
                Description,
                serviceLevel
            };

            if (serviceParentCategoryId) {
                serviceCategoryData.serviceParentCategoryId = serviceParentCategoryId;
            }

            if (req.file?.filename) {
                serviceCategoryData.serviceImage = req.file.filename;
            }

            const newCategory = new serviceCategoryModel(serviceCategoryData);
            const savedCategory = await newCategory.save();

            return res.status(200).json({
                success: true,
                message: "Service category added successfully",
                data: savedCategory
            });

        } catch (error) {
            await cleanupServiceImage(req);
            console.error("addServiceCategoryError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    },

    getCategory: async (req, res) => {
        try {
            let { serviceParentCategoryId, companyId, serviceCategoryName } = req.query;

            let query = { isActive: true };

            if (companyId && mongoose.isValidObjectId(companyId)) {
                query.companyId = new mongoose.Types.ObjectId(String(companyId));
            }

            if (serviceParentCategoryId) {
                if (mongoose.isValidObjectId(serviceParentCategoryId)) {
                    query.serviceParentCategoryId = new mongoose.Types.ObjectId(
                        String(serviceParentCategoryId)
                    );
                } else if (serviceParentCategoryId === "null") {
                    query.serviceParentCategoryId = { $exists: false };
                }
            }

            if (serviceCategoryName) {
                query.serviceCategoryName = {
                    $regex: serviceCategoryName,
                    $options: "i"
                };
            }

            let categories = await serviceCategoryModel
                .find(query)
                .sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                message: "Successfully fetched service categories",
                data: categories.length ? categories : []
            });

        } catch (error) {
            console.error("getServiceCategoryError:", error);
            return res.status(500).json({
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

            let buildCategoryTree = async (categories) => {
                return Promise.all(
                    categories.map(async (category) => ({
                        ...category._doc,
                        subcategories: await getCategoryTreeRecursive(companyId, category._id),
                    }))
                );
            };

            let getCategoryTreeRecursive = async (companyId, serviceParentCategoryId) => {
                const subCategories = await serviceCategoryModel.find({ companyId, serviceParentCategoryId, isActive: true });
                if (!subCategories || subCategories.length === 0) {
                    return [];
                }
                return buildCategoryTree(subCategories);
            };

            let categoryTree = await buildCategoryTree(categories);

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

getCategoryWithLeafNodes: async (req, res) => {
    try {
        let { companyId, HeadServiceCategoryId, selectedServiceCategoryIds } = req.query;

        if (!companyId) {
            return res.status(400).send({
                success: false,
                message: "Please send companyId",
            });
        }

        let categories = await serviceCategoryModel.find({
            companyId,
            isActive: true
        });

        let parentMap = {};
        categories.forEach(cat => {
            let parentId = cat.serviceParentCategoryId
                ? cat.serviceParentCategoryId.toString()
                : null;

            if (!parentMap[parentId]) parentMap[parentId] = [];
            parentMap[parentId].push(cat);
        });

        const getLeafNodes = (categoryId) => {
            let children = parentMap[categoryId] || [];
            if (children.length === 0) return [];

            let leaves = [];
            for (let child of children) {
                let subLeaves = getLeafNodes(child._id.toString());
                if (subLeaves.length === 0) {
                    leaves.push(child);
                } else {
                    leaves = leaves.concat(subLeaves);
                }
            }
            return leaves;
        };

        let headCategories = [];

        if (HeadServiceCategoryId) {
            headCategories = categories.filter(
                cat => cat._id.toString() === HeadServiceCategoryId
            );
        } else {
            let rootCategories = categories.filter(
                cat => !cat.serviceParentCategoryId
            );

            let secondLevel = [];
            for (let root of rootCategories) {
                let children = parentMap[root._id.toString()] || [];
                secondLevel = secondLevel.concat(children);
            }
            headCategories = secondLevel;
        }

        let result = headCategories.map(head => ({
            _id: head._id,
            serviceCategoryName: head.serviceCategoryName,
            Description: head.Description,
            serviceImage: head.serviceImage,
            serviceParentCategoryId: head.serviceParentCategoryId,
            leafCategories: getLeafNodes(head._id.toString())
        }));

        let selectedIds = [];
        if (selectedServiceCategoryIds) {
            if (typeof selectedServiceCategoryIds === "string") {
                selectedIds = selectedServiceCategoryIds
                    .split(",")
                    .map(id => id.trim());
            } else if (Array.isArray(selectedServiceCategoryIds)) {
                selectedIds = selectedServiceCategoryIds.map(id =>
                    id.toString()
                );
            }
        }

        let selectedCategories = [];
        result.forEach(cat => {
            let matched = cat.leafCategories.filter(leaf =>
                selectedIds.includes(leaf._id.toString())
            );
            selectedCategories = selectedCategories.concat(matched);
        });

        let filteredResult = result.map(head => ({
            ...head,
            leafCategories: head.leafCategories.filter(
                leaf => !selectedIds.includes(leaf._id.toString())
            )
        }));

        return res.status(200).send({
            success: true,
            message: "Service categories fetched successfully",
            data: filteredResult,
            selectedCategories
        });

    } catch (error) {
        console.error("getServiceCategoryWithLeafNodesError:", error);
        return res.status(500).send({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
},

getCategoryWithHeadAndLeafParentNodes: async (req, res) => {
    try {
        let { companyId, HeadServiceCategoryId } = req.query;

        if (!companyId) {
            return res.status(400).send({
                success: false,
                message: "Please send companyId",
            });
        }

        let categories = await serviceCategoryModel.find({
            companyId,
            isActive: true
        });

        let parentMap = {};
        categories.forEach(cat => {
            let parentId = cat.serviceParentCategoryId
                ? cat.serviceParentCategoryId.toString()
                : null;

            if (!parentMap[parentId]) parentMap[parentId] = [];
            parentMap[parentId].push(cat);
        });

        let getLeafNodesWithParents = (categoryId) => {
            let children = parentMap[categoryId] || [];
            if (children.length === 0) return [];

            let leaves = [];
            for (let child of children) {
                let subLeaves = getLeafNodesWithParents(child._id.toString());
                if (subLeaves.length === 0) {
                    leaves.push(child);
                } else {
                    leaves = leaves.concat(subLeaves);
                }
            }
            return leaves;
        };

        let roots;
        if (HeadServiceCategoryId) {
            roots = categories.filter(
                cat => cat._id.toString() === HeadServiceCategoryId
            );
        } else {
            roots = categories.filter(
                cat => !cat.serviceParentCategoryId
            );
        }

        let result = [];

        for (let root of roots) {
            let leafData = getLeafNodesWithParents(root._id.toString());
            let parentCategoryMap = {};

            leafData.forEach(leaf => {
                let parentCategoryId = leaf.serviceParentCategoryId.toString();

                if (!parentCategoryMap[parentCategoryId]) {
                    let parentCategory = categories.find(
                        c => c._id.toString() === parentCategoryId
                    );

                    parentCategoryMap[parentCategoryId] = {
                        parentCategory,
                        leafCategories: []
                    };
                }

                parentCategoryMap[parentCategoryId].leafCategories.push(leaf);
            });

            result.push({
                headCategory: {
                    _id: root._id,
                    serviceCategoryName: root.serviceCategoryName,
                    Description: root.Description,
                    serviceImage: root.serviceImage,
                    serviceParentCategoryId: root.serviceParentCategoryId || null
                },
                leafHierarchy: Object.values(parentCategoryMap).map(
                    ({ parentCategory, leafCategories }) => ({
                        parentCategory: {
                            _id: parentCategory._id,
                            serviceCategoryName: parentCategory.serviceCategoryName,
                            Description: parentCategory.Description,
                            serviceImage: parentCategory.serviceImage,
                            serviceParentCategoryId:
                                parentCategory.serviceParentCategoryId || null
                        },
                        leafCategories: leafCategories.map(leaf => ({
                            _id: leaf._id,
                            serviceCategoryName: leaf.serviceCategoryName,
                            Description: leaf.Description,
                            serviceImage: leaf.serviceImage,
                            serviceParentCategoryId:
                                leaf.serviceParentCategoryId || null
                        }))
                    })
                )
            });
        }

        return res.status(200).send({
            success: true,
            message: "Service categories fetched successfully",
            data: result
        });

    } catch (error) {
        console.error(
            "getServiceCategoryWithHeadAndLeafParentNodes Error:",
            error
        );
        return res.status(500).send({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
},

    updateCategory: async (req, res) => {
        try {

            let { serviceCategoryName, companyId } = req.body;
            if (req.user.companyId) companyId = req.user.companyId

            if (!companyId) {
                return res.status(400).json({ message: 'Company Not Found', success: false })
            }

            let category = await serviceCategoryModel.findOne({
                _id: req.params.id, companyId
            });

            if (!category) {
                if (req.file?.filename) {
                    let newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(404).send({ success: false, message: "Category not found" });
            }
            let updatedData = { serviceCategoryName: serviceCategoryName, updatedAt: new Date() };


            if (req.file?.filename) {
                if (category?.serviceImage) {
                    let oldImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage', category.serviceImage);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }

                updatedData.serviceImage = req.file.filename;
            }



            let updatedCategory = await serviceCategoryModel.findOneAndUpdate(
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
            if (req.file?.filename) {
                let newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceCategoryImage', req.file.filename);
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

            const productData = await ServiceProductModel.serviceProductsModel.find({ SubServiceId: id });
            let deletedProduct = '';
            if (productData && productData.length > 0) {
                try {
                    const deleteProduct = await ServiceProductModel.serviceProductsModel.deleteMany({ SubServiceId: id });

                    for (const eachProduct of productData) {
                        if (Array.isArray(eachProduct?.productimages) && eachProduct.productimages.length > 0) {
                            for (const eachImage of eachProduct.serviceImages) {
                                const productPath = path.join(__dirname, "..", "..", "public", "ServiceProductImage", eachImage);
                                try {
                                    await fs.promises.unlink(productPath);
                                    console.log(`Deleted: ${productPath}`);
                                } catch (err) {
                                    if (err.code !== "ENOENT") {
                                        console.error(`Error deleting ${productPath}:`, err.message);
                                    }
                                }
                            }
                        }
                    }

                    deletedProduct = deleteProduct;
                } catch (err) {
                    console.error("Error during service product deletion:", err.message);
                }
            }
            const result = await serviceCategoryModel.deleteOne({ _id: id })
            if (!result) {
                return res.status(400).json({ message: 'CATEGORY NOT DELETED', success: false })
            }

            res.status(200).json({ success: true, message: "category and services both deleted", data: result, deletedServices: deletedProduct });

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


