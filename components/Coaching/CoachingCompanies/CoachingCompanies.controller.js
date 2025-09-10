const { ObjectId } = require('mongodb')
const CoachingCompaniesModel = require('./CoachingCompanies.model')
const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')



module.exports = {


    addCoachingCompanies: async (req, resp) => {

        try {

            let { Skills, CourseCompanyName, CompanyOwnerName, Contact_person_name, companyId, HeadCourceCatId, SubCourceCatId, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, googleLocation, Password, ConnectedWith, ProviderType } = req.body;
            if (HeadCourceCatId) {
                HeadCourceCatId = JSON.parse(HeadCourceCatId);
            }
            if (SubCourceCatId) {
                SubCourceCatId = JSON.parse(SubCourceCatId);
            }
            if (CompanyOwnerName) {
                CompanyOwnerName = JSON.parse(CompanyOwnerName);
            }
            if (ConnectedWith) {
                ConnectedWith = JSON.parse(ConnectedWith);
            }
            if (Skills) {
                Skills = JSON.parse(Skills);
            }
            console.log(req.body, 'body')
            if (!CourseCompanyName || !CompanyOwnerName || !companyId || !HeadCourceCatId || !SubCourceCatId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation || !Password || !ProviderType) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return resp.status(400).json({ message: 'Please fill in all required fields', success: false });
            }
            if (ConnectedWith && ConnectedWith.length !== 0) {
                ConnectedWith.forEach((EachData) => {
                    if (EachData.connectedType) {
                        if (EachData.connectedIds.length == 0) {
                           if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', req.file.filename);
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

            let CoachingCompanyData = {
                CourseCompanyName,
                CompanyOwnerName,
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
                CoachingCompanyData.Contact_person_name = Contact_person_name
            }
            if (req.file) {
                CoachingCompanyData.CourseCompanyLogo = req.file.filename;

            }
            if (ConnectedWith) {
                CoachingCompanyData.ConnectedWith = ConnectedWith;
            }
            if (Skills) {
                CoachingCompanyData.Skills = Skills;
            }
            const newCoachingCompany = new CoachingCompaniesModel(CoachingCompanyData);
            const result = await newCoachingCompany.save();


            if (!result) {
               if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return resp.status(400).json({ message: 'Something went wrong while saving the company', success: false });
            }

            return resp.status(200).json({ data: result, success: true });
        } catch (error) {
           if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
            return resp.status(500).json({ error: error.message, success: false });
        }
    },

    getCoachingCompaniesData: async (matchCondition) => {
        return await CoachingCompaniesModel.aggregate([
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
                    ProviderType: { $first: "$ProviderType" },
                    SkillsInfo: { $first: "$SkillsInfo" },
                    ProviderTypeInfo: { $first: "$ProviderTypeInfo" },
                    ConnectedInfos: {
                        $push: {
                            connectedType: "$ConnectedTypeInfo",
                            connectedData: "$connectedInfo"
                        }
                    },
                    CourseCompanyName: { $first: "$CourseCompanyName" },
                    CompanyOwnerName: { $first: "$CompanyOwnerName" },
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
                    CourseCompanyLogo: { $first: "$CourseCompanyLogo" },
                    googleLocation: { $first: "$googleLocation" },
                }
            },


        ]);
    },

    getCoachingCompaniesByData: async (req, res) => {
        const { SkillId, HeadCourceCatId, SubCourceCatId, ConnecterId, companyId, CoachingCompanyId, googleLocation } = req.query;

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
            if (CoachingCompanyId) {
                if (!mongoose.Types.ObjectId.isValid(CoachingCompanyId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId(CoachingCompanyId);
            }

            const data = await module.exports.getCoachingCompaniesData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No company Found', success: false });
            }

            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false });
        }
    },

    updateSubCourceCategoryList: async (req, resp) => {
        try {
            let { CoachingCompanyId, SubCourceCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!CoachingCompanyId || !SubCourceCatId || SubCourceCatId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingCompaniesModel.findOneAndUpdate(
                        { _id: CoachingCompanyId, companyId: companyId },
                        { $pull: { SubCourceCatId: { $in: SubCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingCompaniesModel.findOneAndUpdate(
                        { _id: CoachingCompanyId, companyId: companyId },
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
            let { CoachingCompanyId, HeadCourceCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!CoachingCompanyId || !HeadCourceCatId || HeadCourceCatId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingCompaniesModel.findOneAndUpdate(
                        { _id: CoachingCompanyId, companyId: companyId },
                        { $pull: { HeadCourceCatId: { $in: HeadCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingCompaniesModel.findOneAndUpdate(
                        { _id: CoachingCompanyId, companyId: companyId },
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
    updateCompanyOwnerNameList: async (req, resp) => {
        try {
            let { CoachingCompanyId, CompanyOwnerName } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!CoachingCompanyId || !CompanyOwnerName || CompanyOwnerName.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingCompaniesModel.findOneAndUpdate(
                        { _id: CoachingCompanyId, companyId: companyId },
                        { $pull: { CompanyOwnerName: { $in: CompanyOwnerName } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingCompaniesModel.findOneAndUpdate(
                        { _id: CoachingCompanyId, companyId: companyId },
                        { $addToSet: { CompanyOwnerName: { $each: CompanyOwnerName } } },
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

    updateCoachingCompanyDetail: async (req, resp) => {
        try {
            let {
                CoachingCompanyId,
                CourseCompanyName,
                CompanyOwnerName,
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
            if (CompanyOwnerName) {
                CompanyOwnerName = JSON.parse(CompanyOwnerName)
            }
            if (ConnectedWith) {
                ConnectedWith = JSON.parse(ConnectedWith)
            }

            if (Skills) {
                Skills = JSON.parse(Skills)
            }
            const companyId = req.query.companyId;
            console.log(Skills, HeadCourceCatId, 'new testing');

            if (ConnectedWith) {
                ConnectedWith.forEach((EachData) => {
                    console.log(ConnectedWith, 'hello');

                    if (EachData.connectedType) {
                        console.log(ConnectedWith, 'hello');

                        if (EachData.connectedIds.length == 0) {
                            console.log(ConnectedWith, 'hello');

                            if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', req.file.filename);
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

            if (!CoachingCompanyId || !HeadCourceCatId || !SubCourceCatId || !CourseCompanyName || !CompanyOwnerName || !companyId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return resp.status(400).send('Please insert valid data');

            }


            else {
                const CoachingCompanyData = {

                    CourseCompanyName,
                    CompanyOwnerName,
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
                    CoachingCompanyData.ConnectedWith = ConnectedWith;
                }
                if (Skills) {
                    CoachingCompanyData.Skills = Skills;
                }
                if (req.file) {
                    const existingCoachingCompany = await CoachingCompaniesModel.findOne({ _id: CoachingCompanyId, companyId: companyId })
                    if (existingCoachingCompany && existingCoachingCompany.CourseCompanyLogo) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', existingCoachingCompany.CourseCompanyLogo);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    CoachingCompanyData.CourseCompanyLogo = req.file.filename;
                }
                console.log('hello', CoachingCompanyData)
                let updatedResult = await CoachingCompaniesModel.updateOne(
                    { _id: CoachingCompanyId, companyId: companyId },
                    {
                        $set: CoachingCompanyData
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
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
            return resp.status(400).json({ error: error.message, success: false });
        }
    },
    deleteCoachingCompany: async (req, resp) => {
        try {
            if (!req.params.id) {
                return resp.status(400).json({ message: "please provide id of company", success: false })
            }
            const coachingcompanydata = await CoachingCompaniesModel.findById(req.params.id)
            if (coachingcompanydata) {
                const result = await CoachingCompaniesModel.deleteOne({ _id: req.params.id })
                if (!result) {
                    return resp.status(400).json({ message: "Coaching company cannot be deleted", success: false })
                }
                // const deleteServiceProduct = await serviceProductsModel.serviceProductsModel.deleteMany({ ProviderId: req.params.id })

                // const deleteServiceAppointment = await ServiceAppointmentModel.ServiceAppointmentModel.deleteMany({ ServiceProviderId: req.params.id })


                return resp.status(200).json({ message: "Coaching Company deleted", success: true, data: result })
            }
            else {
                return resp.status(400).json({ message: "please cannot found", success: false })
            }


        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false });

        }
    },
    loginCoachingCompany: async (req, resp) => {
        let { Email, Password } = req.body;

        try {
            if (!Email || !Password) {
                return resp.status(400).json({ message: 'please provide email and password', success: false })
            }
            let findCoachingCompany = await CoachingCompaniesModel.findOne({ Email: Email })
            console.log(findCoachingCompany, 'findCoachingCompany')

            if (!findCoachingCompany) {
                return resp.status(400).json({ message: 'Coaching Company not found', success: false })
            }
            let passwordMatch = await bcrypt.compare(Password, findCoachingCompany.Password);
            if (!passwordMatch) {
                return resp.status(400).json({ message: 'password not match', success: false })
            }
            let Role = "Coaching Company"
            let token = jwt.sign(
                { CoachingCompanyId: findCoachingCompany._id, Email: findCoachingCompany.Email, companyId: findCoachingCompany.companyId, Role: Role },
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