const path = require("path")
const fs = require('fs');
const CoachingCategory = require("./CoachingCategories.model");
const { ObjectId } = require("mongodb");
const { default: mongoose } = require("mongoose");





module.exports = {
    addCoachingCategory: async (req, res) => {
        try {
            let { companyId, coachingCategoryName, coachingParentCategoryId, coachingLevel, Description } = req.body;



            if (!companyId || !coachingCategoryName || !coachingLevel || !Description) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCategoryImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return res.status(400).json({
                    success: false,
                    message: 'Please Provide all Fields'
                })
            }
            coachingLevel = Number(coachingLevel)
            if (coachingLevel !== 0 && !coachingParentCategoryId) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCategoryImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(400).json({
                    success: false,
                    message: 'Please Provide coachingParentCategoryId for subservices'
                })
            }

            const coachingCategoryData = {
                companyId,
                coachingCategoryName,
                coachingLevel,
                Description,
            }

            if (coachingParentCategoryId) {
                coachingCategoryData.coachingParentCategoryId = coachingParentCategoryId;
            }

            if (req.file?.filename) {
                coachingCategoryData.coachingImage = req.file.filename
            }

            const newcategory = new CoachingCategory(coachingCategoryData)

            const categoryData = await newcategory.save();

            res.status(200).json({
                success: true,
                message: "Coaching Category Added Successfully",
                data: categoryData
            })

        } catch (error) {
            console.error("Error", error)
            if (req.file?.filename) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCategoryImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            })
        }
    },

    getCoachingCategory: async (req, res) => {
        try {
            const { companyId, coachingCategoryName, coachingParentCategoryId } = req.query

            let query = { isActive: true }

            if (companyId) query.companyId = mongoose.Types.ObjectId.createFromHexString(companyId);
            if (coachingParentCategoryId) query.coachingParentCategoryId = mongoose.Types.ObjectId.createFromHexString(coachingParentCategoryId);
            if (coachingCategoryName) query.coachingCategoryName = new RegExp(coachingCategoryName, 'i')

            const data = await CoachingCategory.find(query)

            res.status(200).send({
                success: true,
                message: "Successfully Fetched",
                data: data.length ? data : null
            })

        } catch (error) {
            console.log("error", error);
            res.status(500).json({
                success: false,
                message: "Unsuccessful to fetch",
                error: error.message
            })
        }
    },

    getCoachingCategoryTree: async (req, res) => {
        try {
            let { coachingParentCategoryId, companyId, _id } = req.query;

            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId"
                })
            }

            let categories;

            if (_id) {
                categories = await CoachingCategory.find({ companyId, _id, isActive: true });
            } else if (coachingParentCategoryId) {
                categories = await CoachingCategory.find({ companyId, coachingParentCategoryId, isActive: true })
            } else {
                categories = await CoachingCategory.find({ companyId, coachingParentCategoryId: null, isActive: true })
            }

            const buildCategoryTree = async (categories) => {
                return Promise.all(
                    categories.map(async (category) => ({
                        ...category._doc,
                        subcategories: await getCategoryTreeRecursion(companyId, category._id)
                    }))
                )
            }

            const getCategoryTreeRecursion = async (companyId, coachingParentCategoryId) => {
                const subCategories = await CoachingCategory.find({ companyId, coachingParentCategoryId, isActive: true });
                if (!subCategories || subCategories.length === 0) {
                    return [];
                }

                return buildCategoryTree(subCategories);
            }

            const categoryTree = await buildCategoryTree(categories)

            return res.status(200).send({
                success: true,
                message: "Success",
                data: categoryTree
            })
        } catch (error) {
            console.error("error", error)
            return res.status(500).send({
                success: false,
                message: "Something Went Wrong",
                error: error.message
            })
        }
    },

    updateCoachingCategory: async (req, res) => {
        try {
            let { coachingCategoryName } = req.body;
            const category = await CoachingCategory.findOne({
                $or: [
                    { _id: req.params.id },
                    { coachingCategoryName: coachingCategoryName }
                ]
            })
            if (!category) {
                if (req.file?.filename) {
                    const newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCategoryImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }

                return res.status(404).send({
                    success: false,
                    message: 'Category not found'
                })
            }

            let updatedData = { ...req.body, updatedAt: new Date() }
            console.log("updated Data", updatedData)


            if (req.file?.filename) {
                if (category && category.coachingImage) {
                    let oldFilePath = path.join(__dirname, '..', '..', 'public', 'CoachingCategoryImage', category.coachingImage)
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                }
                updatedData.coachingImage = req.file.filename;
            }

            let updatedCategory = await CoachingCategory.findOneAndUpdate(
                { _id: category._id },
                { $set: updatedData },
                { new: true }
            )

            return res.status(200).json({
                success: true,
                message: "Category Updated Successfully",
                data: updatedCategory
            })

        } catch (error) {
            console.log("error in updateCoachingCategory", error)
            res.status(500).json({
                success: false,
                message: "error while updating CoachingCategory",
                error: error.message
            })
        }
    },

    toggleCoachingCategoryStatus: async (req, res) => {
        try {
            let id = req.body.id

            let details = await CoachingCategory.findById(id)
            console.log("detais", details)

            let data = await CoachingCategory.findByIdAndUpdate(id, {
                $set: {
                    isActive: !details.isActive
                }
            }, { new: true })

            res.status(200).json({
                success: true,
                message: "Success",
                data: data
            })
        } catch (error) {
            console.log("error", error);
            res.status(500).json({
                success: false,
                message: "Something Went Wrong",
                error: error.message
            })
        }
    },

    deleteCoachingCategory: async (req, res) => {
        try {
            let { id } = req.params;

            let category = await CoachingCategory.findById(id)

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Category not Found"
                })
            }

            if (!category.isActive) {
                return res.status(404).json({
                    success: false,
                    message: "Category is already inActive"
                })
            }

            let result = await CoachingCategory.deleteOne({ _id: id })
            if (!result) {
                res.status(400).json({
                    success: false,
                    message: "Category not deleted"
                })
            }
            if (category && category.coachingImage) {
                const oldImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCategoryImage', category.coachingImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            res.status(200).json({
                success: true,
                message: "Category deleted",
                data: result
            })

        } catch (error) {
            console.log("error", error)
            res.status(500).json({
                success: false,
                message: "Something Went Wrong",
                error: error.message
            })
        }
    }
}