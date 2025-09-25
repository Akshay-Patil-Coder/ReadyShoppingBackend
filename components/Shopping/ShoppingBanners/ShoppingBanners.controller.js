const bannersSchema = require('./ShoppingBanners.model');
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const ProductsModel = require('../Products/Products.model')
module.exports = {

    addbanner: async (req, resp) => {
        try {
            let { companyId, BannerName, SubCategoryId, HeadCategoryId, BrandId, Position, ProductsId, OfferPercentage, BannerType } = req.body;
            if (ProductsId) {
                try {
                    ProductsId = JSON.parse(ProductsId);
                } catch {
                    if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'Invalid ProductsId format', success: false });
                }
            }

            if (BannerType == 'Brand') {
                if (!companyId || !BannerName || !SubCategoryId || !HeadCategoryId || !BrandId) {
                    if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCategoryId,
                    HeadCategoryId,
                    BrandId,
                    Position,
                    BannerType,
                };

                if (req.file) {
                    bannerData.BannerImage = req.file.filename;
                }
                else {
                    return resp.status(400).json({ message: 'please Upload The Image', success: false })
                }


                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                    if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true, message: "Banner Added Successfully" });
            }
            else if (BannerType == 'Offer') {
                if (!companyId || !BannerName || !SubCategoryId || !HeadCategoryId || !ProductsId || !OfferPercentage) {
                    if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }

                if (OfferPercentage) {
                    OfferPercentage = Number(OfferPercentage);
                    if (isNaN(OfferPercentage) || OfferPercentage < 0 || OfferPercentage >= 100) {
                        if (req.file?.filename) {
                            const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                            if (fs.existsSync(newImagePath)) {
                                fs.unlinkSync(newImagePath);
                            }
                        }
                        return resp.status(400).send({
                            success: false,
                            message: "OfferPercentage must be a number between 0 and 99"
                        });
                    }
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCategoryId,
                    HeadCategoryId,
                    ProductsId,
                    OfferPercentage,
                    Position,
                    BannerType,
                };

                if (req.file?.filename) {
                    bannerData.BannerImage = req.file.filename;
                }
                else {
                    return resp.status(400).json({ message: 'please Upload The Image', success: false })
                }
                if (ProductsId && ProductsId.length !== 0) {
                    await ProductsModel.Products.updateMany(
                        { _id: { $in: ProductsId } },
                        { $set: { offerPercentage: OfferPercentage } }
                    );
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                    if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true, message: "Banner Added Successfully" });
            }
        } catch (error) {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            return resp.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
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
                    as: "HeadCategoryInfo",
                }
            },
            {
                $lookup: {
                    from: "categgggories",
                    localField: "SubCategoryId",
                    foreignField: "_id",
                    as: "SubCategoriesInfo",
                }
            }, {
                $lookup: {
                    from: "products",
                    localField: "ProductsId",
                    foreignField: "_id",
                    as: "ProductsInfo",
                }
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "BrandId",
                    foreignField: "_id",
                    as: "BrandsInfo",
                }
            }
        ]);

    },
    getBannersById: async (req, res) => {
        const { Position, BannerType, companyId, BrandId, SubCategoryId, HeadCategoryId, BannerId } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (HeadCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCategoryId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCategoryId = mongoose.Types.ObjectId.createFromHexString(HeadCategoryId);
            }
            if (SubCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCategoryId = mongoose.Types.ObjectId.createFromHexString(SubCategoryId);
            }
            if (BannerId) {
                if (!mongoose.Types.ObjectId.isValid(BannerId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId.createFromHexString(BannerId);
            }
            if (BrandId) {
                if (!mongoose.Types.ObjectId.isValid(BrandId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.BrandId = mongoose.Types.ObjectId.createFromHexString(BrandId);
            }
            if (Position) {
                if (Position !== "SUB" && Position !== "HEAD") {
                    return res.status(400).json({ message: 'please provide Position', success: false });
                }
                else {
                    matchCondition.Position = Position;

                }
            }
            if (BannerType) {
                if (BannerType !== "Brand" && BannerType !== "Offer") {
                    return res.status(400).json({ message: 'please provide Banner Type', success: false });
                }
                else {
                    matchCondition.BannerType = BannerType;

                }
            }

            const data = await module.exports.getBannersData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Banners found for this Data', success: false });
            }

            return res.status(200).json({ data: data, success: true, message: "Banner Fetched Successfully" });

        } catch (error) {
            res.status(400).json({ message: "Internal Server Error", error: error.message, success: false });
        }
    },

    updateProductsById: async (req, resp) => {
        try {
            let { BannerId, ProductsId, BannerType } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!BannerId || !ProductsId || ProductsId.length === 0) {
                return resp.status(400).send({ messgae: 'Please insert valid data', success: false });
            }
            if (BannerType !== 'Offer') {
                return resp.status(400).send({ message: 'Please provide banner type or banner type must be offer', success: false });
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await bannersSchema.findOneAndUpdate(
                        { _id: BannerId, companyId: companyId, BannerType: BannerType },
                        { $pull: { ProductsId: { $in: ProductsId } } },
                        { new: true }
                    );

                    if (ProductsId && updatedResult.BannerType === 'Offer') {
                        let productdata = await ProductsModel.Products.findOne({ _id: ProductsId });
                        if (productdata.offerPercentage == updatedResult.OfferPercentage) {
                            const updateProduct = await ProductsModel.Products.updateOne({ _id: ProductsId }, { $set: { offerPercentage: null } })
                        }
                    }

                    return resp.status(200).json({ data: updatedResult, success: true, message: "product deleted successfully from given offer banner" });
                }
                if (operation === 'add') {
                    let updatedResult = await bannersSchema.findOneAndUpdate(
                        { _id: BannerId, companyId: companyId, BannerType: BannerType },
                        { $addToSet: { ProductsId: { $each: ProductsId } } },
                        { new: true }
                    );
                    if (ProductsId && ProductsId.length !== 0 && updatedResult.BannerType == 'Offer') {
                        const updateOperations = ProductsId.map(Prod_id => ({
                            updateOne: {
                                filter: { _id: Prod_id },
                                update: { $set: { offerPercentage: updatedResult.OfferPercentage } }
                            }
                        }));

                        if (updateOperations.length > 0) {
                            await ProductsModel.Products.bulkWrite(updateOperations);
                        }
                    }
                    return resp.status(200).json({ data: updatedResult, success: true, message: 'product added successfully in given offer banner' });
                }

            }
        } catch (error) {
            return resp.status(400).json({ message: "Internal Server Error", error: error.message, success: false });
        }

    },
    deleteBanner: async (req, res) => {
        try {
            let _id = req.query._id;
            let companyId = req.query.companyId;
            if (!_id || !companyId) {
                return res.status(400).json({ message: 'provide brand id and company id', success: false });
            }
            if (_id) {
                if (!mongoose.Types.ObjectId.isValid(_id)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
            }
            if (companyId) {
                if (!mongoose.Types.ObjectId.isValid(companyId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: true });
                }
            }
            let bannerdatanew = await bannersSchema.findOne({ _id: _id, companyId: companyId })
            if (bannerdatanew && bannerdatanew.BannerType == 'Offer') {
                for (ProdId of bannerdatanew.ProductsId) {
                    let productdata = await ProductsModel.Products.findOne({ _id: ProdId });
                    if (productdata.offerPercentage == bannerdatanew.OfferPercentage) {
                        const updateProduct = await ProductsModel.Products.updateOne({ _id: ProdId }, { $set: { offerPercentage: null } })
                    }
                }
            }
            if (bannerdatanew?.BannerImage) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', bannerdatanew.BannerImage);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
            }
            let result = await bannersSchema.deleteOne({ _id: _id, companyId: companyId })

            return res.status(200).json({ data: result, success: true, message: "banner deleted successfully" });
        } catch (error) {
            return res.status(400).json({ error: error.message, success: false, message: "Internal Server Error" });

        }
    },
    updateBannerDetails: async (req, resp) => {
        try {
            const { BannerId, BannerName } = req.body;
            const companyId = req.query.companyId;

            if (!BannerId || !BannerName) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
            }


            else {
                const bannerData = {
                    BannerName
                }
                if (req.file?.filename) {
                    const existingBanner = await bannersSchema.findOne({ _id: BannerId, companyId: companyId })
                    if (existingBanner && existingBanner.BannerImage) {
                            const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', existingBanner.BannerImage);
                            if (fs.existsSync(newImagePath)) {
                                fs.unlinkSync(newImagePath);
                            }
                    }
                    bannerData.BannerImage = req.file.filename;
                }

                let updatedResult = await bannersSchema.updateOne(
                    { _id: BannerId, companyId: companyId },
                    {
                        $set: bannerData
                    }
                );
                if (!updatedResult) {
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'not updated', success: false });
                }
                else {
                  
                    return resp.status(200).json({ data: updatedResult, success: true, message: "updated successfully" });
                }

            }
        } catch (error) {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            return resp.status(400).json({ error: error.message, success: false, message: "Internal Server Error" });
        }
    }




}
