const mongoose = require('mongoose');
const Company = require('./Company.model');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer');
const axios = require("axios");

module.exports = {
    addcompanies: async (req, res) => {
        let { CompanyName, CompanyDomain, PredifinedDomain, Latitude, Longitude, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, Contact_person_name, Password } = req.body;

        try {
            if (!CompanyName || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !Contact_person_name || !Password) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({ message: "please filled all data", success: false })
            }
            try {
                if (!PredifinedDomain) {
                    const companyName = CompanyName || '';
                    const subdomain = companyName
                        .trim()
                        .split(/\s+/)[0]
                        ?.toLowerCase()
                        .replace(/\./g, '');
                    CompanyDomain = subdomain;
                }

                if (PredifinedDomain) {
                    const existingCompany = await Company.findOne({
                        PredifinedDomain: String(PredifinedDomain).toLowerCase()
                    });

                    if (existingCompany) {
                        if (req.file?.filename) {
                            const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
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
                        const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                        if (fs.existsSync(newImagePath)) {
                            fs.unlinkSync(newImagePath);
                        }
                    }
                    return res.status(400).json({ message: "domain not fetched by company name please provide company name or your domain", success: false })
                }

            } catch (error) {
                console.error('Error generating or validating company domain:', error);
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
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
                const salt = await bcrypt.genSalt(10);
                CopyOfPassword = Password;
                Password = await bcrypt.hash(Password, salt);
            }

            const CompanyData = {
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

            const fetchLatLng = async () => {
                if (!Latitude || !Longitude) {
                    const address = [Street, City, State, Country, PostalCode].filter(Boolean).join(', ');
                    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
                    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
                    const response = await axios.get(url);
                    const results = response.data.results;

                    if (!results || results.length === 0) {
                        return
                    }

                    const location = results[0].geometry.location;
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

            const company = new Company(CompanyData);
            const data = await company.save();

            if (!data) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return res.status(400).json({ message: 'Something went wrong while saving the brand', success: false });
            }

            if (CompanyDomain) {
                const redirectLink = `https://${CompanyDomain}.shop.readytechnologies.in`;
                const adminPanelLink = `https://adminshop.readytechnologies.in`;

                const transporter = nodemailer.createTransport({
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

                const mailOptions = {
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
                const adminPanelLink = `https://adminshop.readytechnologies.in`;

                const transporter = nodemailer.createTransport({
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

                const mailOptions = {
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

            const data = await Company.find(query);



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
        const removeUploadedFile = () => {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
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

            const FoundCompany = await Company.findById(_id);
            if (!FoundCompany) {
                removeUploadedFile();
                return res.status(404).json({ message: "Company not found", success: false });
            }

            const fields = {
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

            const CompanyData = Object.fromEntries(
                Object.entries(fields).filter(([_, v]) => v !== undefined && v !== null && v !== "")
            );

            if (PredifinedDomain) {
                const existingDomain = await Company.findOne({
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
                    const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', FoundCompany.CompanyLogo);
                    if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
                }
                CompanyData.CompanyLogo = req.file.filename;
            }

            if ((!Latitude || !Longitude) && (Street || City || State || Country || PostalCode)) {
                const address = [
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
                    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
                    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
                    const response = await axios.get(url);

                    if (response.data.results?.length > 0) {
                        const location = response.data.results[0].geometry.location;
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

            const updatedCompany = await Company.findByIdAndUpdate(_id, { $set: CompanyData }, { new: true });

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
            const existingCompany = await Company.findOne({ _id: req.params._id })
            if (existingCompany && existingCompany?.CompanyLogo) {
                const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', existingCompany.CompanyLogo);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            const data = await Company.deleteOne({ _id: req.params._id })
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

            const company = await Company.findById(companyId);
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

            const bankDetails = {
                IFSC,
                AccountNumber,
                BankName: BankName?.trim() || "",
                BranchName: BranchName?.trim() || "",
                MICR: MICR?.trim() || "",
                Address: Address?.trim() || "",
                BankState: BankState?.trim() || ""
            };

            const updatedCompany = await Company.findByIdAndUpdate(
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

            const company = await Company.findById(companyId);
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

            const updatedCompany = await Company.findByIdAndUpdate(
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
