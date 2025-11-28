const bannersSchema = require('./CoachingBanners.model');
const {  ObjectId } = require('mongodb');
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const { CoachingCourseModel } = require('../CoachingCourse/CoachingCourse.model')
module.exports = {

    addbanner: async (req, resp) => {
        try {
            let { companyId, BannerName, SubCourseCatId, HeadCourseCatId, AdvertiserId, AdvertiserType, Position, SkillId, CoursesId, OfferPercentage, BannerType } = req.body;
            if (CoursesId) {
                CoursesId = JSON.parse(CoursesId)
            }
            if (BannerType == 'Skill') {
                if (!companyId || !BannerName || !SubCourseCatId || !HeadCourseCatId || !SkillId) {
                    if(req.file?.filename){
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourseCatId,
                    HeadCourseCatId,
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
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Offer') {
                if (!companyId || !BannerName || !SubCourseCatId || !HeadCourseCatId || !CoursesId || !OfferPercentage) {
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourseCatId,
                    HeadCourseCatId,
                    CoursesId,
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
                if (CoursesId && CoursesId.length !== 0) {
                    for (let Course_id of CoursesId) {
                        console.log(OfferPercentage, 'Offepercentage')
                        let newresult = await CoachingCourseModel.updateOne({ _id: Course_id }, {
                            $set: {
                                offerPercentage: OfferPercentage
                            }
                        });
                    }
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Advertiser') {
                if (!companyId || !BannerName || !SubCourseCatId || !HeadCourseCatId || !AdvertiserId || !AdvertiserType) {
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }

                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourseCatId,
                    HeadCourseCatId,
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
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Offer-Skill') {
                if (!companyId || !BannerName || !SubCourseCatId || !HeadCourseCatId || !CoursesId || !OfferPercentage || !SkillId) {
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourseCatId,
                    HeadCourseCatId,
                    CoursesId,
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
                if (CoursesId && CoursesId.length !== 0) {
                    for (let Course_id of CoursesId) {
                        console.log(OfferPercentage, 'Offepercentage')
                        let newresult = await CoachingCourseModel.updateOne({ _id: Course_id }, {
                            $set: {
                                offerPercentage: OfferPercentage
                            }
                        });
                    }
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                     if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Offer-Advertiser') {
                if (!companyId || !BannerName || !SubCourseCatId || !HeadCourseCatId || !CoursesId || !OfferPercentage || !AdvertiserId || !AdvertiserType) {
                     if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourseCatId,
                    HeadCourseCatId,
                    CoursesId,
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
                if (CoursesId && CoursesId.length !== 0) {
                    for (let Course_id of CoursesId) {
                        console.log(OfferPercentage, 'Offepercentage')
                let newresult = await CoachingCourseModel.updateOne({ _id: CoursesId }, {
                    $set: {
                        offerPercentage: OfferPercentage
                    }
                });
                    }
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                     if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'Skill-Advertiser') {
                if (!companyId || !BannerName || !SubCourseCatId || !HeadCourseCatId || !AdvertiserId || !AdvertiserType || !SkillId) {
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }

                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourseCatId,
                    HeadCourseCatId,
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
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }
            else if (BannerType == 'AllCombined') {
                if (!companyId || !BannerName || !SubCourseCatId || !HeadCourseCatId || !CoursesId || !OfferPercentage || !AdvertiserId || !AdvertiserType || !SkillId) {
                      if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return resp.status(400).json({ message: 'please filled all required fields', success: false })
                }
                const bannerData = {
                    companyId,
                    BannerName,
                    SubCourseCatId,
                    HeadCourseCatId,
                    CoursesId,
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
                if (CoursesId && CoursesId.length !== 0) {
                    for (let Course_id of CoursesId) {
                        console.log(OfferPercentage, 'Offepercentage')
                let newresult = await CoachingCourseModel.updateOne({ _id: CoursesId }, {
                    $set: {
                        offerPercentage: OfferPercentage
                    }
                });
                    }
                }
                const newBanner = new bannersSchema(bannerData);
                const result = await newBanner.save();
                if (!result) {
                     if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

                    return resp.status(400).json({ message: 'Something went wrong while saving the banner', success: false });
                }

                return resp.status(200).json({ data: result, success: true });
            }

        } catch (error) {
              if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
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
                    localField: "HeadCourseCatId",
                    foreignField: "_id",
                    as: "HeadCourseCategoryInfo",
                }
            },
            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "SubCourseCatId",
                    foreignField: "_id",
                    as: "SubCourseCategoryInfo",
                }
            },
            {
                $lookup: {
                    from: "coachingCourses",
                    localField: "CoursesId",
                    foreignField: "_id",
                    as: "CoursesInfo",
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
                                { case: { $eq: ["$AdvertiserTypeValue.CourseProviderType", "Class"] }, then: "$ClassAdvertiserInfo" },
                                { case: { $eq: ["$AdvertiserTypeValue.CourseProviderType", "Tutor"] }, then: "$TutorAdvertiserInfo" },
                                { case: { $eq: ["$AdvertiserTypeValue.CourseProviderType", "University"] }, then: "$UniversityAdvertiserInfo" },
                                { case: { $eq: ["$AdvertiserTypeValue.CourseProviderType", "Company"] }, then: "$CompanyAdvertiserInfo" }
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
        const { Position, BannerType, companyId, HeadCourseCatId, SubCourseCatId, AdvertiserId, AdvertiserType, SkillId, BannerId } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId(companyId) };

            if (HeadCourseCatId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCourseCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCourseCatId = mongoose.Types.ObjectId(HeadCourseCatId);
            }
            if (SubCourseCatId) {
                if (!mongoose.Types.ObjectId.isValid(SubCourseCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCourseCatId = mongoose.Types.ObjectId(SubCourseCatId);
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
            let { BannerId, CoursesId, BannerType } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            BannerId = ObjectId(BannerId)
            if (!BannerId || !CoursesId || CoursesId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }
            if (BannerType !== 'Offer' && BannerType !== 'Offer-Skill' && BannerType !== 'Offer-Advertiser' && BannerType !== 'AllCombined') {
                return resp.status(400).send('Please provide banner type or banner type must be offer');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await bannersSchema.findOneAndUpdate(
                        { _id: BannerId, companyId: companyId, BannerType: BannerType },
                        { $pull: { CoursesId: { $in: CoursesId } } },
                        { new: true }
                    );
                    if (CoursesId && (updatedResult.BannerType === 'Offer' || updatedResult.BannerType === 'Offer-Skill' || updatedResult.BannerType === 'Offer-Advertiser' || updatedResult.BannerType === 'AllCombined')) {
                    let updateOperations;
                        for (let EachCourseId of CoursesId) {
                            let productdata = await CoachingCourseModel.findOne({ _id: EachCourseId });
                            if (productdata.offerPercentage == updatedResult.OfferPercentage) {
                                 updateOperations = CoursesId.map(Course_id => ({
                                    updateOne: {
                                        filter: { _id: Course_id },
                                        update: { $set: { offerPercentage: null } }
                                    }
                                }));
                              
                            }
                           
                        }
                        if (updateOperations.length > 0) {
                            await CoachingCourseModel.bulkWrite(updateOperations);
                        }
                    }

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await bannersSchema.findOneAndUpdate(
                        { _id: BannerId, companyId: companyId, BannerType: BannerType },
                        { $addToSet: { CoursesId: { $each: CoursesId } } },
                        { new: true }
                    );
                    if (CoursesId && CoursesId.length !== 0 && (updatedResult.BannerType === 'Offer' || updatedResult.BannerType === 'Offer-Skill' || updatedResult.BannerType === 'Offer-Advertiser' || updatedResult.BannerType === 'AllCombined')) {
                        const updateOperations = CoursesId.map(Course_id => ({
                            updateOne: {
                                filter: { _id: Course_id },
                                update: { $set: { offerPercentage: updatedResult.OfferPercentage } }
                            }
                        }));

                        if (updateOperations.length > 0) {
                            await CoachingCourseModel.bulkWrite(updateOperations);
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
                for (Course_id of bannerdatanew.CoursesId) {
                    let productdata = await CoachingCourseModel.findOne({ _id: Course_id });
                    if (productdata.offerPercentage == bannerdatanew.OfferPercentage) {
                        const updateProduct = await CoachingCourseModel.updateOne({ _id: Course_id }, { $set: { offerPercentage: null } })
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
                 if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
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
             if (req.file?.filename) {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingBannerImage', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }

            return resp.status(400).json({ error: error.message, success: false });
        }
    }

}
