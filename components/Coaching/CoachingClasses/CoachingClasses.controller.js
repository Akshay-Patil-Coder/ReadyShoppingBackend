const { ObjectId } = require('mongodb')
const CoachingClassesModel = require('./CoachingClasses.model')
const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')



module.exports = {


    addCoachingClasses: async (req, resp) => {

        try {

            let { Skills, ClassName, ClassOwnerName, companyId, HeadCourseCatId, SubCourseCatId, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, googleLocation, Password, ProviderType } = req.body;
            if (HeadCourseCatId) {
                HeadCourseCatId = JSON.parse(HeadCourseCatId);
            }
            if (SubCourseCatId) {
                SubCourseCatId = JSON.parse(SubCourseCatId);
            }
            if (ClassOwnerName) {
                ClassOwnerName = JSON.parse(ClassOwnerName);
            }
            if (Skills) {
                Skills = JSON.parse(Skills);
            }
            if (!ClassName || !ClassOwnerName || !companyId || !HeadCourseCatId || !SubCourseCatId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation || !Password || !ProviderType) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
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
                HeadCourseCatId,
                SubCourseCatId,
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
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return resp.status(400).json({ message: 'Something went wrong while saving the class', success: false });
            }

            return resp.status(200).json({ data: result, success: true });
        } catch (error) {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            return resp.status(500).json({ error: error.message, success: false,message:"Internal Server Error" });
        }
    },


    getCoachingClassData: async (matchCondition) => {
        return await CoachingClassesModel.aggregate([
            { $match: matchCondition },
            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "HeadCourseCatId",
                    foreignField: "_id",
                    as: "HeadCoachingCategories",
                }
            },
            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "SubCourseCatId",
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
        const { SkillId, HeadCourseCatId, SubCourseCatId, companyId, ClassId, googleLocation } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (HeadCourseCatId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCourseCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCourseCatId = { $in: [mongoose.Types.ObjectId.createFromHexString(HeadCourseCatId)] };
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
            if (SubCourseCatId) {
                if (!mongoose.Types.ObjectId.isValid(SubCourseCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCourseCatId = { $in: [mongoose.Types.ObjectId.createFromHexString(SubCourseCatId)] };
            }
            if (ClassId) {
                if (!mongoose.Types.ObjectId.isValid(ClassId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId.createFromHexString(ClassId);
            }

            const data = await module.exports.getCoachingClassData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Class Found', success: false });
            }

            return res.status(200).json({ data: data, success: true,message:"data fetched successfully" });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false,message:"Internal Server Error"});
        }
    },

    updateSubCourseCategoryList: async (req, resp) => {
        try {
            let { ClassId, SubCourseCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!ClassId || !SubCourseCatId || SubCourseCatId.length === 0) {
                return resp.status(400).send({message:'Please insert valid data',success:false});
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $pull: { SubCourseCatId: { $in: SubCourseCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true,message:"Deleted"});
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $addToSet: { SubCourseCatId: { $each: SubCourseCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true,message:"Added" });
                }

            }
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false,message:"Internal Server Error" });
        }

    },
    updateHeadCourseCategoryList: async (req, resp) => {
        try {
            let { ClassId, HeadCourseCatId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!ClassId || !HeadCourseCatId || HeadCourseCatId.length === 0) {
                return resp.status(400).send({message:'Please insert valid data',success:false});
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $pull: { HeadCourseCatId: { $in: HeadCourseCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true,message:"Deleted" });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $addToSet: { HeadCourseCatId: { $each: HeadCourseCatId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true,message:"Added" });
                }

            }
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false,message:'Internal Server Error' });
        }

    },
    updateClassOwnerNameList: async (req, resp) => {
        try {
            let { ClassId, ClassOwnerName } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!ClassId || !ClassOwnerName || ClassOwnerName.length === 0) {
                return resp.status(400).send({message:'Please insert valid data',success:false});
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $pull: { ClassOwnerName: { $in: ClassOwnerName } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true ,message:'Deleted'});
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingClassesModel.findOneAndUpdate(
                        { _id: ClassId, companyId: companyId },
                        { $addToSet: { ClassOwnerName: { $each: ClassOwnerName } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true,message:'Added' });
                }

            }
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false ,message:'Internal Server Error'});
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
                HeadCourseCatId,
                SubCourseCatId,
                Skills
            } = req.body;
            if (HeadCourseCatId) {
                HeadCourseCatId = JSON.parse(HeadCourseCatId)
            }
            if (SubCourseCatId) {
                SubCourseCatId = JSON.parse(SubCourseCatId)
            }
            if (ClassOwnerName) {
                ClassOwnerName = JSON.parse(ClassOwnerName)
            }
            if (Skills) {
                Skills = JSON.parse(Skills)
            }
            const companyId = req.query.companyId;
            console.log(req.body, 'new testing');

            if (!ClassId || !HeadCourseCatId || !SubCourseCatId || !ClassName || !ClassOwnerName || !companyId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return resp.status(400).send({message:'Please insert valid data',success:false});

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
                    HeadCourseCatId,
                    SubCourseCatId
                }
                if (req.file?.filename) {
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
                    return resp.status(200).json({ data: updatedResult, success: true,message:"Class Detail Updated" });
                }

            }
        } catch (error) {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            return resp.status(400).json({ error: error.message, success: false,message:'Internal Server Error' });
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
                 if (coachingclassdata && coachingclassdata.ClassLogo) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', coachingclassdata.ClassLogo);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }

                return resp.status(200).json({ message: "Coaching Classes deleted", success: true, data: result })
            }
            else {
                return resp.status(400).json({ message: "please cannot found", success: false })
            }


        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false,message:'Internal Server Error' });

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