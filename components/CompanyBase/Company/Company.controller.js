const mongoose = require('mongoose');
const Company = require('./Company.model');
const DeleteCompanyModal = require('./DeletedCompany.model');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer');
const AccessModel = require('../AccessManagment/AccessManagment.model')
const CategoryModel = require('../../Shopping/ProductCategories/ProductCategories.model')
const { brandmodel } = require('../../Shopping/ProductsBrand/ProductsBrand.model')
const { ProductService } = require('../../Shopping/ProductServices/ProductServices.model')
const BannerModel = require('../../Shopping/ShoppingBanners/ShoppingBanners.model')
const { Variant } = require('../../Shopping/Variants/Variants.model')
const { VariantProduct, Product, Batch } = require('../../Shopping/VariantsProducts/VariantsProducts.model')
const { ProductCart } = require('../../Shopping/ProductCart/ProductCart.model')
const { Wishlist } = require('../../Shopping/WishList/WishList.model')
const { ProductRating } = require('../../Shopping/ProductRating/ProductRating.model')
const { User } = require('../../UserBase/User/User.model')
const axios = require('axios');
const DeletedCompanyModel = require('./DeletedCompany.model');
module.exports = {
    addcompanies: async (req, res) => {
        let { CompanyName, CompanyDomain, PredifinedDomain, Latitude, Longitude, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, Contact_person_name, Password } = req.body;

        try {
            if (!CompanyName || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !Contact_person_name || !Password) {
                if (req.file?.filename) {
                    let newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({ message: "please filled all data", success: false })
            }
            try {
                if (!PredifinedDomain) {
                    let companyName = CompanyName || '';
                    let subdomain = companyName
                        .trim()
                        .split(/\s+/)[0]
                        ?.toLowerCase()
                        .replace(/\./g, '');
                    CompanyDomain = subdomain;
                }

                if (PredifinedDomain) {
                    let existingCompany = await Company.findOne({
                        PredifinedDomain: String(PredifinedDomain).toLowerCase()
                    });

                    if (existingCompany) {
                        if (req.file?.filename) {
                            let newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                            if (fs.existsSync(newImagePath)) {
                                fs.unlinkSync(newImagePath);
                            }
                        }
                        return res.status(400).json({
                            success: false,
                            message: 'Your domain is already registered.'
                        });
                    }

                    PredifinedDomain = String(PredifinedDomain).toLowerCase();
                }

                if (CompanyDomain) {
                    let baseDomain = String(CompanyDomain).trim().toLowerCase();
                    let uniqueDomain = baseDomain;
                    let count = 1;

                    while (await Company.findOne({ CompanyDomain: uniqueDomain })) {
                        uniqueDomain = `${baseDomain}${count}`;
                        count++;
                    }

                    CompanyDomain = uniqueDomain;
                }
                if (!CompanyDomain && !PredifinedDomain) {
                    if (req.file?.filename) {
                        let newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return res.status(400).json({ message: "domain not fetched by company name please provide company name or your domain", success: false })
                }

            } catch (error) {
                console.error('Error generating or validating company domain:', error);
                if (req.file?.filename) {
                    let newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(500).json({
                    success: false,
                    message: 'Server error while validating company domain.'
                });
            }

            if (Phone) {
                let findCompany = await Company.findOne({ Phone: String(Phone) })
                if (findCompany) {
                    return res.status(400).json({ message: 'mobile number must be unique' })
                }
            }
            let CopyOfPassword;
            if (Password) {
                let salt = await bcrypt.genSalt(10);
                CopyOfPassword = Password;
                Password = await bcrypt.hash(Password, salt);
            }

            let CompanyData = {
                CompanyName,
                Street,
                City,
                State,
                Country,
                PostalCode,
                Email,
                Phone,
                PanCardNo,
                GstNo,
                Contact_person_name,
                Password,
            };

            let fetchLatLng = async () => {
                if (!Latitude || !Longitude) {
                    let address = [Street, City, State, Country, PostalCode].filter(Boolean).join(', ');
                    let apiKey = process.env.GOOGLE_MAPS_API_KEY;
                    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
                    let response = await axios.get(url);
                    let results = response.data.results;

                    if (!results || results.length === 0) {
                        return
                    }

                    let location = results[0].geometry.location;
                    CompanyData.Latitude = location.lat;
                    CompanyData.Longitude = location.lng;
                }
            };

            if (PredifinedDomain) {
                CompanyData.PredifinedDomain = PredifinedDomain
            }
            else if (CompanyDomain) {
                CompanyData.CompanyDomain = CompanyDomain
            }
            if (req.file) {
                CompanyData.CompanyLogo = req.file.filename
            }
            if (Latitude && Longitude) {
                CompanyData.Latitude = Latitude
                CompanyData.Longitude = Longitude
            }
            else {
                await fetchLatLng();
            }
            console.log(CompanyData, 'data')

            let company = new Company(CompanyData);
            let data = await company.save();

            if (!data) {
                if (req.file?.filename) {
                    let newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return res.status(400).json({ message: 'Something went wrong while saving the brand', success: false });
            }

            if (CompanyDomain) {
                let redirectLink = `https://${CompanyDomain}.shop.readytechnologies.in`;
                let adminPanelLink = `https://adminshop.readytechnologies.in`;

                let transporter = nodemailer.createTransport({
                    host: '192.168.1.112',
                    port: 465,
                    secure: true,
                    auth: {
                        user: 'hr@onelifecapital.in',
                        pass: 'Desti@2017'
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });

                let mailOptions = {
                    from: '"HR" <hr@onelifecapital.in>',
                    to: Email,
                    subject: 'Your Website Access Details',
                    html: `
    <p>Please go to the admin panel and log in with your email and password:</p>
    <p><strong>Email:</strong> ${Email}</p>
    <p><strong>Password:</strong> ${CopyOfPassword}</p>
    <p><strong>User Panel:</strong> <a href="${redirectLink}" target="_blank">${redirectLink}</a></p>
    <p><strong>Admin Panel:</strong> <a href="${adminPanelLink}" target="_blank">${adminPanelLink}</a></p>
  `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending mail:', error);
                    } else {
                        console.log('Email sent:', info.response);
                    }
                });

            }
            else if (PredifinedDomain) {
                let adminPanelLink = `https://adminshop.readytechnologies.in`;

                let transporter = nodemailer.createTransport({
                    host: '192.168.1.112',
                    port: 465,
                    secure: true,
                    auth: {
                        user: 'hr@onelifecapital.in',
                        pass: 'Desti@2017'
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });

                let mailOptions = {
                    from: '"HR" <hr@onelifecapital.in>',
                    to: Email,
                    subject: 'Your Website Access Details',
                    html: `
    <p>Please go to the admin panel and log in with your email and password(please open link in laptops for better experience)</p>
    <p><strong>Email:</strong> ${Email}</p>
    <p><strong>Password:</strong> ${CopyOfPassword}</p>
    <p><strong>Your Domain:</strong> ${PredifinedDomain} Wait For Making Live </p>
    <p><strong>Admin Panel:</strong> <a href="${adminPanelLink}" target="_blank">${adminPanelLink}</a></p>
  `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending mail:', error);
                    } else {
                        console.log('Email sent:', info.response);
                    }
                });

            }
            res.status(200).send({
                success: true,
                message: "Company successfully added",
                data: data
            });
        } catch (error) {
            console.log("error", error)
            res.status(500).send({
                success: false,
                message: "Failed to add company",
                error: error.message
            });
        }
    },
    getcompanies: async (req, res) => {
        try {
            let query = {}
            if (req.query.id) {
                query._id = mongoose.Types.ObjectId.createFromHexString(req.query.id);
            }
            if (req.query.CompanyDomain) query.CompanyDomain = (req.query.CompanyDomain)
            if (req.query.PredifinedDomain) query.PredifinedDomain = (req.query.PredifinedDomain)

            let data = await Company.find(query);



            res.status(200).send({
                success: true,
                message: "Company successfully fetched",
                data: data
            });
        } catch (error) {
            console.log("error", error)
            res.status(500).send({
                success: false,
                message: "Failed to add company",
                error: error.message
            });
        }
    },

    updatecompanies: async (req, res) => {
        let removeUploadedFile = () => {
            if (req.file?.filename) {
                let newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
            }
        };

        try {
            let {
                CompanyName,
                PredifinedDomain,
                Street,
                City,
                State,
                Country,
                PostalCode,
                Email,
                Phone,
                PanCardNo,
                GstNo,
                Contact_person_name,
                _id,
                Latitude,
                Longitude
            } = req.body;
            if (req.user.companyId) _id = req.user.companyId

            if (!_id) {
                removeUploadedFile();
                return res.status(400).json({ message: "Please provide company ID to update", success: false });
            }

            let FoundCompany = await Company.findById(_id);
            if (!FoundCompany) {
                removeUploadedFile();
                return res.status(404).json({ message: "Company not found", success: false });
            }

            let fields = {
                CompanyName,
                Street,
                City,
                State,
                Country,
                PostalCode,
                Email,
                Phone,
                PanCardNo,
                GstNo,
                Contact_person_name
            };

            let CompanyData = Object.fromEntries(
                Object.entries(fields).filter(([_, v]) => v !== undefined && v !== null && v !== "")
            );

            if (PredifinedDomain) {
                let existingDomain = await Company.findOne({
                    PredifinedDomain: String(PredifinedDomain),
                    _id: { $ne: _id }
                });
                if (existingDomain) {
                    removeUploadedFile();
                    return res.status(400).json({
                        message: "Your domain is already registered",
                        success: false
                    });
                }
                CompanyData.PredifinedDomain = PredifinedDomain;
            }

            if (req.file?.filename) {
                if (FoundCompany.CompanyLogo) {
                    let oldImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', FoundCompany.CompanyLogo);
                    if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
                }
                CompanyData.CompanyLogo = req.file.filename;
            }

            if ((!Latitude || !Longitude) && (Street || City || State || Country || PostalCode)) {
                let address = [
                    Street || FoundCompany.Street,
                    City || FoundCompany.City,
                    State || FoundCompany.State,
                    Country || FoundCompany.Country,
                    PostalCode || FoundCompany.PostalCode
                ].filter(Boolean).join(', ');

                if (!address) {
                    removeUploadedFile();
                    return res.status(400).json({
                        message: "Address fields are incomplete or invalid",
                        success: false
                    });
                }

                try {
                    let apiKey = process.env.GOOGLE_MAPS_API_KEY;
                    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
                    let response = await axios.get(url);

                    if (response.data.results?.length > 0) {
                        let location = response.data.results[0].geometry.location;
                        CompanyData.Latitude = location.lat;
                        CompanyData.Longitude = location.lng;
                    } else {
                        console.warn("No geocode results found for address:", address);
                    }
                } catch (geoErr) {
                    console.warn("Geocoding failed:", geoErr.message);
                }
            } else {
                if ((Latitude && !Longitude) || (!Latitude && Longitude)) {
                    removeUploadedFile();
                    return res.status(400).json({
                        message: 'If you provide location, then provide both Latitude and Longitude',
                        success: false
                    });
                }

                if (Latitude && Longitude) {
                    if (!Street || !City || !State || !Country || !PostalCode) {
                        removeUploadedFile();
                        return res.status(400).json({
                            message: "If you fetch current location manually, provide full address details",
                            success: false
                        });
                    }
                    CompanyData.Latitude = Latitude;
                    CompanyData.Longitude = Longitude;
                }
            }

            let updatedCompany = await Company.findByIdAndUpdate(_id, { $set: CompanyData }, { new: true });

            return res.status(200).json({
                success: true,
                message: "Company successfully updated",
                data: updatedCompany
            });

        } catch (error) {
            console.error("Error updating company:", error);
            removeUploadedFile();
            return res.status(500).json({
                success: false,
                message: "Failed to update company",
                error: error.message
            });
        }
    },



    deletecompanies: async (req, res) => {
        try {
            let existingCompany = await Company.findOne({ _id: req.params._id })
            if (existingCompany && existingCompany?.CompanyLogo) {
                let oldImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', existingCompany.CompanyLogo);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            let data = await Company.deleteOne({ _id: req.params._id })
            res.status(200).send({
                success: true,
                message: "Company successfully deleted",
                data: data
            });
        } catch (error) {
            console.log("error", error)
            res.status(500).send({
                success: false,
                message: "Failed to add company",
                error: error.message
            });
        }
    },
    addBankDetailOfCompany: async (req, res) => {
        try {
            let { companyId, IFSC, AccountNumber, BankName, BranchName, MICR, Address, BankState } = req.body;
            if (req.user.companyId) companyId = req.user.companyId

            if (!companyId || !IFSC || !AccountNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide companyId, IFSC, and AccountNumber."
                });
            }

            let company = await Company.findById(companyId);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: "Company not found."
                });
            }

            if (!/^\d{9,18}$/.test(AccountNumber)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Account Number format."
                });
            }

            let bankDetails = {
                IFSC,
                AccountNumber,
                BankName: BankName?.trim() || "",
                BranchName: BranchName?.trim() || "",
                MICR: MICR?.trim() || "",
                Address: Address?.trim() || "",
                BankState: BankState?.trim() || ""
            };

            let updatedCompany = await Company.findByIdAndUpdate(
                companyId,
                { $set: { BankDetails: bankDetails } },
                { new: true }
            );

            if (!updatedCompany) {
                return res.status(400).json({
                    success: false,
                    message: "Failed to update bank details."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Bank details updated successfully.",
                data: updatedCompany
            });

        } catch (error) {
            console.error("AddBankDetailOfCompanyError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },
    deleteBankDetailOfCompany: async (req, res) => {
        try {
            let { companyId } = req.query;
            if (req.user.companyId) companyId = req.user.companyId

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide companyId."
                });
            }

            let company = await Company.findById(companyId);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: "Company not found."
                });
            }

            if (!company.BankDetails || Object.keys(company.BankDetails).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No bank details found to delete."
                });
            }

            let updatedCompany = await Company.findByIdAndUpdate(
                companyId,
                { $unset: { BankDetails: "" } },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: "Bank details deleted successfully.",
                data: updatedCompany
            });

        } catch (error) {
            console.error("DeleteBankDetailOfCompanyError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },
    previewDeleteCompany: async (req, res) => {
        try {
            let { companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({ message: 'Company Not Found', success: false });
            }

            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({ message: 'Invalid Company ID', success: false });
            }

            let FoundCompany = await Company.findById(companyId);
            if (!FoundCompany) {
                return res.status(404).json({ message: 'Company Not Found', success: false });
            }

            let AllData = {
                access: [],
                shopping: {}
            };

            let FoundAccess = await AccessModel.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(String(companyId))
                    }
                },
                {
                    $lookup: {
                        from: 'masterusers',
                        localField: 'assignvalues',
                        foreignField: '_id',
                        as: 'assignValues'
                    }
                }
            ]);
            function cleanCategory(cat) {
                return {
                    categoryName: cat.categoryName,
                    categoryLevel: cat.categoryLevel,
                    Description: cat.Description,
                    imageName: cat.imageName,
                    _id: cat._id,
                    subcategories: (cat.subcategories || []).map(sub => cleanCategory(sub))
                };
            }

            AllData.access = FoundAccess;

            let AssignValues = FoundAccess[0]?.assignValues || [];

            for (let EachAccess of AssignValues) {
                if (EachAccess.FunctionallityName === 'shopping') {

                    try {
                        let categoryRes = await axios.get(
                            `${process.env.BASE_URL}dynamicCategories/getCategoryTree?companyId=${companyId}`
                        );

                        let rawCategories = categoryRes.data.data;
                        rawCategories = Array.isArray(rawCategories) ? rawCategories : [rawCategories]

                        AllData.shopping.categories = rawCategories.map(cat => cleanCategory(cat));

                    } catch (error) {
                        console.error("Error fetching categories:", error.message);
                    }

                    try {
                        let brandres = await axios.get(
                            `${process.env.BASE_URL}brands/getBrandsById?companyId=${companyId}`
                        );

                        AllData.shopping.brands = brandres.data.data.map((EachBrand) => {
                            return {
                                BrandName: EachBrand.BrandName,
                                BrandImage: EachBrand.BrandImage,
                                _id: EachBrand._id
                            }
                        });
                    } catch (error) {
                        console.error("Error fetching brands:", error.message);
                    }
                    try {
                        let bannerres = await axios.get(
                            `${process.env.BASE_URL}masterbanners/getBannersById?companyId=${companyId}`
                        );

                        AllData.shopping.banners = bannerres.data.data.map((EachBanner) => {
                            return {
                                BannerName: EachBanner.BannerName,
                                Position: EachBanner.Position,
                                BannerImage: EachBanner.BannerImage,
                                OfferPercentage: EachBanner.OfferPercentage,
                                BannerType: EachBanner.BannerType,
                                _id: EachBanner._id

                            }
                        });
                    } catch (error) {
                        console.error("Error fetching banners:", error.message);
                    }
                    try {
                        let variantres = await axios.get(
                            `${process.env.BASE_URL}variants/getVariantsById?companyId=${companyId}`
                        );

                        AllData.shopping.variants = variantres.data.data.map((EachVariant) => {
                            return {
                                VariantName: EachVariant.VariantName,
                                VariantType: EachVariant.VariantType,
                                _id: EachVariant._id
                            }
                        })
                    } catch (error) {
                        console.error("Error fetching variantres:", error.message);
                    }
                    try {
                        let productserviceres = await axios.get(
                            `${process.env.BASE_URL}productservices/getProductServicesById?companyId=${companyId}`
                        );

                        AllData.shopping.productservices = productserviceres.data.data.map((EachService) => {
                            return {
                                ServiceName: EachService.ServiceName,
                                ServiceImages: EachService.ServiceImages,
                                Description: EachService.Description,
                                _id: EachService._id
                            }
                        });
                    } catch (error) {
                        console.error("Error fetching productservices:", error.message);
                    }
                    try {
                        let productsres = await axios.post(
                            `${process.env.BASE_URL}products/getProductsById?companyId=${companyId}`, { '': '' }
                        );

                        AllData.shopping.products = productsres.data.data.map((EachProduct) => {
                            return {
                                ProductName: EachProduct.ProductName,
                                CommonImages: EachProduct.CommonImages,
                                CommonVideos: EachProduct.CommonVideos,
                                CommonDescription: EachProduct.CommonDescription,
                                ProductId: EachProduct._id,
                                VariantProducts: EachProduct.VariantProducts.map((EachVariantProduct) => {
                                    return {
                                        VariantProductId: EachVariantProduct._id,
                                        VariantProductName: EachVariantProduct.VariantProductName,
                                        Price: EachVariantProduct.Price,
                                        VariantProductImage: EachVariantProduct.VariantProductImage,
                                        OfferPercentage: EachVariantProduct.OfferPercentage,
                                        AboutProduct: EachVariantProduct.AboutProduct,
                                        Specification: EachVariantProduct.Specification,
                                        VariantFields: EachVariantProduct.VariantFields
                                    }
                                })
                            }
                        });
                    } catch (error) {
                        console.error("Error fetching products:", error.message);
                    }


                }
            }

            return res.status(200).json({
                success: true,
                data: AllData
            });

        } catch (error) {
            console.error("Error previewDeleteCompany:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    },
    ToggleStatusOfCompany: async (req, res) => {
        try {
            let { companyId, isActive } = req.query;

            if (!companyId) {
                return res.status(400).json({ message: 'Company Not Found', success: false });
            }
            if (typeof isActive !== 'boolean') {
                return res.status(400).json({
                    message: 'Provide valid status to update',
                    success: false
                });
            }

            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({ message: 'Invalid Company ID', success: false });
            }

            let FoundCompany = await Company.findById(companyId);
            if (!FoundCompany) {
                return res.status(404).json({ message: 'Company Not Found', success: false });
            }

            let AllData = {
                access: [],
                shopping: {}
            };

            let FoundAccess = await AccessModel.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(String(companyId))
                    }
                },
                {
                    $lookup: {
                        from: 'masterusers',
                        localField: 'assignvalues',
                        foreignField: '_id',
                        as: 'assignValues'
                    }
                }
            ]);
            function cleanCategory(cat) {
                return {
                    categoryName: cat.categoryName,
                    categoryLevel: cat.categoryLevel,
                    Description: cat.Description,
                    imageName: cat.imageName,
                    _id: cat._id,
                    isActive: cat.isActive,
                    isActiveBy: cat.isActiveBy,
                    subcategories: (cat.subcategories || []).map(sub => cleanCategory(sub))
                };
            }
            async function updateCategoryRecursively(category, isActive) {
                if (['Self', 'Parent'].includes(category.isActiveBy) && category.isActive !== false && isActive === false) {
                    await CategoryModel.findByIdAndUpdate(category._id, {
                        $set: { isActive: false, isActiveBy: "Company" }
                    });
                }
                else if (category.isActiveBy === "Company" && isActive === true) {
                    await CategoryModel.findByIdAndUpdate(category._id, {
                        $set: { isActive: true, isActiveBy: "Company" }
                    });
                }
                else if (!category.isActiveBy) {
                    await CategoryModel.findByIdAndUpdate(category._id, {
                        $set: { isActive, isActiveBy: "Company" }
                    });
                }

                for (let sub of category.subcategories) {
                    await updateCategoryRecursively(sub, isActive);
                }
            }

            AllData.access = FoundAccess;

            let AssignValues = FoundAccess[0]?.assignValues || [];

            for (let EachAccess of AssignValues) {
                if (EachAccess.FunctionallityName === 'shopping') {

                    try {
                        let categoryRes = await axios.get(
                            `${process.env.BASE_URL}dynamicCategories/getCategoryTree?companyId=${companyId}`
                        );

                        let rawCategories = categoryRes.data.data;
                        rawCategories = Array.isArray(rawCategories) ? rawCategories : [rawCategories];

                        AllData.shopping = {};
                        AllData.shopping.categories = rawCategories.map(cat => cleanCategory(cat));

                        for (let category of AllData.shopping.categories) {
                            await updateCategoryRecursively(category, isActive);
                        }

                    } catch (error) {
                        console.error("Error fetching categories:", error.message);
                    }


                    try {
                        const brandres = await axios.get(
                            `${process.env.BASE_URL}brands/getBrandsById?companyId=${companyId}`
                        );

                        const rawBrands = brandres.data.data || [];

                        AllData.shopping.brands = rawBrands.map(b => ({
                            BrandName: b.BrandName,
                            BrandImage: b.BrandImage,
                            _id: b._id,
                            isActive: b.isActive,
                            isActiveBy: b.isActiveBy
                        }));

                        for (const brand of AllData.shopping.brands) {

                            if (brand.isActiveBy === "Self" && brand.isActive !== false && isActive === false) {
                                await brandmodel.findByIdAndUpdate(brand._id, {
                                    $set: { isActive: false, isActiveBy: "Company" }
                                });
                            }
                            else if (brand.isActiveBy === "Company" && isActive === true) {
                                await brandmodel.findByIdAndUpdate(brand._id, {
                                    $set: { isActive: true, isActiveBy: "Company" }
                                });
                            }
                            else if (!brand.isActiveBy) {
                                await brandmodel.findByIdAndUpdate(brand._id, {
                                    $set: { isActive: isActive, isActiveBy: "Company" }
                                });
                            }
                        }

                    } catch (error) {
                        console.error("Error fetching brands:", error.message);
                    }

                    try {
                        const bannerres = await axios.get(
                            `${process.env.BASE_URL}masterbanners/getBannersById?companyId=${companyId}`
                        );

                        const rawBanners = bannerres.data.data || [];

                        AllData.shopping.banners = rawBanners.map(b => ({
                            BannerName: b.BannerName,
                            Position: b.Position,
                            BannerImage: b.BannerImage,
                            OfferPercentage: b.OfferPercentage,
                            BannerType: b.BannerType,
                            _id: b._id,
                            isActive: b.isActive,
                            isActiveBy: b.isActiveBy
                        }));

                        for (const banner of AllData.shopping.banners) {

                            if (banner.isActiveBy === "Self" && banner.isActive !== false && isActive === false) {
                                await BannerModel.findByIdAndUpdate(banner._id, {
                                    $set: { isActive: false, isActiveBy: "Company" }
                                });
                            }

                            else if (banner.isActiveBy === "Company" && isActive === true) {
                                await BannerModel.findByIdAndUpdate(banner._id, {
                                    $set: { isActive: true, isActiveBy: "Company" }
                                });
                            }

                            else if (!banner.isActiveBy) {
                                await BannerModel.findByIdAndUpdate(banner._id, {
                                    $set: { isActive: isActive, isActiveBy: "Company" }
                                });
                            }
                        }

                    } catch (error) {
                        console.error("Error fetching banners:", error.message);
                    }

                    try {
                        let variantres = await axios.get(
                            `${process.env.BASE_URL}variants/getVariantsById?companyId=${companyId}`
                        );

                        const variants = variantres.data.data || [];

                        AllData.shopping.variants = variants.map(v => ({
                            VariantName: v.VariantName,
                            VariantType: v.VariantType,
                            _id: v._id,
                            isActive: v.isActive,
                            isActiveBy: v.isActiveBy
                        }));

                        for (const variant of AllData.shopping.variants) {

                            if (
                                variant.isActiveBy === "Self" &&
                                variant.isActive === true &&
                                isActive === false
                            ) {
                                await Variant.findByIdAndUpdate(variant._id, {
                                    $set: { isActive: false, isActiveBy: "Company" }
                                });
                                continue;
                            }

                            if (variant.isActiveBy === "Company" && isActive === true) {
                                await Variant.findByIdAndUpdate(variant._id, {
                                    $set: { isActive: true, isActiveBy: "Company" }
                                });
                                continue;
                            }

                            if (!variant.isActiveBy) {
                                await Variant.findByIdAndUpdate(variant._id, {
                                    $set: { isActive: isActive, isActiveBy: "Company" }
                                });
                                continue;
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching variantres:", error.message);
                    }

                    try {
                        const productserviceres = await axios.get(
                            `${process.env.BASE_URL}productservices/getProductServicesById?companyId=${companyId}`
                        );

                        const services = productserviceres?.data?.data || [];

                        AllData.shopping.productservices = services.map(s => ({
                            ServiceName: s.ServiceName,
                            ServiceImages: s.ServiceImages,
                            Description: s.Description,
                            _id: s._id,
                            isActive: s.isActive,
                            isActiveBy: s.isActiveBy
                        }));

                        for (const service of AllData.shopping.productservices) {

                            if (service.isActiveBy === "Self" && service.isActive && !isActive) {
                                await ProductService.findByIdAndUpdate(service._id, {
                                    $set: { isActive: false, isActiveBy: "Company" }
                                });
                                continue;
                            }

                            if (service.isActiveBy === "Company" && isActive === true) {
                                await ProductService.findByIdAndUpdate(service._id, {
                                    $set: { isActive: true, isActiveBy: "Company" }
                                });
                                continue;
                            }

                            if (!service.isActiveBy) {
                                await ProductService.findByIdAndUpdate(service._id, {
                                    $set: { isActive, isActiveBy: "Company" }
                                });
                                continue;
                            }
                        }

                    } catch (error) {
                        console.error("Error fetching productservices:", error.message);
                    }

                    try {
                        const productsres = await axios.post(
                            `${process.env.BASE_URL}products/getProductsById?companyId=${companyId}`,
                            { "": "" }
                        );

                        const products = productsres?.data?.data || [];

                        AllData.shopping.products = products.map(product => ({
                            ProductName: product.ProductName,
                            CommonImages: product.CommonImages,
                            CommonVideos: product.CommonVideos,
                            CommonDescription: product.CommonDescription,
                            ProductId: product._id,
                            isActive: product.isActive,
                            isActiveBy: product.isActiveBy,

                            VariantProducts: (product.VariantProducts || []).map(vp => ({
                                VariantProductId: vp._id,
                                VariantProductName: vp.VariantProductName,
                                Price: vp.Price,
                                VariantProductImage: vp.VariantProductImage,
                                OfferPercentage: vp.OfferPercentage,
                                AboutProduct: vp.AboutProduct,
                                Specification: vp.Specification,
                                VariantFields: vp.VariantFields,
                                isActive: vp.isActive,
                                isActiveBy: vp.isActiveBy,
                                ProductId: product._id
                            }))
                        }));

                        for (const product of AllData.shopping.products) {

                            if (product.isActiveBy === "Self" && product.isActive === true && isActive === false) {
                                await Product.findByIdAndUpdate(product.ProductId, {
                                    $set: { isActive: false, isActiveBy: "Company" }
                                });
                            }
                            else if (product.isActiveBy === "Company" && isActive === true) {
                                await Product.findByIdAndUpdate(product.ProductId, {
                                    $set: { isActive: true, isActiveBy: "Company" }
                                });
                            }
                            else if (!product.isActiveBy) {
                                await Product.findByIdAndUpdate(product.ProductId, {
                                    $set: { isActive: isActive, isActiveBy: "Company" }
                                });
                            }

                            for (const variant of product.VariantProducts) {

                                if (
                                    variant.isActiveBy === "Self" &&
                                    variant.isActive === true &&
                                    isActive === false
                                ) {
                                    await VariantProduct.findByIdAndUpdate(variant.VariantProductId, {
                                        $set: { isActive: false, isActiveBy: "Company" }
                                    });
                                }

                                else if (variant.isActiveBy === "Company" && isActive === true) {
                                    await VariantProduct.findByIdAndUpdate(variant.VariantProductId, {
                                        $set: { isActive: true, isActiveBy: "Company" }
                                    });
                                }

                                else if (!variant.isActiveBy) {
                                    await VariantProduct.findByIdAndUpdate(variant.VariantProductId, {
                                        $set: { isActive: isActive, isActiveBy: "Company" }
                                    });
                                }
                            }
                        }

                    } catch (error) {
                        console.error("Error fetching products:", error.message);
                    }


                }
            }
            let UpdateCompany = await Company.findByIdAndUpdate(companyId, {
                $set: {
                    isActive: isActive,
                    isActiveBy: 'Company'
                }
            })
            return res.status(200).json({
                success: true,
                data: UpdateCompany,
                AllData: AllData
            });

        } catch (error) {
            console.error("Error ToggleStatusOfCompany:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
        }
    },

    DeleteCompany: async (req, res) => {
        let { companyId } = req.query;

        const deleteFiles = async (files, folder) => {
            try {
                if (!Array.isArray(files)) files = [files];

                for (const file of files) {
                    if (!file) continue;

                    const filePath = path.join(__dirname, "..", "..", "public", folder, file);
                    if (fs.existsSync(filePath)) {
                        await fs.promises.unlink(filePath);
                    }
                }
            } catch (err) {
                console.warn(`⚠️ File delete failed in ${folder}:`, err.message);
            }
        };

        try {
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: "companyId required"
                });
            }

            try {
                const categories = await CategoryModel.find({ companyId });
                for (const cat of categories) {
                    if (cat?.imageName) {
                        await deleteFiles(cat.imageName, "ProductCategories");
                    }
                }
            } catch (err) {
                console.error("❌ Category image delete error:", err.message);
            }

            try {
                const brands = await brandmodel.find({ companyId });
                for (const brand of brands) {
                    if (brand?.BrandImage) {
                        await deleteFiles(brand.BrandImage, "BrandImage");
                    }
                }
            } catch (err) {
                console.error("❌ Brand image delete error:", err.message);
            }

            try {
                const banners = await BannerModel.find({ companyId });
                for (const banner of banners) {
                    if (banner?.BannerImage) {
                        await deleteFiles(banner.BannerImage, "BannerImage");
                    }
                }
            } catch (err) {
                console.error("❌ Banner image delete error:", err.message);
            }

            try {
                const products = await Product.find({ companyId });
                await Promise.allSettled(
                    products.map(p =>
                        Promise.all([
                            deleteFiles(p.CommonImages, "ProductImage"),
                            deleteFiles(p.CommonVideos, "ProductVideo")
                        ])
                    )
                );
            } catch (err) {
                console.error("❌ Product media delete error:", err.message);
            }

            try {
                const variants = await VariantProduct.find({ companyId });
                for (const vp of variants) {
                    await deleteFiles(vp.VariantProductImage, "ProductImage");
                }
            } catch (err) {
                console.error("❌ Variant product image delete error:", err.message);
            }

            try {
                const services = await ProductService.find({ companyId });
                for (const service of services) {
                    await deleteFiles(service.ServiceImages, "ProductServiceImage");
                }
            } catch (err) {
                console.error("❌ Service image delete error:", err.message);
            }

            try {
                const users = await User.find({ companyId });
                for (const user of users) {
                    if (user?.ProfileImage) {
                        await deleteFiles(user.ProfileImage, "UserImage");
                    }
                }
            } catch (err) {
                console.error("❌ User image delete error:", err.message);
            }

            try {
                const ratings = await ProductRating.find({ companyId });
                for (const rating of ratings) {
                    if (rating?.ReviewImages?.length) {
                        await deleteFiles(rating.ReviewImages, "ProductSRatingImage");
                    }
                }
            } catch (err) {
                console.error("❌ Rating image delete error:", err.message);
            }

            try {
                await Promise.allSettled([
                    AccessModel.deleteMany({ companyId }),
                    CategoryModel.deleteMany({ companyId }),
                    brandmodel.deleteMany({ companyId }),
                    BannerModel.deleteMany({ companyId }),
                    Variant.deleteMany({ companyId }),
                    ProductService.deleteMany({ companyId }),
                    VariantProduct.deleteMany({ companyId }),
                    Product.deleteMany({ companyId }),
                    ProductCart.deleteMany({ companyId }),
                    Wishlist.deleteMany({ companyId }),
                    ProductRating.deleteMany({ companyId }),
                    User.deleteMany({ companyId })
                ]);
            } catch (err) {
                console.error("❌ Bulk DB delete error:", err.message);
            }

            let deletedCompany;

            try {
                deletedCompany = await Company.findByIdAndDelete(companyId);
            } catch (err) {
                console.error("❌ Company delete error:", err.message);
            }

            if (deletedCompany) {
                try {
                    const DeletedCompanyData = {
                        companyId: deletedCompany?._id,

                        CompanyName: deletedCompany?.CompanyName,
                        CompanyDomain: deletedCompany?.CompanyDomain,
                        PredifinedDomain: deletedCompany?.PredifinedDomain,

                        Street: deletedCompany?.Street,
                        City: deletedCompany?.City,
                        State: deletedCompany?.State,
                        Country: deletedCompany?.Country,
                        PostalCode: deletedCompany?.PostalCode,

                        Latitude: deletedCompany?.Latitude,
                        Longitude: deletedCompany?.Longitude,

                        Email: deletedCompany?.Email,
                        Phone: deletedCompany?.Phone,

                        PanCardNo: deletedCompany?.PanCardNo,
                        GstNo: deletedCompany?.GstNo,

                        Contact_person_name: deletedCompany?.Contact_person_name,

                        CompanyLogo: deletedCompany?.CompanyLogo,
                        BankDetails: deletedCompany?.BankDetails,

                        deletedAt: new Date()
                    };

                    await new DeletedCompanyModel(DeletedCompanyData).save();

                } catch (err) {
                    console.error("❌ DeletedCompany save error:", err.message);
                }
            }

            return res.status(200).json({
                success: true,
                message: "✅ Company, data, images & videos deleted successfully",
                data: deletedCompany
            });

        } catch (error) {
            console.error("❌ DeleteCompany Fatal Error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },



    loginCompnay: async (req, resp) => {
        let { Email, Password } = req.body;

        try {
            if (!Email || !Password) {
                return resp.status(400).json({ message: 'please provide email and password', success: false })
            }
            let findCompany = await Company.findOne({ Email: Email })
            if (!findCompany) {
                return resp.status(400).json({ message: 'company not found', success: false })
            }
            let passwordMatch = await bcrypt.compare(Password, findCompany.Password);
            if (!passwordMatch) {
                return resp.status(400).json({ message: 'password not match', success: false })
            }
            let Role = "Company"
            let token = jwt.sign(
                { companyId: findCompany._id, Email: findCompany.Email, Role: Role },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '24h' }
            );

            resp.status(200).json({ message: 'login successfully', token: token })
        } catch (error) {
            console.error('Login error:', error);
            resp.status(500).json({ message: 'Internal Server Error', success: false });
        }
    },
    resetPassword: async (req, resp) => {
        let { companyId, Password } = req.query
        if (Password) {
            let salt = await bcrypt.genSalt(10);
            Password = await bcrypt.hash(Password, salt);
        }
        let CompanyData = await Company.findByIdAndUpdate(companyId, {
            $set: { Password: Password }
        })
        return resp.status(200).json({ data: CompanyData })

    },
    verifyToken: async (req, resp) => {
        try {
            let { token } = req.body;
            if (!token) {
                return resp.status(400).json({ message: 'please provide token', success: false })
            }
            let data = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
            if (!data) {
                return resp.status(400).json({ message: "token is expired or data not found", success: false })
            }
            resp.status(200).json({ message: 'token verified successfully', data: data })

        } catch (error) {
            return resp.status(400).json({ message: "TokenExpiredError", success: false })
        }
    }
};
