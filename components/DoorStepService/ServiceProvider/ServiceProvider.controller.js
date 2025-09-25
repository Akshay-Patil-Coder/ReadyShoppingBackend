const { ObjectId } = require('mongodb')
const serviceProviderModel = require('./ServiceProvider.model')
const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path');
const serviceProductsModel = require('../ServiceProducts/ServiceProducts.model')
const ServiceAppointmentModel = require('../ServiceAppointment/ServiceAppointment.model');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')



module.exports = {


    addServiceProvider: async (req, resp) => {

        try {

            let { FirstName, LastName, companyId, HeadServiceId, SubServiceId, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, googleLocation, Password } = req.body;
            if (HeadServiceId) {
                HeadServiceId = JSON.parse(HeadServiceId);
            }
            if (SubServiceId) {
                SubServiceId = JSON.parse(SubServiceId);
            }

            if (!FirstName || !LastName || !companyId || !HeadServiceId || !SubServiceId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation || !Password) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceProviderImage', req.file.filename);
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

            let serviceProviderData = {
                FirstName,
                LastName,
                companyId,
                HeadServiceId,
                SubServiceId,
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
                Password
            };

            if (req.file) {
                serviceProviderData.ProviderImage = req.file.filename;

            }

            const newServiceProvider = new serviceProviderModel.serviceProviderModel(serviceProviderData);
            const result = await newServiceProvider.save();


            if (!result) {
                  if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceProviderImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                }

                return resp.status(400).json({ message: 'Something went wrong while saving the brand', success: false });
            }

            return resp.status(200).json({ data: result, success: true });
        } catch (error) {
              if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceProviderImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                }
            return resp.status(500).json({ error: error.message, success: false });
        }
    },


    getServiceProviderData: async (matchCondition) => {
        return await serviceProviderModel.serviceProviderModel.aggregate([
            { $match: matchCondition },
            {
                $lookup: {
                    from: "masterservicecategories",
                    localField: "HeadServiceId",
                    foreignField: "_id",
                    as: "HeadServices",
                }
            },
            {
                $lookup: {
                    from: "masterservicecategories",
                    localField: "SubServiceId",
                    foreignField: "_id",
                    as: "SubServices",
                }
            }
        ]);
    },

    getServiceProviderByData: async (req, res) => {
        const { HeadServiceId, SubServiceId, companyId, ServiceProviderId, googleLocation } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (HeadServiceId) {
                if (!mongoose.Types.ObjectId.isValid(HeadServiceId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadServiceId = { $in: [mongoose.Types.ObjectId.createFromHexString(HeadServiceId)] };
            }
            if (googleLocation) {
                matchCondition.googleLocation = String(googleLocation);
            }
            if (SubServiceId) {
                if (!mongoose.Types.ObjectId.isValid(SubServiceId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubServiceId = { $in: [mongoose.Types.ObjectId.createFromHexString(SubServiceId)] };
            }
            if (ServiceProviderId) {
                if (!mongoose.Types.ObjectId.isValid(ServiceProviderId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId.createFromHexString(ServiceProviderId);
            }
            console.log(matchCondition, 'condition')
            const data = await module.exports.getServiceProviderData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Provider Found', success: false });
            }

            // console.log('result of populated data', data);
            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false });
        }
    },

    updateSubServiceList: async (req, resp) => {
        try {
            let { ServiceProviderId, SubServiceId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!ServiceProviderId || !SubServiceId || SubServiceId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await serviceProviderModel.serviceProviderModel.findOneAndUpdate(
                        { _id: ServiceProviderId, companyId: companyId },
                        { $pull: { SubServiceId: { $in: SubServiceId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await serviceProviderModel.serviceProviderModel.findOneAndUpdate(
                        { _id: ServiceProviderId, companyId: companyId },
                        { $addToSet: { SubServiceId: { $each: SubServiceId } } },
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
    updateHeadServiceList: async (req, resp) => {
        try {
            let { ServiceProviderId, HeadServiceId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!ServiceProviderId || !HeadServiceId || HeadServiceId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await serviceProviderModel.serviceProviderModel.findOneAndUpdate(
                        { _id: ServiceProviderId, companyId: companyId },
                        { $pull: { HeadServiceId: { $in: HeadServiceId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await serviceProviderModel.serviceProviderModel.findOneAndUpdate(
                        { _id: ServiceProviderId, companyId: companyId },
                        { $addToSet: { HeadServiceId: { $each: HeadServiceId } } },
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

    updateServiceProviderDetail: async (req, resp) => {
        try {
            let {
                ServiceProviderId,
                FirstName,
                LastName,
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
                HeadServiceId,
                SubServiceId,
            } = req.body;
            if (HeadServiceId) {
                HeadServiceId = JSON.parse(HeadServiceId)
            }
            if (SubServiceId) {
                SubServiceId = JSON.parse(SubServiceId)
            }
            const companyId = req.query.companyId;
            console.log(req.body, 'new testing');

            if (!ServiceProviderId || !HeadServiceId || !SubServiceId || !FirstName || !LastName || !companyId || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !googleLocation) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceProviderImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
                return resp.status(400).send('Please insert valid data');

            }


            else {
                const serviceProviderData = {

                    FirstName,
                    LastName,
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
                    HeadServiceId,
                    SubServiceId
                }
                if (req.file) {
                    const existingServiceProvider = await serviceProviderModel.serviceProviderModel.findOne({ _id: ServiceProviderId, companyId: companyId })
                    if (existingServiceProvider && existingServiceProvider.ProviderImage) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceProviderImage', existingServiceProvider.ProviderImage);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    serviceProviderData.ProviderImage = req.file.filename;
                }

                let updatedResult = await serviceProviderModel.serviceProviderModel.updateOne(
                    { _id: ServiceProviderId, companyId: companyId },
                    {
                        $set: serviceProviderData
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
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceProviderImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }

                }
            return resp.status(400).json({ error: error.message, success: false });
        }
    },
    deleteServiceProvider: async (req, resp) => {
        try {
            if (!req.params.id) {
                return resp.status(400).json({ message: "please provide id of service provider", success: false })
            }
            const serviceproviderdata = await serviceProviderModel.serviceProviderModel.findById(req.params.id)
            if (serviceproviderdata) {
                const result = await serviceProviderModel.serviceProviderModel.deleteOne({ _id: req.params.id })
                if (!result) {
                    return resp.status(400).json({ message: "provider cannot be deleted", success: false })
                }
                const deleteServiceProduct = await serviceProductsModel.serviceProductsModel.deleteMany({ ProviderId: req.params.id })

                const deleteServiceAppointment = await ServiceAppointmentModel.ServiceAppointmentModel.deleteMany({ ServiceProviderId: req.params.id })


                return resp.status(200).json({ message: "provider deleted", success: true, data: result })
            }
            else {
                return resp.status(400).json({ message: "please cannot found", success: false })
            }


        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false });

        }
    },
    loginServiceProvider: async (req, resp) => {
        let { Email, Password } = req.body;

        try {
            if (!Email || !Password) {
                return resp.status(400).json({ message: 'please provide email and password', success: false })
            }
            let findServiceProvider = await serviceProviderModel.serviceProviderModel.findOne({ Email: Email })
            console.log(findServiceProvider, 'service provider')

            if (!findServiceProvider) {
                return resp.status(400).json({ message: 'service provider not found', success: false })
            }
            let passwordMatch = await bcrypt.compare(Password, findServiceProvider.Password);
            if (!passwordMatch) {
                return resp.status(400).json({ message: 'password not match', success: false })
            }
            let Role = "Service Provider"
            let token = jwt.sign(
                { ServiceProviderId: findServiceProvider._id, Email: findServiceProvider.Email, companyId: findServiceProvider.companyId, Role: Role },
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