const { ObjectID } = require('mongodb')
const CoachingUniversityModel = require('./CoachingUniversity.model')
const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path');
const { tryEach } = require('async');
const { success } = require('../paytm/paytm.controller');
// const moment = require('moment')
// const moment_timezone_1 = require("moment-timezone");
// const serviceProductsModel = require('../serviceProducts/serviceProducts.model')
// const ServiceAppointmentModel = require('../serviceAppointment/serviceAppointment.model');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')



module.exports = {


    addCoachingUniversity: async (req, resp) => {

        try {

            let { Skills, UniversityName, Contact_person_name, companyId, HeadCourceCatId, SubCourceCatId, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, googleLocation, Password, ConnectedWith, ProviderType } = req.body;
            if (HeadCourceCatId) {
                HeadCourceCatId = JSON.parse(HeadCourceCatId);
            }
            if (SubCourceCatId) {
                SubCourceCatId = JSON.parse(SubCourceCatId);
            }
            if (Skills) {
                Skills = JSON.parse(Skills);
            }
            if (ConnectedWith) {
                ConnectedWith = JSON.parse(ConnectedWith);
            }
            if (!UniversityName || !companyId || !HeadCourceCatId || !SubCourceCatId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation || !Password || !ProviderType) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }

                return resp.status(400).json({ message: 'Please fill in all required fields', success: false });
            }

            if (ConnectedWith) {
                ConnectedWith.forEach((EachData) => {
                    if (EachData.connectedType) {
                        if (EachData.connectedIds.length == 0) {
                            const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', req.file.filename);
                            if (fs.existsSync(newImagePath)) {
                                fs.unlinkSync(newImagePath);
                            }

                            return resp.status(400).json({ message: 'if you connected with someone then select them', success: false });
                        }
                    }
                })
                let ConnectedWithNew = [];

                ConnectedWith.forEach((EachData) => {
                    let EachConnection = {
                        connectedType: EachData.connectedType,
                        connectedIds: EachData.connectedIds.map((EachId) => EachId)
                    };

                    ConnectedWithNew.push(EachConnection);
                });

                ConnectedWith = ConnectedWithNew;

            }
            if (Password) {
                const salt = await bcrypt.genSalt(10);
                Password = await bcrypt.hash(Password, salt);
            }

            let CoachingUniversityData = {
                UniversityName,
                companyId,
                HeadCourceCatId,
                SubCourceCatId,
                Street,
                City,
                State,
                Country,
                PostalCode,
                Email,
                Phone,
                PanCardNo,
                GstNo,
                googleLocation,
                Password,
                ProviderType
            };
            if (Contact_person_name) {
                CoachingUniversityData.Contact_person_name = Contact_person_name
            }
            if (req.file) {
                CoachingUniversityData.UniversityLogo = req.file.filename;

            }
            if (ConnectedWith) {
                CoachingUniversityData.ConnectedWith = ConnectedWith;
            }
            if (Skills) {
                CoachingUniversityData.Skills = Skills;
            }
            const newCoachingUniversity = new CoachingUniversityModel(CoachingUniversityData);
            const result = await newCoachingUniversity.save();


            if (!result) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }

                return resp.status(400).json({ message: 'Something went wrong while saving the university', success: false });
            }

            return resp.status(200).json({ data: result, success: true });
        } catch (error) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }
            return resp.status(500).json({ error: error.message, success: false });
        }
    },


    // getCoachingUniversityData: async (matchCondition) => {
    //     return await CoachingUniversityModel.aggregate([
    //         { $match: matchCondition },
    //         {
    //             $lookup: {
    //                 from: "coachingcategories",
    //                 localField: "HeadCourceCatId",
    //                 foreignField: "_id",
    //                 as: "HeadCoachingCategories",
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "coachingcategories",
    //                 localField: "SubCourceCatId",
    //                 foreignField: "_id",
    //                 as: "SubCoachingCategories",
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "coachingprovidertypes",
    //                 localField: "ProviderType",
    //                 foreignField: "_id",
    //                 as: "ProviderTypeInfo",
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "coachingprovidertypes",
    //                 localField: "ConnectedWith.connectedType",
    //                 foreignField: "_id",
    //                 as: "ConnectedTypeInfo",
    //             }
    //         },

    //         {
    //             $lookup: {
    //                 from: "coachingclasses",
    //                 localField: "ConnectedWith.connectedIds",
    //                 foreignField: "_id",
    //                 as: "ClassConnectedInfo",
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "coachingtutors",
    //                 localField: "ConnectedWith.connectedIds",
    //                 foreignField: "_id",
    //                 as: "TutorConnectedInfo",
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "coachinguniversities",
    //                 localField: "ConnectedWith.connectedIds",
    //                 foreignField: "_id",
    //                 as: "UniversityConnectedInfo",
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "coachingcompanies",
    //                 localField: "ConnectedWith.connectedIds",
    //                 foreignField: "_id",
    //                 as: "CompanyConnectedInfo",
    //             }
    //         },

    //         {
    //             $addFields: {
    //                 ConnectedInfo: {
    //                     $switch: {
    //                         branches: [
    //                             {
    //                                 case: { $eq: [{ $arrayElemAt: ["$ConnectedTypeInfo.CourceProviderType", 0] }, "Class"] },
    //                                 then: "$ClassConnectedInfo"
    //                             },
    //                             {
    //                                 case: { $eq: [{ $arrayElemAt: ["$ConnectedTypeInfo.CourceProviderType", 0] }, "Tutor"] },
    //                                 then: "$TutorConnectedInfo"
    //                             },
    //                             {
    //                                 case: { $eq: [{ $arrayElemAt: ["$ConnectedTypeInfo.CourceProviderType", 0] }, "University"] },
    //                                 then: "$UniversityConnectedInfo"
    //                             },
    //                             {
    //                                 case: { $eq: [{ $arrayElemAt: ["$ConnectedTypeInfo.CourceProviderType", 0] }, "Company"] },
    //                                 then: "$CompanyConnectedInfo"
    //                             }
    //                         ],
    //                         default: []
    //                     }
    //                 }
    //             }
    //         },

    //         {
    //             $project: {
    //                 ClassConnectedInfo: 0,
    //                 TutorConnectedInfo: 0,
    //                 UniversityConnectedInfo: 0,
    //                 CompanyConnectedInfo: 0
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "coachingskills",
    //                 localField: "Skills",
    //                 foreignField: "_id",
    //                 as: "SkillsInfo",
    //             }
    //         }
    //     ]);
    // },
    getCoachingUniversityData: async (matchCondition) => {
        return await CoachingUniversityModel.aggregate([
            { $match: matchCondition },

            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "HeadCourceCatId",
                    foreignField: "_id",
                    as: "HeadCoachingCategories"
                }
            },
            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "SubCourceCatId",
                    foreignField: "_id",
                    as: "SubCoachingCategories"
                }
            },

            { $unwind: { path: "$ConnectedWith", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "coachingprovidertypes",
                    localField: "ConnectedWith.connectedType",
                    foreignField: "_id",
                    as: "ConnectedTypeInfo"
                }
            },
            { $unwind: { path: "$ConnectedTypeInfo", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "coachingclasses",
                    localField: "ConnectedWith.connectedIds",
                    foreignField: "_id",
                    as: "ClassConnectedInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingtutors",
                    localField: "ConnectedWith.connectedIds",
                    foreignField: "_id",
                    as: "TutorConnectedInfo"
                }
            },
            {
                $lookup: {
                    from: "coachinguniversities",
                    localField: "ConnectedWith.connectedIds",
                    foreignField: "_id",
                    as: "UniversityConnectedInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingcompanies",
                    localField: "ConnectedWith.connectedIds",
                    foreignField: "_id",
                    as: "CompanyConnectedInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingskills",
                    localField: "Skills",
                    foreignField: "_id",
                    as: "SkillsInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingprovidertypes",
                    localField: "ProviderType",
                    foreignField: "_id",
                    as: "ProviderTypeInfo"
                }
            },

            {
                $addFields: {
                    connectedInfo: {
                        $switch: {
                            branches: [
                                {
                                    case: { $eq: ["$ConnectedTypeInfo.CourceProviderType", "Class"] },
                                    then: "$ClassConnectedInfo"
                                },
                                {
                                    case: { $eq: ["$ConnectedTypeInfo.CourceProviderType", "Tutor"] },
                                    then: "$TutorConnectedInfo"
                                },
                                {
                                    case: { $eq: ["$ConnectedTypeInfo.CourceProviderType", "University"] },
                                    then: "$UniversityConnectedInfo"
                                },
                                {
                                    case: { $eq: ["$ConnectedTypeInfo.CourceProviderType", "Company"] },
                                    then: "$CompanyConnectedInfo"
                                }
                            ],
                            default: []
                        }
                    }
                }
            },

            {
                $group: {
                    _id: "$_id",
                    HeadCoachingCategories: { $first: "$HeadCoachingCategories" },
                    SubCoachingCategories: { $first: "$SubCoachingCategories" },
                    SkillsInfo:{$first:"$SkillsInfo"},
                    ProviderTypeInfo:{$first:"$ProviderTypeInfo"},
                    ProviderType:{$first:"$ProviderType"},
                    ConnectedInfos: {
                        $push: {
                            connectedType: "$ConnectedTypeInfo",
                            connectedData: "$connectedInfo"
                        }
                    },
                    UniversityName: { $first: "$UniversityName" },
                    Contact_person_name: { $first: "$Contact_person_name" },
                    companyId: { $first: "$companyId" },
                    Street: { $first: "$Street" },
                    City: { $first: "$City" },
                    State: { $first: "$State" },
                    Country: { $first: "$Country" },
                    PostalCode: { $first: "$PostalCode" },
                    Email: { $first: "$Email" },
                    Phone: { $first: "$Phone" },
                    PanCardNo: { $first: "$PanCardNo" },
                    GstNo: { $first: "$GstNo" },
                    UniversityLogo: { $first: "$UniversityLogo" },
                    googleLocation: { $first: "$googleLocation" },
                }
            },

            
        ]);
    },

    getCoachingUniversityByData: async (req, res) => {
        const { SkillId, HeadCourceCatId, SubCourceCatId, CoachingUniversityId, companyId, ConnecterId, googleLocation } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId(companyId) };

            if (HeadCourceCatId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCourceCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCourceCatId = { $in: [mongoose.Types.ObjectId(HeadCourceCatId)] };
            }
            if (SkillId) {
                if (!mongoose.Types.ObjectId.isValid(SkillId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.Skills = { $in: [mongoose.Types.ObjectId(SkillId)] };
            }
            if (googleLocation) {
                matchCondition.googleLocation = String(googleLocation);
            }
            if (SubCourceCatId) {
                if (!mongoose.Types.ObjectId.isValid(SubCourceCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCourceCatId = { $in: [mongoose.Types.ObjectId(SubCourceCatId)] };
            }
            if (ConnecterId) {
                if (!mongoose.Types.ObjectId.isValid(ConnecterId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ConnectedWith.connectedIds = { $in: [mongoose.Types.ObjectId(ConnecterId)] };
            }
            if (CoachingUniversityId) {
                if (!mongoose.Types.ObjectId.isValid(CoachingUniversityId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId(CoachingUniversityId);
            }

            const data = await module.exports.getCoachingUniversityData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No university Found', success: false });
            }

            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false });
        }
    },

    updateSubCourceCategoryList: async (req, resp) => {
        try {
            let { CoachingUniversityId, SubCourceCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!CoachingUniversityId || !SubCourceCatId || SubCourceCatId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingUniversityModel.findOneAndUpdate(
                        { _id: CoachingUniversityId, companyId: companyId },
                        { $pull: { SubCourceCatId: { $in: SubCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingUniversityModel.findOneAndUpdate(
                        { _id: CoachingUniversityId, companyId: companyId },
                        { $addToSet: { SubCourceCatId: { $each: SubCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }

            }
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });
        }

    },
    updateHeadCourceCategoryList: async (req, resp) => {
        try {
            let { CoachingUniversityId, HeadCourceCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!CoachingUniversityId || !HeadCourceCatId || HeadCourceCatId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingUniversityModel.findOneAndUpdate(
                        { _id: CoachingUniversityId, companyId: companyId },
                        { $pull: { HeadCourceCatId: { $in: HeadCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingUniversityModel.findOneAndUpdate(
                        { _id: CoachingUniversityId, companyId: companyId },
                        { $addToSet: { HeadCourceCatId: { $each: HeadCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }

            }
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });
        }

    },
    updateCoachingUniversityDetail: async (req, resp) => {
        try {
            let {
                CoachingUniversityId,
                UniversityName,
                Street,
                City,
                State,
                Country,
                PostalCode,
                Email,
                Phone,
                PanCardNo,
                GstNo,
                googleLocation,
                HeadCourceCatId,
                SubCourceCatId,
                ConnectedWith,
                Skills
            } = req.body;
            if (HeadCourceCatId) {
                HeadCourceCatId = JSON.parse(HeadCourceCatId)
            }
            if (SubCourceCatId) {
                SubCourceCatId = JSON.parse(SubCourceCatId)
            }
            if (Skills) {
                Skills = JSON.parse(Skills)
            }
            if (ConnectedWith) {
                ConnectedWith = JSON.parse(ConnectedWith)
            }
            const companyId = req.query.companyId;
            console.log(req.body, 'new testing');

            if (ConnectedWith) {
                ConnectedWith.forEach((EachData) => {
                    if (EachData.connectedType) {
                        if (EachData.connectedIds.length == 0) {
                            const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', req.file.filename);
                            if (fs.existsSync(newImagePath)) {
                                fs.unlinkSync(newImagePath);
                            }

                            return resp.status(400).json({ message: 'if you connected with someone then select them', success: false });
                        }
                    }
                })
                let ConnectedWithNew = [];

                ConnectedWith.forEach((EachData) => {
                    let EachConnection = {
                        connectedType: EachData.connectedType,
                        connectedIds: EachData.connectedIds.map((EachId) => EachId)
                    };

                    ConnectedWithNew.push(EachConnection);
                });

                ConnectedWith = ConnectedWithNew;

            }
            if (!CoachingUniversityId || !HeadCourceCatId || !SubCourceCatId || !UniversityName || !companyId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
                return resp.status(400).send('Please insert valid data');

            }


            else {
                const CoachingUniversityData = {

                    UniversityName,
                    Street,
                    City,
                    State,
                    Country,
                    PostalCode,
                    Email,
                    Phone,
                    PanCardNo,
                    GstNo,
                    googleLocation,
                    HeadCourceCatId,
                    SubCourceCatId
                }

                if (ConnectedWith) {
                    CoachingUniversityData.ConnectedWith = ConnectedWith;
                }
                if (Skills) {
                    CoachingUniversityData.Skills = Skills;
                }
                if (req.file) {
                    const existingCoachingUniversity = await CoachingUniversityModel.findOne({ _id: CoachingUniversityId, companyId: companyId })
                    if (existingCoachingUniversity && existingCoachingUniversity.UniversityLogo) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', existingCoachingUniversity.UniversityLogo);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    CoachingUniversityData.UniversityLogo = req.file.filename;
                }

                let updatedResult = await CoachingUniversityModel.updateOne(
                    { _id: CoachingUniversityId, companyId: companyId },
                    {
                        $set: CoachingUniversityData
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
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }
            return resp.status(400).json({ error: error.message, success: false });
        }
    },
    deleteCoachingUniversity: async (req, resp) => {
        try {
            if (!req.params.id) {
                return resp.status(400).json({ message: "please provide id of university", success: false })
            }
            const coachinguniversitydata = await CoachingUniversityModel.findById(req.params.id)
            if (coachinguniversitydata) {
                const result = await CoachingUniversityModel.deleteOne({ _id: req.params.id })
                if (!result) {
                    return resp.status(400).json({ message: "Coaching university cannot be deleted", success: false })
                }
                // const deleteServiceProduct = await serviceProductsModel.serviceProductsModel.deleteMany({ ProviderId: req.params.id })

                // const deleteServiceAppointment = await ServiceAppointmentModel.ServiceAppointmentModel.deleteMany({ ServiceProviderId: req.params.id })


                return resp.status(200).json({ message: "Coaching university deleted", success: true, data: result })
            }
            else {
                return resp.status(400).json({ message: "please cannot found", success: false })
            }


        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false });

        }
    },
    loginCoachingUniversity: async (req, resp) => {
        let { Email, Password } = req.body;

        try {
            if (!Email || !Password) {
                return resp.status(400).json({ message: 'please provide email and password', success: false })
            }
            let findCoachingUniversity = await CoachingUniversityModel.findOne({ Email: Email })
            console.log(findCoachingUniversity, 'findCoachingUniversity')

            if (!findCoachingUniversity) {
                return resp.status(400).json({ message: 'Coaching University not found', success: false })
            }
            let passwordMatch = await bcrypt.compare(Password, findCoachingUniversity.Password);
            if (!passwordMatch) {
                return resp.status(400).json({ message: 'password not match', success: false })
            }
            let Role = "Coaching University"
            let token = jwt.sign(
                { CoachingUniversityId: findCoachingUniversity._id, Email: findCoachingUniversity.Email, companyId: findCoachingUniversity.companyId, Role: Role },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '24h' }
            );
            resp.status(200).json({ message: 'login successfully', token: token })
        } catch (error) {
            console.error('Login error:', error);
            resp.status(500).json({ message: 'Internal Server Error', success: false });
        }
    },
}