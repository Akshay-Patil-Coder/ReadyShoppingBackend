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
    getCategoryWithLeafNodes: async (req, res) => {
        try {
            let { companyId, HeadCategoryId, selectedCategoryIds } = req.query;

            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId",
                });
            }

            let categories = await CoachingCategory.find({ companyId, isActive: true });

            let parentMap = {};
            categories.forEach(cat => {
                let parentId = cat.coachingParentCategoryId ? cat.coachingParentCategoryId.toString() : null;
                if (!parentMap[parentId]) parentMap[parentId] = [];
                parentMap[parentId].push(cat);
            });

            let getLeafNodes = (categoryId) => {
                let children = parentMap[categoryId] || [];
                if (children.length === 0) return [];

                let leaves = [];
                for (let child of children) {
                    let subLeaves = getLeafNodes(child._id.toString());
                    if (subLeaves.length === 0) {
                        leaves.push(child);
                    } else {
                        leaves = leaves.concat(subLeaves);
                    }
                }
                return leaves;
            };

            let headCategories = [];

            if (HeadCategoryId) {
                headCategories = categories.filter(cat => cat._id.toString() === HeadCategoryId);
            } else {
                let rootCategories = categories.filter(cat => !cat.coachingParentCategoryId);
                let secondLevel = [];
                for (let root of rootCategories) {
                    let children = parentMap[root._id.toString()] || [];
                    secondLevel = secondLevel.concat(children);
                }
                headCategories = secondLevel;
            }

            let result = headCategories.map(head => ({
                _id: head._id,
                coachingCategoryName: head.coachingCategoryName,
                Description: head.Description,
                coachingImage: head.coachingImage,
                coachingLevel: head.coachingLevel,
                coachingParentCategoryId: head.coachingParentCategoryId,
                leafCategories: getLeafNodes(head._id.toString())
            }));

            let selectedIds = [];
            if (selectedCategoryIds) {
                if (typeof selectedCategoryIds === "string") {
                    selectedIds = selectedCategoryIds.split(",").map(id => id.trim());
                } else if (Array.isArray(selectedCategoryIds)) {
                    selectedIds = selectedCategoryIds.map(id => id.toString());
                }
            }

            let selectedCategories = [];
            result.forEach(cat => {
                let matched = cat.leafCategories.filter(leaf =>
                    selectedIds.includes(leaf._id.toString())
                );
                selectedCategories = selectedCategories.concat(matched);
            });

            let filteredResult = result.map(head => ({
                ...head,
                leafCategories: head.leafCategories.filter(
                    leaf => !selectedIds.includes(leaf._id.toString())
                )
            }));

            return res.status(200).send({
                success: true,
                message: "Coaching categories fetched successfully",
                data: filteredResult,
                selectedCategories
            });

        } catch (error) {
            console.error("getCoachingCategoryWithLeafNodesError:", error);
            return res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },

    getCategoryWithHeadAndLeafParentNodes: async (req, res) => {
        try {
            let { companyId, HeadCategoryId } = req.query;

            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId",
                });
            }

            let categories = await CoachingCategory.find({ companyId, isActive: true });

            let parentMap = {};
            categories.forEach(cat => {
                let parentId = cat.coachingParentCategoryId ? cat.coachingParentCategoryId.toString() : null;
                if (!parentMap[parentId]) parentMap[parentId] = [];
                parentMap[parentId].push(cat);
            });

            let getLeafNodesWithParents = (categoryId) => {
                let children = parentMap[categoryId] || [];
                if (children.length === 0) return [];

                let leaves = [];
                for (let child of children) {
                    let subLeaves = getLeafNodesWithParents(child._id.toString());
                    if (subLeaves.length === 0) {
                        leaves.push(child);
                    } else {
                        leaves = leaves.concat(subLeaves);
                    }
                }
                return leaves;
            };

            let roots;
            if (HeadCategoryId) {
                roots = categories.filter(cat => cat._id.toString() === HeadCategoryId);
            } else {
                roots = categories.filter(cat => !cat.coachingParentCategoryId);
            }

            let result = [];

            for (let root of roots) {
                let leafData = getLeafNodesWithParents(root._id.toString());
                let parentCategoryMap = {};

                leafData.forEach(leaf => {
                    let parentCategoryId = leaf.coachingParentCategoryId.toString();
                    if (!parentCategoryMap[parentCategoryId]) {
                        let parentCategory = categories.find(c => c._id.toString() === parentCategoryId);
                        parentCategoryMap[parentCategoryId] = {
                            parentCategory: parentCategory,
                            leafCategories: []
                        };
                    }
                    parentCategoryMap[parentCategoryId].leafCategories.push(leaf);
                });

                result.push({
                    headCategory: {
                        _id: root._id,
                        coachingCategoryName: root.coachingCategoryName,
                        Description: root.Description,
                        coachingImage: root.coachingImage,
                        coachingLevel: root.coachingLevel,
                        coachingParentCategoryId: root.coachingParentCategoryId || null
                    },
                    leafHierarchy: Object.values(parentCategoryMap).map(({ parentCategory, leafCategories }) => ({
                        parentCategory: {
                            _id: parentCategory._id,
                            coachingCategoryName: parentCategory.coachingCategoryName,
                            Description: parentCategory.Description,
                            coachingImage: parentCategory.coachingImage,
                            coachingLevel: parentCategory.coachingLevel,
                            coachingParentCategoryId: parentCategory.coachingParentCategoryId || null
                        },
                        leafCategories: leafCategories.map(leaf => ({
                            _id: leaf._id,
                            coachingCategoryName: leaf.coachingCategoryName,
                            Description: leaf.Description,
                            coachingImage: leaf.coachingImage,
                            coachingLevel: leaf.coachingLevel,
                            coachingParentCategoryId: leaf.coachingParentCategoryId || null
                        }))
                    }))
                });
            }

            return res.status(200).send({
                success: true,
                message: "Coaching categories fetched successfully",
                data: result
            });

        } catch (error) {
            console.error("getCoachingCategoryWithHeadAndLeafParentNodesError:", error);
            return res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },
    updateCoachingCategory: async (req, res) => {
        try {
            let { coachingCategoryName, companyId, Description, coachingLevel, coachingParentCategoryId } = req.body;

            if (req.user.companyId) companyId = req.user.companyId;

            if (!companyId) {
                return res.status(400).json({ message: 'Company Not Found', success: false });
            }

            let category = await CoachingCategory.findOne({
                _id: req.params.id, companyId
            });

            if (!category) {
                if (req.file?.filename) {
                    let newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCategoryImage', req.file.filename);
                    if (fs.existsSync(newImagePath)) {
                        fs.unlinkSync(newImagePath);
                    }
                }
                return res.status(404).send({ success: false, message: "Category not found" });
            }

            let updatedData = {
                coachingCategoryName,
                Description,
                coachingLevel,
                coachingParentCategoryId,
                updatedAt: new Date()
            };

            if (req.file?.filename) {
                if (category?.coachingImage) {
                    let oldImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCategoryImage', category.coachingImage);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                updatedData.coachingImage = req.file.filename;
            }

            let updatedCategory = await CoachingCategory.findOneAndUpdate(
                { _id: category._id },
                { $set: updatedData },
                { new: true }
            );

            res.status(200).send({
                success: true,
                message: "Category updated successfully",
                data: updatedCategory
            });

        } catch (error) {
            console.log("error in updateCoachingCategory", error);
            if (req.file?.filename) {
                let newImagePath = path.join(__dirname, '..', '..', 'public', 'CoachingCategoryImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            }
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
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