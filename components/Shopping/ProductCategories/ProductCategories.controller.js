const { ObjectId } = require("mongodb")
const dynamicCategoriesModel = require("./ProductCategories.model");
const fs = require('fs');
const path = require('path');
const master_services = require('../MasterServices/MasterServices.model');
const ProductsModel = require('../Products/Products.model')


module.exports = {


    addCategory: async (req, res) => {
        try {
            console.log("prasad", req.body)
            const { companyId, categoryName, parentCategoryId, categoryLevel, Description, service_type, price, duration, serviceCategoryLevel = 0 } = req.body;


            let imageName = '';

            if (req.file) {
                console.log("Uploaded file:", req.file);
                const fileExtension = req.file.originalname.split('.').pop();
                imageName = `${categoryName}.${fileExtension}`;

                const oldPath = path.join(req.file.destination, req.file.filename);
                const newPath = path.join(req.file.destination, imageName);

                console.log("Old Path:", oldPath);
                console.log("New Path:", newPath);

                fs.renameSync(oldPath, newPath);
            }

            if (categoryLevel !== '0' && !parentCategoryId) {
                return res.status(400).send({ message: "Please provide parentCategoryId for subcategories" });
            }

            const newCategory = new dynamicCategoriesModel({
                companyId,
                categoryName,
                parentCategoryId: parentCategoryId ? ObjectId(parentCategoryId) : null,
                categoryLevel,
                imageName,
                Description
            });

            const categoryData = await newCategory.save();

            const newService = new master_services({
                companyId,
                categoryId: categoryData._id,
                service_type,
                //parentserviceId: parentCategoryId ? ObjectId(parentCategoryId) : null,
                service_name: categoryName + " Services",
                serviceCategoryLevel,
                isActive: true,
                description: Description,
                price: price ? Number(price) : undefined,
                duration
            });

            await newService.save();

            res.status(200).send({
                success: true,
                message: "Category and service added successfully",
                categoryData,
                newService
            });

        } catch (error) {
            console.error("Error:", error);
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },


//     getCategory: async (req, res) => {
//         try {
//             const { parentCategoryId, companyId, categoryName } = req.query;

//             // Initialize the base query with isActive: true
//             const query = { isActive: true };

//         const newCategory = new dynamicCategoriesModel({
//             companyId,
//             categoryName,
//             parentCategoryId: parentCategoryId ? ObjectId(parentCategoryId) : null,
//             categoryLevel,
//             imageName,
//             Description
//         });

//         const categoryData = await newCategory.save();

//         const newService = new master_services({
//             companyId,
//             categoryId: categoryData._id,
//             service_type,
//             //parentserviceId: parentCategoryId ? ObjectId(parentCategoryId) : null,
//             service_name: categoryName + " Services",
//             serviceCategoryLevel, 
//             isActive: true,
//             description: Description,
//             price: price ? Number(price) : undefined,
//             duration
//         });

//         await newService.save();

//         res.status(200).send({ 
//             success: true, 
//             message: "Category and service added successfully", 
//             categoryData,
//             newService
//          });

//     } catch (error) {
//         console.error("Error:", error);
//         res.status(500).send({ 
//             success: false, 
//             message: "Something went wrong", 
//             error: error.message 
//     });
//     }
// },

getCategory: async (req, res) => {
    try {
        const { parentCategoryId, companyId, categoryName } = req.query;

        // Initialize the base query with isActive: true
        const query = { isActive: true };

        // Conditionally add filters if they are provided
        if (parentCategoryId) query.parentCategoryId = new ObjectId(parentCategoryId);
        if (companyId) query.companyId = new ObjectId(companyId);
        if (categoryName) query.categoryName = new RegExp(categoryName, 'i'); // Case-insensitive regex search

        // Fetch data based on constructed query
        const data = await dynamicCategoriesModel.find(query);

        res.status(200).send({
            success: true,
            message: "Successfully fetched",
            data: data.length ? data : null // Return data or null if empty
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

// getCategoryTree: async (req, res) => {
//     try {
//         let { parentCategoryId, companyId, _id } = req.query;
        
//         // Check if companyId is present
//         if (!companyId) {
//             return res.status(400).send({
//                 success: false,
//                 message: "Unsuccessful fetch",
//                 error: error.message
//             });
//         }
//     },

    getCategoryTree: async (req, res) => {
        try {
            let { parentCategoryId, companyId, _id } = req.query;

            // Check if companyId is present
            if (!companyId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send companyId",
                });
            }

            let categories;

            // Fetch categories based on the presence of _id, parentCategoryId, or companyId
            if (_id) {
                // Fetch the category by _id
                categories = await dynamicCategoriesModel.find({ companyId, _id, isActive: true });
            } else if (parentCategoryId) {
                // Fetch categories by parentCategoryId
                categories = await dynamicCategoriesModel.find({ companyId, parentCategoryId, isActive: true });
            } else {
                // Fetch all top-level categories (parentCategoryId is null)
                categories = await dynamicCategoriesModel.find({ companyId, parentCategoryId: null, isActive: true });
            }

            // Recursive function to build nested categories
            const buildCategoryTree = async (categories) => {
                return Promise.all(
                    categories.map(async (category) => ({
                        ...category._doc, // Spread category data
                        subcategories: await getCategoryTreeRecursive(companyId, category._id), // Recursively fetch subcategories
                    }))
                );
            };

            // Function to recursively fetch subcategories
            const getCategoryTreeRecursive = async (companyId, parentCategoryId) => {
                const subCategories = await dynamicCategoriesModel.find({ companyId, parentCategoryId, isActive: true });
                if (!subCategories || subCategories.length === 0) {
                    return []; // Base case: no more subcategories
                }
                return buildCategoryTree(subCategories); // Recursively build subcategory tree
            };

            // Build the category tree
            const categoryTree = await buildCategoryTree(categories);

            // Send the response
            return res.status(200).send({
                success: true,
                message: "Success",
                data: categoryTree,
            });
        } catch (error) {
            console.error("error", error);
            return res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message,
            });
        }
    },

    updateCategory: async (req, res) => {
        try {
            const { categoryName } = req.body;

            const category = await dynamicCategoriesModel.findOne({
                $or: [
                    { _id: req.params.id },
                    { categoryName: categoryName }
                ]
            });

            if (!category) {
                return res.status(404).send({ success: false, message: "Category not found" });
            }

            let updatedData = { ...req.body, updatedAt: new Date() };

            if (req.file) {
                const fileExtension = path.extname(req.file.filename);
                const newImageName = `${categoryName}${fileExtension}`;

                if (category.imageName) {
                    const oldFilePath = path.join(__dirname, '../../public/master_categories', category.imageName);

                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                }

                const newFilePath = path.join(__dirname, '../../public/master_categories', newImageName);
                const currentFilePath = path.join(__dirname, '../../public/master_categories', req.file.filename);

                fs.renameSync(currentFilePath, newFilePath);

                updatedData.imageName = newImageName;
            }



            const updatedCategory = await dynamicCategoriesModel.findOneAndUpdate(
                { _id: category._id },
                { $set: updatedData },
                { new: true }
            );

            res.status(200).send({
                success: true,
                message: "Successfully updated category",
                data: updatedCategory
            });

        } catch (error) {
            console.log("error", error);
            res.status(500).send({
                success: false, 
                message: "Something went wrong",
                error: error.message
            });
        }
    },

    toggleCategoriesStatus: async (req, res) => {
        try {
            let id = req.body.id
            const details = await dynamicCategoriesModel.findById(id)
            const data = await dynamicCategoriesModel.findByIdAndUpdate(id, {
                $set: {
                    isActive: !details.isActive
                }
            }, { new: true })

            res.status(200).send({
                success: true,
                message: "success",
                data
            })


        } catch (error) {
            console.error("error", error);
            return res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message,
            });
        }
    },

    deleteCategories: async (req, res) => {
        try {
            const { id } = req.params;

            const category = await dynamicCategoriesModel.findById(id);

            if (!category) {
                return res.status(404).send({ success: false, message: "Category not found" });
            }

            if (!category.isActive) {
                return res.status(400).send({ success: false, message: "Category is already inactive" });
            }



            const productData = await ProductsModel.Products.find({ categoryId: id })
            let deletedProduct = '';
            if (productData) {
                const deleteProduct = await ProductsModel.Products.deleteMany({ categoryId: id })
                deletedProduct = deleteProduct
            }

            const result = await dynamicCategoriesModel.deleteOne({ _id: id })
            if (!result) {
                res.status(400).json({ message: 'CATEGORY NOT DELETED', success: false })
            }

            res.status(200).json({ success: true, message: "category and product both deleted", data: result, deletedProduct: deletedProduct });

        } catch (error) {
            console.error("error", error);
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },

}

