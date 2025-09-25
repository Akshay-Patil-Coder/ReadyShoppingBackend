const { ObjectId } = require('mongodb')
const CoachingTutorsModel = require('./CoachingTutors.model,')
const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')



module.exports = {


    addCoachingTutor: async (req, resp) => {

        try {

            let { Skills, TutorName, companyId, HeadCourceCatId, SubCourceCatId, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, googleLocation, Password, ConnectedWith, ProviderType } = req.body;
            if (HeadCourceCatId) {
                HeadCourceCatId = JSON.parse(HeadCourceCatId);
            }
            if (SubCourceCatId) {
                SubCourceCatId = JSON.parse(SubCourceCatId);
            }
            if (Skills) {
                Skills = JSON.parse(Skills)
            }
            if (ConnectedWith) {
                ConnectedWith = JSON.parse(ConnectedWith)
            }
            if (!TutorName || !companyId || !HeadCourceCatId || !SubCourceCatId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation || !Password || !ProviderType) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return resp.status(400).json({ message: 'Please fill in all required fields', success: false });
            }

            if (ConnectedWith) {
                ConnectedWith.forEach((EachData) => {
                    if (EachData.connectedType) {
                        if (EachData.connectedIds.length == 0) {
                             if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
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

            let CoachingTutorData = {
                TutorName,
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

            if (req.file) {
                CoachingTutorData.TutorImage = req.file.filename;

            }
            if (ConnectedWith) {
                CoachingTutorData.ConnectedWith = ConnectedWith;
            }
            if (Skills) {
                CoachingTutorData.Skills = Skills;
            }
            const newCoachingTutor = new CoachingTutorsModel(CoachingTutorData);
            const result = await newCoachingTutor.save();


            if (!result) {
                 if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return resp.status(400).json({ message: 'Something went wrong while saving the tutor', success: false });
            }

            return resp.status(200).json({ data: result, success: true });
        } catch (error) {
              if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
            return resp.status(500).json({ error: error.message, success: false });
        }
    },


    getCoachingTutorData: async (matchCondition) => {
        return await CoachingTutorsModel.aggregate([
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
                    SkillsInfo: { $first: "$SkillsInfo" },
                    ProviderType: { $first: "$ProviderType" },
                    ProviderTypeInfo: { $first: "$ProviderTypeInfo" },
                    ConnectedInfos: {
                        $push: {
                            connectedType: "$ConnectedTypeInfo",
                            connectedData: "$connectedInfo"
                        }
                    },
                    TutorName: { $first: "$TutorName" },
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
                    TutorImage: { $first: "$TutorImage" },
                    googleLocation: { $first: "$googleLocation" },
                }
            },


        ]);
    },

    getCoachingTutorByData: async (req, res) => {
        const { SkillId, HeadCourceCatId, SubCourceCatId, CoachingTutorId, companyId, ConnecterId, googleLocation } = req.query;
        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (HeadCourceCatId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCourceCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCourceCatId = { $in: [mongoose.Types.ObjectId.createFromHexString(HeadCourceCatId)] };
            }
            if (SkillId) {
                if (!mongoose.Types.ObjectId.isValid(SkillId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.Skills = { $in: [mongoose.Types.ObjectId.createFromHexString(SkillId)] };
            }
            if (googleLocation) {
                matchCondition.googleLocation = String(googleLocation);
            }
            if (SubCourceCatId) {
                if (!mongoose.Types.ObjectId.isValid(SubCourceCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCourceCatId = { $in: [mongoose.Types.ObjectId.createFromHexString(SubCourceCatId)] };
            }
            if (ConnecterId) {
                if (!mongoose.Types.ObjectId.isValid(ConnecterId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ConnectedWith.connectedIds = { $in: [mongoose.Types.ObjectId.createFromHexString(ConnecterId)] };
            }
            if (CoachingTutorId) {
                if (!mongoose.Types.ObjectId.isValid(CoachingTutorId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId.createFromHexString(CoachingTutorId);
            }

            const data = await module.exports.getCoachingTutorData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No tutor Found', success: false });
            }

            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false });
        }
    },

    updateSubCourceCategoryList: async (req, resp) => {
        try {
            let { CoachingTutorId, SubCourceCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!CoachingTutorId || !SubCourceCatId || SubCourceCatId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingTutorsModel.findOneAndUpdate(
                        { _id: CoachingTutorId, companyId: companyId },
                        { $pull: { SubCourceCatId: { $in: SubCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingTutorsModel.findOneAndUpdate(
                        { _id: CoachingTutorId, companyId: companyId },
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
            let { CoachingTutorId, HeadCourceCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!CoachingTutorId || !HeadCourceCatId || HeadCourceCatId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingTutorsModel.findOneAndUpdate(
                        { _id: CoachingTutorId, companyId: companyId },
                        { $pull: { HeadCourceCatId: { $in: HeadCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingTutorsModel.findOneAndUpdate(
                        { _id: CoachingTutorId, companyId: companyId },
                        { $addToSet: { HeadCourceCatId: { $each: HeadCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }

            }
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: 
                
                error.message, success: false });
        }

    },
    updateCoachingTutorDetail: async (req, resp) => {
        try {
            let {
                CoachingTutorId,
                TutorName,
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
                             if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
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
            if (!CoachingTutorId || !HeadCourceCatId || !SubCourceCatId || !TutorName || !companyId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation) {
  if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return resp.status(400).send('Please insert valid data');

            }


            else {
                const CoachingTutorData = {

                    TutorName,
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
                    CoachingTutorData.ConnectedWith = ConnectedWith;
                }
                if (Skills) {
                    CoachingTutorData.Skills = Skills;
                }
                if (req.file?.filename) {
                    const existingCoachingTutor = await CoachingTutorsModel.findOne({ _id: CoachingTutorId, companyId: companyId })
                    if (existingCoachingTutor && existingCoachingTutor.TutorImage) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', existingCoachingTutor.TutorImage);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    CoachingTutorData.TutorImage = req.file.filename;
                }

                let updatedResult = await CoachingTutorsModel.updateOne(
                    { _id: CoachingTutorId, companyId: companyId },
                    {
                        $set: CoachingTutorData
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
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
            return resp.status(400).json({ error: error.message, success: false });
        }
    },
    deleteCoachingTutor: async (req, resp) => {
        try {
            if (!req.params.id) {
                return resp.status(400).json({ message: "please provide id of tutor", success: false })
            }
            const coachingtutordata = await CoachingTutorsModel.findById(req.params.id)
            if (coachingtutordata) {
                const result = await CoachingTutorsModel.deleteOne({ _id: req.params.id })
                if (!result) {
                    return resp.status(400).json({ message: "Coaching tutor cannot be deleted", success: false })
                }
                return resp.status(200).json({ message: "Coaching tutor deleted", success: true, data: result })
            }
            else {
                return resp.status(400).json({ message: "please cannot found", success: false })
            }


        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false });

        }
    },
    loginCoachingTutor: async (req, resp) => {
        let { Email, Password } = req.body;

        try {
            if (!Email || !Password) {
                return resp.status(400).json({ message: 'please provide email and password', success: false })
            }
            let findCoachingTutor = await CoachingTutorsModel.findOne({ Email: Email })
            console.log(findCoachingTutor, 'findCoachingTutor')

            if (!findCoachingTutor) {
                return resp.status(400).json({ message: 'Coaching Tutor not found', success: false })
            }
            let passwordMatch = await bcrypt.compare(Password, findCoachingTutor.Password);
            if (!passwordMatch) {
                return resp.status(400).json({ message: 'password not match', success: false })
            }
            let Role = "Coaching Tutor"

            let token = jwt.sign(
                { CoachingTutorId: findCoachingTutor._id, Email: findCoachingTutor.Email, companyId: findCoachingTutor.companyId, Role: Role },
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