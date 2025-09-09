const { data } = require('jquery')
const bannersSchema = require('./ShoppingBanners.model');
const { ObjectID } = require('mongodb');
const { query } = require('express');
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const ProductsModel = require('../Products/Products.model')
module.exports = {

    addbanner: async (req, resp) => {
        try {
            let { companyId, BannerName, SubCategoryId, HeadCategoryId, BrandId, Position, ProductsId, OfferPercentage, BannerType } = req.body;
            if (ProductsId) {
                ProductsId = JSON.parse(ProductsId)

            }
            if (BannerType == 'Brand') {
                if (!companyId || !BannerName || !SubCategoryId || !HeadCategoryId || !BrandId) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
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
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Offer') {
                if (!companyId || !BannerName || !SubCategoryId || !HeadCategoryId || !ProductsId || !OfferPercentage) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
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

                if (req.file) {
                    bannerData.BannerImage = req.file.filename;
                }
                else {
                    return resp.status(400).json({ message: 'please Upload The Image', success: false })
                }
                if (ProductsId && ProductsId.length !== 0) {
                    for (let Prod_id of ProductsId) {
                        console.log(OfferPercentage, 'Offepercentage')
                        let newresult = await ProductsModel.Products.updateOne({ _id: Prod_id }, {
                            $set: {
                                offerPercentage: OfferPercentage
                            }
                        });
                    }
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
        } catch (error) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }
            return resp.status(500).json({ error: error.message, success: false });
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
            let matchCondition = { companyId: mongoose.Types.ObjectId(companyId) };

            if (HeadCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCategoryId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCategoryId = mongoose.Types.ObjectId(HeadCategoryId);
            }
            if (SubCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCategoryId = mongoose.Types.ObjectId(SubCategoryId);
            }
            if (BannerId) {
                if (!mongoose.Types.ObjectId.isValid(BannerId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId(BannerId);
            }
            if (BrandId) {
                if (!mongoose.Types.ObjectId.isValid(BrandId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.BrandId = mongoose.Types.ObjectId(BrandId);
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

            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false });
        }
    },

    updateProductsById: async (req, resp) => {
        try {
            let { BannerId, ProductsId, BannerType } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!BannerId || !ProductsId || ProductsId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }
            if (BannerType !== 'Offer') {
                return resp.status(400).send('Please provide banner type or banner type must be offer');
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

                    return resp.status(200).json({ data: updatedResult, success: true });
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
                    return resp.status(200).json({ data: updatedResult, success: true });
                }

            }
        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false });
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
            if (bannerdatanew.BannerImage) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', bannerdatanew.BannerImage);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            let result = await bannersSchema.deleteOne({ _id: _id, companyId: companyId })

            return res.status(200).json({ data: result, success: true });
        } catch (error) {
            return res.status(400).json({ error: error.message, success: false });

        }
    },
    updateBannerDetails: async (req, resp) => {
        try {
            const { BannerId, BannerName } = req.body;
            const companyId = req.query.companyId;

            if (!BannerId || !BannerName) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
                return resp.status(400).send('Please insert valid data');

            }


            else {
                const bannerData = {
                    BannerName
                }
                if (req.file) {
                    const existingBanner = await bannersSchema.findOne({ _id: BannerId, companyId: companyId })
                    if (existingBanner && existingBanner.BannerImage) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', existingBanner.BannerImage);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
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
                    return resp.status(400).json({ message: 'not updated', success: false });
                }
                else {
                    return resp.status(200).json({ data: updatedResult, success: true });
                }

            }
        } catch (error) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'BannerImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }

            return resp.status(400).json({ error: error.message, success: false });
        }
    }




}
