const fs = require('fs');
const path = require('path');
const masterUsers = require('./Functionallity.model');

module.exports = {

    addmasterusers: async (req, res) => {
        try {
            const { FunctionallityName } = req.body;
            if (!FunctionallityName) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'FunctionallityLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                res.status(400).json({ message: 'please filled all fields', success: false })
            }
            const FunctionallityData = {
                FunctionallityName
            }
            if (req.file) {
                FunctionallityData.FunctionallityLogo = req.file.filename;
            }

            const newUser = new masterUsers(FunctionallityData);

            const savedUser = await newUser.save();

            if (!savedUser) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'FunctionallityLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({ message: 'Something went wrong while saving the brand', success: false });
            }

            res.status(200).json({
                success: true,
                message: "User added successfully",
                data: savedUser
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getmasterusers: async (req, res) => {
        try {

            const users = await masterUsers.find();
            res.status(200).json({
                success: true,
                message: "Functionallity Fetched Successfully",
                data: users
            });
        } catch (error) {
            res.status(500).send
                ({
                    success: false,
                    message: error.message
                });
        }
    },


    updatemasterusers: async (req, res) => {
        try {
            const { id } = req.params;
            const existingUser = await masterUsers.findById(id);

            if (!existingUser) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            if (!req.body.FunctionallityName || !id) {
              if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'FunctionallityLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({ message: "please filled all data", success: false })
            }

            let updatedData = { FunctionallityName: req.body.FunctionallityName };

            if (req.file) {

                const oldImagePath = path.join(__dirname, '../../public/FunctionallityLogos', existingUser.FunctionallityLogo);
                if (existingUser.FunctionallityLogo && fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }

                updatedData.FunctionallityLogo = req.file.filename;
            }

            const updatedUser = await masterUsers.findByIdAndUpdate(id, updatedData, { new: true });

            res.status(200).json({
                success: true,
                message: "User updated successfully",
                data: updatedUser
            });

        } catch (error) {
              if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'FunctionallityLogos', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // deletemasterusers: async (req, res) => {
    //     try {
    //         const { id } = req.params; 
    //         const user = await masterUsers.findById(id);

    //         if (!user) {
    //             return res.status(404).json({ success: false, message: "User not found" });
    //         }


    //         if (user.image) {
    //             const imagePath = path.join(__dirname, '../../public/masterusers', user.image);
    //             if (fs.existsSync(imagePath)) {
    //                 fs.unlinkSync(imagePath);
    //             }
    //         }

    //         await masterUsers.findByIdAndDelete(id);

    //         res.status(200).json({
    //             success: true,
    //             message: "User deleted successfully"
    //         });

    //     } catch (error) {
    //         res.status(500).json({
    //             success: false,
    //             message: error.message
    //         });
    //     }
    // }

};
