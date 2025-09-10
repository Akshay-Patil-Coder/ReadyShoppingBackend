const { ObjectId } = require('mongodb')
const CoachingGainerCompaniesModel = require('./CoachingGainerCompnay.model')
const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')



module.exports = {


    addCoachingGainerCompanies: async (req, resp) => {

        try {

            let { CompanyGainerName, CompanyOwnerName, Contact_person_name, companyId, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, googleLocation, Password, } = req.body;
            // if (CompanyOwnerName) {
            //     CompanyOwnerName = JSON.parse(CompanyOwnerName);
            // }
            console.log(req.body, 'body')
            if (!CompanyGainerName || !CompanyOwnerName || !companyId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation || !Password) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingGainerCompanyImage', req.file.filename);
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

            let CoachingGainerCompanyData = {
                CompanyGainerName,
                CompanyOwnerName,
                companyId,
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
            };
            if (Contact_person_name) {
                CoachingGainerCompanyData.Contact_person_name = Contact_person_name
            }
            if (req.file) {
                CoachingGainerCompanyData.CoachingGainerCompanyLogo = req.file.filename;
                console.log(req.file.filename)
                console.log(CoachingGainerCompanyData.CoachingGainerCompanyLogo)
            }
            const newCoachingGainerCompany = new CoachingGainerCompaniesModel(CoachingGainerCompanyData);
            const result = await newCoachingGainerCompany.save();


            if (!result) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingGainerCompanyImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return resp.status(400).json({ message: 'Something went wrong while saving the company', success: false });
            }

            return resp.status(200).json({ data: result, success: true });
        } catch (error) {
            if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingGainerCompanyImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

            return resp.status(500).json({ error: error.message, success: false });
        }
    },

    getCoachingGainerCompaniesData: async (matchCondition) => {
        return await CoachingGainerCompaniesModel.aggregate([
            { $match: matchCondition },
        ]);
    },

    getCoachingGainerCompaniesByData: async (req, res) => {
        const { CompanyGainerName, Email, companyId, CoachingGainerCompanyId, googleLocation } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId(companyId) };

            if (CompanyGainerName) {
                matchCondition.CompanyGainerName = String(CompanyGainerName);
            }
            if (googleLocation) {
                matchCondition.googleLocation = String(googleLocation);
            }
            if (Email) {
                matchCondition.Email = String(Email);
            }
            if (CoachingGainerCompanyId) {
                if (!mongoose.Types.ObjectId.isValid(CoachingGainerCompanyId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId(CoachingGainerCompanyId);
            }

            const data = await module.exports.getCoachingGainerCompaniesData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No company Found', success: false });
            }

            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false });
        }
    },

    updateGainerCompanyOwnerNameList: async (req, res) => {
        try {
            let { CoachingGainerCompanyId, CompanyOwnerName } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!CoachingGainerCompanyId || !CompanyOwnerName || CompanyOwnerName.length == 0) {
                return res.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await CoachingGainerCompaniesModel.findOneAndUpdate(
                        { _id: CoachingGainerCompanyId, companyId: companyId },
                        { $pull: { CompanyOwnerName: { $in: CompanyOwnerName } } },
                        { new: true }
                    );

                    return res.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await CoachingGainerCompaniesModel.findOneAndUpdate(
                        { _id: CoachingGainerCompanyId, companyId: companyId },
                        { $addToSet: { CompanyOwnerName: { $each: CompanyOwnerName } } },
                        { new: true }
                    );

                    return res.status(200).json({ data: updatedResult, success: true });
                }

            }
        } catch (error) {
            console.error(error);
            return res.status(400).json({ error: error.message, success: false });
        }

    },
    updateEmployeeListInGainerCompany: async (req, resp) => {
        try {
            let { CoachingGainerCompanyId, Employees, EmployeeId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!CoachingGainerCompanyId) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    if (!EmployeeId) {
                        return resp.status(400).send('Please insert valid data');
                    }

                    let updatedResult = await CoachingGainerCompaniesModel.findOneAndUpdate(
                        { _id: CoachingGainerCompanyId, companyId: companyId },
                        { $pull: { Employees: { _id: { $in: EmployeeId } } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    if (!Employees || Employees.length === 0) {
                        return resp.status(400).send('Please insert valid data');
                    }
                    const hasInvalid = Employees.some(emp =>
                        !emp.EmployeeName || !emp.EmployeeEmail || !emp.EmployeePassword || !emp.EmployeeMobileNo
                    );

                    if (hasInvalid) {
                        return resp.status(400).json({
                            message: 'Please fill all required data of employee',
                            status: false
                        });
                    }

                    const NewEmployees = Employees.filter(emp =>
                        emp.EmployeeName && emp.EmployeeEmail && emp.EmployeePassword && emp.EmployeeMobileNo
                    );


                    let CompanyDetail = await CoachingGainerCompaniesModel.findOne({ _id: CoachingGainerCompanyId, companyId: companyId })
                    if (CompanyDetail.Employees.length !== 0) {

                        let updatedResult = await CoachingGainerCompaniesModel.findOneAndUpdate(
                            { _id: CoachingGainerCompanyId, companyId: companyId },
                            { $addToSet: { Employees: { $each: NewEmployees } } },
                            { new: true }
                        );
                        return resp.status(200).json({ data: updatedResult, success: true });
                    }
                    else {

                        let updatedResult = await CoachingGainerCompaniesModel.findOneAndUpdate(
                            { _id: CoachingGainerCompanyId, companyId: companyId },
                            { $addToSet: { Employees: NewEmployees } },
                            { new: true }
                        );
                        return resp.status(200).json({ data: updatedResult, success: true });

                    }

                }

            }
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });
        }

    },
    updateGainerCoachingCompanyDetail: async (req, resp) => {
        try {
            let {
                CoachingGainerCompanyId,
                CompanyGainerName,
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
            } = req.body;

            // if (CompanyOwnerName) {
            //     CompanyOwnerName = JSON.parse(CompanyOwnerName)
            // }
            const companyId = req.query.companyId;

            if (!CoachingGainerCompanyId || !CompanyGainerName || !CompanyOwnerName || !companyId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingGainerCompanyImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return resp.status(400).send('Please insert valid data');

            }


            else {
                const CoachingGainerCompanyData = {

                    CompanyGainerName,
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
                }


                if (req.file) {
                    const existingCoachingCompany = await CoachingGainerCompaniesModel.findOne({ _id: CoachingGainerCompanyId, companyId: companyId })
                    if (existingCoachingCompany && existingCoachingCompany.CourseCompanyLogo) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingGainerCompanyImage', existingCoachingCompany.CoachingGainerCompanyLogo);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    CoachingGainerCompanyData.CoachingGainerCompanyLogo = req.file.filename;
                }

                let updatedResult = await CoachingGainerCompaniesModel.updateOne(
                    { _id: CoachingGainerCompanyId, companyId: companyId },
                    {
                        $set: CoachingGainerCompanyData
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
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingGainerCompanyImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

            return resp.status(400).json({ error: error.message, success: false });
        }
    },
    deleteGainerCoachingCompany: async (req, resp) => {
        try {
            if (!req.params.id) {
                return resp.status(400).json({ message: "please provide id of company", success: false })
            }
            const coachingcompanydata = await CoachingGainerCompaniesModel.findById(req.params.id)
            if (coachingcompanydata) {
                const result = await CoachingGainerCompaniesModel.deleteOne({ _id: req.params.id })
                if (!result) {
                    return resp.status(400).json({ message: "Coaching gainer company cannot be deleted", success: false })
                }

                return resp.status(200).json({ message: "Coaching gainer Company deleted", success: true, data: result })
            }
            else {
                return resp.status(400).json({ message: "please cannot found", success: false })
            }


        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false });

        }
    },
    loginGainerCoachingCompany: async (req, resp) => {
        let { Email, Password } = req.body;

        try {
            if (!Email || !Password) {
                return resp.status(400).json({ message: 'please provide email and password', success: false })
            }
            let findCoachingCompany = await CoachingGainerCompaniesModel.findOne({ Email: Email })
            console.log(findCoachingCompany, 'findCoachingCompany')

            if (!findCoachingCompany) {
                return resp.status(400).json({ message: 'Coaching gainer Company not found', success: false })
            }
            let passwordMatch = await bcrypt.compare(Password, findCoachingCompany.Password);
            if (!passwordMatch) {
                return resp.status(400).json({ message: 'password not match', success: false })
            }
            let Role = "Coaching Gainer Company"
            let token = jwt.sign(
                { CoachingGainerCompanyId: findCoachingCompany._id, Email: findCoachingCompany.Email, companyId: findCoachingCompany.companyId, Role: Role },
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