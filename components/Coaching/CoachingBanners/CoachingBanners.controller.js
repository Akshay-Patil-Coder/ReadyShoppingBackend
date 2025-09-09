const { data } = require('jquery')
const bannersSchema = require('./CoachingBanners.model');
const { ObjectID, ObjectId } = require('mongodb');
const { query } = require('express');
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const { CoachingCourceModel } = require('../CoachingCource/CoachingCource.model')
module.exports = {

    addbanner: async (req, resp) => {
        try {
            let { companyId, BannerName, SubCourceCatId, HeadCourceCatId, AdvertiserId, AdvertiserType, Position, SkillId, CourcesId, OfferPercentage, BannerType } = req.body;
            if (CourcesId) {
                CourcesId = JSON.parse(CourcesId)
            }
            if (BannerType == 'Skill') {
                if (!companyId || !BannerName || !SubCourceCatId || !HeadCourceCatId || !SkillId) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourceCatId,
                    HeadCourceCatId,
                    SkillId,
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
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Offer') {
                if (!companyId || !BannerName || !SubCourceCatId || !HeadCourceCatId || !CourcesId || !OfferPercentage) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourceCatId,
                    HeadCourceCatId,
                    CourcesId,
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
                if (CourcesId && CourcesId.length !== 0) {
                    for (let Cource_id of CourcesId) {
                        console.log(OfferPercentage, 'Offepercentage')
                        let newresult = await CoachingCourceModel.updateOne({ _id: Cource_id }, {
                            $set: {
                                offerPercentage: OfferPercentage
                            }
                        });
                    }
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Advertiser') {
                if (!companyId || !BannerName || !SubCourceCatId || !HeadCourceCatId || !AdvertiserId || !AdvertiserType) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }

                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourceCatId,
                    HeadCourceCatId,
                    AdvertiserId,
                    AdvertiserType,
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
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Offer-Skill') {
                if (!companyId || !BannerName || !SubCourceCatId || !HeadCourceCatId || !CourcesId || !OfferPercentage || !SkillId) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourceCatId,
                    HeadCourceCatId,
                    CourcesId,
                    OfferPercentage,
                    SkillId,
                    Position,
                    BannerType,
                };

                if (req.file) {
                    bannerData.BannerImage = req.file.filename;
                }
                else {
                    return resp.status(400).json({ message: 'please Upload The Image', success: false })
                }
                if (CourcesId && CourcesId.length !== 0) {
                    for (let Cource_id of CourcesId) {
                        console.log(OfferPercentage, 'Offepercentage')
                        let newresult = await CoachingCourceModel.updateOne({ _id: Cource_id }, {
                            $set: {
                                offerPercentage: OfferPercentage
                            }
                        });
                    }
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Offer-Advertiser') {
                if (!companyId || !BannerName || !SubCourceCatId || !HeadCourceCatId || !CourcesId || !OfferPercentage || !AdvertiserId || !AdvertiserType) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourceCatId,
                    HeadCourceCatId,
                    CourcesId,
                    OfferPercentage,
                    AdvertiserId,
                    AdvertiserType,
                    Position,
                    BannerType,
                };

                if (req.file) {
                    bannerData.BannerImage = req.file.filename;
                }
                else {
                    return resp.status(400).json({ message: 'please Upload The Image', success: false })
                }
                if (CourcesId && CourcesId.length !== 0) {
                    for (let Cource_id of CourcesId) {
                        console.log(OfferPercentage, 'Offepercentage')
                let newresult = await CoachingCourceModel.updateOne({ _id: CourcesId }, {
                    $set: {
                        offerPercentage: OfferPercentage
                    }
                });
                    }
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Skill-Advertiser') {
                if (!companyId || !BannerName || !SubCourceCatId || !HeadCourceCatId || !AdvertiserId || !AdvertiserType || !SkillId) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }

                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourceCatId,
                    HeadCourceCatId,
                    AdvertiserId,
                    AdvertiserType,
                    SkillId,
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
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'AllCombined') {
                if (!companyId || !BannerName || !SubCourceCatId || !HeadCourceCatId || !CourcesId || !OfferPercentage || !AdvertiserId || !AdvertiserType || !SkillId) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourceCatId,
                    HeadCourceCatId,
                    CourcesId,
                    OfferPercentage,
                    AdvertiserId,
                    AdvertiserType,
                    SkillId,
                    Position,
                    BannerType,
                };

                if (req.file) {
                    bannerData.BannerImage = req.file.filename;
                }
                else {
                    return resp.status(400).json({ message: 'please Upload The Image', success: false })
                }
                if (CourcesId && CourcesId.length !== 0) {
                    for (let Cource_id of CourcesId) {
                        console.log(OfferPercentage, 'Offepercentage')
                let newresult = await CoachingCourceModel.updateOne({ _id: CourcesId }, {
                    $set: {
                        offerPercentage: OfferPercentage
                    }
                });
                    }
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }

        } catch (error) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
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
                    from: "coachingcategories",
                    localField: "HeadCourceCatId",
                    foreignField: "_id",
                    as: "HeadCourceCategoryInfo",
                }
            },
            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "SubCourceCatId",
                    foreignField: "_id",
                    as: "SubCourceCategoryInfo",
                }
            },
            {
                $lookup: {
                    from: "coachingcources",
                    localField: "CourcesId",
                    foreignField: "_id",
                    as: "CourcesInfo",
                }
            },
            {
                $lookup: {
                    from: "coachingprovidertypes",
                    localField: "AdvertiserType",
                    foreignField: "_id",
                    as: "AdvertiserTypeInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingclasses",
                    localField: "AdvertiserId",
                    foreignField: "_id",
                    as: "ClassAdvertiserInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingtutors",
                    localField: "AdvertiserId",
                    foreignField: "_id",
                    as: "TutorAdvertiserInfo"
                }
            },
            {
                $lookup: {
                    from: "coachinguniversities",
                    localField: "AdvertiserId",
                    foreignField: "_id",
                    as: "UniversityAdvertiserInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingcompanies",
                    localField: "AdvertiserId",
                    foreignField: "_id",
                    as: "CompanyAdvertiserInfo"
                }
            },

            {
                $addFields: {
                    AdvertiserTypeValue: { $arrayElemAt: ["$AdvertiserTypeInfo", 0] },
                }
            },

            {
                $addFields: {
                    ProviderInfo: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$AdvertiserTypeValue.CourceProviderType", "Class"] }, then: "$ClassAdvertiserInfo" },
                                { case: { $eq: ["$AdvertiserTypeValue.CourceProviderType", "Tutor"] }, then: "$TutorAdvertiserInfo" },
                                { case: { $eq: ["$AdvertiserTypeValue.CourceProviderType", "University"] }, then: "$UniversityAdvertiserInfo" },
                                { case: { $eq: ["$AdvertiserTypeValue.CourceProviderType", "Company"] }, then: "$CompanyAdvertiserInfo" }
                            ],
                            default: []
                        }
                    },
                }
            },

            {
                $project: {
                    ClassProviderInfo: 0,
                    TutorProviderInfo: 0,
                    UniversityProviderInfo: 0,
                    CompanyProviderInfo: 0
                }
            },

            {
                $lookup: {
                    from: "coachingskills",
                    localField: "SkillId",
                    foreignField: "_id",
                    as: "SkillsInfo",
                }
            }
        ]);

    },
    getBannersById: async (req, res) => {
        const { Position, BannerType, companyId, HeadCourceCatId, SubCourceCatId, AdvertiserId, AdvertiserType, SkillId, BannerId } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId(companyId) };

            if (HeadCourceCatId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCourceCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCourceCatId = mongoose.Types.ObjectId(HeadCourceCatId);
            }
            if (SubCourceCatId) {
                if (!mongoose.Types.ObjectId.isValid(SubCourceCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCourceCatId = mongoose.Types.ObjectId(SubCourceCatId);
            }
            if (BannerId) {
                if (!mongoose.Types.ObjectId.isValid(BannerId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId(BannerId);
            }
            if (AdvertiserId) {
                if (!mongoose.Types.ObjectId.isValid(AdvertiserId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.AdvertiserId = mongoose.Types.ObjectId(AdvertiserId);
            }
            if (AdvertiserType) {
                if (!mongoose.Types.ObjectId.isValid(AdvertiserType)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.AdvertiserType = mongoose.Types.ObjectId(AdvertiserType);
            }
            if (SkillId) {
                if (!mongoose.Types.ObjectId.isValid(SkillId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SkillId = mongoose.Types.ObjectId(SkillId);
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
                if (BannerType == "Skill" || BannerType == "Offer" || BannerType == "Advertiser" || BannerType == "Offer-Skill" || BannerType == "Offer-Advertiser" || BannerType == "Skill-Advertiser" || BannerType == "AllCombined") {
                    matchCondition.BannerType = BannerType;
                }
                else {
                    return res.status(400).json({ message: 'please provide Banner Type', success: false });
                   
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
            let { BannerId, CourcesId, BannerType } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            BannerId = ObjectId(BannerId)
            if (!BannerId || !CourcesId || CourcesId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }
            if (BannerType !== 'Offer' && BannerType !== 'Offer-Skill' && BannerType !== 'Offer-Advertiser' && BannerType !== 'AllCombined') {
                return resp.status(400).send('Please provide banner type or banner type must be offer');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await bannersSchema.findOneAndUpdate(
                        { _id: BannerId, companyId: companyId, BannerType: BannerType },
                        { $pull: { CourcesId: { $in: CourcesId } } },
                        { new: true }
                    );
                    if (CourcesId && (updatedResult.BannerType === 'Offer' || updatedResult.BannerType === 'Offer-Skill' || updatedResult.BannerType === 'Offer-Advertiser' || updatedResult.BannerType === 'AllCombined')) {
                    let updateOperations;
                        for (let EachCourceId of CourcesId) {
                            let productdata = await CoachingCourceModel.findOne({ _id: EachCourceId });
                            if (productdata.offerPercentage == updatedResult.OfferPercentage) {
                                 updateOperations = CourcesId.map(Cource_id => ({
                                    updateOne: {
                                        filter: { _id: Cource_id },
                                        update: { $set: { offerPercentage: null } }
                                    }
                                }));
                              
                            }
                           
                        }
                        if (updateOperations.length > 0) {
                            await CoachingCourceModel.bulkWrite(updateOperations);
                        }
                    }

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await bannersSchema.findOneAndUpdate(
                        { _id: BannerId, companyId: companyId, BannerType: BannerType },
                        { $addToSet: { CourcesId: { $each: CourcesId } } },
                        { new: true }
                    );
                    if (CourcesId && CourcesId.length !== 0 && (updatedResult.BannerType === 'Offer' || updatedResult.BannerType === 'Offer-Skill' || updatedResult.BannerType === 'Offer-Advertiser' || updatedResult.BannerType === 'AllCombined')) {
                        const updateOperations = CourcesId.map(Cource_id => ({
                            updateOne: {
                                filter: { _id: Cource_id },
                                update: { $set: { offerPercentage: updatedResult.OfferPercentage } }
                            }
                        }));

                        if (updateOperations.length > 0) {
                            await CoachingCourceModel.bulkWrite(updateOperations);
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
            if (bannerdatanew && (bannerdatanew.BannerType === 'Offer' || bannerdatanew.BannerType === 'Offer-Skill' || bannerdatanew.BannerType === 'Offer-Advertiser' || bannerdatanew.BannerType === 'AllCombined')) {
                for (Cource_id of bannerdatanew.CourcesId) {
                    let productdata = await CoachingCourceModel.findOne({ _id: Cource_id });
                    if (productdata.offerPercentage == bannerdatanew.OfferPercentage) {
                        const updateProduct = await CoachingCourceModel.updateOne({ _id: Cource_id }, { $set: { offerPercentage: null } })
                    }
                }
            }
            if (bannerdatanew.BannerImage) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', bannerdatanew.BannerImage);
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
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
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
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', existingBanner.BannerImage);
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
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }

            return resp.status(400).json({ error: error.message, success: false });
        }
    }

}
