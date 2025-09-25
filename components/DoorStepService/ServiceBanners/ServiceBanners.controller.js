const serviceBannerModel = require('./ServiceBanners.model')
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const ServiceModel = require('../ServiceProducts/ServiceProducts.model');
module.exports = {

    addbanner: async (req, resp) => {
        try {
            let { companyId, BannerName, SubServiceId, HeadServiceId, ProviderId, Position, ServicesId, OfferPercentage, BannerType } = req.body;
            console.log(req.body)
            if (ServicesId) {
                ServicesId = JSON.parse(ServicesId)

            }
            // if (BannerType == 'Provider') {
            //     if (!companyId || !BannerName || !SubServiceId || !HeadServiceId || !ProviderId) {
            //         const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage', req.file.filename);
            //         if (fs.existsSync(newImagePath)) {
            //             fs.unlinkSync(newImagePath);
            //         }
            //         return resp.status(400).json({ message: 'please filled all required fields', success: false })
            //     }
            //     const bannerData = {
            //         companyId,
            //         BannerName,
            //         SubServiceId,
            //         HeadServiceId,
            //         ProviderId,
            //         Position,
            //         BannerType,
            //     };

            //     if (req.file) {
            //         bannerData.BannerImage = req.file.filename;
            //     }
            //     else {
            //         return resp.status(400).json({ message: 'please Upload The Image', success: false })
            //     }


            //     const newBanner = new serviceBannerModel(bannerData);
            //     const result = await newBanner.save();
            //     if (!result) {
            //         const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage', req.file.filename);
            //         if (fs.existsSync(newImagePath)) {
            //             fs.unlinkSync(newImagePath);
            //         }

            //         return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
            //     }

            //     return resp.status(200).json({ data: result, success: true });
            // }
            // else 
            if (BannerType == 'Offer') {
                if (!companyId || !BannerName || !SubServiceId || !HeadServiceId || !ServicesId || !OfferPercentage) {
                  if(req.file?.filename){
                      const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                  }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubServiceId,
                    HeadServiceId,
                    ServicesId,
                    OfferPercentage,
                    Position,
                    BannerType,
                };

                if (req.file) {
                    bannerData.BannerImage = req.file.filename;
                }
                // else {
                //     return resp.status(400).json({ message: 'please Upload The Image', success: false })
                // }
                if (ServicesId && ServicesId.length !== 0) {
                    for (let Ser_id of ServicesId) {
                        console.log(OfferPercentage, 'Offepercentage')
                        let newresult = await ServiceModel.serviceProductsModel.updateOne({ _id: Ser_id }, {
                            $set: {
                                offerPercentage: OfferPercentage
                            }
                        });
                    }
                }
                // bannerData.BannerImage="image.jpg"
                const newBanner = new serviceBannerModel(bannerData);
                const result = await newBanner.save();
                if (!result) {
                    if(req.file?.filename){
                      const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                  }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
        } catch (error) {
            if(req.file?.filename){
                      const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                  }
            return resp.status(500).json({ error: error.message, success: false });
        }
    },


    getBannersData: async (matchCondition) => {

        return await serviceBannerModel.aggregate([
            { $match: matchCondition },
            {
                $lookup: {
                    from: "masterservicecategories",
                    localField: "HeadServiceId",
                    foreignField: "_id",
                    as: "HeadServiceInfo",
                }
            },
            {
                $lookup: {
                    from: "masterservicecategories",
                    localField: "SubServiceId",
                    foreignField: "_id",
                    as: "SubServiceInfo",
                }
            }, {
                $lookup: {
                    from: "serviceproducts",
                    localField: "ServicesId",
                    foreignField: "_id",
                    as: "ServicesInfo",
                }
            },
            {
                $lookup: {
                    from: "serviceproviders",
                    localField: "ProviderId",
                    foreignField: "_id",
                    as: "ProviderInfo",
                }
            }
        ]);

    },
    getBannersById: async (req, res) => {
        const { Position, BannerType, companyId, ProviderId, SubServiceId, HeadServiceId, BannerId } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (HeadServiceId) {
                if (!mongoose.Types.ObjectId.isValid(HeadServiceId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadServiceId = mongoose.Types.ObjectId.createFromHexString(HeadServiceId);
            }
            if (SubServiceId) {
                if (!mongoose.Types.ObjectId.isValid(SubServiceId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubServiceId = mongoose.Types.ObjectId.createFromHexString(SubServiceId);
            }
            if (BannerId) {
                if (!mongoose.Types.ObjectId.isValid(BannerId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId.createFromHexString(BannerId);
            }
            if (ProviderId) {
                if (!mongoose.Types.ObjectId.isValid(ProviderId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ProviderId = mongoose.Types.ObjectId.createFromHexString(ProviderId);
            }
            if (Position) {
                if (Position !== "SUB" && Position !== "HEAD") {
                    return res.status(400).json({ message: 'please provide correct Position', success: false });
                }
                else {
                    matchCondition.Position = Position;

                }
            }
            if (BannerType) {
                if (BannerType !== "Provider" && BannerType !== "Offer") {
                    return res.status(400).json({ message: 'please provide correct Banner Type', success: false });
                }
                else {
                    matchCondition.BannerType = BannerType;

                }
            }

            const data = await module.exports.getBannersData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No banner found ', success: false });
            }

            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false });
        }
    },

    updateProductsById: async (req, resp) => {
        try {
            let { BannerId, ServicesId, BannerType } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!BannerId || !ServicesId || ServicesId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }
            if (BannerType !== 'Offer') {
                return resp.status(400).send('Please provide banner type or banner type must be offer');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await serviceBannerModel.findOneAndUpdate(
                        { _id: BannerId, companyId: companyId, BannerType: BannerType },
                        { $pull: { ServicesId: { $in: ServicesId } } },
                        { new: true }
                    );

                    if (ServicesId && updatedResult.BannerType === 'Offer') {
                        let productdata = await ServiceModel.serviceProductsModel.findOne({ _id: ServicesId });
                        if (productdata.offerPercentage == updatedResult.OfferPercentage) {
                            const updateProduct = await ServiceModel.serviceProductsModel.updateOne({ _id: ServicesId }, { $set: { offerPercentage: null } })
                        }
                    }

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await serviceBannerModel.findOneAndUpdate(
                        { _id: BannerId, companyId: companyId, BannerType: BannerType },
                        { $addToSet: { ServicesId: { $each: ServicesId } } },
                        { new: true }
                    );
                    if (ServicesId && ServicesId.length !== 0 && updatedResult.BannerType == 'Offer') {
                        const updateOperations = ServicesId.map(Prod_id => ({
                            updateOne: {
                                filter: { _id: Prod_id },
                                update: { $set: { offerPercentage: updatedResult.OfferPercentage } }
                            }
                        }));

                        if (updateOperations.length > 0) {
                            await ServiceModel.serviceProductsModel.bulkWrite(updateOperations);
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
            let bannerdatanew = await serviceBannerModel.findOne({ _id: _id, companyId: companyId })
            if (bannerdatanew && bannerdatanew.BannerType == 'Offer') {
                for (SerId of bannerdatanew.ServicesId) {
                    let productdata = await ServiceModel.serviceProductsModel.findOne({ _id: SerId });
                    if (productdata.offerPercentage == bannerdatanew.OfferPercentage) {
                        const updateProduct = await ServiceModel.serviceProductsModel.updateOne({ _id: SerId }, { $set: { offerPercentage: null } })
                        console.log(updateProduct,'update')
                    }
                }
            }
            if(bannerdatanew.BannerImage){
                if(req.file?.filename){
                      const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                  }
            }
            let result = await serviceBannerModel.deleteOne({ _id: _id, companyId: companyId })

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
                if(req.file?.filename){
                      const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                  }
                return resp.status(400).send('Please insert valid data');

            }


            else {
                const bannerData = {
                    BannerName
                }
                if (req.file) {
                    const existingBanner = await serviceBannerModel.findOne({ _id: BannerId, companyId: companyId })
                    if (existingBanner && existingBanner.BannerImage) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage', existingBanner.BannerImage);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    bannerData.BannerImage = req.file.filename;
                }

                let updatedResult = await serviceBannerModel.updateOne(
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
             if(req.file?.filename){
                      const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                  }
            return resp.status(400).json({ error: error.message, success: false });
        }
    }




}
