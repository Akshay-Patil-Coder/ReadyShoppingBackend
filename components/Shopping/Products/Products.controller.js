const ProductsModel = require('./Products.model')
const mongoose = require('mongoose');
const path = require('path')
const fs = require('fs');
const { query } = require('express');
const { Parser } = require("json2csv");
const csv = require("csv-parser");
const { data } = require('jquery');
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const defaultImagePath = path.join(__dirname, "..", "..", "public", "varients", "default.png"); 

if (!fs.existsSync(defaultImagePath)) {
    fs.writeFileSync(defaultImagePath, ""); 
}

module.exports = {
    addproducts: async (req, res) => {
        console.log(req.body)
        try {
            let {
                companyId,
                categoryId,
                services,
                productName,
                categoryName,
                product_description,
                product_base_price,
                dynamicFields,
                BrandId,
                offerPercentage
            } = req.body;
            dynamicFields = JSON.parse(dynamicFields)
            if (!companyId || !categoryId || !productName || !BrandId) {
                return res.status(400).send({
                    success: false,
                    message: "Please send all required fields: companyId, categoryId, productName"
                });
            }

            if (typeof dynamicFields === 'parse') {
                dynamicFields = dynamicFields.split(',').reduce((acc, curr) => {
                    const [key, value] = curr.split(':');
                    acc[key.trim()] = value.trim();
                    return acc;
                }, {});
            }
            const categoryKeys = await ProductsModel.productKeysModel.findOne({ categoryId });
            if (dynamicFields && Object.keys(dynamicFields).length > 0) {
                if (categoryKeys) {
                    const dynamicFieldsArray = Object.keys(dynamicFields);
                    const mergedArray = [...categoryKeys.keys, ...dynamicFieldsArray];
                    const uniqueKeysArray = [...new Set(mergedArray)];
                    await ProductsModel.productKeysModel.findOneAndUpdate(
                        { categoryId },
                        { $set: { keys: uniqueKeysArray } }
                    );
                } else {
                    let newKeys = new ProductsModel.productKeysModel({
                        companyId,
                        isActive: true,
                        categoryId,
                        keys: Object.keys(dynamicFields)
                    });
                    await newKeys.save();
                }
            }

            const formattedName = productName.replace(/ /g, "_").toLowerCase();

            const productImages = req.files.map(file => `${file.filename}`);

            const newProduct = new ProductsModel.Products({
                companyId,
                productName: formattedName,
                categoryId,
                services,
                product_description,
                product_base_price,
                dynamicFields,
                categoryName,
                productimages: productImages,
                BrandId,
                offerPercentage
            });

            const dt = await newProduct.save();

            res.status(200).send({ success: true, message: "Successfully added", dt });

        } catch (error) {
            console.log("Error:", error);
            res.status(500).send({ success: false, message: "Error occurred", error: error.message });
        }
    },

    updateproducts: async (req, res) => {
        try {
            const { dynamicFields } = req.body;

            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid product ID"
                });
            }

            const existingProduct = await ProductsModel.Products.findById(req.params.id);
            if (!existingProduct) {
                return res.status(404).send({
                    success: false,
                    message: "Product not found"
                });
            }

            // Handle images
            let updatedImages = [];
            const publicFolder = path.join("E:", "readyshopping", "dist", "public", "varients");

            if (req.files && req.files.length > 0) {
                updatedImages = req.files.map(file => `${file.filename}`);

                console.log("New images uploaded:", updatedImages);

                if (existingProduct.productimages.length > 0) {
                    await Promise.all(existingProduct.productimages.map(async (imagePath) => {
                        const imageFullPath = path.join(publicFolder, path.basename(imagePath));
                        console.log("Deleting image:", imageFullPath);
                        try {
                            await fs.promises.unlink(imageFullPath);
                        } catch (err) {
                            console.error(`Error deleting image: ${imageFullPath}`, err.message);
                        }
                    }));
                }
            } else {
                updatedImages = existingProduct.productimages;
            }

            let parsedDynamicFields = dynamicFields;
            if (dynamicFields && typeof dynamicFields === "string") {
                parsedDynamicFields = dynamicFields.split(',').reduce((acc, curr) => {
                    const [key, value] = curr.split(':');
                    acc[key.trim()] = value.trim();
                    return acc;
                }, {});
            }

            const updateData = {
                productimages: updatedImages,
                dynamicFields: parsedDynamicFields || existingProduct.dynamicFields,
                companyId: req.body.companyId,
                categoryId: req.body.categoryId,
                productName: req.body.productName,
                BrandId: req.body.BrandId,
                product_description: req.body.product_description,
                product_base_price: req.body.product_base_price,
                offerPercentage: req.body.offerPercentage,
                categoryName: req.body.categoryName
            };

            const updatedProduct = await ProductsModel.Products.findByIdAndUpdate(
                req.params.id,
                { $set: updateData },
                { new: true }
            );

            res.status(200).send({
                success: true,
                message: "Successfully updated",
                data: updatedProduct
            });
        } catch (error) {
            console.error("Error updating product:", error);
            res.status(500).send({
                success: false,
                message: "Error occurred",
                error: error.message
            });
        }
    },

    getproducts: async (req, res) => {
        let query = {}
        if (req.query.id && req.query.companyId) {
            query._id = mongoose.Types.ObjectId(req.query.id)
            query.companyId = mongoose.Types.ObjectId(req.query.companyId)
        }
        else if (!req.query.id) return res.status(400).send({
            success: false,
            message: "please send products id"
        })

        try {
            const data = await ProductsModel.Products.aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: "varients",
                        localField: "_id",
                        foreignField: "productId",
                        as: "varients",
                    },
                },
                {
                    $lookup: {
                        from: "brands",
                        localField: "BrandId",
                        foreignField: "_id",
                        as: "brands",
                    },
                },
            ])

            res.status(200).send({
                success: true,
                message: "Successfully fetched data",
                data: data
            });
        } catch (error) {
            res.status(500).send({
                success: false,
                message: "UnSuccessfully fetched data",
                error: error.message
            });
        }
    },

    getproductsList: async (req, res) => {
        let query = {
            $or: [{ isActive: true }]
        };
        if (req.query.categoryId) {
            query.categoryId = mongoose.Types.ObjectId(req.query.categoryId);
        }
        if (req.query.companyId) {
            query.companyId = mongoose.Types.ObjectId(req.query.companyId);
        }
        if (req.query._id) {
            query._id = mongoose.Types.ObjectId(req.query._id);
        }
        if (req.query.BrandId) {
            query.BrandId = mongoose.Types.ObjectId(req.query.BrandId);
        }
        try {
            const data = await ProductsModel.Products.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: "categgggories",
                        let: { categoryId: "$categoryId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$categoryId"] },
                                    ...(req.query.categoryName ? { categoryName: { $regex: `^${req.query.categoryName}$`, $options: "i" } } : {}),
                                    ...(req.query.parentCategoryId ? { parentCategoryId: mongoose.Types.ObjectId(req.query.parentCategoryId) } : {}),
                                    ...(req.query.companyId ? { companyId: mongoose.Types.ObjectId(req.query.companyId) } : {})
                                }
                            }
                        ],
                        as: "categories"
                    }
                },
                {
                    $match: {
                        "categories.0": { $exists: true }
                    }
                },
                {
                    $lookup: {
                        from: "varients",
                        localField: "_id",
                        foreignField: "productId",
                        as: "varients"
                    }
                },
                {
                    $lookup: {
                        from: "master_services",
                        localField: "services",
                        foreignField: "_id",
                        as: "master_services"
                    }
                },
                {
                    $lookup: {
                        from: "brands",
                        localField: "BrandId",
                        foreignField: "_id",
                        as: "brands",
                    },
                },
            ]);

            res.status(200).send({
                success: true,
                message: "Successfully fetched data",
                data: data
            });
        } catch (error) {
            console.log("prasad", error)
            res.status(400).send({
                success: false,
                message: "Unsuccessful fetched data",
                error: error.message
            });
        }
    },

    deleteproducts: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid product ID",
                });
            }

            const product = await ProductsModel.Products.findById(id);

            if (!product) {
                return res.status(404).send({
                    success: false,
                    message: "Product not found",
                });
            }

            const publicFolder = path.join("E:", "readyshopping", "dist", "public", "varients");

            if (product.productimages && product.productimages.length > 0) {
                await Promise.all(product.productimages.map(async (imagePath) => {
                    const imageFullPath = path.join(publicFolder, path.basename(imagePath));
                    console.log("Deleting image:", imageFullPath);
                    try {
                        await fs.promises.unlink(imageFullPath);
                    } catch (err) {
                        console.error(`Error deleting image: ${imageFullPath}`, err.message);
                    }
                }));
            }

            await ProductsModel.Products.findByIdAndDelete(id);

            res.status(200).send({
                success: true,
                message: "Product deleted successfully",
                data: product
            });
        } catch (error) {
            console.error("Error deleting product:", error);
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message,
            });
        }
    },

    exploreproducts: async (req, res) => {
        let query = {}

        if (req.query._id) {
            query._id = mongoose.Types.ObjectId(req.query._id)
        }
        if (req.query.companyId) {
            query.companyId = mongoose.Types.ObjectId(req.query.companyId)
        }

        try {
            const data = await ProductsModel.Products.aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: "varients",
                        localField: "_id",
                        foreignField: "productId",
                        as: "varients",
                    },
                },
                {
                    $lookup: {
                        from: "brands",
                        localField: "BrandId",
                        foreignField: "_id",
                        as: "brands",
                    },
                },
            ])

            res.status(200).send({
                success: true,
                message: "Successfully fetched data",
                data: data
            });
        } catch (error) {
            res.status(500).send({
                success: false,
                message: "UnSuccessfully fetched data",
                error: error.message
            });
        }
    },

    mostlovedgadgets: async (req, res) => {
        let query = {}

        if (req.query._id) {
            query._id = mongoose.Types.ObjectId(req.query._id)
        }
        if (req.query.companyId) {
            query.companyId = mongoose.Types.ObjectId(req.query.companyId)
        }

        try {
            const data = await ProductsModel.Products.aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: "varients",
                        localField: "_id",
                        foreignField: "productId",
                        as: "varients",
                    },
                },
                {
                    $lookup: {
                        from: "brands",
                        localField: "BrandId",
                        foreignField: "_id",
                        as: "brands",
                    },
                },
            ])

            res.status(200).send({
                success: true,
                message: "Successfully fetched data",
                data: data
            });
        } catch (error) {
            res.status(500).send({
                success: false,
                message: "UnSuccessfully fetched data",
                error: error.message
            });
        }
    },

    productlaunch: async (req, res) => {
        let query = {}

        if (req.query._id) {
            query._id = mongoose.Types.ObjectId(req.query._id)
        }
        if (req.query.companyId) {
            query.companyId = mongoose.Types.ObjectId(req.query.companyId)
        }

        try {
            const data = await ProductsModel.Products.aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: "varients",
                        localField: "_id",
                        foreignField: "productId",
                        as: "varients",
                    },
                },
                {
                    $lookup: {
                        from: "brands",
                        localField: "BrandId",
                        foreignField: "_id",
                        as: "brands",
                    },
                },
            ])

            res.status(200).send({
                success: true,
                message: "Successfully fetched data",
                data: data
            });
        } catch (error) {
            res.status(500).send({
                success: false,
                message: "UnSuccessfully fetched data",
                error: error.message
            });
        }
    },

    recentlyviewed: async (req, res) => {
        let query = {}

        if (req.query._id) {
            query._id = mongoose.Types.ObjectId(req.query._id)
        }
        if (req.query.companyId) {
            query.companyId = mongoose.Types.ObjectId(req.query.companyId)
        }

        try {
            const data = await ProductsModel.Products.aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: "varients",
                        localField: "_id",
                        foreignField: "productId",
                        as: "varients",
                    },
                },
                {
                    $lookup: {
                        from: "brands",
                        localField: "BrandId",
                        foreignField: "_id",
                        as: "brands",
                    },
                },
            ])

            res.status(200).send({
                success: true,
                message: "Successfully fetched data",
                data: data
            });
        } catch (error) {
            res.status(500).send({
                success: false,
                message: "UnSuccessfully fetched data",
                error: error.message
            });
        }
    },

    generateBlankCSVProducts: async (req, res) => {
        console.log("prasad", req.body);
        try {
            const { companyId, categoryId, BrandId } = req.body;

            if (!companyId || !categoryId || !BrandId) {
                return res.status(400).send({
                    message: "Please provide companyId, categoryId, and BrandId",
                    success: false
                });
            }

            const staticHeaders = [
                "isActive", "productimages", "productName",
                "categoryName", "productBrandName", "product_description",
                "product_base_price", "offerPercentage", "services", "dynamicFields"
            ];

            const blankRow = {
                isActive: "TRUE",
                productimages: "image1.jpg|image2.jpg",
                productName: "Electric Kettle",
                categoryName: "Kitchen Appliances",
                productBrandName: "Philips",
                product_description: "A compact and efficient electric kettle.",
                product_base_price: "1299.99",
                offerPercentage: "22",
                services: "Cleaning",
                dynamicFields: JSON.stringify({
                    warranty: "2 years",
                    color: "Silver",
                    power: "1500W"
                })
            };

            const data = [blankRow];

            const json2csvParser = new Parser({ fields: staticHeaders });
            const csv = json2csvParser.parse(data);

            const outputDir = path.join("outputfiles", "blankproducts");
            const filePath = path.join(outputDir, "blankproducts.csv");

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(filePath, csv);

            res.status(200).send({
                success: true,
                message: "Successfully generated blank CSV with sample data",
                filePath
            });

        } catch (error) {
            res.status(500).send({
                success: false,
                message: "Unsuccessfully generated blank CSV",
                error: error.message
            });
        }
    },

    uploadCSV: async (req, res) => {
        try {
            const { companyId, categoryId, BrandId } = req.body;

            if (!companyId || !categoryId || !BrandId) {
                return res.status(400).send({ message: "please kindly provide companyId, categoryId, BrandId" });
            }

            const results = [];
            const filePath = req.file.path;

            const processRow = async (row) => {
                let dynamicFields = {};
                console.log("prasadpatil", row.dynamicFields);
                try {
                    if (row.dynamicFields) {
                        let jsonString = row.dynamicFields.trim();

                        if (!jsonString.startsWith("{")) {
                            jsonString = `{${jsonString}}`;
                        }
                        jsonString = jsonString.replace(/([{,])(\s*)([a-zA-Z0-9_]+)(\s*):/g, '$1"$3":');

                        jsonString = jsonString.replace(/:\s*([a-zA-Z0-9_]+)(\s*[,}])/g, ': "$1"$2');

                        console.log("prasaddynamicfields", jsonString);

                        dynamicFields = JSON.parse(jsonString);
                    }
                } catch (error) {
                    console.error("invalid dynamicfields", row.dynamicFields);
                    dynamicFields = {};
                }

                const data = new ProductsModel.Products({
                    companyId: mongoose.Types.ObjectId(companyId),
                    categoryId: mongoose.Types.ObjectId(categoryId),
                    BrandId: mongoose.Types.ObjectId(BrandId),
                    isActive: row.isActive && row.isActive.toLowerCase() === "false" ? false : true,
                    productimages: row.productimages ? row.productimages.split("|").map(img => img.trim()) : [],
                    productName: row.productName,
                    categoryName: row.categoryName,
                    productBrandName: row.productBrandName,
                    product_description: row.product_description,
                    product_base_price: parseFloat(row.product_base_price) || 0,
                    offerPercentage: parseFloat(row.offerPercentage) || 0,
                    services: row.services ? row.services.split(",").map((s) => s.trim()) : [],
                    dynamicFields: dynamicFields,
                });

                try {
                    await data.save();
                    results.push(data);
                } catch (error) {
                    console.error("error saving product", error.message);
                }
            };
            const readStream = fs.createReadStream(filePath).pipe(csv());
            const rowPromises = [];

            readStream.on("data", (row) => {
                rowPromises.push(processRow(row));
            });

            readStream.on("end", async () => {
                await Promise.all(rowPromises);
                fs.unlinkSync(filePath);
                res.send({ message: "Products uploaded successfully", products: results });
            });

            readStream.on("error", (err) => {
                res.status(500).send({ message: "Error processing CSV file", error: err.message });
            });
        } catch (error) {
            res.status(500).send({ message: "Internal Server Error", error: error.message });
        }
    },

    addvarientsimages: async (req, res) => {
        try {
            const { productId, varientsId, isActive } = req.body;
            const imagesArray = [];

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const randomNumber = Math.floor(1000 + Math.random() * 9000);
                    const fileExtension = file.originalname.split('.').pop();
                    console.log("prasad", fileExtension)
                    const imageName = `${randomNumber}.${fileExtension}`;
                    const oldpath = file.path;
                    console.log("prasad", oldpath)
                    const newpath = path.join(file.destination, imageName);
                    console.log("prasad", newpath)

                    fs.renameSync(oldpath, newpath);

                    imagesArray.push({ imageName, isActive });
                }
            }

            let existingImages = await ProductsModel.ProductsImages.findOne({ productId, varientsId });

            if (existingImages) {
                existingImages.images.push(...imagesArray);
                await existingImages.save();
                res.status(200).send({
                    success: true,
                    message: "Variant images added successfully to existing entry",
                    data: existingImages
                });
            } else {
                const newImages = new ProductsModel.ProductsImages({
                    productId,
                    varientsId,
                    isActive,
                    images: imagesArray
                });
                const dt = await newImages.save();
                res.status(200).send({
                    success: true,
                    message: "Variant images added successfully as a new entry",
                    data: dt
                });
            }

        } catch (error) {
            res.status(400).send({
                success: false,
                message: "Variant images added unsuccessfully",
                error: error.message
            });
        }
    },

    deletevarientsimages: async (req, res) => {
        try {
            const { id } = req.params;
            const objectId = mongoose.Types.ObjectId(id);

            const updatedVariant = await ProductsModel.ProductsImages.findOneAndUpdate(
                { 'images._id': objectId },
                {
                    $set: {
                        'images.$.isActive': false
                    }
                },
                { new: true }
            );

            if (!updatedVariant) {
                return res.status(404).send({ success: false, message: "Image not found" });
            }

            res.status(200).send({
                success: true,
                message: "Image is now inactive",
                data: updatedVariant
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

    updatevarientsimages: async (req, res) => {
        try {
            const { id } = req.params;
            const { isActive, otherFieldToUpdate } = req.body;
            let imageName = null;

            if (req.file) {
                const randomNum = Math.floor(Math.random() * 10000);
                const originalName = req.file.originalname;
                const extension = originalName.split('.').pop();
                imageName = `${randomNum}.${extension}`;
            }

            const objectId = mongoose.Types.ObjectId(id);

            const updateFields = {};

            if (imageName) updateFields['images.$[elem].imageName'] = imageName;
            if (typeof isActive !== 'undefined') updateFields['images.$[elem].isActive'] = isActive;
            if (typeof otherFieldToUpdate !== 'undefined') updateFields['otherFieldToUpdate'] = otherFieldToUpdate;

            const updatedVariant = await ProductsModel.ProductsImages.findOneAndUpdate(
                { 'images._id': objectId },
                { $set: updateFields },
                {
                    new: true,
                    arrayFilters: [{ 'elem._id': objectId }]
                }
            );

            if (updatedVariant) {
                res.status(200).send({
                    success: true,
                    message: "Variant image updated successfully",
                    data: updatedVariant
                });
            } else {
                res.status(404).send({
                    success: false,
                    message: "Variant image not found"
                });
            }
        } catch (error) {
            res.status(400).send({
                success: false,
                message: "Failed to update variant image",
                error: error.message
            });
        }
    },

    getvarientsimages: async (req, res) => {
        try {
            let query = { isActive: true };
            if (req.query.varientsId) {
                query.varientsId = mongoose.Types.ObjectId(req.query.varientsId);
            }
            if (req.query.productId) {
                query.productId = mongoose.Types.ObjectId(req.query.productId);
            }

            const data = await ProductsModel.ProductsImages.aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: "varients",
                        localField: "varientsId",
                        foreignField: "_id",
                        as: "varients"
                    }
                },
                {
                    $addFields: {
                        images: {
                            $filter: {
                                input: "$images",
                                as: "image",
                                cond: { $eq: ["$$image.isActive", true] }
                            }
                        }
                    }
                }
            ]);

            res.status(200).send({
                success: true,
                message: "Successfully fetched",
                data: data
            });
        } catch (error) {
            console.error("Error fetching variant images:", error);
            res.status(400).send({
                success: false,
                message: "Unsuccessfully fetched",
                error: error.message
            });
        }
    },

    getKeys: async (req, res) => {
        if (!req.query.categoryId) return res.status(400).send({
            success: false,
            message: "Please pass categoryId"
        })
        let query = {}
        if (req.query.categoryId) {
            query.categoryId = mongoose.Types.ObjectId(req.query.categoryId)
        }

        try {
            const data = await ProductsModel.productKeysModel.findOne(query)

            res.status(200).send({
                success: true,
                message: "Successfully fetched data",
                data: data
            });
        } catch (error) {
            console.log("error", error)
            res.status(500).send({
                success: false,
                message: "UnSuccessfully fetched data",
                error: error.message
            });
        }
    },

    addKeys: async (req, res) => {
        try {
            const { categoryId, companyId } = req.query;
            const keysToAdd = req.body.keysToAdd;

            if (!categoryId || !companyId || !keysToAdd || !Array.isArray(keysToAdd)) {
                return res.status(400).send({
                    success: false,
                    message: "Please provide categoryId, companyId, and an array of keysToAdd."
                });
            }

            const result = await ProductsModel.productKeysModel.findOneAndUpdate(
                {
                    categoryId: mongoose.Types.ObjectId(categoryId),
                    companyId: mongoose.Types.ObjectId(companyId)
                },
                {
                    $addToSet: { keys: { $each: keysToAdd } }
                },
                { new: true }
            );

            if (!result) {
                const newVarientsKeys = new ProductsModel.productKeysModel({
                    categoryId: mongoose.Types.ObjectId(categoryId),
                    companyId: mongoose.Types.ObjectId(companyId),
                    keys: keysToAdd
                });

                const savedNewKeys = await newVarientsKeys.save();

                return res.status(201).send({
                    success: true,
                    message: "Successfully created a new category and added keys",
                    result: savedNewKeys
                });
            }

            res.status(200).send({
                success: true,
                message: "Successfully added keys",
                result
            });
        } catch (error) {
            console.error("prasad", error);
            res.status(400).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },

    deleteKeys: async (req, res) => {
        try {
            const { categoryId, companyId, keysToRemove } = req.query;
            if (!categoryId || !companyId || !keysToRemove) {
                return res.status(400).send({ message: "Please provide categoryId, companyId, and keysToRemove." });
            }

            const result = await ProductsModel.productKeysModel.findOneAndUpdate(
                {
                    categoryId: mongoose.Types.ObjectId(categoryId),
                    companyId: mongoose.Types.ObjectId(companyId)
                },
                {
                    $pull: { keys: keysToRemove }
                },
                { new: true }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).send({
                    success: false,
                    message: "No matching document or key found"
                });
            }

            res.status(200).send({
                success: true,
                message: "Successfully deleted key(s)",
                result
            });
        } catch (error) {
            console.error("Error deleting key:", error);
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            });
        }
    },

    updateKeys: async (req, res) => {
        const { categoryId, oldValue, newValue } = req.body;

        try {
            const categoryObjectId = mongoose.Types.ObjectId(categoryId);

            const updatedDocument = await ProductsModel.productKeysModel.findOneAndUpdate(
                {
                    categoryId: categoryObjectId,
                    keys: oldValue
                },
                {
                    $set: { "keys.$": newValue }
                },
                {
                    new: true
                }
            );

            if (!updatedDocument) {
                return res.status(404).json({
                    success: false,
                    message: "No matching document found"
                });
            }
            res.status(200).json({
                success: true,
                message: "Successfully updated",
                data: updatedDocument
            });
        } catch (error) {
            console.error("Error updating array element:", error);
            res.status(500).json({
                success: false,
                message: "Unsuccessfully updated",
                error: error.message
            });
        }
    },
};