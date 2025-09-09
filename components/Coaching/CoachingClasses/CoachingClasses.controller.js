const { ObjectID } = require('mongodb')
const CoachingClassesModel = require('./CoachingClasses.model')
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


    addCoachingClasses: async (req, resp) => {

        try {

            let { Skills, ClassName, ClassOwnerName, companyId, HeadCourceCatId, SubCourceCatId, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, googleLocation, Password, ProviderType } = req.body;
            if (HeadCourceCatId) {
                HeadCourceCatId = JSON.parse(HeadCourceCatId);
            }
            if (SubCourceCatId) {
                SubCourceCatId = JSON.parse(SubCourceCatId);
            }
            if (ClassOwnerName) {
                ClassOwnerName = JSON.parse(ClassOwnerName);
            }
            if (Skills) {
                Skills = JSON.parse(Skills);
            }
            if (!ClassName || !ClassOwnerName || !companyId || !HeadCourceCatId || !SubCourceCatId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation || !Password || !ProviderType) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }

                return resp.status(400).json({ message: 'Please fill in all required fields', success: false });
            }
            if (Password) {
                const salt = await bcrypt.genSalt(10);
                Password = await bcrypt.hash(Password, salt);
            }

            let CoachingClassData = {
                ClassName,
                ClassOwnerName,
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
                CoachingClassData.ClassLogo = req.file.filename;
            }
            if (Skills) {
                CoachingClassData.Skills = Skills;

            }
            const newCoachingClass = new CoachingClassesModel(CoachingClassData);
            const result = await newCoachingClass.save();


            if (!result) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }

                return resp.status(400).json({ message: 'Something went wrong while saving the class', success: false });
            }

            return resp.status(200).json({ data: result, success: true });
        } catch (error) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }
            return resp.status(500).json({ error: error.message, success: false });
        }
    },


    getCoachingClassData: async (matchCondition) => {
        return await CoachingClassesModel.aggregate([
            { $match: matchCondition },
            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "HeadCourceCatId",
                    foreignField: "_id",
                    as: "HeadCoachingCategories",
                }
            },
            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "SubCourceCatId",
                    foreignField: "_id",
                    as: "SubCoachingCategories",
                }
            },
            {
                $lookup: {
                    from: "coachingprovidertypes",
                    localField: "ProviderType",
                    foreignField: "_id",
                    as: "ProviderTypeInfo",
                }
            },
            {
                $lookup: {
                    from: "coachingskills",
                    localField: "Skills",
                    foreignField: "_id",
                    as: "SkillsInfo",
                }
            },
        ]);
    },

    getCoachingClassesByData: async (req, res) => {
        const { SkillId,HeadCourceCatId, SubCourceCatId, companyId, ClassId, googleLocation } = req.query;

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
            if (ClassId) {
                if (!mongoose.Types.ObjectId.isValid(ClassId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId(ClassId);
            }

            const data = await module.exports.getCoachingClassData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Class Found', success: false });
            }

            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false });
        }
    },

    updateSubCourceCategoryList: async (req, resp) => {
        try {
            let { ClassId, SubCourceCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!ClassId || !SubCourceCatId || SubCourceCatId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $pull: { SubCourceCatId: { $in: SubCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
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
            let { ClassId, HeadCourceCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!ClassId || !HeadCourceCatId || HeadCourceCatId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $pull: { HeadCourceCatId: { $in: HeadCourceCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
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
    updateClassOwnerNameList: async (req, resp) => {
        try {
            let { ClassId, ClassOwnerName } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!ClassId || !ClassOwnerName || ClassOwnerName.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $pull: { ClassOwnerName: { $in: ClassOwnerName } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $addToSet: { ClassOwnerName: { $each: ClassOwnerName } } },
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

    updateCoachingClassDetail: async (req, resp) => {
        try {
            let {
                ClassId,
                ClassName,
                ClassOwnerName,
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
                Skills
            } = req.body;
            if (HeadCourceCatId) {
                HeadCourceCatId = JSON.parse(HeadCourceCatId)
            }
            if (SubCourceCatId) {
                SubCourceCatId = JSON.parse(SubCourceCatId)
            }
            if (ClassOwnerName) {
                ClassOwnerName = JSON.parse(ClassOwnerName)
            }
            if (Skills) {
                Skills = JSON.parse(Skills)
            }
            const companyId = req.query.companyId;
            console.log(req.body, 'new testing');

            if (!ClassId || !HeadCourceCatId || !SubCourceCatId || !ClassName || !ClassOwnerName || !companyId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
                return resp.status(400).send('Please insert valid data');

            }


            else {
                const CoachingClassData = {

                    ClassName,
                    ClassOwnerName,
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
                if (req.file) {
                    const existingCoachingClass = await CoachingClassesModel.findOne({ _id: ClassId, companyId: companyId })
                    if (existingCoachingClass && existingCoachingClass.ClassLogo) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', existingCoachingClass.ClassLogo);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    CoachingClassData.ClassLogo = req.file.filename;
                }
                if (Skills) {
                    CoachingClassData.Skills = Skills;

                }
                let updatedResult = await CoachingClassesModel.updateOne(
                    { _id: ClassId, companyId: companyId },
                    {
                        $set: CoachingClassData
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
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }
            return resp.status(400).json({ error: error.message, success: false });
        }
    },
    deleteCoachingClass: async (req, resp) => {
        try {
            if (!req.params.id) {
                return resp.status(400).json({ message: "please provide id of class", success: false })
            }
            const coachingclassdata = await CoachingClassesModel.findById(req.params.id)
            if (coachingclassdata) {
                const result = await CoachingClassesModel.deleteOne({ _id: req.params.id })
                if (!result) {
                    return resp.status(400).json({ message: "Coaching Classes cannot be deleted", success: false })
                }
                // const deleteServiceProduct = await serviceProductsModel.serviceProductsModel.deleteMany({ ProviderId: req.params.id })

                // const deleteServiceAppointment = await ServiceAppointmentModel.ServiceAppointmentModel.deleteMany({ ServiceProviderId: req.params.id })


                return resp.status(200).json({ message: "Coaching Classes deleted", success: true, data: result })
            }
            else {
                return resp.status(400).json({ message: "please cannot found", success: false })
            }


        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false });

        }
    },
    loginCoachingClass: async (req, resp) => {
        let { Email, Password } = req.body;

        try {
            if (!Email || !Password) {
                return resp.status(400).json({ message: 'please provide email and password', success: false })
            }
            let findCoachingClass = await CoachingClassesModel.findOne({ Email: Email })
            console.log(findCoachingClass, 'findCoachingClass')

            if (!findCoachingClass) {
                return resp.status(400).json({ message: 'Coaching Class not found', success: false })
            }
            let passwordMatch = await bcrypt.compare(Password, findCoachingClass.Password);
            if (!passwordMatch) {
                return resp.status(400).json({ message: 'password not match', success: false })
            }
            let Role = "Coaching Class"
            let token = jwt.sign(
                { CoachingClassId: findCoachingClass._id, Email: findCoachingClass.Email, companyId: findCoachingClass.companyId, Role: Role },
                'secret-for-now',
                { expiresIn: '24h' }
            );
            resp.status(200).json({ message: 'login successfully', token: token })
        } catch (error) {
            console.error('Login error:', error);
            resp.status(500).json({ message: 'Internal Server Error', success: false });
        }
    },
}