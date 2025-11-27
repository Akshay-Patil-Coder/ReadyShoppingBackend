const dynamicCategoriesModel = require("./ProductCategories.model");
const fs = require('fs');
const path = require('path');
const { Product, VariantProduct } = require('../VariantsProducts/VariantsProducts.model')
const { ProductRating } = require('../ProductRating/ProductRating.model')
const { brandmodel } = require('../ProductsBrand/ProductsBrand.model')
const { Variant } = require('../Variants/Variants.model')
const BannerModel = require('../ShoppingBanners/ShoppingBanners.model')

const { default: mongoose } = require("mongoose");

module.exports = {
    addCategory: async (req, res) => {
        try {
            let { companyId, categoryName, parentCategoryId, Description } = req.body;
            if (req.user.companyId) companyId = req.user.companyId

            if (!companyId || !categoryName || !Description) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
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
                const parentCategory = await dynamicCategoriesModel.findOne({
                    _id: parentCategoryId,
                    companyId
                });

                if (!parentCategory) {
                    if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
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
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
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
                const existingRoot = await dynamicCategoriesModel.findOne({
                    companyId,
                    categoryLevel: 0
                });

                if (existingRoot) {
                    if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
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

            const categoryData = {
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

            const newCategory = new dynamicCategoriesModel(categoryData);
            const savedCategory = await newCategory.save();

            return res.status(200).json({
                success: true,
                message: 'Category added successfully',
                data: savedCategory
            });

        } catch (error) {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'ProductCategories', req.file.filename);
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
            const { parentCategoryId, companyId, categoryName } = req.query;

            const query = { isActive: true };

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

            const categories = await dynamicCategoriesModel.find(query).sort({ createdAt: -1 });

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
    getCategoryWithLeafNodes: async (req, res) => {
        try {
            const { companyId, HeadCategoryId, selectedCategoryIds } = req.query;

            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId",
                });
            }

            const categories = await dynamicCategoriesModel.find({ companyId, isActive: true });

            const parentMap = {};
            categories.forEach(cat => {
                const parentId = cat.parentCategoryId ? cat.parentCategoryId.toString() : null;
                if (!parentMap[parentId]) parentMap[parentId] = [];
                parentMap[parentId].push(cat);
            });

            const getLeafNodes = (categoryId) => {
                const children = parentMap[categoryId] || [];
                if (children.length === 0) return [];

                let leaves = [];
                for (const child of children) {
                    const subLeaves = getLeafNodes(child._id.toString());
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
                const rootCategories = categories.filter(cat => !cat.parentCategoryId);
                let secondLevel = [];
                for (const root of rootCategories) {
                    const children = parentMap[root._id.toString()] || [];
                    secondLevel = secondLevel.concat(children);
                }
                headCategories = secondLevel;
            }

            const result = headCategories.map(head => ({
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
                const matched = cat.leafCategories.filter(leaf =>
                    selectedIds.includes(leaf._id.toString())
                );
                selectedCategories = selectedCategories.concat(matched);
            });

            const filteredResult = result.map(head => ({
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
            const { companyId, HeadCategoryId } = req.query;

            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId",
                });
            }

            const categories = await dynamicCategoriesModel.find({ companyId, isActive: true });

            const parentMap = {};
            categories.forEach(cat => {
                const parentId = cat.parentCategoryId ? cat.parentCategoryId.toString() : null;
                if (!parentMap[parentId]) parentMap[parentId] = [];
                parentMap[parentId].push(cat);
            });

            const getLeafNodesWithParents = (categoryId) => {
                const children = parentMap[categoryId] || [];
                if (children.length === 0) return [];

                let leaves = [];
                for (const child of children) {
                    const subLeaves = getLeafNodesWithParents(child._id.toString());
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

            const result = [];

            for (const root of roots) {
                const leafData = getLeafNodesWithParents(root._id.toString());
                const parentCategoryMap = {};

                leafData.forEach(leaf => {
                    const parentCategoryId = leaf.parentCategoryId.toString();
                    if (!parentCategoryMap[parentCategoryId]) {
                        const parentCategory = categories.find(c => c._id.toString() === parentCategoryId);
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
            let { categoryName, companyId } = req.body;
            if (req.user.companyId) companyId = req.user.companyId

            if(!companyId){
                return res.status(400).json({message:'Company Not Found',success:false})
            }
            const category = await dynamicCategoriesModel.findOne({
                _id: req.params.id, companyId
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
            let updatedData = { categoryName:categoryName, updatedAt: new Date() };

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
            let { _id, companyId } = req.query;
            if (req.user.companyId) companyId = req.user.companyId

            const category = await dynamicCategoriesModel.findOne({ _id, companyId });
            if (!category) {
                return res.status(404).json({ success: false, message: "Category not found" });
            }
            if (category.categoryLevel == 0) {
                return res.status(404).json({ success: false, message: "Category Level 0 Not Deleteable" });
            }

            const deleteFiles = async (files, folder) => {
                for (const file of files) {
                    const filePath = path.join(__dirname, "..", "..", "public", folder, file);
                    try {
                        await fs.promises.unlink(filePath);
                    } catch (err) {
                        if (err.code !== "ENOENT") console.error(`Error deleting ${filePath}:`, err.message);
                    }
                }
            };

            const deleteCategoryRecursive = async (categoryId) => {
                try {
                    const subCategories = await dynamicCategoriesModel.find({ parentCategoryId: categoryId });
                    for (const sub of subCategories) {
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

                for (const product of products) {
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
                        for (const variantId of product.VariantProductIds) {
                            try {
                                const variant = await VariantProduct.findById(variantId);
                                if (variant) {
                                    if (Array.isArray(variant.VariantProductImage) && variant.VariantProductImage.length) {
                                        await deleteFiles(variant.VariantProductImage, "ProductImage");
                                    }
                                    if (Array.isArray(variant.VariantFields)) {
                                        for (const EachVariant of variant.VariantFields) {
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
                                }
                            } catch (err) {
                                console.error(`Error deleting variant ${variantId}:`, err.message);
                            }
                        }
                    }

                    if (Array.isArray(product.RatingIds) && product.RatingIds.length) {
                        for (const reviewId of product.RatingIds) {
                            try {
                                const review = await ProductRating.findById(reviewId);
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
                }
                try {
                    const brandsWithSub = await brandmodel.find({ SubCategoryId: categoryId });
                    for (const brand of brandsWithSub) {
                        try {
                            await brandmodel.updateOne({ _id: brand._id }, { $pull: { SubCategoryId: categoryId } });

                            const banners = await BannerModel.find({ BrandId: brand._id, SubCategoryId: categoryId });
                            for (const banner of banners) {
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

                    const brandsToDelete = await brandmodel.find({ HeadCategoryId: categoryId });
                    for (const brand of brandsToDelete) {
                        try {
                            if (brand?.BrandImage) await deleteFiles([brand.BrandImage], "BrandImage");

                            const brandBanners = await BannerModel.find({ BrandId: brand._id });
                            for (const banner of brandBanners) {
                                try {
                                    if (banner.BannerImage) await deleteFiles([banner.BannerImage], "BannerImage");
                                    await BannerModel.deleteOne({ _id: banner._id });
                                } catch (err) {
                                    console.error(`Error deleting banner ${banner._id}:`, err.message);
                                }
                            }

                            await brandmodel.deleteOne({ _id: brand._id });
                        } catch (err) {
                            console.error(`Error deleting brand ${brand._id}:`, err.message);
                        }
                    }
                } catch (err) {
                    console.error("Error handling brands:", err.message);
                }

                try {
                    const currentCategory = await dynamicCategoriesModel.findById(categoryId);
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
            const { _id, companyId } = req.query;
            const category = await dynamicCategoriesModel.findOne({ _id, companyId });
            if (!category) return res.status(404).json({ success: false, message: "Category not found" });
            if (category.categoryLevel == 0) {
                return res.status(404).json({ success: false, message: "Category Level 0 Not Deleteable" });
            }
            const preview = {
                categories: [],
                products: [],
                variantProducts: [],
                reviews: [],
                reviewResponses: [],
                brands: [],
                banners: [],
                files: []
            };

            const gatherCategoryRecursive = async (categoryId) => {
                const currentCategory = await dynamicCategoriesModel.findById(categoryId);
                if (!currentCategory) return;

                preview.categories.push({
                    _id: currentCategory._id,
                    categoryName: currentCategory.categoryName,
                    imageName: currentCategory.imageName
                });
                if (currentCategory.imageName) preview.files.push({ folder: "ProductCategories", file: currentCategory.imageName });

                const subCategories = await dynamicCategoriesModel.find({ parentCategoryId: categoryId });
                for (const sub of subCategories) {
                    await gatherCategoryRecursive(sub._id);
                }

                const products = await Product.find({ $or: [{ HeadCategoryId: categoryId }, { SubCategoryId: categoryId }] });
                for (const product of products) {
                    preview.products.push({
                        _id: product._id,
                        ProductName: product.ProductName,
                        CommonImages: product.CommonImages,
                        CommonVideos: product.CommonVideos
                    });

                    if (Array.isArray(product.CommonImages)) product.CommonImages.forEach(img => preview.files.push({ folder: "ProductImage", file: img }));
                    if (Array.isArray(product.CommonVideos)) product.CommonVideos.forEach(v => preview.files.push({ folder: "ProductVideo", file: v }));

                    if (Array.isArray(product.VariantProductIds)) {
                        for (const variantId of product.VariantProductIds) {
                            const variant = await VariantProduct.findById(variantId);
                            if (!variant) continue;
                            preview.variantProducts.push({
                                _id: variant._id,
                                VariantProductName: variant.VariantProductName,
                                VariantImages: variant.VariantProductImage
                            });
                            if (Array.isArray(variant.VariantProductImage)) variant.VariantProductImage.forEach(img => preview.files.push({ folder: "ProductImage", file: img }));
                        }
                    }

                    if (Array.isArray(product.RatingIds)) {
                        for (const reviewId of product.RatingIds) {
                            const review = await ProductRating.findById(reviewId);
                            if (!review) continue;
                            preview.reviews.push({
                                _id: review._id,
                                ReviewText: review.ReviewText,
                                ReviewImages: review.ReviewImages
                            });
                            if (Array.isArray(review.ReviewImages)) review.ReviewImages.forEach(img => preview.files.push({ folder: "ProductSRatingImage", file: img }));

                            if (Array.isArray(review.ResponseOnReview)) {
                                const responses = await ProductReviewResponse.find({ _id: { $in: review.ResponseOnReview } });
                                for (const resp of responses) {
                                    preview.reviewResponses.push({
                                        _id: resp._id,
                                        LikeOrDislike: resp.LikeOrDislike,
                                        createdAt: resp.createdAt
                                    });
                                }
                            }
                        }
                    }
                }

                const brandsWithSub = await brandmodel.find({ SubCategoryId: categoryId });
                for (const brand of brandsWithSub) {
                    preview.brands.push({ _id: brand._id, BrandName: brand.BrandName, SubCategoryId: brand.SubCategoryId });
                    if (brand.BrandImage) preview.files.push({ folder: "BrandImage", file: brand.BrandImage });

                    const banners = await BannerModel.find({ BrandId: brand._id, SubCategoryId: categoryId });
                    for (const banner of banners) {
                        preview.banners.push({ _id: banner._id, BannerName: banner.BannerName, BannerImage: banner.BannerImage });
                        if (banner.BannerImage) preview.files.push({ folder: "BannerImage", file: banner.BannerImage });
                    }
                }

                const brandsToDelete = await brandmodel.find({ HeadCategoryId: categoryId });
                for (const brand of brandsToDelete) {
                    preview.brands.push({ _id: brand._id, BrandName: brand.BrandName, HeadCategoryId: brand.HeadCategoryId });
                    if (brand.BrandImage) preview.files.push({ folder: "BrandImage", file: brand.BrandImage });

                    const banners = await BannerModel.find({ BrandId: brand._id });
                    for (const banner of banners) {
                        preview.banners.push({ _id: banner._id, BannerName: banner.BannerName, BannerImage: banner.BannerImage });
                        if (banner.BannerImage) preview.files.push({ folder: "BannerImage", file: banner.BannerImage });
                    }
                }
            };

            await gatherCategoryRecursive(_id);

            res.status(200).json({
                success: true,
                message: "Preview of all deletable data",
                data: preview
            });

        } catch (error) {
            console.error("previewDeleteCategoryError:", error);
            res.status(500).json({ success: false, message: "Something went wrong", error: error.message });
        }
    }



};