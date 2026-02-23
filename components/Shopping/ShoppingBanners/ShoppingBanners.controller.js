const bannersSchema = require('./ShoppingBanners.model');
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const { VariantProduct } = require('../VariantsProducts/VariantsProducts.model');
const { updateElasticById } = require('../ElasticSearch/elastic/CRUD');

module.exports = {

    addbanner: async (req, res) => {
        try {
            let {
                companyId,
                BannerName,
                SubCategoryId,
                HeadCategoryId,
                BrandId,
                Position,
                VariantsProductsIds,
                OfferPercentage,
                BannerType
            } = req.body;
            if (req.user.companyId) companyId = req.user.companyId

            let deleteBannerImage = () => {
                if (req.file?.filename) {
                    let filePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            };

            if (VariantsProductsIds) {
                try {
                    if (typeof VariantsProductsIds === 'string') {
                        VariantsProductsIds = VariantsProductsIds.trim();

                        if (VariantsProductsIds.startsWith('[') && VariantsProductsIds.endsWith(']')) {
                            VariantsProductsIds = JSON.parse(VariantsProductsIds);
                        } else if (VariantsProductsIds.includes(',')) {
                            VariantsProductsIds = VariantsProductsIds.split(',').map(v => v.trim());
                        } else {
                            VariantsProductsIds = [VariantsProductsIds];
                        }
                    }

                    else if (!Array.isArray(VariantsProductsIds)) {
                        VariantsProductsIds = [VariantsProductsIds];
                    }

                } catch (err) {
                    deleteBannerImage();
                    return res.status(400).json({
                        message: 'Invalid VariantsProductsIds format',
                        success: false
                    });
                }
            }


            if (!companyId || !BannerName || !HeadCategoryId || !SubCategoryId || !BannerType) {
                deleteBannerImage();
                return res.status(400).json({ message: 'Please fill all required fields', success: false });
            }

            if (!req.file?.filename) {
                return res.status(400).json({ message: 'Please upload the banner image', success: false });
            }

            let bannerData = {
                companyId,
                BannerName,
                SubCategoryId,
                HeadCategoryId,
                Position,
                BannerType,
                BannerImage: req.file.filename
            };

            if (BannerType === 'Brand') {
                if (!BrandId) {
                    deleteBannerImage();
                    return res.status(400).json({ message: 'BrandId is required for Brand banners', success: false });
                }

                bannerData.BrandId = BrandId;
            }

            else if (BannerType === 'Offer') {
                if (!VariantsProductsIds || VariantsProductsIds.length === 0 || !OfferPercentage) {
                    deleteBannerImage();
                    return res.status(400).json({ message: 'VariantsProductsIds and OfferPercentage are required for Offer banners', success: false });
                }

                OfferPercentage = Number(OfferPercentage);
                if (isNaN(OfferPercentage) || OfferPercentage <= 0 || OfferPercentage >= 100) {
                    deleteBannerImage();
                    return res.status(400).json({
                        success: false,
                        message: 'OfferPercentage must be a number between 1 and 99'
                    });
                }

                bannerData.VariantsProductsIds = VariantsProductsIds;
                bannerData.OfferPercentage = OfferPercentage;

                await VariantProduct.updateMany(
                    { _id: { $in: VariantsProductsIds } },
                    { $set: { OfferPercentage } }
                );
                try {
                    await updateElasticById({ type: 'multipleVariantProducts', id: VariantsProductsIds });
                } catch (e) {
                    console.error("❌ Elastic error:", e.message);
                }


            }

            let newBanner = new bannersSchema(bannerData);
            let result = await newBanner.save();

            if (!result) {
                deleteBannerImage();
                return res.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
            }

            return res.status(200).json({
                data: result,
                success: true,
                message: 'Banner added successfully'
            });

        } catch (error) {
            if (req.file?.filename) {
                let filePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            console.error('Error in addbanner:', error);
            return res.status(500).json({
                message: 'Internal Server Error',
                error: error.message,
                success: false
            });
        }
    },


    getBannersData: async (matchCondition) => {
        return await bannersSchema.aggregate([
            { $match: matchCondition },

            {
                $lookup: {
                    from: "categgggories",
                    localField: "HeadCategoryId",
                    foreignField: "_id",
                    as: "HeadCategory"
                }
            },

            {
                $lookup: {
                    from: "categgggories",
                    localField: "SubCategoryId",
                    foreignField: "_id",
                    as: "SubCategory"
                }
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "BrandId",
                    foreignField: "_id",
                    as: "Brands"
                }
            },
            {
                $lookup: {
                    from: "variantproducts",
                    localField: "VariantsProductsIds",
                    foreignField: "_id",
                    as: "VariantProducts"
                }
            },

            {
                $lookup: {
                    from: "products",
                    localField: "VariantProducts.ProductId",
                    foreignField: "_id",
                    as: "ProductData"
                }
            },

            {
                $lookup: {
                    from: "productservices",
                    localField: "ProductData.ProductServices.ProductServiceId",
                    foreignField: "_id",
                    as: "ProductServicesData"
                }
            },

            {
                $addFields: {
                    "ProductData": {
                        $map: {
                            input: "$ProductData",
                            as: "p",
                            in: {
                                $mergeObjects: [
                                    "$$p",
                                    {
                                        ProductServices: {
                                            $map: {
                                                input: "$$p.ProductServices",
                                                as: "ps",
                                                in: {
                                                    $mergeObjects: [
                                                        "$$ps",
                                                        {
                                                            ProductServiceData: {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $filter: {
                                                                            input: "$ProductServicesData",
                                                                            as: "psd",
                                                                            cond: { $eq: ["$$psd._id", "$$ps.ProductServiceId"] }
                                                                        }
                                                                    },
                                                                    0
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            {
                $lookup: {
                    from: "variants",
                    localField: "VariantProducts.VariantFields.VariantId",
                    foreignField: "_id",
                    as: "VariantDetails"
                }
            },

            {
                $lookup: {
                    from: "batches",
                    localField: "VariantProducts.BatchIds",
                    foreignField: "_id",
                    as: "BatchesInfo"
                }
            },

            {
                $addFields: {
                    "VariantProducts": {
                        $map: {
                            input: "$VariantProducts",
                            as: "vp",
                            in: {
                                $mergeObjects: [
                                    "$$vp",
                                    {
                                        VariantFields: {
                                            $map: {
                                                input: "$$vp.VariantFields",
                                                as: "vf",
                                                in: {
                                                    $mergeObjects: [
                                                        "$$vf",
                                                        {
                                                            VariantName: {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $map: {
                                                                            input: {
                                                                                $filter: {
                                                                                    input: "$VariantDetails",
                                                                                    as: "v",
                                                                                    cond: { $eq: ["$$v._id", "$$vf.VariantId"] }
                                                                                }
                                                                            },
                                                                            as: "v",
                                                                            in: "$$v.VariantName"
                                                                        }
                                                                    },
                                                                    0
                                                                ]
                                                            },
                                                            VariantValue: {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $map: {
                                                                            input: {
                                                                                $filter: {
                                                                                    input: "$VariantDetails",
                                                                                    as: "v",
                                                                                    cond: { $eq: ["$$v._id", "$$vf.VariantId"] }
                                                                                }
                                                                            },
                                                                            as: "v",
                                                                            in: "$$v.Value"
                                                                        }
                                                                    },
                                                                    0
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        BatchesInfo: {
                                            $filter: {
                                                input: "$BatchesInfo",
                                                as: "b",
                                                cond: { $in: ["$$b._id", "$$vp.BatchIds"] }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            {
                $addFields: {
                    ProductData: {
                        $map: {
                            input: "$ProductData",
                            as: "p",
                            in: {
                                $mergeObjects: [
                                    "$$p",
                                    {
                                        VariantProducts: {
                                            $filter: {
                                                input: "$VariantProducts",
                                                as: "vp",
                                                cond: { $eq: ["$$vp.ProductId", "$$p._id"] }
                                            }
                                        },


                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    ProductServicesData: 0,
                    VariantProducts: 0,
                    VariantDetails: 0,
                    BatchesInfo: 0
                }
            }
        ]);
    },


    getBannersById: async (req, res) => {
        let { Position, BannerType, companyId, BrandId, SubCategoryId, HeadCategoryId, BannerId } = req.query;

        try {
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({ message: 'Invalid companyId', success: false });
            }

            let matchCondition = { companyId: new mongoose.Types.ObjectId(String(companyId)) };

            if (HeadCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCategoryId)) {
                    return res.status(400).json({ message: 'Invalid HeadCategoryId format', success: false });
                }
                matchCondition.HeadCategoryId = new mongoose.Types.ObjectId(String(HeadCategoryId));
            }

            if (SubCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
                    return res.status(400).json({ message: 'Invalid SubCategoryId format', success: false });
                }
                matchCondition.SubCategoryId = new mongoose.Types.ObjectId(String(SubCategoryId));
            }

            if (BannerId) {
                if (!mongoose.Types.ObjectId.isValid(BannerId)) {
                    return res.status(400).json({ message: 'Invalid BannerId format', success: false });
                }
                matchCondition._id = new mongoose.Types.ObjectId(String(BannerId));
            }

            if (BrandId) {
                if (!mongoose.Types.ObjectId.isValid(BrandId)) {
                    return res.status(400).json({ message: 'Invalid BrandId format', success: false });
                }
                matchCondition.BrandId = new mongoose.Types.ObjectId(String(BrandId));
            }

            if (Position) {
                if (Position !== "SUB" && Position !== "HEAD") {
                    return res.status(400).json({ message: 'Invalid Position. Use "SUB" or "HEAD".', success: false });
                }
                matchCondition.Position = Position;
            }

            if (BannerType) {
                if (BannerType !== "Brand" && BannerType !== "Offer") {
                    return res.status(400).json({ message: 'Invalid BannerType. Use "Brand" or "Offer".', success: false });
                }
                matchCondition.BannerType = BannerType;
            }

            let data = await module.exports.getBannersData(matchCondition);


            if (!data || data.length === 0) {
                return res.status(404).json({ message: 'No banners found for the given criteria', success: false });
            }

            return res.status(200).json({ data, success: true, message: "Banners fetched successfully" });

        } catch (error) {
            console.error("Error in getBannersById:", error);
            return res.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
        }
    },


   
    deleteBanner: async (req, res) => {
        try {
            let { _id, companyId } = req.query;
            if (req.user.companyId) companyId = req.user.companyId

            if (!_id || !companyId) {
                return res.status(400).json({ message: 'Provide banner id and company id', success: false });
            }

            if (!mongoose.Types.ObjectId.isValid(_id)) {
                return res.status(400).json({ message: 'Invalid banner ID format', success: false });
            }
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({ message: 'Invalid company ID format', success: false });
            }

            let bannerObjectId = new mongoose.Types.ObjectId(String(_id));
            let companyObjectId = new mongoose.Types.ObjectId(String(companyId));

            let bannerData = await bannersSchema.findOne({ _id: bannerObjectId, companyId: companyObjectId });
            if (!bannerData) {
                return res.status(404).json({ message: 'Banner not found', success: false });
            }

            let productObjectIds = [];
            if (bannerData.BannerType === 'Offer' && bannerData.VariantsProductsIds?.length) {
                productObjectIds = bannerData.VariantsProductsIds.map(pid => new mongoose.Types.ObjectId(String(pid)));

                for (let prodObjectId of productObjectIds) {
                    let productData = await VariantProduct.findOne({ _id: prodObjectId });
                    if (productData && productData.OfferPercentage === bannerData.OfferPercentage) {
                        await VariantProduct.updateOne({ _id: prodObjectId }, { $set: { OfferPercentage: null } });
                    }
                }
                try {
                    await updateElasticById({ type: 'multipleVariantProducts', id: bannerData.VariantsProductsIds });
                } catch (e) {
                    console.error("❌ Elastic error:", e.message);
                }
            }

            if (bannerData.BannerImage) {
                let imagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', bannerData.BannerImage);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            let result = await bannersSchema.deleteOne({ _id: bannerObjectId, companyId: companyObjectId });

            return res.status(200).json({ data: result, success: true, message: "Banner deleted successfully" });

        } catch (error) {
            console.error("Error deleting banner:", error);
            return res.status(500).json({ error: error.message, success: false, message: "Internal Server Error" });
        }
    },

    // updateBannerDetails: async (req, resp) => {
    //     try {
    //         let { BannerId, BannerName } = req.body;
    //         let { companyId } = req.query;
    //         if (req.user.companyId) companyId = req.user.companyId

    //         if (!BannerId || !BannerName) {
    //             if (req.file?.filename) {
    //                 let imagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
    //                 if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    //             }
    //             return resp.status(400).json({ message: 'BannerId and BannerName are required', success: false });
    //         }

    //         if (!mongoose.Types.ObjectId.isValid(BannerId)) {
    //             return resp.status(400).json({ message: 'Invalid BannerId', success: false });
    //         }
    //         if (!mongoose.Types.ObjectId.isValid(companyId)) {
    //             return resp.status(400).json({ message: 'Invalid companyId', success: false });
    //         }

    //         let bannerObjectId = new mongoose.Types.ObjectId(String(BannerId));
    //         let companyObjectId = new mongoose.Types.ObjectId(String(companyId));

    //         let bannerData = { BannerName };

    //         if (req.file?.filename) {
    //             let existingBanner = await bannersSchema.findOne({ _id: bannerObjectId, companyId: companyObjectId });
    //             if (existingBanner?.BannerImage) {
    //                 let existingImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', existingBanner.BannerImage);
    //                 if (fs.existsSync(existingImagePath)) fs.unlinkSync(existingImagePath);
    //             }
    //             bannerData.BannerImage = req.file.filename;
    //         }

    //         let updatedResult = await bannersSchema.updateOne(
    //             { _id: bannerObjectId, companyId: companyObjectId },
    //             { $set: bannerData }
    //         );

    //         if (!updatedResult.modifiedCount) {
    //             if (req.file?.filename) {
    //                 let newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
    //                 if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
    //             }
    //             return resp.status(400).json({ message: 'Banner not updated', success: false });
    //         }

    //         return resp.status(200).json({ data: updatedResult, success: true, message: "Banner updated successfully" });

    //     } catch (error) {
    //         if (req.file?.filename) {
    //             let imagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
    //             if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    //         }
    //         console.error("Error in updateBannerDetails:", error);
    //         return resp.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
    //     }
    // },
    // updateProductsById: async (req, resp) => {
    //     try {
    //         let { BannerId, VariantsProductsId, BannerType } = req.body;
    //         let companyId = req.user.companyId || req.query.companyId;

    //         if (!BannerId || !Array.isArray(VariantsProductsId)) {
    //             return resp.status(400).json({ message: 'Invalid data', success: false });
    //         }

    //         if (BannerType !== 'Offer') {
    //             return resp.status(400).json({ message: 'BannerType must be "Offer"', success: false });
    //         }

    //         const bannerObjectId = new mongoose.Types.ObjectId(String(BannerId));
    //         const companyObjectId = new mongoose.Types.ObjectId(String(companyId));
    //         const newVariantIds = VariantsProductsId.map(id => new mongoose.Types.ObjectId(String(id)));

    //         const existingBanner = await bannersSchema.findOne({
    //             _id: bannerObjectId,
    //             companyId: companyObjectId,
    //             BannerType
    //         });

    //         if (!existingBanner) {
    //             return resp.status(404).json({ message: "Banner not found", success: false });
    //         }

    //         const oldVariantIds = existingBanner.VariantsProductsIds.map(id => id.toString());
    //         const newVariantIdsString = newVariantIds.map(id => id.toString());

    //         const removedIds = oldVariantIds.filter(id => !newVariantIdsString.includes(id));

    //         const addedIds = newVariantIdsString.filter(id => !oldVariantIds.includes(id));

    //         existingBanner.VariantsProductsIds = newVariantIds;
    //         await existingBanner.save();

    //         if (removedIds.length > 0) {
    //             await VariantProduct.updateMany(
    //                 { _id: { $in: removedIds }, OfferPercentage: existingBanner.OfferPercentage },
    //                 { $set: { OfferPercentage: null } }
    //             );
    //         }

    //         if (addedIds.length > 0) {
    //             await VariantProduct.updateMany(
    //                 { _id: { $in: addedIds } },
    //                 { $set: { OfferPercentage: existingBanner.OfferPercentage } }
    //             );
    //         }

    //         try {
    //             await updateElasticById({
    //                 type: 'multipleVariantProducts',
    //                 id: [...removedIds, ...addedIds]
    //             });
    //         } catch (e) {
    //             console.error("Elastic error:", e.message);
    //         }

    //         return resp.status(200).json({
    //             success: true,
    //             message: "Banner products updated successfully",
    //             data: existingBanner
    //         });

    //     } catch (error) {
    //         console.error("Error:", error);
    //         return resp.status(500).json({
    //             success: false,
    //             message: "Internal Server Error",
    //             error: error.message
    //         });
    //     }
    // },
   
    updateBannerDetails: async (req, resp) => {
        try {
            let { BannerId, BannerName, VariantsProductsId, BannerType } = req.body;
            let companyId = req.user.companyId || req.query.companyId;


            if (!BannerId || !mongoose.Types.ObjectId.isValid(BannerId)) {
                return resp.status(400).json({ message: "Valid BannerId required", success: false });
            }

            if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
                return resp.status(400).json({ message: "Valid companyId required", success: false });
            }

            const bannerObjectId = new mongoose.Types.ObjectId(String(BannerId));
            const companyObjectId = new mongoose.Types.ObjectId(String(companyId));


            const existingBanner = await bannersSchema.findOne({
                _id: bannerObjectId,
                companyId: companyObjectId
            });

            if (!existingBanner) {
                if (req.file?.filename) {
                    let imagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
                return resp.status(404).json({ message: "Banner not found", success: false });
            }


            if (BannerName) {
                existingBanner.BannerName = BannerName;
            }

            if (req.file?.filename) {
                if (existingBanner.BannerImage) {
                    let oldImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', existingBanner.BannerImage);
                    if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
                }
                existingBanner.BannerImage = req.file.filename;
            }


            if (BannerType === "Offer" && Array.isArray(VariantsProductsId)) {

                const newVariantIds = VariantsProductsId.map(id =>
                    new mongoose.Types.ObjectId(String(id))
                );

                const oldVariantIds = existingBanner.VariantsProductsIds.map(id => id.toString());
                const newVariantIdsString = newVariantIds.map(id => id.toString());

                const removedIds = oldVariantIds.filter(id => !newVariantIdsString.includes(id));
                const addedIds = newVariantIdsString.filter(id => !oldVariantIds.includes(id));

                existingBanner.VariantsProductsIds = newVariantIds;

                if (removedIds.length > 0) {
                    await VariantProduct.updateMany(
                        { _id: { $in: removedIds }, OfferPercentage: existingBanner.OfferPercentage },
                        { $set: { OfferPercentage: null } }
                    );
                }

                if (addedIds.length > 0) {
                    await VariantProduct.updateMany(
                        { _id: { $in: addedIds } },
                        { $set: { OfferPercentage: existingBanner.OfferPercentage } }
                    );
                }

                try {
                    await updateElasticById({
                        type: 'multipleVariantProducts',
                        id: [...removedIds, ...addedIds]
                    });
                } catch (e) {
                    console.error("Elastic error:", e.message);
                }
            }


            await existingBanner.save();

            return resp.status(200).json({
                success: true,
                message: "Banner updated successfully",
                data: existingBanner
            });

        } catch (error) {

            if (req.file?.filename) {
                let imagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }

            console.error("Error in updateBanner:", error);

            return resp.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    }
}
