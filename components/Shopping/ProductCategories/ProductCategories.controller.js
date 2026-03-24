const dynamicCategoriesModel = require("./ProductCategories.model");
const fs = require('fs');
const path = require('path');
const { Product, VariantProduct } = require('../VariantsProducts/VariantsProducts.model')
const { ProductRating } = require('../ProductRating/ProductRating.model')
const { brandmodel } = require('../ProductsBrand/ProductsBrand.model')
const { Variant } = require('../Variants/Variants.model')
const BannerModel = require('../ShoppingBanners/ShoppingBanners.model')
const { ProductService } = require('../ProductServices/ProductServices.model')
const { updateElasticById, deleteElasticById, deleteElasticVariantByProductId } = require('../ElasticSearch/elastic/CRUD.js')
const { default: mongoose } = require("mongoose");

module.exports = {
    addCategory: async (req, res) => {
        try {
            let { companyId, categoryName, parentCategoryId, Description } = req.body;
            if (req.user.companyId) companyId = req.user.companyId

            if (!companyId || !categoryName || !Description) {
                if (req.file?.filename) {
                    let newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return res.status(400).json({
                    success: false,
                    message: 'Please provide companyId, categoryName, and Description'
                });
            }

            let categoryLevel = 0;

            if (parentCategoryId) {
                let parentCategory = await dynamicCategoriesModel.findOne({
                    _id: parentCategoryId,
                    companyId
                });

                if (!parentCategory) {
                    if (req.file?.filename) {
                        let newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return res.status(404).json({
                        success: false,
                        message: 'Parent category not found for this company'
                    });
                }
                let FoundProduct = await VariantProduct.findOne({ companyId, SubCategoryId: parentCategoryId })
                if (FoundProduct) {
                    if (req.file?.filename) {
                        let newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return res.status(404).json({
                        success: false,
                        message: 'Category Not Added Because Provided Parent Category Is Already A Child Category'
                    });
                }

                categoryLevel = parentCategory.categoryLevel + 1;
            } else {
                let existingRoot = await dynamicCategoriesModel.findOne({
                    companyId,
                    categoryLevel: 0
                });

                if (existingRoot) {
                    if (req.file?.filename) {
                        let newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return res.status(400).json({
                        success: false,
                        message: 'Only one root (level-0) category is allowed per company'
                    });
                }
            }

            let categoryData = {
                companyId,
                categoryName,
                Description,
                categoryLevel
            };

            if (parentCategoryId) {
                categoryData.parentCategoryId = parentCategoryId;
            }

            if (req.file?.filename) {
                categoryData.imageName = req.file.filename;
            }

            let newCategory = new dynamicCategoriesModel(categoryData);
            let savedCategory = await newCategory.save();

            return res.status(200).json({
                success: true,
                message: 'Category added successfully',
                data: savedCategory
            });

        } catch (error) {
            if (req.file?.filename) {
                let newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }

            console.error("addCategoryError:", error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    },


    getCategory: async (req, res) => {
        try {
            let { parentCategoryId, companyId, categoryName } = req.query;

            let query = { isActive: true };

            if (companyId && mongoose.isValidObjectId(companyId)) {
                query.companyId = new mongoose.Types.ObjectId(String(companyId));
            }

            if (parentCategoryId) {
                if (mongoose.isValidObjectId(parentCategoryId)) {
                    query.parentCategoryId = new mongoose.Types.ObjectId(String(parentCategoryId));
                } else if (parentCategoryId === "null") {
                    query.parentCategoryId = { $exists: false };
                }
            }

            if (categoryName) {
                query.categoryName = { $regex: categoryName, $options: "i" };
            }

            let categories = await dynamicCategoriesModel.find(query).sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                message: "Successfully fetched categories",
                data: categories.length ? categories : []
            });

        } catch (error) {
            console.error("getCategoryError:", error);
            return res.status(500).json({
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

            let buildCategoryTree = async (categories) => {
                return Promise.all(
                    categories.map(async (category) => ({
                        ...category._doc,
                        subcategories: await getCategoryTreeRecursive(companyId, category._id),
                    }))
                );
            };

            let getCategoryTreeRecursive = async (companyId, parentCategoryId) => {
                let subCategories = await dynamicCategoriesModel.find({ companyId, parentCategoryId, isActive: true });
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
            let { companyId, HeadCategoryId, selectedCategoryIds } = req.query;

            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId",
                });
            }

            let categories = await dynamicCategoriesModel.find({ companyId, isActive: true });

            let parentMap = {};
            categories.forEach(cat => {
                let parentId = cat.parentCategoryId ? cat.parentCategoryId.toString() : null;
                if (!parentMap[parentId]) parentMap[parentId] = [];
                parentMap[parentId].push(cat);
            });

            let getLeafNodes = (categoryId) => {
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

            if (HeadCategoryId) {
                headCategories = categories.filter(cat => cat._id.toString() === HeadCategoryId);
            } else {
                let rootCategories = categories.filter(cat => !cat.parentCategoryId);
                let secondLevel = [];
                for (let root of rootCategories) {
                    let children = parentMap[root._id.toString()] || [];
                    secondLevel = secondLevel.concat(children);
                }
                headCategories = secondLevel;
            }

            let result = headCategories.map(head => ({
                _id: head._id,
                categoryName: head.categoryName,
                Description: head.Description,
                imageName: head.imageName,
                parentCategoryId: head.parentCategoryId,
                leafCategories: getLeafNodes(head._id.toString())
            }));

            let selectedIds = [];
            if (selectedCategoryIds) {
                if (typeof selectedCategoryIds === "string") {
                    selectedIds = selectedCategoryIds.split(",").map(id => id.trim());
                } else if (Array.isArray(selectedCategoryIds)) {
                    selectedIds = selectedCategoryIds.map(id => id.toString());
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
                message: "Categories fetched successfully",
                data: filteredResult,
                selectedCategories
            });

        } catch (error) {
            console.error("getCategoryWithLeafNodesError:", error);
            return res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },

    getCategoryWithHeadAndLeafParentNodes: async (req, res) => {
        try {
            let { companyId, HeadCategoryId } = req.query;

            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId",
                });
            }

            let categories = await dynamicCategoriesModel.find({ companyId, isActive: true });

            let parentMap = {};
            categories.forEach(cat => {
                let parentId = cat.parentCategoryId ? cat.parentCategoryId.toString() : null;
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
            if (HeadCategoryId) {
                roots = categories.filter(cat => cat._id.toString() === HeadCategoryId);
            } else {
                roots = categories.filter(cat => !cat.parentCategoryId);
            }

            let result = [];

            for (let root of roots) {
                let leafData = getLeafNodesWithParents(root._id.toString());
                let parentCategoryMap = {};

                leafData.forEach(leaf => {
                    let parentCategoryId = leaf.parentCategoryId.toString();
                    if (!parentCategoryMap[parentCategoryId]) {
                        let parentCategory = categories.find(c => c._id.toString() === parentCategoryId);
                        parentCategoryMap[parentCategoryId] = {
                            parentCategory: parentCategory,
                            leafCategories: []
                        };
                    }
                    parentCategoryMap[parentCategoryId].leafCategories.push(leaf);
                });

                result.push({
                    headCategory: {
                        _id: root._id,
                        categoryName: root.categoryName,
                        Description: root.Description,
                        imageName: root.imageName,
                        parentCategoryId: root.parentCategoryId || null
                    },
                    leafHierarchy: Object.values(parentCategoryMap).map(({ parentCategory, leafCategories }) => ({
                        parentCategory: {
                            _id: parentCategory._id,
                            categoryName: parentCategory.categoryName,
                            Description: parentCategory.Description,
                            imageName: parentCategory.imageName,
                            parentCategoryId: parentCategory.parentCategoryId || null
                        },
                        leafCategories: leafCategories.map(leaf => ({
                            _id: leaf._id,
                            categoryName: leaf.categoryName,
                            Description: leaf.Description,
                            imageName: leaf.imageName,
                            parentCategoryId: leaf.parentCategoryId || null
                        }))
                    }))
                });
            }

            return res.status(200).send({
                success: true,
                message: "Categories fetched successfully",
                data: result
            });

        } catch (error) {
            console.error("getCategoryWithLeafAndParentNodes Error:", error);
            return res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },

    updateCategory: async (req, res) => {
        try {
            let { categoryName, companyId,Description } = req.body;
            if (req.user.companyId) companyId = req.user.companyId

            if (!companyId) {
                return res.status(400).json({ message: 'Company Not Found', success: false })
            }
            let category = await dynamicCategoriesModel.findOne({
                _id: req.params.id, companyId
            });

            if (!category) {
                if (req.file?.filename) {
                    let newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(404).send({ success: false, message: "Category not found" });
            }
            let updatedData = { categoryName: categoryName, updatedAt: new Date(),Description:Description };

            if (req.file?.filename) {
                if (category?.imageName) {
                    let oldFilePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', category?.imageName);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath)
                    }
                }
                updatedData.imageName = req.file.filename;
            }

            let updatedCategory = await dynamicCategoriesModel.findOneAndUpdate(
                { _id: category._id },
                { $set: updatedData },
                { new: true }
            );

            try {
                await updateElasticById({ type: 'category', id: updatedCategory._id })
                console.log(`✅ Successfully updated Elasticsearch for category: ${updatedCategory._id}`);
            } catch (error) {
                console.error(`❌ Failed to update Elasticsearch for category ${updatedCategory._id}:`, error.message);
            }

            res.status(200).send({
                success: true,
                message: "Successfully updated category",
                data: updatedCategory
            });

        } catch (error) {
            if (req.file?.filename) {
                let newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
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

    ToggleStatusOfCategory: async (req, res) => {
        const toggleElastic = ({ type, id, isActive }) => {
            if (!type || !id) return Promise.resolve();

            return isActive
                ? updateElasticById({ type, id })
                : deleteElasticById({ type, id });
        };
        const toggleElasticForVariant = ({ type, id, isActive }) => {
            if (!type || !id) return Promise.resolve();

            return isActive
                ? updateElasticById({ type, id })
                : deleteElasticVariantByProductId({ ProductId: id });
        };
        try {
            const { categoryId, companyId, isActive } = req.query;
            let esTasks = []


            if (!categoryId || !companyId) {
                return res.status(400).json({
                    success: false,
                    message: "CategoryId and CompanyId are required"
                });
            }

            if (typeof isActive !== "boolean") {
                return res.status(400).json({
                    success: false,
                    message: "Provide valid status (true / false)"
                });
            }

            if (
                !mongoose.Types.ObjectId.isValid(categoryId) ||
                !mongoose.Types.ObjectId.isValid(companyId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid CategoryId or CompanyId"
                });
            }

            const getAllCategoryIds = async (rootId) => {
                const ids = [];
                const stack = [rootId];

                while (stack.length) {
                    const currentId = stack.pop();
                    ids.push(currentId);

                    const children = await dynamicCategoriesModel.find(
                        { parentCategoryId: currentId },
                        { _id: 1 }
                    );

                    children.forEach(child => stack.push(child._id));
                }
                return ids;
            };

            const categoryIds = await getAllCategoryIds(categoryId);
            const rootCategoryId = categoryId.toString();

            const categories = await dynamicCategoriesModel.find({
                _id: { $in: categoryIds },
                companyId
            });

            for (const cat of categories) {
                const isRoot = cat._id.toString() === rootCategoryId;
                const nextActiveBy = isRoot ? "Self" : "Parent";

                if (isActive === false && cat.isActive !== false) {
                    await dynamicCategoriesModel.findByIdAndUpdate(cat._id, {
                        $set: { isActive: false, isActiveBy: nextActiveBy }
                    });
                    esTasks.push(
                        toggleElastic({
                            type: "category",
                            id: cat._id,
                            isActive: false
                        })
                    );
                }

                if (isActive === true) {
                    if (
                        cat.isActive === false &&
                        ["Self", "Parent"].includes(cat.isActiveBy)
                    ) {
                        await dynamicCategoriesModel.findByIdAndUpdate(cat._id, {
                            $set: { isActive: true, isActiveBy: nextActiveBy }
                        });

                        esTasks.push(
                            toggleElastic({
                                type: "category",
                                id: cat._id,
                                isActive: true
                            })
                        )
                    }

                    if (!cat.isActiveBy) {
                        await dynamicCategoriesModel.findByIdAndUpdate(cat._id, {
                            $set: { isActive: true, isActiveBy: nextActiveBy }
                        });

                        esTasks.push(
                            toggleElastic({
                                type: "category",
                                id: cat._id,
                                isActive: true
                            })
                        )
                    }
                }
            }

            const brands = await brandmodel.find({
                HeadCategoryId: { $in: categoryIds }
            });

            for (const brand of brands) {
                if (brand.isActiveBy === "Self" && brand.isActive && !isActive) {
                    await brandmodel.findByIdAndUpdate(brand._id, {
                        $set: { isActive: false, isActiveBy: "Category" }
                    });

                    esTasks.push(
                        toggleElastic({
                            type: "brand",
                            id: brand._id,
                            isActive: false
                        })
                    )
                }
                else if (brand.isActiveBy === "Category" && isActive) {
                    await brandmodel.findByIdAndUpdate(brand._id, {
                        $set: { isActive: true, isActiveBy: "Category" }
                    });

                    esTasks.push(
                        toggleElastic({
                            type: "brand",
                            id: brand._id,
                            isActive: true
                        })
                    )
                }
                else if (!brand.isActiveBy) {
                    await brandmodel.findByIdAndUpdate(brand._id, {
                        $set: { isActive, isActiveBy: "Category" }
                    });

                    esTasks.push(
                        toggleElastic({
                            type: "brand",
                            id: brand._id,
                            isActive
                        })
                    )
                }
            }
            const banners = await BannerModel.find({
                SubCategoryId: { $in: categoryIds }
            });
            for (const banner of banners) {
                if (banner.isActiveBy === "Self" && banner.isActive && !isActive) {
                    await BannerModel.findByIdAndUpdate(banner._id, {
                        $set: { isActive: false, isActiveBy: "Category" }
                    });
                }
                else if (banner.isActiveBy === "Category" && isActive) {
                    await BannerModel.findByIdAndUpdate(banner._id, {
                        $set: { isActive: true, isActiveBy: "Category" }
                    });
                }
                else if (!banner.isActiveBy) {
                    await BannerModel.findByIdAndUpdate(banner._id, {
                        $set: { isActive, isActiveBy: "Category" }
                    });
                }
            }
            const variants = await Variant.find({
                $or: [
                    { HeadCategoryId: { $in: categoryIds } },
                    { SubCategoryId: { $in: categoryIds } }
                ]
            });
            for (const variant of variants) {
                if (variant.isActiveBy === "Self" && variant.isActive && !isActive) {
                    await Variant.findByIdAndUpdate(variant._id, {
                        $set: { isActive: false, isActiveBy: "Category" }
                    });
                }
                else if (variant.isActiveBy === "Category" && isActive) {
                    await Variant.findByIdAndUpdate(variant._id, {
                        $set: { isActive: true, isActiveBy: "Category" }
                    });
                }
                else if (!variant.isActiveBy) {
                    await Variant.findByIdAndUpdate(variant._id, {
                        $set: { isActive, isActiveBy: "Category" }
                    });
                }
            }
            const services = await ProductService.find({
                $or: [
                    { HeadCategoryId: { $in: categoryIds } },
                    { SubCategoryId: { $in: categoryIds } }
                ]
            });

            for (const service of services) {
                if (service.isActiveBy === "Self" && service.isActive && !isActive) {
                    await ProductService.findByIdAndUpdate(service._id, {
                        $set: { isActive: false, isActiveBy: "Category" }
                    });
                }
                else if (service.isActiveBy === "Category" && isActive) {
                    await ProductService.findByIdAndUpdate(service._id, {
                        $set: { isActive: true, isActiveBy: "Category" }
                    });
                }
                else if (!service.isActiveBy) {
                    await ProductService.findByIdAndUpdate(service._id, {
                        $set: { isActive, isActiveBy: "Category" }
                    });
                }
            }

            const products = await Product.find({
                $or: [
                    { HeadCategoryId: { $in: categoryIds } },
                    { SubCategoryId: { $in: categoryIds } }
                ]
            });

            for (const product of products) {
                if (product.isActiveBy === "Self" && product.isActive && !isActive) {
                    await Product.findByIdAndUpdate(product._id, {
                        $set: { isActive: false, isActiveBy: "Category" }
                    });

                    esTasks.push(
                        toggleElastic({
                            type: "product",
                            id: product._id,
                            isActive: false
                        })
                    )
                }
                else if (product.isActiveBy === "Category" && isActive) {
                    await Product.findByIdAndUpdate(product._id, {
                        $set: { isActive: true, isActiveBy: "Category" }
                    });

                    esTasks.push(
                        toggleElastic({
                            type: "product",
                            id: product._id,
                            isActive: true
                        })
                    )
                }
                else if (!product.isActiveBy) {
                    await Product.findByIdAndUpdate(product._id, {
                        $set: { isActive, isActiveBy: "Category" }
                    });

                    esTasks.push(
                        toggleElastic({
                            type: "product",
                            id: product._id,
                            isActive
                        })
                    )
                }

                await VariantProduct.updateMany(
                    { ProductId: product._id },
                    { $set: { isActive, isActiveBy: "Category" } }
                );
                esTasks.push(
                    toggleElasticForVariant({
                        type: "product",
                        id: product._id,
                        isActive
                    })
                )
            }
            const esResults = await Promise.allSettled(esTasks);

            const failed = esResults.filter(r => r.status === "rejected");

            if (failed.length) {
                console.error("❌ Some ES operations failed:", failed.length);
            }
            return res.status(200).json({
                success: true,
                message: "Category status updated successfully",
                affectedCategories: categoryIds.length
            });

        } catch (error) {
            console.error("ToggleStatusOfCategory error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    },



    deleteCategories: async (req, res) => {
        try {
            let { _id, companyId } = req.query;
            if (req.user.companyId) companyId = req.user.companyId

            let category = await dynamicCategoriesModel.findOne({ _id, companyId });
            if (!category) {
                return res.status(404).json({ success: false, message: "Category not found" });
            }
            if (category.categoryLevel == 0) {
                return res.status(404).json({ success: false, message: "Category Level 0 Not Deleteable" });
            }

            let deleteFiles = async (files, folder) => {
                for (let file of files) {
                    let filePath = path.join(__dirname, "..", "..", "public", folder, file);
                    try {
                        await fs.promises.unlink(filePath);
                    } catch (err) {
                        if (err.code !== "ENOENT") console.error(`Error deleting ${filePath}:`, err.message);
                    }
                }
            };

            let deleteCategoryRecursive = async (categoryId) => {
                try {
                    let subCategories = await dynamicCategoriesModel.find({ parentCategoryId: categoryId });
                    for (let sub of subCategories) {
                        await deleteCategoryRecursive(sub._id);
                    }
                } catch (err) {
                    console.error(`Error fetching subcategories of ${categoryId}:`, err.message);
                }

                let products = [];
                try {
                    products = await Product.find({
                        $or: [
                            { HeadCategoryId: categoryId },
                            { SubCategoryId: categoryId }
                        ]
                    });
                } catch (err) {
                    console.error(`Error fetching products for category ${categoryId}:`, err.message);
                }

                for (let product of products) {
                    try {
                        if (Array.isArray(product.CommonImages) && product.CommonImages.length) {
                            await deleteFiles(product.CommonImages, "ProductImage");
                        }
                        if (Array.isArray(product.CommonVideos) && product.CommonVideos.length) {
                            await deleteFiles(product.CommonVideos, "ProductVideo");
                        }
                    } catch (err) {
                        console.error(`Error deleting media for product ${product._id}:`, err.message);
                    }

                    if (Array.isArray(product.VariantProductIds) && product.VariantProductIds.length) {
                        for (let variantId of product.VariantProductIds) {
                            try {
                                let variant = await VariantProduct.findById(variantId);
                                if (variant) {
                                    if (Array.isArray(variant.VariantProductImage) && variant.VariantProductImage.length) {
                                        await deleteFiles(variant.VariantProductImage, "ProductImage");
                                    }
                                    if (Array.isArray(variant.VariantFields)) {
                                        for (let EachVariant of variant.VariantFields) {
                                            try {
                                                await Variant.findOneAndUpdate(
                                                    {
                                                        _id: EachVariant.VariantId,
                                                        "VariantValues.Value": EachVariant.VariantValue,
                                                        "VariantValues.Count": { $gt: 0 },
                                                    },
                                                    { $inc: { "VariantValues.$.Count": -1 } },
                                                    { new: true }
                                                );
                                            } catch (err) {
                                                console.warn(`Variant count decrement failed for ${EachVariant.VariantId}:`, err.message);
                                            }
                                        }
                                    }
                                    await VariantProduct.deleteOne({ _id: variantId });
                                    try {
                                        await deleteElasticById({ type: 'variant', id: variantId })
                                        console.log(`✅ Successfully deleted Elasticsearch for variantProduct: ${variantId}`);
                                    } catch (error) {
                                        console.error(`❌ Failed to delete Elasticsearch for variantProduct ${variantId}:`, error.message);
                                    }
                                }
                            } catch (err) {
                                console.error(`Error deleting variant ${variantId}:`, err.message);
                            }
                        }
                    }

                    if (Array.isArray(product.RatingIds) && product.RatingIds.length) {
                        for (let reviewId of product.RatingIds) {
                            try {
                                let review = await ProductRating.findById(reviewId);
                                if (review) {
                                    if (Array.isArray(review.ReviewImages) && review.ReviewImages.length) {
                                        await deleteFiles(review.ReviewImages, "ProductSRatingImage");
                                    }
                                    await ProductRating.deleteOne({ _id: reviewId });
                                }
                            } catch (err) {
                                console.error(`Error deleting review ${reviewId}:`, err.message);
                            }
                        }
                    }

                    try {
                        await Product.deleteOne({ _id: product._id });
                    } catch (err) {
                        console.error(`Error deleting product ${product._id}:`, err.message);
                    }
                    try {
                        await deleteElasticById({ type: 'product', id: brand._id })
                        console.log(`✅ Successfully deleted Elasticsearch for product: ${product._id}`);
                    } catch (error) {
                        console.error(`❌ Failed to delete Elasticsearch for product ${product._id}:`, error.message);
                    }
                }
                try {
                    let brandsWithSub = await brandmodel.find({ SubCategoryId: categoryId });
                    for (let brand of brandsWithSub) {
                        try {
                            await brandmodel.updateOne({ _id: brand._id }, { $pull: { SubCategoryId: categoryId } });

                            let banners = await BannerModel.find({ BrandId: brand._id, SubCategoryId: categoryId });
                            for (let banner of banners) {
                                try {
                                    if (banner.BannerImage) await deleteFiles([banner.BannerImage], "BannerImage");
                                    await BannerModel.deleteOne({ _id: banner._id });
                                } catch (err) {
                                    console.error(`Error deleting banner ${banner._id}:`, err.message);
                                }
                            }
                        } catch (err) {
                            console.error(`Error updating brand ${brand._id} subcategories:`, err.message);
                        }
                    }

                    let brandsToDelete = await brandmodel.find({ HeadCategoryId: categoryId });
                    for (let brand of brandsToDelete) {
                        try {
                            if (brand?.BrandImage) await deleteFiles([brand.BrandImage], "BrandImage");

                            let brandBanners = await BannerModel.find({ BrandId: brand._id });
                            for (let banner of brandBanners) {
                                try {
                                    if (banner.BannerImage) await deleteFiles([banner.BannerImage], "BannerImage");
                                    await BannerModel.deleteOne({ _id: banner._id });
                                } catch (err) {
                                    console.error(`Error deleting banner ${banner._id}:`, err.message);
                                }
                            }

                            await brandmodel.deleteOne({ _id: brand._id });
                            try {
                                await deleteElasticById({ type: 'brand', id: brand._id })
                                console.log(`✅ Successfully deleted Elasticsearch for brand: ${brand._id}`);
                            } catch (error) {
                                console.error(`❌ Failed to delete Elasticsearch for brand ${brand._id}:`, error.message);
                            }
                        } catch (err) {
                            console.error(`Error deleting brand ${brand._id}:`, err.message);
                        }
                    }
                } catch (err) {
                    console.error("Error handling brands:", err.message);
                }

                try {
                    let productServices = await ProductService.find({
                        $or: [
                            { HeadCategoryId: categoryId },
                            { SubCategoryId: categoryId }
                        ]
                    })
                    for (let EachService of productServices) {
                        try {
                            if (EachService?.ServiceImages) await deleteFiles(EachService.ServiceImages, "ProductServiceImage");

                            await ProductService.deleteOne({ _id: EachService._id })

                        } catch (err) {
                            console.error(`Error deleting productService ${EachService._id}:`, err.message);
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching product services for category ${categoryId}:`, err.message);

                }
                try {
                    let variants = await Variant.find({
                        $or: [
                            { HeadCategoryId: categoryId },
                            { SubCategoryId: categoryId }
                        ]
                    })
                    for (let EachVariant of variants) {
                        try {
                            await Variant.deleteOne({ _id: EachVariant._id })

                        } catch (err) {
                            console.error(`Error deleting Variant ${EachService._id}:`, err.message);
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching Variant for category ${categoryId}:`, err.message);

                }
                try {
                    let currentCategory = await dynamicCategoriesModel.findById(categoryId);
                    if (currentCategory?.imageName) {
                        await deleteFiles([currentCategory.imageName], "ProductCategories");
                    }
                } catch (err) {
                    console.error(`Error deleting category image for ${categoryId}:`, err.message);
                }

                try {
                    await dynamicCategoriesModel.deleteOne({ _id: categoryId });
                } catch (err) {
                    console.error(`Error deleting category ${categoryId}:`, err.message);
                }
                try {
                    await deleteElasticById({ type: 'category', id: categoryId })
                    console.log(`✅ Successfully deleted Elasticsearch for category: ${categoryId}`);
                } catch (error) {
                    console.error(`❌ Failed to delete Elasticsearch for category ${categoryId}:`, error.message);
                }
            };

            await deleteCategoryRecursive(_id);
            res.status(200).json({
                success: true,
                message: "Category, subcategories, and all associated products, variant products, images, videos, and reviews deleted successfully"
            });

        } catch (error) {
            console.error("deleteCategoriesError:", error);
            res.status(500).json({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },

    previewDeleteCategory: async (req, res) => {
        try {
            let { categoryId, companyId } = req.query;

            if (!categoryId || !companyId) {
                return res.status(400).json({
                    success: false,
                    message: "CategoryId and CompanyId are required"
                });
            }

            if (
                !mongoose.Types.ObjectId.isValid(categoryId) ||
                !mongoose.Types.ObjectId.isValid(companyId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid CategoryId or CompanyId"
                });
            }

            const getAllCategoryIds = async (rootId) => {
                const ids = [];
                const stack = [rootId];

                while (stack.length) {
                    const currentId = stack.pop();
                    ids.push(currentId);

                    const children = await dynamicCategoriesModel.find(
                        { parentCategoryId: currentId },
                        { _id: 1 }
                    );

                    children.forEach(c => stack.push(c._id));
                }

                return ids;
            };

            const categoryIds = await getAllCategoryIds(categoryId);

            const categoriesRaw = await dynamicCategoriesModel.find({
                _id: { $in: categoryIds },
                companyId
            }).select("categoryName categoryLevel Description imageName parentCategoryId _id");

            const brands = await brandmodel.find({
                $or: [
                    { HeadCategoryId: { $in: categoryIds } },
                    { SubCategoryId: { $in: categoryIds } }
                ]
            }).select("BrandName BrandImage HeadCategoryId SubCategoryId _id");

            const banners = await BannerModel.find({
                SubCategoryId: { $in: categoryIds }
            }).select("BannerName BannerImage BannerType Position OfferPercentage SubCategoryId _id");

            const variants = await Variant.find({
                $or: [
                    { HeadCategoryId: { $in: categoryIds } },
                    { SubCategoryId: { $in: categoryIds } }
                ]
            }).select("VariantName VariantType HeadCategoryId SubCategoryId _id");

            const productServices = await ProductService.find({
                $or: [
                    { HeadCategoryId: { $in: categoryIds } },
                    { SubCategoryId: { $in: categoryIds } }
                ]
            }).select("ServiceName ServiceImages Description HeadCategoryId SubCategoryId _id");

            const productsRaw = await Product.find({
                $or: [
                    { HeadCategoryId: { $in: categoryIds } },
                    { SubCategoryId: { $in: categoryIds } }
                ]
            }).select(
                "ProductName CommonImages CommonVideos CommonDescription VariantProductIds HeadCategoryId SubCategoryId _id"
            );

            const variantProductIds = productsRaw
                .flatMap(p => p.VariantProductIds || [])
                .filter(Boolean);

            const variantProducts = await VariantProduct.find({
                _id: { $in: variantProductIds }
            }).select(
                "VariantProductName Price VariantProductImage OfferPercentage VariantFields _id"
            );
            const buildCategoryTree = (categories, rootCategoryId) => {
                const map = {};
                const roots = [];

                const rootId = rootCategoryId.toString();

                categories.forEach(cat => {
                    map[cat._id.toString()] = {
                        ...cat.toObject(),
                        subcategories: []
                    };
                });

                categories.forEach(cat => {
                    const id = cat._id.toString();
                    const parentId = cat.parentCategoryId?.toString();

                    if (id === rootId) {
                        roots.push(map[id]);
                    }
                    else if (parentId && map[parentId]) {
                        map[parentId].subcategories.push(map[id]);
                    }
                });

                return roots;
            };


            const mergeVariantProductsIntoProducts = (products, variantProducts) => {
                const vpMap = {};

                variantProducts.forEach(vp => {
                    vpMap[vp._id.toString()] = vp.toObject();
                });

                return products.map(product => ({
                    ...product.toObject(),
                    VariantProducts: (product.VariantProductIds || [])
                        .map(id => vpMap[id.toString()])
                        .filter(Boolean)
                }));
            };

            const categories = buildCategoryTree(categoriesRaw, categoryId);
            const products = mergeVariantProductsIntoProducts(productsRaw, variantProducts);

            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        categories: categoriesRaw.length,
                        brands: brands.length,
                        banners: banners.length,
                        variants: variants.length,
                        productServices: productServices.length,
                        products: products.length
                    },
                    categories,
                    brands,
                    banners,
                    variants,
                    productServices,
                    products
                }
            });

        } catch (error) {
            console.error("previewDeleteCategory error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },


};