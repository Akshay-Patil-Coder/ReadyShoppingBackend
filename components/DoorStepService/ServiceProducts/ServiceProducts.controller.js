const { serviceProductsModel } = require('./ServiceProducts.model')
const mongoose = require('mongoose');
const path = require('path')
const fs = require('fs');
const { ObjectId } = require('mongodb');
const { Parser } = require("json2csv");
const csvParser = require("csv-parser");
const { ServiceWishlist } = require('../ServiceWishlist/ServiceWishlist.model');
const csvgenerator = require('csv-writer').createObjectCsvWriter
const ServiceBanner = require('../ServiceBanners/ServiceBanners.model')
let searcher;
module.exports = {


    getproducts: async (req, res) => {
        try {
            let query = {}

            if (req.query.companyId) {
                query.companyId = ObjectId(req.query.companyId)
            }

            const data = await serviceProductsModel.find(query)
            res.status(200).send({
                success: true,
                message: "Successfully fetched",
                data: data
            });
        } catch (error) {
            console.log("error", error);
            res.status(500).send({
                success: false,
                message: "Unsuccessful fetch",
                error: error.message
            });
        }
    },


    addserviceproduct: async (req, res) => {
        const deleteUploadedFiles = (files) => {
            if (!files) return;

            files.forEach((file) => {
                const filePath = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        };

        const calculateFinalPrice = (parts) => {
            return parts.reduce((total, item) => total + (item.partPrice || 0), 0);
        };
        try {
            let {
                companyId,
                ServiceName,
                HeadServiceId,
                SubServiceId,
                ProviderId,
                service_description,
                service_parts,
                service_base_price,
                offerPercentage,
                serviceTime,
                googleLocation,
            } = req.body;

            if (!companyId || !ServiceName || !HeadServiceId || !SubServiceId || !ProviderId || !service_description || !googleLocation) {
                deleteUploadedFiles(req.files);
                return res.status(400).send({
                    success: false,
                    message: "All required fields must be filled"
                });
            }

            if (service_parts) {
                try {
                    service_parts = JSON.parse(service_parts);
                } catch (err) {
                    deleteUploadedFiles(req.files);
                    return res.status(400).send({
                        success: false,
                        message: "Invalid service_parts format"
                    });
                }
            }

            if (service_parts?.length) {
                const finalPrice = calculateFinalPrice(service_parts);
                if (finalPrice > 0) {
                    service_base_price = finalPrice;
                }
            }

            const serviceImages = req.files?.map(file => file.filename) || [];

            const newService = new serviceProductsModel({
                companyId,
                ServiceName,
                HeadServiceId,
                SubServiceId,
                ProviderId,
                service_description,
                service_parts,
                service_base_price,
                offerPercentage,
                serviceTime,
                googleLocation,
                serviceImages
            });

            const result = await newService.save();

            return res.status(201).send({
                success: true,
                message: "Service added successfully",
                data: result
            });

        } catch (error) {
            deleteUploadedFiles(req.files);

            console.error("Error:", error);
            return res.status(500).send({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },

    getServicePrductData: async (matchCondition, skip = 0, limit = 10) => {
        return await serviceProductsModel.aggregate([
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
            },
            {
                $lookup: {
                    from: "serviceproviders",
                    localField: "ProviderId",
                    foreignField: "_id",
                    as: "Providers",
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);
    },
    getServiceProductByData: async (req, res) => {
        let {
            HeadServiceId,
            Search,
            BannerId,
            SubServiceId,
            ServiceProductsIds,
            companyId,
            ServiceProductId,
            googleLocation,
            ProviderId,
            CategoryName,
            UserId,
            page = 1,
            limit = 10
        } = req.query;

        try {

            const currentPage = Number(page) || 1;
            const perPage = Number(limit) || 10;

            const skip = (currentPage - 1) * perPage;
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId), isActive: true };

            if (HeadServiceId) {
                if (!mongoose.Types.ObjectId.isValid(HeadServiceId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadServiceId = { $in: [mongoose.Types.ObjectId.createFromHexString(HeadServiceId)] };
            }

            if (ProviderId) {
                if (!mongoose.Types.ObjectId.isValid(ProviderId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ProviderId = { $in: [mongoose.Types.ObjectId.createFromHexString(ProviderId)] };
            }

            if (googleLocation) {
                matchCondition.googleLocation = {
                    $regex: googleLocation,
                    $options: "i"
                };
            }

            if (SubServiceId) {
                if (!mongoose.Types.ObjectId.isValid(SubServiceId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubServiceId = { $in: [mongoose.Types.ObjectId.createFromHexString(SubServiceId)] };
            }

            if (ServiceProductId) {
                if (!mongoose.Types.ObjectId.isValid(ServiceProductId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId.createFromHexString(ServiceProductId);
            }

            if (Search) {

                matchCondition.$or = [

                    {
                        ServiceName: {
                            $regex: Search,
                            $options: "i"
                        }
                    },

                    {
                        service_description: {
                            $regex: Search,
                            $options: "i"
                        }
                    },

                    {
                        googleLocation: {
                            $regex: Search,
                            $options: "i"
                        }
                    },

                    {
                        "service_parts.partName": {
                            $regex: Search,
                            $options: "i"
                        }
                    }

                ];

            }
            if (typeof ServiceProductsIds === "string") {
                ServiceProductsIds = ServiceProductsIds.split(",");
            }
            if (BannerId) {

                if (!mongoose.Types.ObjectId.isValid(BannerId)) {

                    return res.status(400).json({
                        success: false,
                        message: "Invalid BannerId"
                    });

                }

                let FoundBanner = await ServiceBanner.findOne({
                    _id: mongoose.Types.ObjectId.createFromHexString(BannerId),
                    companyId: mongoose.Types.ObjectId.createFromHexString(companyId)
                });

                if (!FoundBanner) {

                    return res.status(404).json({
                        success: false,
                        message: "Banner Not Found"
                    });

                }

                ServiceProductsIds = FoundBanner?.ServicesId || [];

                if (ServiceProductsIds.length) {

                    matchCondition._id = {
                        $in: ServiceProductsIds.map(id =>
                            mongoose.Types.ObjectId.createFromHexString(id.toString())
                        )
                    };

                } else {

                    return res.status(404).json({
                        success: false,
                        message: "No Services Found In Banner"
                    });

                }

            }
            if (ServiceProductsIds?.length) {

                matchCondition._id = {
                    $in: ServiceProductsIds.map(id =>
                        mongoose.Types.ObjectId.createFromHexString(id.toString())
                    )
                };
            }
            const total = await serviceProductsModel.countDocuments(matchCondition);
            let data = await module.exports.getServicePrductData(
                matchCondition,
                skip,
                perPage
            );

            if (mongoose.Types.ObjectId.isValid(UserId)) {

                let wishlistData = await ServiceWishlist.findOne({ UserId, companyId });
                let WishListIds = wishlistData?.ServiceProductsIds || [];

                if (WishListIds.length) {
                    const wishSet = new Set(WishListIds.map(id => id.toString()));

                    data = data.map((EachProduct) => ({
                        ...EachProduct,
                        Wishlist: wishSet.has(EachProduct._id.toString())
                    }));
                } else {
                    data = data.map((EachProduct) => ({
                        ...EachProduct,
                        Wishlist: false
                    }));
                }
            }

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Services Found', success: false });
            }

            return res.status(200).json({
                data,
                success: true,
                message: 'Data Fetched',
                total,
                currentPage,
                perPage,
                totalPages: Math.ceil(total / perPage)
            });
        } catch (error) {
            res.status(500).json({
                error: error.message,
                success: false,
                message: 'Internal Server Error'
            });
        }
    },


    updateServiceProducts: async (req, resp) => {
        try {
            let {
                ServiceName,
                HeadServiceId,
                SubServiceId,
                ProviderId,
                service_description,
                service_parts,
                service_base_price,
                offerPercentage,
                serviceTime,
                googleLocation,
                ServiceProductId
            } = req.body;
            let finalPrice = 0;

            if (service_parts) {
                service_parts = JSON.parse(service_parts);
            }
            console.log(req.body, 'update')
            const companyId = req.query.companyId;
            console.log(req.body, 'new testing');

            if (!ServiceProductId || !HeadServiceId || !serviceTime || !SubServiceId || !ProviderId || !ServiceName || !service_description || !googleLocation) {
                if (req.files) {
                    req.files.forEach((file) => {
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage', file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    });
                }
                return resp.status(400).send({ message: 'Please insert valid data', success: false });
            }

            let serviceProductData = {
                ServiceName,
                HeadServiceId,
                SubServiceId,
                ProviderId,
                service_description,
                serviceTime,
                googleLocation,
            };

            if (service_parts) {
                serviceProductData.service_parts = service_parts;
                service_parts.forEach(data => {
                    finalPrice += data.partPrice;
                });

                if (finalPrice > 0) {
                    serviceProductData.service_base_price = finalPrice;
                }
            } else {
                serviceProductData.service_base_price = service_base_price;
            }

            if (req.files) {
                const existingServiceProduct = await serviceProductsModel.findOne({ _id: ServiceProductId, companyId });

                if (existingServiceProduct && existingServiceProduct.serviceImages) {
                    const serviceImages = req.files.map(file => `${file?.filename}`);
                    const result = await serviceProductsModel.findOneAndUpdate(
                        { _id: ServiceProductId, companyId },
                        { $push: { serviceImages: { $each: serviceImages } } },
                        { new: true }
                    );
                }
            }

            serviceProductData.offerPercentage = offerPercentage && offerPercentage > 0 ? offerPercentage : null;

            const updatedResult = await serviceProductsModel.updateOne(
                { _id: ServiceProductId, companyId },
                { $set: serviceProductData }
            );

            if (!updatedResult) {
                return resp.status(400).json({ message: 'Service product not updated', success: false });
            } else {
                return resp.status(200).json({ data: updatedResult, success: true, message: "Updated" });
            }

        } catch (error) {
            if (req.files) {
                req.files.forEach((file) => {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage', file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                });
            }

            return resp.status(400).json({ error: error.message, success: false, message: "Internal Server Error" });
        }
    },

    deleteServiceProducts: async (req, resp) => {
        try {
            if (!req.params.id) {
                return resp.status(400).json({ message: "please provide id of service provider", success: false })
            }
            const serviceproductdata = await serviceProductsModel.findById(req.params.id)
            if (serviceproductdata) {
                const result = await serviceProductsModel.deleteOne({ _id: req.params.id })
                if (!result) {
                    return resp.status(400).json({ message: "service cannot be deleted", success: false })
                }
                return resp.status(200).json({ message: "service deleted", success: true, data: result })
            }
            else {
                return resp.status(400).json({ message: "service cannot found", success: false })
            }


        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false, message: "Internal Server Error" });

        }
    },

    deleteServiceImage: async (req, resp) => {
        try {
            let { serviceImages } = req.body;

            if (!serviceImages) {
                return resp.status(400).json({ message: "No service image provided", success: false });
            }

            if (!req.params.id) {
                return resp.status(400).json({ message: "Please provide the ID of the service provider", success: false });
            }

            const serviceproductdata = await serviceProductsModel.findById(req.params.id);

            if (!serviceproductdata) {
                return resp.status(400).json({ message: "Service product not found", success: false });
            }

            const result = await serviceProductsModel.findOneAndUpdate(
                { _id: req.params.id },
                { $pull: { serviceImages: serviceImages } },
                { new: true }
            );

            if (!result) {
                return resp.status(400).json({ message: "Service image cannot be deleted", success: false });
            }

            const imagePath = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage', serviceImages);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            } else {
                console.warn(`Image not found in filesystem: ${imagePath}`);
            }

            return resp.status(200).json({ message: "Service image deleted successfully", success: true, data: result });

        } catch (error) {
            console.error('Error deleting service image:', error);
            return resp.status(500).json({ error: error.message, success: false, message: "Internal Server Error" });
        }
    },
    updateServiceParts: async (req, resp) => {
        try {
            let { serviceProductId, service_parts } = req.body;
            let companyId = req.query.companyId;
            let operation = req.query.operation;

            console.log(serviceProductId, service_parts, companyId, operation, 'data');

            if (!serviceProductId || !companyId || !service_parts || !Array.isArray(service_parts)) {
                return resp.status(400).json({ message: "Please fill all required fields correctly", success: false });
            }

            let updateQuery = {};
            if (operation === 'delete') {
                updateQuery = { $pull: { service_parts: { partName: { $in: service_parts.map(p => p.partName) } } } };
            } else if (operation === 'add') {
                let existingData = await serviceProductsModel.findOne({ _id: serviceProductId, companyId: companyId });
                if (!existingData) {
                    return resp.status(404).json({ message: "Service product not found", success: false });
                }

                let existingParts = existingData.service_parts || [];

                let newParts = service_parts.filter(newPart =>
                    !existingParts.some(existingPart => existingPart.partName === newPart.partName)
                );

                if (newParts.length === 0) {
                    return resp.status(400).json({ message: "No unique parts to add", success: false });
                }

                updateQuery = { $push: { service_parts: { $each: newParts } } };
            } else {
                return resp.status(400).json({ message: "Invalid operation", success: false });
            }

            let updatedResult = await serviceProductsModel.findOneAndUpdate(
                { _id: serviceProductId, companyId: companyId },
                updateQuery,
                { new: true }
            );

            if (!updatedResult) {
                return resp.status(404).json({ message: "Service product not found", success: false });
            }

            let finalPrice = updatedResult.service_parts.reduce((acc, part) => acc + part.partPrice, 0);
            console.log(finalPrice, 'Updated price');

            const newResult = await serviceProductsModel.updateOne(
                { _id: serviceProductId },
                { $set: { service_base_price: finalPrice } }
            );

            return resp.status(200).json({ data: newResult, success: true, message: "Updated" });

        } catch (error) {
            console.error("Error:", error);
            return resp.status(500).json({ message: "Internal Server Error", success: false });
        }
    },
    generateBlankCSVServiceProducts: async (req, resp) => {
        const publicdirPath = path.join(__dirname, '..', '..', 'public', 'serviceCsv')
        if (!fs.existsSync(publicdirPath)) {
            fs.mkdirSync(publicdirPath, { recursive: true })
        }
        const filepath = path.join(publicdirPath, 'serviceProduct.csv')
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath)
        }
        const generateCsv = csvgenerator({
            path: filepath,
            header: [
                { id: 'ServiceName', title: 'ServiceName' },
                { id: 'service_description', title: 'service_description' },
                { id: 'service_parts', title: 'service_parts' },
                { id: 'service_base_price', title: 'service_base_price' },
                { id: 'offerPercentage', title: 'offerPercentage' },
                { id: 'serviceTime', title: 'serviceTime' },
                { id: 'googleLocation', title: 'googleLocation' },
                { id: 'serviceImages', title: 'serviceImages' },
            ]
        })
        generateCsv.writeRecords([]).then(() => {
            resp.status(200).json({ message: 'file generated succesfully', file: 'serviceProduct.csv', success: true })
            // resp.download(filepath, "serviceCsv")
        }).catch((err) => {
            resp.status(400).json({ err: err.message, message: 'file not generated', success: false })
        })
    },

    uploadServiceProductsCsv: async (req, resp) => {
        try {
            const { SubServiceId, HeadServiceId, ProviderId, companyId, SubServiceName } = req.body;

            if (!req.files || !req.files.csvFile) {
                return resp.status(400).json({ message: 'Please upload a CSV file', success: false });
            }

            if (!SubServiceId || !HeadServiceId || !ProviderId || !companyId || !SubServiceName) {
                module.exports.cleanupUploadedFiles(req.files);
                return resp.status(400).json({ message: "Please fill all required fields", success: false });
            }

            const csvFilePath = req.files.csvFile[0].path;
            const uploadedImages = req.files.serviceImages ? req.files.serviceImages.map((img) => img.originalname) : [];

            const serviceProducts = [];
            const csvListedImages = new Set();

            const stream = fs.createReadStream(csvFilePath).pipe(csvParser());

            stream.on('data', (row) => {
                try {
                    let serviceParts = [];
                    let calculatedPrice = 0;
                    if (row["service_parts"]) {
                        serviceParts = row["service_parts"].split(" | ").map((part) => {
                            const [partName, partPrice] = part.split(",");
                            const price = parseFloat(partPrice) || 0;
                            calculatedPrice += price;
                            return { partName: partName.trim(), partPrice: price };
                        });
                    }

                    let serviceImages = [];
                    if (row['serviceImages']) {
                        const imagePaths = row['serviceImages'].split(" | ").map((img) => img.trim());
                        imagePaths.forEach((img) => csvListedImages.add(img));
                        serviceImages = imagePaths.filter((img) => uploadedImages.includes(img));
                    }

                    let serviceBasePrice = parseFloat(row['service_base_price']) || null;
                    if (isNaN(serviceBasePrice)) {
                        serviceBasePrice = calculatedPrice;
                    }

                    serviceProducts.push({
                        companyId,
                        ServiceName: row["ServiceName"],
                        HeadServiceId,
                        SubServiceId,
                        ProviderId,
                        service_description: row["service_description"],
                        service_parts: serviceParts,
                        service_base_price: serviceBasePrice > 0 ? serviceBasePrice : calculatedPrice,
                        offerPercentage: parseFloat(row["offerPercentage"]) || null,
                        serviceTime: parseFloat(row["serviceTime"]) || null,
                        googleLocation: row["googleLocation"],
                        SubServiceName,
                        serviceImages: serviceImages.length > 0 ? serviceImages : null,
                    });
                } catch (error) {
                    console.error("Error processing CSV row:", error.message);
                }
            });

            stream.on("end", async () => {
                try {
                    if (serviceProducts.length === 0) {
                        module.exports.cleanupUploadedFiles(req.files);
                        return resp.status(400).json({ message: "No valid data found in CSV", success: false });
                    }

                    await serviceProductsModel.insertMany(serviceProducts);
                    module.exports.cleanupUnusedImages(uploadedImages, csvListedImages);

                    return resp.status(200).json({ message: "CSV uploaded successfully", success: true });
                } catch (error) {
                    console.error("Error inserting data:", error.message);
                    module.exports.cleanupUploadedFiles(req.files);
                    return resp.status(500).json({ message: 'Something went wrong', error: error.message, success: false });
                } finally {
                    fs.unlink(csvFilePath, (err) => {
                        if (err) console.error('Error deleting CSV file:', err);
                    });
                }
            });

        } catch (error) {
            console.error("Unexpected error:", error.message);
            return resp.status(500).json({ message: 'Internal server error', error: error.message, success: false });
        }
    },

    cleanupUploadedFiles: (files) => {
        if (!files) return;

        if (files.csvFile) {
            fs.unlink(files.csvFile[0].path, (err) => {
                if (err) console.error('Error deleting CSV file:', err);
            });
        }

        if (files.serviceImages) {
            files.serviceImages.forEach((file) => {
                const filePath = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    },

    cleanupUnusedImages: (uploadedImages, csvListedImages) => {
        const imagesDir = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage');

        uploadedImages.forEach((file) => {
            if (!csvListedImages.has(file)) {
                fs.unlink(path.join(imagesDir, file), (err) => {
                    if (err) console.error(`Error deleting file ${file}:`, err);
                });
            }
        });
    },
    getAvailableLocationOfServiceProducts: async (req, res) => {
        try {
            const { companyId } = req.query;

            let allGoogleLocations = await serviceProductsModel.distinct(
                "googleLocation",
                {
                    companyId: companyId,
                }
            );
            allGoogleLocations = [...new Set(allGoogleLocations)]
            return res.status(200).json({
                success: true,
                message: "Available locations fetched successfully",
                data: allGoogleLocations
            });

        } catch (error) {
            console.log("getAvailableLocationOfServiceProducts Error:", error);

            return res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    },
} 