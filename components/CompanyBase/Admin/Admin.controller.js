const Admin = require("./Admin.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../../UserBase/User/User.model.js");
const moment = require("moment");
const path = require('path')
const fs = require('fs')
const getAdminList = async (req, res) => {
    try {
        const adminList = await Admin.find();
        res.status(200).send({ success: true, message: "admin fetched successfully", adminList });
    } catch (error) {
        res.status(400).send({ success: false, error: error.message, message: "Internal Server Error" });
    }
};

const adminLogin = async (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.status(400).send({ success: false, message: "arguments missing" });
    }

    try {
        const admin = await Admin.findOne(
            { isActive: true, username: req.body.username },
            {
                username: 1,
                password: 1,
                image: 1,
                lastlogintime: 1,
                name: 1,
                role: 1,
            }
        );

        if (!admin) return res.status(400).send({ success: false, message: "authentication error" });

        await Admin.updateOne(
            { _id: admin._id },
            { $set: { lastlogintime: new Date() } }
        );

        const result = await bcrypt.compare(req.body.password, admin.password);
        if (!result) return res.status(400).send({ success: false, message: "authentication error" });

        const sanitizedUser = {
            _id: admin._id,
            Email: admin.username,
            Role: "Admin",
        };

        const token = jwt.sign(
            sanitizedUser,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "24h" }
        );

        const refToken = jwt.sign(
            sanitizedUser,
            process.env.REFER_TOKEN_SECRET,
            { expiresIn: "24h" }
        );

        res.status(200).send({
            token,
            refToken,
            Admin: admin,
            message: "admin login successfully",
            success: true
        });
    } catch (error) {
        res.status(400).send({ success: false, error: error.message, message: 'Internal Server Error' });
    }
};

// const getUnread = async (req, res) => {
//     try {
//         const data = await Admin.findOne({ _id: req.user._id }, { count: 1 });
//         if (data) {
//             res.status(200).send({ unread: data.count, success: true, message: 'data fetched successfully' });
//         } else {
//             res.status(404).send({ message: "Admin does not exist.", success: false });
//         }
//     } catch (error) {
//         res.status(400).send({ error: error.message, success: false, message: 'Internal Server Error' });
//     }
// };
const createAdmin = async (req, res) => {
    try {
        const { username, password, name, role } = req.body;

        if (!username || !password) {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'AdminImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            return res.status(400).json({ success: false, message: "Username and password are required" });
        }
        const AdminData = {
            username,
            name,
            role,
        }
        if (req.file?.filename) {
            AdminData.image = req.file.filename
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        AdminData.password = hashedPassword
        const admin = new Admin(AdminData);

        await admin.save();

        return res.status(201).json({
            success: true,
            message: "Admin user has been created successfully",
            admin: admin
        });
    } catch (error) {
        if (error.code === 11000) {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'AdminImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            return res.status(400).json({ success: false, message: "Username already exists" });
        }
        if (req.file?.filename) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'AdminImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
                fs.unlinkSync(newImagePath);
            }
        }
        console.error(error);
        return res.status(500).json({ success: false, message: "Error creating admin", error: error.message });
    }
};

module.exports = {
    getAdminList,
    adminLogin,
    createAdmin
};
