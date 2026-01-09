const fs = require('fs');
const path = require('path');
const CoachingProviderTypeModel = require('./CoachingProviderType.model');

module.exports = {

    addcoachingProviderType: async (req, res) => {
        try {
            const { CourseProviderType } = req.body;
            if (!CourseProviderType) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CourseProviderTypeImages', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                res.status(400).json({ message: 'please filled all fields', success: false })
            }
            const CourseProviderTypeData = {
                CourseProviderType
            }
            if (req.file) {
                CourseProviderTypeData.CourseProviderTypeImage = req.file.filename;
            }

            const newCoachingProviderType = new CoachingProviderTypeModel(CourseProviderTypeData);

            const savedCoachingProviderType = await newCoachingProviderType.save();

            if (!savedCoachingProviderType) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CourseProviderTypeImages', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return res.status(400).json({ message: 'Something went wrong while saving the coaching provider type', success: false });
            }

            res.status(200).json({
                success: true,
                message: "provider type successfully added",
                data: savedCoachingProviderType
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message,message:"Internal Server Error" });
        }
    },

    getCoachingProviderType: async (req, res) => {
        try {

            const users = await CoachingProviderTypeModel.find();
            res.status(200).json({
                success: true,
                message: "Coaching provider type fetched successfully",
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


    updateCoachingProviderTypeDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const existingUser = await CoachingProviderTypeModel.findById(id);

            if (!existingUser) {
                return res.status(404).json({ success: false, message: "Course provider type not found" });
            }
            if (!req.body.CourseProviderType || !id) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CourseProviderTypeImages', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({ message: "please filled all data", success: false })
            }

            let updatedData = { CourseProviderType: req.body.CourseProviderType };

            if (req.file?.filename) {

                const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CourseProviderTypeImages', existingUser.CourseProviderTypeImage);
                if (existingUser.CourseProviderTypeImage && fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }

                updatedData.CourseProviderTypeImage = req.file.filename;
            }

            const updatedUser = await CoachingProviderTypeModel.findByIdAndUpdate(id, updatedData, { new: true });

            res.status(200).json({
                success: true,
                message: "coaching provider type updated successfully",
                data: updatedUser
            });

        } catch (error) {
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CourseProviderTypeImages', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            res.status(500).json({
                success: false,
                error: error.message,
                message:"Internal Server Error"
            });
        }
    },


};
