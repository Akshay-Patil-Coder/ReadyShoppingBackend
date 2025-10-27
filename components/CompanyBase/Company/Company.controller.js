const mongoose = require('mongoose');
const Company = require('./Company.model');
const { ObjectId } = mongoose.Types;
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')

module.exports = {
    addcompanies: async (req, res) => {
        let { CompanyName, CompanyDomain, PredifinedDomain, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, Contact_person_name, Password } = req.body;
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
            if (!PredifinedDomain && !CompanyDomain) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({ message: "we required domain for make your website", success: false })
            }
            if (PredifinedDomain) {
                let findCompany = await Company.findOne({ PredifinedDomain: String(PredifinedDomain) })
                if (findCompany) {
                    return res.status(400).json({ message: 'your domain is already registered' })
                }
            }
            else if (CompanyDomain) {
                let findCompany = await Company.findOne({ PredifinedDomain: String(PredifinedDomain) })
                if (findCompany) {
                    return res.status(400).json({ message: 'dont allow duplicate domain it must be unique' })
                }

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
            if (CompanyDomain) {
                CompanyData.CompanyDomain = CompanyDomain
            }
            else if (PredifinedDomain) {
                CompanyData.PredifinedDomain = PredifinedDomain
            }
            if (req.file) {
                CompanyData.CompanyLogo = req.file.filename
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
        let { Password, CompanyName, PredifinedDomain, CompanyDomain, Street, City, State, Country, PostalCode, Email, Phone, PanCardNo, GstNo, Contact_person_name, _id } = req.body;

        try {

            if (!_id || !CompanyName || !Street || !City || !State || !Country || !PostalCode || !Email || !Phone || !PanCardNo || !GstNo || !Contact_person_name) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({ message: "please filled all data", success: false })
            }
            if (!PredifinedDomain && !CompanyDomain) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({ message: "we required domain for make your website", success: false })
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
            };

            if (PredifinedDomain) {
                let findCompany = await Company.findOne({ PredifinedDomain: String(PredifinedDomain) })
                if (findCompany) {
                    return res.status(400).json({ message: 'your domain is already registered' })
                }
                CompanyData.PredifinedDomain = PredifinedDomain
            }
            else if (CompanyDomain) {
                let findCompany = await Company.findOne({ PredifinedDomain: String(PredifinedDomain) })
                if (findCompany) {
                    return res.status(400).json({ message: 'dont allow duplicate domain it must be unique' })
                }
                CompanyData.CompanyDomain = CompanyDomain
            }

            console.log(CompanyData, 'CompanyData')
            if (req.file?.filename) {
                const existingBrand = await Company.findOne({ _id: _id })
                if (existingBrand && existingBrand.CompanyLogo) {
                    const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', existingBrand.CompanyLogo);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                CompanyData.CompanyLogo = req.file.filename
            }
            const data = await Company.findByIdAndUpdate(
                _id,
                { $set: CompanyData },
                { new: true }
            );



            res.status(200).send({
                success: true,
                message: "Company successfully updated",
                data: data
            });
        } catch (error) {
            console.log("error", error)
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            res.status(500).send({
                success: false,
                message: "Failed to add company",
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
            console.log(data, 'data')
            resp.status(200).json({ message: 'token verified successfully', data: data })

        } catch (error) {
            return resp.status(400).json({ message: "TokenExpiredError", success: false })
        }
    }
};
