const { VariantProduct, Product, Batch } = require('./VariantsProducts.model');
const { Variant } = require('../Variants/Variants.model');
const { ProductService } = require('../ProductServices/ProductServices.model')
const { ProductRating } = require('../ProductRating/ProductRating.model')
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');
const { Wishlist } = require('../WishList/WishList.model');
const { updateElasticById, deleteElasticById, deleteElasticVariantByProductId } = require('../ElasticSearch/elastic/CRUD');


module.exports = {
    addVariantProduct: async (req, res) => {
        let {
            companyId,
            HeadCategoryId,
            SubCategoryId,
            BrandId,
            ProductServices,
            ProductName,
            CommonDescription,
            CommonImages,
            VariantProductDatas
        } = req.body;

        if (req.user.companyId) companyId = req.user.companyId

        let clearFiles = (files) => {
            if (!Array.isArray(files)) return;
            files.forEach((file) => {
                let filePath = path.join(__dirname, '..', '..', 'public', 'ProductImage', file);
                try {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                } catch (err) {
                    console.warn('⚠️ Failed to delete product image:', err.message);
                }
            });
        };
        let clearVideo = (files) => {
            if (!Array.isArray(files)) return;
            files.forEach((file) => {
                let filePath = path.join(__dirname, '..', '..', 'public', 'ProductVideo', file);
                try {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                } catch (err) {
                    console.warn('⚠️ Failed to delete product Video:', err.message);
                }
            });
        }
        let AllProductImages = [];

        let AllProductVideos = [];

        if (req.files) {
            if (Array.isArray(req.files.ProductImages) && req.files.ProductImages.length > 0) {
                AllProductImages = req.files.ProductImages.map(file => file.filename);
            }

            if (Array.isArray(req.files.ProductVideos) && req.files.ProductVideos.length > 0) {
                AllProductVideos = req.files.ProductVideos.map(file => file.filename);
            }
        }

        try {
            let jsonFields = ['ProductServices', 'CommonDescription', 'CommonImages', 'VariantProductDatas'];
            for (let key of jsonFields) {
                if (req.body[key]) {
                    try {
                        req.body[key] = JSON.parse(req.body[key]);
                    } catch {
                        clearFiles(AllProductImages);
                        clearVideo(AllProductVideos);
                        throw new Error(`Invalid JSON format in field: ${key}`);
                    }
                }
            }
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        try {
            if (!companyId || !HeadCategoryId || !SubCategoryId || !BrandId || !ProductName) {
                clearVideo(AllProductVideos);
                clearFiles(AllProductImages);
                return res.status(400).json({ success: false, message: 'Missing required fields.' });
            }

            let ProductData = { companyId, HeadCategoryId, SubCategoryId, BrandId, ProductName };

            if (Array.isArray(req.body.ProductServices) && req.body.ProductServices.length > 0) {
                let ProductServicesData = [];
                for (let EachService of req.body.ProductServices) {
                    let FoundService = await ProductService.findById(EachService?.ProductServiceId);
                    if (FoundService) ProductServicesData.push(EachService);
                }
                if (ProductServicesData.length > 0) ProductData.ProductServices = ProductServicesData;
            }

            let CommonFilteredImages = [];
            if (Array.isArray(req.body.CommonImages) && req.body.CommonImages.length > 0) {
                CommonFilteredImages = AllProductImages?.filter((img) =>
                    req.body.CommonImages.some((cImg) => img.endsWith(cImg))
                );
                if (CommonFilteredImages?.length) ProductData.CommonImages = CommonFilteredImages;
            }
            if (Array.isArray(AllProductVideos) && AllProductVideos.length > 0) {
                ProductData.CommonVideos = AllProductVideos;
            }

            let cd = req.body.CommonDescription;
            if (cd && (cd.Head || (Array.isArray(cd.Points) && cd.Points.length) || cd.TextDescription)) {
                ProductData.CommonDescription = cd;
            }

            let AddProduct = await new Product(ProductData).save();
            if (!AddProduct) {
                clearFiles(AllProductImages);
                clearVideo(AllProductVideos);
                return res.status(400).json({ success: false, message: 'Product not added. Validation failed.' });
            }

            let VariantIds = [];
            if (Array.isArray(req.body.VariantProductDatas) && req.body.VariantProductDatas.length > 0) {
                for (let EachVariantProduct of req.body.VariantProductDatas) {
                    if (!EachVariantProduct?.Price) continue;

                    if (EachVariantProduct?.VariantProductImage && !Array.isArray(EachVariantProduct.VariantProductImage)) {
                        EachVariantProduct.VariantProductImage = [EachVariantProduct.VariantProductImage];
                    }

                    if (
                        (!EachVariantProduct?.VariantProductImage?.length || EachVariantProduct.VariantProductImage.length === 0) &&
                        CommonFilteredImages.length === 0
                    ) continue;

                    let VariantData = { companyId, HeadCategoryId, SubCategoryId, ProductId: AddProduct._id };

                    if (Array.isArray(EachVariantProduct?.VariantProductImage) && EachVariantProduct.VariantProductImage.length > 0) {
                        VariantData.VariantProductImage = EachVariantProduct.VariantProductImage.map(img =>
                            AllProductImages.find(f => f.endsWith(img)) || null
                        ).filter(Boolean);
                        if (VariantData.VariantProductImage.length == 0) {
                            VariantData.VariantProductImage = CommonFilteredImages.length ? [CommonFilteredImages?.[0]] : [];

                        }

                    } else {
                        VariantData.VariantProductImage = CommonFilteredImages.length ? [CommonFilteredImages?.[0]] : [];
                    }
                    if (EachVariantProduct.BatchIds) {
                        EachVariantProduct.BatchIds = Array.isArray(EachVariantProduct.BatchIds)
                            ? EachVariantProduct.BatchIds
                            : [EachVariantProduct.BatchIds];
                    } if (EachVariantProduct?.BatchIds?.length > 0) {
                        let FoundBatches = await Batch.find(
                            { _id: { $in: EachVariantProduct.BatchIds } },
                            { _id: 1 }
                        );

                        if (FoundBatches.length > 0) {
                            VariantData.BatchIds = FoundBatches.map(batch => batch._id);
                        }
                    }

                    VariantData.VariantProductName = EachVariantProduct?.VariantProductName || ProductName;
                    VariantData.Price = EachVariantProduct?.Price || 0;
                    if (EachVariantProduct?.OfferPercentage) VariantData.OfferPercentage = EachVariantProduct.OfferPercentage;
                    if (EachVariantProduct?.InventoryBaseStock?.AvailableStock > EachVariantProduct?.InventoryBaseStock?.Stock) {
                        clearFiles(AllProductImages);
                        clearVideo(AllProductVideos);
                        return res.status(400).json({ message: "Available Stock Should Be Less Than Original Stock", status: false })
                    }
                    VariantData.InventoryBaseStock = EachVariantProduct?.InventoryBaseStock || {
                        InventoryBase: false,
                        Stock: 0,
                        AvailableStock: 0
                    };

                    if (Array.isArray(EachVariantProduct.Specification)) {
                        let validSpecs = EachVariantProduct.Specification.filter(
                            (s) => s.SpecificationKey && s.SpecificationValue
                        );
                        if (validSpecs.length) VariantData.Specification = validSpecs;
                    }

                    if (Array.isArray(EachVariantProduct.VariantFields)) {
                        let validVariantFields = [];
                        for (let EachVariant of EachVariantProduct.VariantFields) {
                            let FoundVariant = await Variant.findById(EachVariant?.VariantId);
                            if (FoundVariant && EachVariant?.VariantValue) {
                                validVariantFields.push({
                                    VariantId: EachVariant.VariantId,
                                    VariantValue: EachVariant.VariantValue
                                });
                            }
                        }
                        if (validVariantFields.length) VariantData.VariantFields = validVariantFields;
                    }

                    let ap = EachVariantProduct?.AboutProduct;
                    if (ap && (ap.Head || (Array.isArray(ap.Points) && ap.Points.length) || ap.TextDescription)) {
                        VariantData.AboutProduct = ap;
                    }

                    let AddVariantProduct = await new VariantProduct(VariantData).save();
                    if (AddVariantProduct) {
                        VariantIds.push(AddVariantProduct._id);

                        if (Array.isArray(EachVariantProduct.VariantFields)) {
                            await Promise.all(
                                EachVariantProduct.VariantFields.map(async (EachVariant) => {
                                    let findVariant = await Variant.findOne({
                                        _id: EachVariant?.VariantId,
                                        'VariantValues.Value': EachVariant?.VariantValue
                                    });

                                    if (findVariant) {
                                        await Variant.findOneAndUpdate(
                                            { _id: EachVariant?.VariantId, 'VariantValues.Value': EachVariant?.VariantValue },
                                            { $inc: { 'VariantValues.$.Count': 1 } }
                                        );
                                    } else {
                                        await Variant.findOneAndUpdate(
                                            { _id: EachVariant?.VariantId },
                                            { $push: { VariantValues: { Value: EachVariant?.VariantValue, Count: 1 } } }
                                        );
                                    }
                                })
                            );
                        }
                    }
                }
            }

            if (VariantIds.length > 0) {
                let UpdatedProduct = await Product.findByIdAndUpdate(
                    AddProduct._id,
                    { $set: { VariantProductIds: VariantIds } },
                    { new: true }
                );
                try {
                    await updateElasticById({ type: 'product', id: AddProduct._id })
                    console.log(`✅ Successfully updated Elasticsearch for product: ${AddProduct._id}`);
                } catch (error) {
                    console.error(`❌ Failed to update Elasticsearch for product ${AddProduct._id}:`, error.message);
                }
                return res.status(201).json({
                    success: true,
                    message: 'Product and variant(s) added successfully.',
                    data: UpdatedProduct
                });
            } else {
                clearFiles(AllProductImages);
                clearVideo(AllProductVideos);

                if (AddProduct?._id) await Product.findByIdAndDelete(AddProduct._id);
                return res.status(400).json({
                    success: false,
                    message: 'No valid variant products found. Product deleted.'
                });
            }
        } catch (error) {
            clearFiles(AllProductImages);
            clearVideo(AllProductVideos);

            console.error('❌ VariantProductAddError:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal Server Error',
                error: error.message
            });
        }
    },

    addMultipleVariantProduct: async (req, res) => {
        const safeJSON = (value, fallback = null) => {
            try {
                if (!value) return fallback;
                if (Array.isArray(value)) return value;
                if (typeof value === "object") return value;
                if (typeof value === "string") {
                    const trimmed = value.trim();
                    if (!trimmed || trimmed === "[object Object]") return fallback;
                    if (/^[\[\{]/.test(trimmed)) return JSON.parse(trimmed);
                    return fallback;
                }
                return fallback;
            } catch (err) {
                console.error("safeJSON parse error:", err.message);
                return fallback;
            }
        };

        let {
            companyId,
            HeadCategoryId,
            SubCategoryId,
            BrandId,
            ProductsData,
        } = req.body;

        if (req.user?.companyId) companyId = req.user.companyId;

        const deleteImages = (files) => {
            files.forEach(file => {
                try {
                    const p = path.join(__dirname, '..', '..', 'public', 'ProductImage', file);
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                } catch (err) {
                    console.error("❌ Image delete error:", err.message);
                }
            });
        };

        const deleteVideos = (files) => {
            files.forEach(file => {
                try {
                    const p = path.join(__dirname, '..', '..', 'public', 'ProductVideo', file);
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                } catch (err) {
                    console.error("❌ Video delete error:", err.message);
                }
            });
        };

        let AllProductImages = req.files?.ProductImages?.map(f => f.filename) || [];
        let AllProductVideos = req.files?.ProductVideos?.map(f => f.filename) || [];
        console.log(ProductsData, 'data')
        console.log(typeof ProductsData, 'type')
        ProductsData = safeJSON(ProductsData, null);
        console.log(ProductsData, 'data')
        console.log(typeof ProductsData, 'type')

        if (!Array.isArray(ProductsData)) {
            deleteImages(AllProductImages);
            deleteVideos(AllProductVideos);
            return res.status(400).json({
                success: false,
                message: "ProductsData must be a valid JSON array"
            });
        }

        if (!companyId || !HeadCategoryId || !SubCategoryId || !BrandId) {
            deleteImages(AllProductImages);
            deleteVideos(AllProductVideos);
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        let addedProducts = [];
        let failedProducts = [];
        let failedVariants = [];
        let usedImages = new Set();
        let usedVideos = new Set();

        for (let EachProduct of ProductsData) {
            let ListOfVariantProduct=[];
            try {
                if (!EachProduct?.ProductName) {
                    failedProducts.push({ product: EachProduct, reason: "ProductName missing" });
                    continue;
                }

                let ProductData = {
                    companyId,
                    HeadCategoryId,
                    SubCategoryId,
                    BrandId,
                    ProductName: EachProduct.ProductName,
                };

                let cd = EachProduct.CommonDescription;
                if (cd && (cd.Head || (Array.isArray(cd.Points) && cd.Points.length) || cd.TextDescription)) {
                    ProductData.CommonDescription = cd;
                }

                if (Array.isArray(EachProduct.ProductServices)) {
                    let ProductServicesData = [];
                    for (let s of EachProduct.ProductServices) {
                        let fs = await ProductService.findById(s?.ProductServiceId);
                        if (fs) ProductServicesData.push(s);
                    }
                    if (ProductServicesData.length) ProductData.ProductServices = ProductServicesData;
                }

                if (Array.isArray(EachProduct.CommonImages)) {
                    ProductData.CommonImages = AllProductImages.filter(img =>
                        EachProduct.CommonImages.some(c => img.endsWith(c))
                    );
                    ProductData.CommonImages.forEach(i => usedImages.add(i));
                }

                if (Array.isArray(EachProduct.CommonVideos)) {
                    ProductData.CommonVideos = AllProductVideos.filter(v =>
                        EachProduct.CommonVideos.some(c => v.endsWith(c))
                    );
                    ProductData.CommonVideos.forEach(v => usedVideos.add(v));
                }

                let product = await new Product(ProductData).save();

                let VariantIds = [];

                if (!Array.isArray(EachProduct.VariantProductDatas)) {
                    throw new Error("VariantProductDatas missing");
                }

                for (let EachVariant of EachProduct.VariantProductDatas) {

                    try {
                        if (!EachVariant?.Price) throw new Error("Price missing");
                        if (
                            EachVariant?.InventoryBaseStock &&
                            EachVariant.InventoryBaseStock.AvailableStock >
                            EachVariant.InventoryBaseStock.Stock
                        ) {
                            throw new Error("AvailableStock greater than Stock");
                        }
                        let VariantData = {
                            companyId,
                            HeadCategoryId,
                            SubCategoryId,
                            ProductId: product._id,
                            VariantProductName: EachVariant.VariantProductName || EachProduct.ProductName,
                            Price: EachVariant.Price,
                            OfferPercentage: EachVariant.OfferPercentage,
                            InventoryBaseStock: EachVariant.InventoryBaseStock,
                        };

                        let ap = EachVariant?.AboutProduct;
                        if (ap && (ap.Head || (Array.isArray(ap.Points) && ap.Points.length) || ap.TextDescription)) {
                            VariantData.AboutProduct = ap;
                        }

                        if (Array.isArray(EachVariant.Specification)) {
                            VariantData.Specification = EachVariant.Specification.filter(
                                s => s.SpecificationKey && s.SpecificationValue
                            );
                        }
                        if (EachVariant.BatchIds) {
                            EachVariant.BatchIds = Array.isArray(EachVariant.BatchIds)
                                ? EachVariant.BatchIds
                                : [EachVariant.BatchIds];
                        } if (EachVariant?.BatchIds?.length > 0) {
                            let FoundBatches = await Batch.find(
                                { _id: { $in: EachVariant.BatchIds } },
                                { _id: 1 }
                            );

                            if (FoundBatches.length > 0) {
                                VariantData.BatchIds = FoundBatches.map(batch => batch._id);
                            }
                        }
                        if (Array.isArray(EachVariant.VariantFields)) {
                            let validVariantFields = [];
                            for (let vf of EachVariant.VariantFields) {
                                let fv = await Variant.findById(vf?.VariantId);
                                if (fv && vf?.VariantValue) {
                                    validVariantFields.push({
                                        VariantId: vf.VariantId,
                                        VariantValue: vf.VariantValue
                                    });
                                }
                            }
                            if (validVariantFields.length) VariantData.VariantFields = validVariantFields;
                        }

                        let images = [];
                        if (Array.isArray(EachVariant.VariantProductImage)) {
                            images = EachVariant.VariantProductImage
                                .map(img => AllProductImages.find(f => f.endsWith(img)))
                                .filter(Boolean);
                        }

                        VariantData.VariantProductImage =
                            images.length ? images :
                                (product.CommonImages?.length ? [product.CommonImages[0]] : []);

                        if (!VariantData.VariantProductImage.length) {
                            throw new Error("Variant product image missing");
                        }

                        VariantData.VariantProductImage.forEach(i => usedImages.add(i));

                        const variant = await new VariantProduct(VariantData).save();
                        VariantIds.push(variant._id);
                        ListOfVariantProduct.push(VariantData)
                        if (Array.isArray(EachVariant.VariantFields)) {
                            for (let vf of EachVariant.VariantFields) {
                                let existingVariant = await Variant.findOne({
                                    _id: vf.VariantId,
                                    "VariantValues.Value": vf.VariantValue
                                });

                                if (existingVariant) {
                                    await Variant.updateOne(
                                        { _id: vf.VariantId, "VariantValues.Value": vf.VariantValue },
                                        { $inc: { "VariantValues.$.Count": 1 } }
                                    );
                                } else {
                                    await Variant.updateOne(
                                        { _id: vf.VariantId },
                                        { $push: { VariantValues: { Value: vf.VariantValue, Count: 1 } } }
                                    );
                                }

                            }
                        }

                    } catch (vErr) {
                        console.error("❌ Variant error:", EachProduct.ProductName, EachVariant?.VariantProductName, vErr.message);
                        failedVariants.push({
                            productName: EachProduct.ProductName,
                            variant: EachVariant,
                            reason: vErr.message
                        });
                    }
                }

                if (!VariantIds.length) {
                    await Product.findByIdAndDelete(product._id);
                    throw new Error("No valid variants");
                }

                await Product.findByIdAndUpdate(product._id, {
                    $set: { VariantProductIds: VariantIds }
                });

                try {
                    await updateElasticById({ type: 'product', id: product._id });
                } catch (e) {
                    console.error("❌ Elastic error:", e.message);
                }

                addedProducts.push({ProductData,ListOfVariantProduct});

            } catch (err) {
                console.error("❌ Product error:", err.message);
                failedProducts.push({
                    productName: EachProduct?.ProductName,
                    reason: err.message
                });
            }
        }

        const unusedImages = AllProductImages.filter(i => !usedImages.has(i));
        const unusedVideos = AllProductVideos.filter(v => !usedVideos.has(v));

        deleteImages(unusedImages);
        deleteVideos(unusedVideos);
        return res.status(201).json({
            success: true,
            addedProducts,
            failedProducts,
            failedVariants,
            removedImages: unusedImages,
            removedVideos: unusedVideos
        });
    },

    addVariantProductCSV: async (req, res) => {
        let { companyId, HeadCategoryId, SubCategoryId, BrandId } = req.body;
        const safeJSON = (value, fallback) => {
            try {
                return value ? JSON.parse(value) : fallback;
            } catch {
                return fallback;
            }
        };


        const deleteFiles = (base, files) => {
            files.forEach(file => {
                try {
                    const p = path.join(__dirname, "..", "..", "public", base, file);
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                } catch (e) {
                    console.error(`❌ ${base} delete error:`, e.message);
                }
            });
        };

        if (req.user?.companyId) companyId = req.user.companyId;
        let AllProductImages = req.files?.ProductImages?.map(f => f.filename) || [];
        let AllProductVideos = req.files?.ProductVideos?.map(f => f.filename) || [];

        const imageMap = new Map(AllProductImages.map(i => [path.basename(i), i]));
        const videoMap = new Map(AllProductVideos.map(v => [path.basename(v), v]));

        const csvFilePath = req.files?.CSVFile?.[0]?.path;
        if (!csvFilePath) {
            deleteFiles("ProductImage", AllProductImages);
            deleteFiles("ProductVideo", AllProductVideos);

            return res.status(400).json({ success: false, message: "CSV file is required" });
        }

        let usedImages = new Set();
        let usedVideos = new Set();

        let groupedProducts = {};
        let lastProductName = null;

        let addedProducts = [];
        let failedProducts = [];
        let failedVariants = [];

        try {
            await new Promise((resolve, reject) => {
                fs.createReadStream(csvFilePath)
                    .pipe(csvParser())
                    .on("data", row => {

                        if (!row.ProductName && lastProductName) {
                            row.ProductName = lastProductName;
                        }
                        if (!row.ProductName) return;

                        lastProductName = row.ProductName;

                        if (!groupedProducts[row.ProductName]) {
                            groupedProducts[row.ProductName] = {
                                ProductName: row.ProductName,
                                CommonDescription: safeJSON(row.CommonDescription, {}),
                                ProductServices: safeJSON(row.ProductServices, []),
                                CommonImages: safeJSON(row.CommonImages, []),
                                CommonVideos: safeJSON(row.CommonVideos, []),
                                VariantProductDatas: []
                            };
                        }

                        let variantFields = [];
                        const vfObj = safeJSON(row.VariantFields, {});
                        for (let [VariantId, VariantValue] of Object.entries(vfObj)) {
                            if (VariantId && VariantValue) {
                                variantFields.push({ VariantId, VariantValue });
                            }
                        }

                        const specArray = Object.entries(safeJSON(row.Specification, {})).map(
                            ([k, v]) => ({ SpecificationKey: k, SpecificationValue: v })
                        );

                        groupedProducts[row.ProductName].VariantProductDatas.push({
                            VariantProductName: row.VariantProductName,
                            Price: Number(row.Price),
                            OfferPercentage: Number(row.OfferPercentage || 0),
                            InventoryBaseStock: {
                                InventoryBase: row.InventoryBase === "true",
                                Stock: Number(row.Stock || 0),
                                AvailableStock: Number(row.AvailableStock || 0)
                            },
                            BatchIds: safeJSON(row.BatchIds, []),
                            VariantFields: variantFields,
                            Specification: specArray,
                            AboutProduct: safeJSON(row.AboutProduct, {}),
                            VariantProductImage: safeJSON(row.VariantProductImage, [])
                        });
                    })
                    .on("end", resolve)
                    .on("error", reject);
            });

            for (let productName in groupedProducts) {
                const EachProduct = groupedProducts[productName];

                try {
                    let ProductData = {
                        companyId,
                        HeadCategoryId,
                        SubCategoryId,
                        BrandId,
                        ProductName: EachProduct.ProductName
                    };

                    const cd = EachProduct.CommonDescription;
                    if (cd?.Head || cd?.Points?.length || cd?.TextDescription) {
                        ProductData.CommonDescription = cd;
                    }

                    if (EachProduct.ProductServices?.length) {
                        let validServices = [];
                        for (let s of EachProduct.ProductServices) {
                            if (await ProductService.findById(s?.ProductServiceId)) {
                                validServices.push(s);
                            }
                        }
                        if (validServices.length) ProductData.ProductServices = validServices;
                    }

                    ProductData.CommonImages = EachProduct.CommonImages
                        .map(i => imageMap.get(i))
                        .filter(Boolean);
                    ProductData.CommonImages.forEach(i => usedImages.add(i));

                    ProductData.CommonVideos = EachProduct.CommonVideos
                        .map(v => videoMap.get(v))
                        .filter(Boolean);
                    ProductData.CommonVideos.forEach(v => usedVideos.add(v));

                    const product = await new Product(ProductData).save();
                    let VariantIds = [];

                    for (let EachVariant of EachProduct.VariantProductDatas) {
                        try {
                            if (!EachVariant.Price) throw new Error("Price missing");

                            if (
                                EachVariant.InventoryBaseStock.AvailableStock >
                                EachVariant.InventoryBaseStock.Stock
                            ) {
                                throw new Error("AvailableStock greater than Stock");
                            }

                            let VariantData = {
                                companyId,
                                HeadCategoryId,
                                SubCategoryId,
                                ProductId: product._id,
                                VariantProductName: EachVariant.VariantProductName || product.ProductName,
                                Price: EachVariant.Price,
                                OfferPercentage: EachVariant.OfferPercentage,
                                InventoryBaseStock: EachVariant.InventoryBaseStock
                            };

                            const ap = EachVariant.AboutProduct;
                            if (ap?.Head || ap?.Points?.length || ap?.TextDescription) {
                                VariantData.AboutProduct = ap;
                            }

                            VariantData.Specification = EachVariant.Specification.filter(
                                s => s.SpecificationKey && s.SpecificationValue
                            );

                            if (EachVariant.BatchIds?.length) {
                                const batches = await Batch.find(
                                    { _id: { $in: EachVariant.BatchIds } },
                                    { _id: 1 }
                                );
                                if (batches.length) {
                                    VariantData.BatchIds = batches.map(b => b._id);
                                }
                            }

                            let validVariantFields = [];
                            for (let vf of EachVariant.VariantFields) {
                                if (await Variant.findById(vf.VariantId)) {
                                    validVariantFields.push(vf);
                                }
                            }
                            if (validVariantFields.length) {
                                VariantData.VariantFields = validVariantFields;
                            }

                            const images = EachVariant.VariantProductImage
                                .map(i => imageMap.get(i))
                                .filter(Boolean);

                            VariantData.VariantProductImage =
                                images.length ? images :
                                    (product.CommonImages?.length ? [product.CommonImages[0]] : []);

                            VariantData.VariantProductImage.forEach(i => usedImages.add(i));

                            const variant = await new VariantProduct(VariantData).save();
                            VariantIds.push(variant._id);

                            if (VariantData.VariantFields?.length) {
                                for (let vf of VariantData.VariantFields) {
                                    const exists = await Variant.findOne({
                                        _id: vf.VariantId,
                                        "VariantValues.Value": vf.VariantValue
                                    });

                                    if (exists) {
                                        await Variant.updateOne(
                                            { _id: vf.VariantId, "VariantValues.Value": vf.VariantValue },
                                            { $inc: { "VariantValues.$.Count": 1 } }
                                        );
                                    } else {
                                        await Variant.updateOne(
                                            { _id: vf.VariantId },
                                            { $push: { VariantValues: { Value: vf.VariantValue, Count: 1 } } }
                                        );
                                    }
                                }
                            }

                        } catch (vErr) {
                            failedVariants.push({ productName, variant: EachVariant, reason: vErr.message });
                        }
                    }

                    if (!VariantIds.length) {
                        await Product.findByIdAndDelete(product._id);
                        throw new Error("No valid variants");
                    }

                    await Product.findByIdAndUpdate(product._id, {
                        $set: { VariantProductIds: VariantIds }
                    });

                    try {
                        await updateElasticById({ type: "product", id: product._id });
                    } catch { }

                    addedProducts.push(product._id);

                } catch (pErr) {
                    failedProducts.push({ productName, reason: pErr.message });
                }
            }

            deleteFiles("ProductImage", AllProductImages.filter(i => !usedImages.has(i)));
            deleteFiles("ProductVideo", AllProductVideos.filter(v => !usedVideos.has(v)));

            fs.unlinkSync(csvFilePath);

            return res.status(201).json({
                success: true,
                addedProducts,
                failedProducts,
                failedVariants
            });

        } catch (err) {
            return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
        }
    },

    previewVariantProductCSV: async (req, res) => {
        let { SubCategoryId } = req.body;
        const parsePipeArray = (value = "") =>
            value
                .split("|")
                .map(v => v.trim())
                .filter(Boolean);

        const parseKeyValuePipe = (value = "") =>
            value
                .split("|")
                .map(p => p.trim())
                .filter(Boolean)
                .map(p => {
                    const [key, val] = p.split("=").map(v => v.trim());
                    return key && val ? { key, val } : null;
                })
                .filter(Boolean);

        const resolveVariantFields = async (rawValue = "", VariantModel) => {
            const parsed = parseKeyValuePipe(rawValue);
            const result = [];

            for (const { key, val } of parsed) {
                let variant = null;

                if (/^[0-9a-fA-F]{24}$/.test(key)) {
                    if (SubCategoryId) {
                        variant = await VariantModel.findOne({ _id: key, SubCategoryId });
                    }
                    else {
                        variant = await VariantModel.findById(key);
                    }
                }

                if (!variant) {
                    const nameQuery = {
                        VariantName: { $regex: `^${key}$`, $options: "i" }
                    };

                    if (SubCategoryId) {
                        variant = await VariantModel.findOne({
                            ...nameQuery,
                            SubCategoryId
                        });
                    } else {
                        variant = await VariantModel.findOne(nameQuery);
                    }
                }


                if (variant) {
                    result.push({
                        VariantId: variant._id,
                        VariantValue: val
                    });
                }
            }

            return result;
        };

        try {
            const csvFilePath = req.files?.CSVFile?.[0]?.path;
            if (!csvFilePath) {
                return res.status(400).json({
                    success: false,
                    message: "CSV file is required"
                });
            }

            const rows = [];
            let lastProductRow = {};

            await new Promise((resolve, reject) => {
                fs.createReadStream(csvFilePath)
                    .pipe(csvParser())
                    .on("data", (row) => {

                        row.ProductName ||= lastProductRow.ProductName;
                        row["CommonDescription(Head)"] ||= lastProductRow["CommonDescription(Head)"];
                        row["CommonDescription(Points)"] ||= lastProductRow["CommonDescription(Points)"];
                        row["CommonDescription(TextDescription)"] ||= lastProductRow["CommonDescription(TextDescription)"];
                        row.CommonImages ||= lastProductRow.CommonImages;
                        row.CommonVideos ||= lastProductRow.CommonVideos;

                        if (!row.ProductName) return;

                        lastProductRow = { ...row };
                        rows.push(row);
                    })
                    .on("end", resolve)
                    .on("error", reject);
            });

            const groupedProducts = {};

            for (const row of rows) {

                if (!groupedProducts[row.ProductName]) {
                    groupedProducts[row.ProductName] = {
                        ProductName: row.ProductName,
                        CommonDescription: {
                            Head: row["CommonDescription(Head)"] || "",
                            Points: parsePipeArray(row["CommonDescription(Points)"]),
                            TextDescription: row["CommonDescription(TextDescription)"] || ""
                        },
                        CommonImages: parsePipeArray(row.CommonImages),
                        CommonVideos: parsePipeArray(row.CommonVideos),
                        VariantProductDatas: []
                    };
                }

                const specification = parseKeyValuePipe(row.Specification).map(
                    ({ key, val }) => ({
                        SpecificationKey: key,
                        SpecificationValue: val
                    })
                );

                const variantFields = await resolveVariantFields(
                    row.VariantFields,
                    Variant
                );

                groupedProducts[row.ProductName].VariantProductDatas.push({
                    VariantProductName: row.VariantProductName || row.ProductName,
                    Price: Number(row.Price || 0),
                    OfferPercentage: Number(row.OfferPercentage || 0),
                    BatchIds: parsePipeArray(row.BatchIds),
                    InventoryBaseStock: {
                        InventoryBase: row.InventoryBase?.toString().toLowerCase() == "true",
                        Stock: Number(row.Stock || 0),
                        AvailableStock: Number(row.AvailableStock || 0)
                    },
                    Specification: specification,
                    VariantFields: variantFields,
                    AboutProduct: {
                        Head: row["AboutProduct(Head)"] || "",
                        Points: parsePipeArray(row["AboutProduct(Points)"]),
                        TextDescription: row["AboutProduct(TextDescription)"] || ""
                    },
                    VariantProductImage: parsePipeArray(row.VariantProductImage)
                });
            }

            const sortedProducts = Object.values(groupedProducts).sort(
                (a, b) => a.ProductName.localeCompare(b.ProductName)
            );

            return res.status(200).json({
                success: true,
                count: sortedProducts.length,
                data: sortedProducts
            });

        } catch (error) {
            console.error("❌ CSV Preview Error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },


    getVariantProductCsv: async (req, res) => {
        try {
            const dirPath = path.join(__dirname, "..", "..", "public", "ProductCsv");
            const csvFilePath = path.join(dirPath, "products_template.csv");

            await fs.promises.mkdir(dirPath, { recursive: true });

            const csvWriter = createCsvWriter({
                path: csvFilePath,
                header: [
                    { id: 'ProductName', title: 'ProductName' },
                    { id: 'CommonDescription(Head)', title: 'CommonDescription(Head)' },
                    { id: 'CommonDescription(Points)', title: 'CommonDescription(Points)' },
                    { id: 'CommonDescription(TextDescription)', title: 'CommonDescription(TextDescription)' },
                    { id: 'CommonImages', title: 'CommonImages' },
                    { id: 'CommonVideos', title: 'CommonVideos' },
                    { id: 'VariantProductName', title: 'VariantProductName' },
                    { id: 'Price', title: 'Price' },
                    { id: 'OfferPercentage', title: 'OfferPercentage' },
                    { id: 'BatchIds', title: 'BatchIds' },
                    { id: 'InventoryBase', title: 'InventoryBase' },
                    { id: 'Stock', title: 'Stock' },
                    { id: 'AvailableStock', title: 'AvailableStock' },
                    { id: 'Specification', title: 'Specification' },
                    { id: 'VariantFields', title: 'VariantFields' },
                    { id: 'AboutProduct(Head)', title: 'AboutProduct(Head)' },
                    { id: 'AboutProduct(Points)', title: 'AboutProduct(Points)' },
                    { id: 'AboutProduct(TextDescription)', title: 'AboutProduct(TextDescription)' },
                    { id: 'VariantProductImage', title: 'VariantProductImage' },
                ]
            });

            // Write empty template
            await csvWriter.writeRecords([]);

            console.log('✅ CSV template generated');

            res.download(csvFilePath, 'products_template.csv', (err) => {
                if (err) {
                    console.error('❌ Error sending CSV:', err);
                    res.status(500).json({
                        success: false,
                        message: 'Failed to download CSV'
                    });
                }
            });

        } catch (error) {
            console.error('❌ CSV Generation Error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal Server Error',
                error: error.message
            });
        }

    },
    UpdateVariantProduct: async (req, res) => {
        let {
            ProductId,
            companyId,
            VariantProductName,
            VariantFields,
            OfferPercentage,
            Price,
            InventoryBaseStock,
            Specification,
            AboutProduct,
            VariantProductId,
            Operation,
            ImageName,
        } = req.body;
        if (req.user.companyId) companyId = req.user.companyId

        let uploadedImages = req.files?.length ? req.files.map(f => f.filename) : [];

        let cleanupFiles = async (files, ProductId, companyId, VariantProductId = null) => {
            if (!Array.isArray(files) || files.length === 0) return;
            for (let file of files) {
                try {
                    let usedInVariant;
                    if (VariantProductId) {
                        usedInVariant = await VariantProduct.findOne({
                            ProductId,
                            companyId,
                            _id: { $ne: VariantProductId },
                            VariantProductImage: { $in: [file] }
                        });
                    } else {
                        usedInVariant = await VariantProduct.findOne({
                            ProductId,
                            companyId,
                            VariantProductImage: { $in: [file] }
                        });
                    }

                    let usedInProduct = await Product.findOne({
                        _id: ProductId,
                        companyId,
                        CommonImages: { $in: [file] }
                    });

                    if (!usedInVariant && !usedInProduct) {
                        let filePath = path.join(__dirname, '..', '..', 'public', 'ProductImage', file);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            console.log(`🗑️ Deleted unused file: ${file}`);
                        }
                    }
                } catch (err) {
                    console.warn(`⚠️ File delete error for ${file}:`, err.message);
                }
            }
        };

        try {
            let jsonFields = ['InventoryBaseStock', 'Specification', 'AboutProduct', 'VariantFields'];
            for (let key of jsonFields) {
                if (req.body[key]) {
                    try {
                        req.body[key] = typeof req.body[key] === 'string' ? JSON.parse(req.body[key]) : req.body[key];
                    } catch {
                        await cleanupFiles(uploadedImages, ProductId, companyId);
                        return res.status(400).json({ success: false, message: `Invalid JSON format in field: ${key}` });
                    }
                }
            }

            VariantFields = req.body.VariantFields;
            Specification = req.body.Specification;
            InventoryBaseStock = req.body.InventoryBaseStock;
            AboutProduct = req.body.AboutProduct;

            console.log('Parsed body:', req.body);

            if (!ProductId || !companyId) {
                await cleanupFiles(uploadedImages, ProductId, companyId);
                return res.status(400).json({ message: "Missing required fields", success: false });
            }

            let product = await Product.findOne({ _id: ProductId, companyId });
            if (!product) {
                await cleanupFiles(uploadedImages, ProductId, companyId);
                return res.status(404).json({ message: "Product not found", success: false });
            }

            let VariantProductData = {
                ProductId,
                companyId,
                VariantProductName: VariantProductName || product.ProductName,
                VariantFields: Array.isArray(VariantFields) ? VariantFields.map(v => ({
                    VariantId: v.VariantId,
                    VariantValue: v.VariantValue
                })) : [],
                OfferPercentage,
                Price,
                InventoryBaseStock: InventoryBaseStock || { InventoryBase: false, Stock: 0, AvailableStock: 0 },
                Specification: Array.isArray(Specification) ? Specification.filter(s => s.SpecificationKey && s.SpecificationValue) : [],
                AboutProduct: AboutProduct && (AboutProduct.Head || (Array.isArray(AboutProduct.Points) && AboutProduct.Points.length) || AboutProduct.TextDescription) ? AboutProduct : undefined
            };

            if (!VariantProductData.Specification?.length) delete VariantProductData.Specification;
            if (!VariantProductData.VariantFields?.length) delete VariantProductData.VariantFields;
            if (!VariantProductData.AboutProduct) delete VariantProductData.AboutProduct;

            VariantProductData.HeadCategoryId = product.HeadCategoryId;
            VariantProductData.SubCategoryId = product.SubCategoryId;

            let updateVariantCounts = async (fields, increment = true) => {
                if (!Array.isArray(fields)) return;
                for (let f of fields) {
                    try {
                        let query = {
                            _id: f?.VariantId,
                            "VariantValues.Value": f?.VariantValue,
                            ...(increment ? {} : { "VariantValues.Count": { $gt: 0 } })
                        };
                        let found = await Variant.findOne(query);
                        if (found) {
                            await Variant.findOneAndUpdate(
                                { _id: f?.VariantId, "VariantValues.Value": f?.VariantValue },
                                { $inc: { "VariantValues.$.Count": increment ? 1 : -1 } },
                                { new: true }
                            );
                        } else if (increment) {
                            await Variant.findOneAndUpdate(
                                { _id: f?.VariantId },
                                { $push: { VariantValues: { Value: f?.VariantValue, Count: 1 } } },
                                { new: true }
                            );
                        }
                    } catch (err) {
                        console.warn(`⚠️ Variant count update failed: ${err.message}`);
                    }
                }
            };

            if (Operation === 'add') {
                if (VariantProductId) {
                    let existing = await VariantProduct.findOne({ _id: VariantProductId, companyId });
                    if (!existing) {
                        await cleanupFiles(uploadedImages, ProductId, companyId);
                        return res.status(404).json({ message: "Variant product not found", success: false });
                    }
                    if (VariantProductData?.InventoryBaseStock?.AvailableStock > VariantProductData?.InventoryBaseStock?.Stock) {
                        await cleanupFiles(uploadedImages, ProductId, companyId);
                        return res.status(400).json({ message: "Available Stock Should Be Less Than Original Stock", status: false })
                    }
                    await updateVariantCounts(existing.VariantFields, false);
                    await updateVariantCounts(VariantProductData.VariantFields, true);

                    if (uploadedImages.length > 0) {
                        VariantProductData.VariantProductImage = [...(existing?.VariantProductImage || []), ...uploadedImages];
                    }

                    let updated = await VariantProduct.findOneAndUpdate(
                        { _id: VariantProductId, companyId },
                        { $set: VariantProductData },
                        { new: true }
                    );

                    return res.status(200).json({ success: true, message: "Variant product updated successfully", data: updated });
                }

                if (!Price) {
                    await cleanupFiles(uploadedImages, ProductId, companyId);
                    return res.status(400).json({ message: "Price required", success: false });
                }

                if ((!uploadedImages?.length || uploadedImages?.length === 0) && product?.CommonImages.length === 0) {
                    return res.status(400).json({ message: "Please provide image to add product", success: false });
                }
                if (VariantProductData?.InventoryBaseStock?.AvailableStock > VariantProductData?.InventoryBaseStock?.Stock) {
                    await cleanupFiles(uploadedImages, ProductId, companyId);
                    return res.status(400).json({ message: "Available Stock Should Be Less Than Original Stock", status: false })
                }
                VariantProductData.VariantProductImage = uploadedImages.length ? uploadedImages : [product?.CommonImages[0]] || [];

                let newVariant = await new VariantProduct(VariantProductData).save();
                await updateVariantCounts(VariantProductData.VariantFields, true);

                try {
                    await updateElasticById({ type: 'variantProduct', id: newVariant._id })
                    console.log(`✅ Successfully updated Elasticsearch for variantProduct: ${newVariant._id}`);
                } catch (error) {
                    console.error(`❌ Failed to update Elasticsearch for variantProduct ${newVariant._id}:`, error.message);
                }

                await Product.findOneAndUpdate(
                    { _id: ProductId, companyId },
                    { $addToSet: { VariantProductIds: newVariant._id } },
                    { new: true }
                );
                return res.status(200).json({ success: true, message: "Variant product added successfully", data: newVariant });

            } else if (Operation === 'delete') {
                if (!VariantProductId) {
                    await cleanupFiles(uploadedImages, ProductId, companyId);
                    return res.status(400).json({ message: "VariantProductId required", success: false });
                }

                let existing = await VariantProduct.findOne({ _id: VariantProductId, companyId });
                if (!existing) {
                    await cleanupFiles(uploadedImages, ProductId, companyId, VariantProductId);
                    return res.status(404).json({ message: "Variant product not found", success: false });
                }

                if (ImageName) {
                    ImageName = Array.isArray(ImageName) ? ImageName : [ImageName];
                    await cleanupFiles(ImageName, ProductId, companyId, VariantProductId);
                    await cleanupFiles(uploadedImages, ProductId, companyId, VariantProductId);
                    await VariantProduct.findByIdAndUpdate(VariantProductId, { $pull: { VariantProductImage: { $in: ImageName } } });
                    return res.status(200).json({ message: "Images deleted", success: true });
                }

                await updateVariantCounts(existing.VariantFields, false);
                await cleanupFiles(existing.VariantProductImage, ProductId, companyId, VariantProductId);

                await VariantProduct.deleteOne({ _id: VariantProductId, companyId });
                await Product.findOneAndUpdate(
                    { _id: ProductId, companyId },
                    { $pull: { VariantProductIds: VariantProductId } },
                    { new: true }
                );
                try {
                    await deleteElasticById('variant', VariantProductId)
                    console.log(`✅ Successfully deleted Elasticsearch for variantProduct: ${VariantProductId}`);
                } catch (error) {
                    console.error(`❌ Failed to delete Elasticsearch for variantProduct ${VariantProductId}:`, error.message);
                }
                return res.status(200).json({ success: true, message: "Variant product deleted successfully" });
            }

            await cleanupFiles(uploadedImages);
            return res.status(400).json({ success: false, message: "Invalid Operation" });

        } catch (error) {
            await cleanupFiles(uploadedImages);
            console.error("❌ Error in UpdateVariantProduct:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
        }
    },



    UpdateProductDetail: async (req, res) => {
        let { ProductId, companyId, ProductName, CommonDescription, ProductServices } = req.body;
        if (req.user.companyId) companyId = req.user.companyId

        try {
            if (!ProductId || !companyId) {
                return res.status(400).json({
                    message: "Please provide company id and product id to update product details",
                    success: false
                });
            }

            let FindedProduct = await Product.findOne({ _id: ProductId, companyId });
            if (!FindedProduct) {
                return res.status(404).json({ message: "Product not found", success: false });
            }

            let ProductData = { ProductName, CommonDescription, ProductServices };

            Object.keys(ProductData).forEach(key => ProductData[key] === undefined && delete ProductData[key]);

            if (Array.isArray(ProductServices) && ProductServices.length > 0) {
                let ValidServices = [];
                for (let EachService of ProductServices) {
                    let FoundService = await ProductService.findById(EachService?.ProductServiceId);
                    if (FoundService) ValidServices.push(EachService);
                }
                if (ValidServices.length > 0) ProductData.ProductServices = ValidServices;
            }

            if (
                CommonDescription &&
                (CommonDescription.Head ||
                    (Array.isArray(CommonDescription.Points) && CommonDescription.Points.length > 0) ||
                    CommonDescription.TextDescription)
            ) {
                ProductData.CommonDescription = CommonDescription;
            } else {
                delete ProductData.CommonDescription;
            }

            let UpdateProduct = await Product.findOneAndUpdate(
                { _id: ProductId, companyId },
                { $set: ProductData },
                { new: true }
            );

            if (!UpdateProduct) {
                return res.status(400).json({ message: 'Product not updated', success: false });
            }
            try {
                await updateElasticById({ type: 'product', id: ProductId })
                console.log(`✅ Successfully updated Elasticsearch for product: ${ProductId}`);
            } catch (error) {
                console.error(`❌ Failed to update Elasticsearch for product ${ProductId}:`, error.message);
            }
            return res.status(200).json({
                message: 'Product updated successfully',
                success: true,
                data: UpdateProduct
            });

        } catch (error) {
            console.error("❌ UpdateProductDetailError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },

    UpdateCommonImages: async (req, res) => {
        try {
            let { ProductId, companyId, Operation, ImageName } = req.body;
            let AllProductImages = req.files?.length ? req.files.map(f => f.filename) : [];
            if (req.user.companyId) companyId = req.user.companyId

            let clearFiles = async (files) => {
                if (!files?.length) return;
                try {
                    files.forEach(file => {
                        let filePath = path.join(__dirname, '..', '..', 'public', 'ProductImage', file);
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    });
                } catch (err) {
                    console.warn('⚠️ Error deleting product images:', err.message);
                }
            };

            if (!ProductId || !companyId) {
                await clearFiles(AllProductImages);
                return res.status(400).json({
                    success: false,
                    message: "Please provide company id and product id to update images"
                });
            }

            let product = await Product.findOne({ _id: ProductId, companyId });
            if (!product) {
                await clearFiles(AllProductImages);
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            let updatedProduct;

            if (Operation === "add") {
                if (AllProductImages.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "No images uploaded to add"
                    });
                }

                if (ImageName) {
                    let FilteredImages = product.CommonImages.filter(img => img !== ImageName);
                    FilteredImages.push(...AllProductImages);

                    updatedProduct = await Product.findOneAndUpdate(
                        { _id: ProductId, companyId },
                        { $set: { CommonImages: FilteredImages } },
                        { new: true }
                    );

                    let variantUsingImage = await VariantProduct.findOne({
                        ProductId,
                        companyId,
                        VariantProductImage: ImageName
                    });

                    if (!variantUsingImage) {
                        let oldImagePath = path.join(__dirname, '..', '..', 'public', 'ProductImage', ImageName);
                        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
                    }
                    try {
                        await updateElasticById({ type: 'product', id: ProductId })
                        console.log(`✅ Successfully updated Elasticsearch for product: ${ProductId}`);
                    } catch (error) {
                        console.error(`❌ Failed to update Elasticsearch for product ${ProductId}:`, error.message);
                    }
                    return res.status(200).json({
                        success: true,
                        message: "Image replaced successfully",
                        data: updatedProduct.CommonImages
                    });
                }

                updatedProduct = await Product.findOneAndUpdate(
                    { _id: ProductId, companyId },
                    { $addToSet: { CommonImages: { $each: AllProductImages } } },
                    { new: true }
                );
                try {
                    await updateElasticById({ type: 'product', id: ProductId })
                    console.log(`✅ Successfully updated Elasticsearch for product: ${ProductId}`);
                } catch (error) {
                    console.error(`❌ Failed to update Elasticsearch for product ${ProductId}:`, error.message);
                }
                return res.status(200).json({
                    success: true,
                    message: "Images added successfully",
                    data: updatedProduct.CommonImages
                });
            }

            else if (Operation === "delete") {
                if (!ImageName) {
                    await clearFiles(AllProductImages);
                    return res.status(400).json({
                        success: false,
                        message: "Please provide image name(s) to delete"
                    });
                }

                let imageArray = Array.isArray(ImageName) ? ImageName : [ImageName];

                updatedProduct = await Product.findOneAndUpdate(
                    { _id: ProductId, companyId },
                    { $pull: { CommonImages: { $in: imageArray } } },
                    { new: true }
                );

                for (let img of imageArray) {
                    let variantUsingImage = await VariantProduct.findOne({
                        ProductId,
                        companyId,
                        VariantProductImage: img
                    });

                    if (!variantUsingImage) {
                        let filePath = path.join(__dirname, '..', '..', 'public', 'ProductImage', img);
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    }
                }
                try {
                    await updateElasticById({ type: 'product', id: ProductId })
                    console.log(`✅ Successfully updated Elasticsearch for product: ${ProductId}`);
                } catch (error) {
                    console.error(`❌ Failed to update Elasticsearch for product ${ProductId}:`, error.message);
                }
                return res.status(200).json({
                    success: true,
                    message: "Images deleted successfully",
                    data: updatedProduct.CommonImages
                });
            }

            await clearFiles(AllProductImages);
            return res.status(400).json({
                success: false,
                message: "Invalid operation type"
            });

        } catch (error) {
            console.error("❌ UpdateCommonImagesError:", error);
            await clearFiles(AllProductImages);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },
    UpdateCommonVideos: async (req, res) => {
        try {
            let { ProductId, companyId, Operation, VideoName } = req.body;
            let AllProductVideos = req.files?.length ? req.files.map(f => f.filename) : [];
            if (req.user.companyId) companyId = req.user.companyId

            let clearFiles = async (files) => {
                if (!files?.length) return;
                try {
                    files.forEach(file => {
                        let filePath = path.join(__dirname, '..', '..', 'public', 'ProductVideo', file);
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    });
                } catch (err) {
                    console.warn('⚠️ Error deleting product videos:', err.message);
                }
            };

            if (!ProductId || !companyId) {
                await clearFiles(AllProductVideos);
                return res.status(400).json({
                    success: false,
                    message: "Please provide company id and product id to update videos"
                });
            }

            let product = await Product.findOne({ _id: ProductId, companyId });
            if (!product) {
                await clearFiles(AllProductVideos);
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            let updatedProduct;

            if (Operation === "add") {
                if (AllProductVideos.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "No videos uploaded to add"
                    });
                }

                if (VideoName) {
                    let FilteredVideos = product.CommonVideos.filter(vid => vid !== VideoName);
                    FilteredVideos.push(...AllProductVideos);

                    updatedProduct = await Product.findOneAndUpdate(
                        { _id: ProductId, companyId },
                        { $set: { CommonVideos: FilteredVideos } },
                        { new: true }
                    );

                    let oldVideoPath = path.join(__dirname, '..', '..', 'public', 'ProductVideo', VideoName);
                    if (fs.existsSync(oldVideoPath)) fs.unlinkSync(oldVideoPath);
                    try {
                        await updateElasticById({ type: 'product', id: ProductId })
                        console.log(`✅ Successfully updated Elasticsearch for product: ${ProductId}`);
                    } catch (error) {
                        console.error(`❌ Failed to update Elasticsearch for product ${ProductId}:`, error.message);
                    }
                    return res.status(200).json({
                        success: true,
                        message: "Video replaced successfully",
                        data: updatedProduct.CommonVideos
                    });
                }

                updatedProduct = await Product.findOneAndUpdate(
                    { _id: ProductId, companyId },
                    { $addToSet: { CommonVideos: { $each: AllProductVideos } } },
                    { new: true }
                );
                try {
                    await updateElasticById({ type: 'product', id: ProductId })
                    console.log(`✅ Successfully updated Elasticsearch for product: ${ProductId}`);
                } catch (error) {
                    console.error(`❌ Failed to update Elasticsearch for product ${ProductId}:`, error.message);
                }
                return res.status(200).json({
                    success: true,
                    message: "Videos added successfully",
                    data: updatedProduct.CommonVideos
                });
            }

            else if (Operation === "delete") {
                if (!VideoName) {
                    await clearFiles(AllProductVideos);
                    return res.status(400).json({
                        success: false,
                        message: "Please provide video name(s) to delete"
                    });
                }

                let videoArray = Array.isArray(VideoName) ? VideoName : [VideoName];

                updatedProduct = await Product.findOneAndUpdate(
                    { _id: ProductId, companyId },
                    { $pull: { CommonVideos: { $in: videoArray } } },
                    { new: true }
                );

                for (let vid of videoArray) {
                    let filePath = path.join(__dirname, '..', '..', 'public', 'ProductVideo', vid);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
                try {
                    await updateElasticById({ type: 'product', id: ProductId })
                    console.log(`✅ Successfully updated Elasticsearch for product: ${ProductId}`);
                } catch (error) {
                    console.error(`❌ Failed to update Elasticsearch for product ${ProductId}:`, error.message);
                }
                return res.status(200).json({
                    success: true,
                    message: "Videos deleted successfully",
                    data: updatedProduct.CommonVideos
                });
            }

            await clearFiles(AllProductVideos);
            return res.status(400).json({
                success: false,
                message: "Invalid operation type"
            });

        } catch (error) {
            console.error("❌ UpdateCommonImagesError:", error);
            await clearFiles(AllProductVideos);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },

    DeleteProductOrVariants: async (req, res) => {
        try {
            let { ProductId, VariantIds, deleteType, companyId } = req.body;
            if (req.user.companyId) companyId = req.user.companyId;

            if (!ProductId || !companyId || !deleteType) {
                return res.status(400).json({
                    success: false,
                    message: "ProductId, companyId and deleteType are required"
                });
            }

            const product = await Product.findOne({ _id: ProductId, companyId });
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const deleteFiles = async (files, folder) => {
                if (!Array.isArray(files)) return;
                for (const file of files) {
                    const filePath = path.join(__dirname, "..", "..", "public", folder, file);
                    try {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    } catch (err) {
                        console.warn("File delete failed:", err.message);
                    }
                }
            };


            if (deleteType === "VARIANT") {
                if (!VariantIds || VariantIds.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "VariantIds required for VARIANT delete"
                    });
                }

                const ids = Array.isArray(VariantIds) ? VariantIds : [VariantIds];

                const variants = await VariantProduct.find({
                    _id: { $in: ids },
                    ProductId,
                    companyId
                });

                for (const variant of variants) {
                    if (variant.VariantProductImage?.length) {
                        await deleteFiles(variant.VariantProductImage, "ProductImage");
                    }

                    if (Array.isArray(variant.VariantFields)) {
                        for (const v of variant.VariantFields) {
                            await Variant.findOneAndUpdate(
                                {
                                    _id: v.VariantId,
                                    "VariantValues.Value": v.VariantValue,
                                    "VariantValues.Count": { $gt: 0 }
                                },
                                { $inc: { "VariantValues.$.Count": -1 } }
                            );
                        }
                    }

                    await VariantProduct.deleteOne({ _id: variant._id });
                    try {
                        await deleteElasticById({ type: 'variant', id: variant._id })
                        console.log(`✅ Successfully deleted Elasticsearch for variantProduct: ${variant._id}`);
                    } catch (error) {
                        console.error(`❌ Failed to delete Elasticsearch for variantProduct ${variant._id}:`, error.message);
                    }
                    await Product.updateOne(
                        { _id: ProductId },
                        { $pull: { VariantProductIds: variant._id } }
                    );
                }

                return res.status(200).json({
                    success: true,
                    message: "✅ Selected variant products deleted successfully"
                });
            }

            if (deleteType === "PRODUCT") {

                if (Array.isArray(product.VariantProductIds)) {
                    const variants = await VariantProduct.find({
                        _id: { $in: product.VariantProductIds },
                        ProductId,
                        companyId
                    });

                    for (const variant of variants) {
                        if (variant.VariantProductImage?.length) {
                            await deleteFiles(variant.VariantProductImage, "ProductImage");
                        }

                        if (Array.isArray(variant.VariantFields)) {
                            for (const v of variant.VariantFields) {
                                await Variant.findOneAndUpdate(
                                    {
                                        _id: v.VariantId,
                                        "VariantValues.Value": v.VariantValue,
                                        "VariantValues.Count": { $gt: 0 }
                                    },
                                    { $inc: { "VariantValues.$.Count": -1 } }
                                );
                            }
                        }

                        await VariantProduct.deleteOne({ _id: variant._id });
                        try {
                            await deleteElasticById({ type: 'variant', id: variant._id })
                            console.log(`✅ Successfully deleted Elasticsearch for variantProduct: ${variant._id}`);
                        } catch (error) {
                            console.error(`❌ Failed to delete Elasticsearch for variantProduct ${variant._id}:`, error.message);
                        }
                    }
                }

                await deleteFiles(product.CommonImages, "ProductImage");
                await deleteFiles(product.CommonVideos, "ProductVideo");

                await ProductRating.deleteMany({ ProductId });

                await Product.deleteOne({ _id: ProductId });
                try {
                    await deleteElasticById({ type: 'product', id: ProductId })
                    console.log(`✅ Successfully deleted Elasticsearch for product: ${ProductId}`);
                } catch (error) {
                    console.error(`❌ Failed to delete Elasticsearch for product ${ProductId}:`, error.message);
                }
                return res.status(200).json({
                    success: true,
                    message: "✅ Product and all its variants deleted successfully"
                });
            }

            return res.status(400).json({
                success: false,
                message: "Invalid deleteType (use PRODUCT or VARIANT)"
            });

        } catch (error) {
            console.error("DeleteProductOrVariants error:", error);
            res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },


    ToggleProductOrVariants: async (req, res) => {
        const toggleElastic = ({ type, id, isActive }) => {
            if (!type || !id) return Promise.resolve();

            return isActive
                ? updateElasticById({ type, id })
                : deleteElasticById({ type, id });
        };
        const toggleElasticForVariant = ({ type, id, isActive }) => {
            if (!type || !id) return Promise.resolve();

            return isActive
                ? updateElasticById({ type, id })
                : deleteElasticVariantByProductId({ ProductId: id });
        };
        try {
            let {
                ProductId,
                VariantIds,
                toggleType,
                companyId,
                isActive
            } = req.body;
            let esTasks = [];
            if (req.user.companyId) companyId = req.user.companyId;

            if (!ProductId || !companyId || typeof isActive !== "boolean" || !toggleType) {
                return res.status(400).json({
                    success: false,
                    message: "ProductId, companyId, isActive and toggleType are required"
                });
            }

            const product = await Product.findOne({ _id: ProductId, companyId });
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }


            if (toggleType === "VARIANT") {
                if (!VariantIds || VariantIds.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "VariantIds required for VARIANT toggle"
                    });
                }

                const ids = Array.isArray(VariantIds) ? VariantIds : [VariantIds];

                await VariantProduct.updateMany(
                    { _id: { $in: ids }, ProductId, companyId },
                    {
                        $set: {
                            isActive,
                            isActiveBy: "Self"
                        }
                    }
                );
                esTasks.push(
                    toggleElasticForVariant({
                        type: "product",
                        id: ProductId,
                        isActive
                    })
                )
                return res.status(200).json({
                    success: true,
                    message: `✅ Selected variant products ${isActive ? "activated" : "deactivated"} successfully`
                });
            }


            if (toggleType === "PRODUCT") {

                await Product.updateOne(
                    { _id: ProductId, companyId },
                    {
                        $set: {
                            isActive,
                            isActiveBy: "Self"
                        }
                    }
                );
                esTasks.push(
                    toggleElastic({
                        type: "product",
                        id: ProductId,
                        isActive: isActive
                    })
                );
                if (Array.isArray(product.VariantProductIds) && product.VariantProductIds.length > 0) {
                    await VariantProduct.updateMany(
                        { _id: { $in: product.VariantProductIds }, companyId },
                        {
                            $set: {
                                isActive,
                                isActiveBy: "Parent"
                            }
                        }
                    );
                }
                esTasks.push(
                    toggleElasticForVariant({
                        type: "product",
                        id: ProductId,
                        isActive
                    })
                )
                const esResults = await Promise.allSettled(esTasks);
                const failed = esResults.filter(r => r.status === "rejected");

                if (failed.length) {
                    console.error("❌ Some ES operations failed:", failed.length);
                }
                return res.status(200).json({
                    success: true,
                    message: `✅ Product and all its variants ${isActive ? "activated" : "deactivated"} successfully`
                });
            }

            return res.status(400).json({
                success: false,
                message: "Invalid toggleType (use PRODUCT or VARIANT)"
            });

        } catch (error) {
            console.error("ToggleProductOrVariants error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },

    getProductData: async (matchCondition) => {
        let data = await Product.aggregate([
            { $match: matchCondition },

            {
                $lookup: {
                    from: 'categgggories',
                    let: { headId: "$HeadCategoryId" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$headId"] } } },
                        { $project: { _id: 1, categoryName: 1, imageName: 1 } }
                    ],
                    as: 'HeadCategory'
                }
            },
            {
                $lookup: {
                    from: 'categgggories',
                    let: { subId: "$SubCategoryId" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$subId"] } } },
                        { $project: { _id: 1, categoryName: 1, imageName: 1 } }
                    ],
                    as: 'SubCategories'
                }
            },
            {
                $lookup: {
                    from: 'brands',
                    let: { brandId: "$BrandId" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$brandId"] } } },
                        { $project: { _id: 1, BrandName: 1, BrandImage: 1 } }
                    ],
                    as: 'Brands'
                }
            },

            {
                $lookup: {
                    from: 'productservices',
                    localField: 'ProductServices.ProductServiceId',
                    foreignField: '_id',
                    as: 'ProductServicesData'
                }
            },

            {
                $addFields: {
                    ProductServices: {
                        $map: {
                            input: "$ProductServices",
                            as: "ps",
                            in: {
                                $mergeObjects: [
                                    "$$ps",
                                    {
                                        ProductServiceData: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$ProductServicesData",
                                                        as: "psd",
                                                        cond: { $eq: ["$$psd._id", "$$ps.ProductServiceId"] }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            {
                $lookup: {
                    from: 'variantproducts',
                    localField: 'VariantProductIds',
                    foreignField: '_id',
                    as: 'VariantProducts'
                }
            },

            {
                $lookup: {
                    from: 'variants',
                    localField: 'VariantProducts.VariantFields.VariantId',
                    foreignField: '_id',
                    as: 'VariantNames'
                }
            },
            {
                $lookup: {
                    from: 'batches',
                    localField: 'VariantProducts.BatchIds',
                    foreignField: '_id',
                    as: 'Batches'
                }
            },

            {
                $addFields: {
                    VariantProducts: {
                        $map: {
                            input: "$VariantProducts",
                            as: "vp",
                            in: {
                                $mergeObjects: [
                                    "$$vp",
                                    {
                                        VariantFields: {
                                            $map: {
                                                input: "$$vp.VariantFields",
                                                as: "vf",
                                                in: {
                                                    $mergeObjects: [
                                                        "$$vf",
                                                        {
                                                            VariantName: {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $map: {
                                                                            input: {
                                                                                $filter: {
                                                                                    input: "$VariantNames",
                                                                                    as: "vn",
                                                                                    cond: { $eq: ["$$vn._id", "$$vf.VariantId"] }
                                                                                }
                                                                            },
                                                                            as: "vn",
                                                                            in: "$$vn.VariantName"
                                                                        }
                                                                    },
                                                                    0
                                                                ]
                                                            },
                                                            Extension: {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $map: {
                                                                            input: {
                                                                                $filter: {
                                                                                    input: "$VariantNames",
                                                                                    as: "vn",
                                                                                    cond: { $eq: ["$$vn._id", "$$vf.VariantId"] }
                                                                                }
                                                                            },
                                                                            as: "vn",
                                                                            in: "$$vn.Extension"
                                                                        }
                                                                    },
                                                                    0
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        BatchesInfo: {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: "$Batches",
                                                        as: "b",
                                                        cond: { $in: ["$$b._id", { $ifNull: ["$$vp.BatchIds", []] }] }
                                                    }
                                                },
                                                as: "b",
                                                in: {
                                                    _id: "$$b._id",
                                                    BatchName: "$$b.BatchName",
                                                    BatchLogo: "$$b.BatchLogo"
                                                }
                                            }
                                        }


                                    },

                                ]
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'productratings',
                    localField: 'RatingIds',
                    foreignField: '_id',
                    as: 'Reviews'
                }
            },

            {
                $lookup: {
                    from: 'readyshoppingusers',
                    localField: 'Reviews.UserId',
                    foreignField: '_id',
                    as: 'ReviewUsers'
                }
            },

            {
                $lookup: {
                    from: 'readyshoppingusers',
                    localField: 'Reviews.ResponseOnReview.UserId',
                    foreignField: '_id',
                    as: 'ResponseUsers'
                }
            },

            {
                $addFields: {
                    Reviews: {
                        $map: {
                            input: "$Reviews",
                            as: "rev",
                            in: {
                                _id: "$$rev._id",
                                ReviewText: "$$rev.ReviewText",
                                ReviewImages: "$$rev.ReviewImages",
                                RatingStar: "$$rev.RatingStar",
                                TotalLike: "$$rev.TotalLike",
                                TotalDislike: "$$rev.TotalDislike",
                                createdAt: "$$rev.createdAt",
                                UserData: {
                                    $arrayElemAt: [
                                        {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: "$ReviewUsers",
                                                        cond: { $eq: ["$$this._id", "$$rev.UserId"] }
                                                    }
                                                },
                                                as: "u",
                                                in: { UserName: "$$u.UserName", UserProfile: "$$u.UserProfile" }
                                            }
                                        },
                                        0
                                    ]
                                },
                                ResponseOnReview: {
                                    $map: {
                                        input: "$$rev.ResponseOnReview",
                                        as: "resp",
                                        in: {
                                            _id: "$$resp._id",
                                            LikeOrDislike: "$$resp.LikeOrDislike",
                                            createdAt: "$$resp.createdAt",
                                            UserData: {
                                                $arrayElemAt: [
                                                    {
                                                        $map: {
                                                            input: {
                                                                $filter: {
                                                                    input: "$ResponseUsers",
                                                                    cond: { $eq: ["$$this._id", "$$resp.UserId"] }
                                                                }
                                                            },
                                                            as: "u",
                                                            in: { UserName: "$$u.UserName", UserProfile: "$$u.UserProfile" }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },

            { $project: { ProductServicesData: 0, VariantNames: 0, Batches: 0, ReviewUsers: 0, ResponseUsers: 0 } }

        ]);
        return data;
    },
    getProductsById: async (req, res) => {
        try {
            let {
                HeadCategoryId,
                SubCategoryId,
                companyId,
                ProductId,
                ProductName,
                InventoryBase,
                VariantProductId,
                BrandId,
                BatchName,
                SortOrder,
                StartDate,
                EndDate,
                MaxPrice,
                MinPrice,
                PriceSort,
                CategoryName,
                BrandName,
                MixedName,
                ListType,
                isActive,
                VariantProductIsActive,
                UserId
            } = req.query;


            let { VariantFilters, BatchIds, VariantProductIds } = req.body;

            if (!companyId) {
                return res.status(400).json({ message: 'companyId is required', success: false });
            }

            let validateObjectId = (id, fieldName) => {
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    throw new Error(`Invalid ${fieldName} format`);
                }
                return new mongoose.Types.ObjectId(String(id));
            };

            let matchCondition = { companyId: validateObjectId(companyId, 'companyId') };
            if (isActive === undefined) {
                isActive = true;
                matchCondition.isActive = true
            } else if (isActive === "true") {
                isActive = true;
                matchCondition.isActive = true
            } else if (isActive === "false") {
                isActive = false;
            } else {
                isActive = true;
                matchCondition.isActive = true
            }
            if (VariantProductIsActive === undefined) {
                VariantProductIsActive = true;
            }
            else if (VariantProductIsActive === "false") {
                VariantProductIsActive = false;
            }
            else {
                VariantProductIsActive = true;
            }
            if (HeadCategoryId) matchCondition.HeadCategoryId = validateObjectId(HeadCategoryId, 'HeadCategoryId');
            if (ProductId) matchCondition._id = validateObjectId(ProductId, 'ProductId');
            if (VariantProductId) matchCondition.VariantProductIds = { $in: [validateObjectId(VariantProductId, 'VariantProductId')] };

            if (BrandId) {
                let BrandIdArray = [];

                if (Array.isArray(BrandId)) {
                    BrandIdArray = BrandId;
                } else if (typeof BrandId == "string" && BrandId.includes(",")) {
                    BrandIdArray = BrandId.split(",");
                } else {
                    BrandIdArray = [BrandId];
                }

                let BrandIds = [];

                for (let id of BrandIdArray) {
                    let validId = validateObjectId(id, 'BrandId');
                    if (validId) BrandIds.push(validId);
                }

                matchCondition.BrandId = { $in: BrandIds };
            }

            if (SubCategoryId) {
                let SubIdArray = [];

                if (Array.isArray(SubCategoryId)) {
                    SubIdArray = SubCategoryId;
                } else if (typeof SubCategoryId === "string" && SubCategoryId.includes(",")) {
                    SubIdArray = SubCategoryId.split(",");
                } else {
                    SubIdArray = [SubCategoryId];
                }

                let SubIds = [];

                for (let id of SubIdArray) {
                    let validId = validateObjectId(id, 'SubCategoryId');
                    if (validId) {
                        SubIds.push(validId);
                    }
                }

                if (SubIds.length > 0) {
                    matchCondition.SubCategoryId = { $in: SubIds };
                }
            }


            let data = await module.exports.getProductData(matchCondition);
            if (!data || data.length === 0) {
                return res.status(404).json({ message: 'No Products found for this criteria', success: false });
            }

            let filteredData = data;

            if (ProductName) {
                let regex = new RegExp(ProductName, 'i');
                filteredData = filteredData.filter(product =>
                    regex.test(product.ProductName) ||
                    product.VariantProducts.some(vp => regex.test(vp.VariantProductName))
                );
            }

            if (VariantFilters && Array.isArray(VariantFilters) && VariantFilters.length > 0) {
                let variantPairs = VariantFilters.map(pair => {
                    if (!pair.VariantId || !pair.VariantValue) {
                        throw new Error('Each variant filter must have both VariantId and VariantValue');
                    }
                    if (!mongoose.Types.ObjectId.isValid(pair.VariantId)) {
                        throw new Error(`Invalid VariantId format: ${pair.VariantId}`);
                    }
                    return {
                        VariantId: validateObjectId(pair.VariantId, 'VariantId'),
                        VariantValue: new RegExp(pair.VariantValue, 'i')
                    };
                });

                filteredData = filteredData
                    .map(product => {
                        let matchedVariants = product.VariantProducts.filter(vp =>
                            variantPairs.some(pair =>
                                vp.VariantFields.some(
                                    vf => vf.VariantId.equals(pair.VariantId) &&
                                        pair.VariantValue.test(vf.VariantValue)
                                )
                            )
                        );

                        return { ...product, VariantProducts: matchedVariants };
                    })
                    .filter(p => p.VariantProducts.length > 0);

            }
            if (BatchIds) {
                let batchIdsArray = Array.isArray(BatchIds) ? BatchIds : [BatchIds];
                let batchObjectIds = batchIdsArray.map(id => validateObjectId(id, 'BatchId'));

                filteredData = filteredData.map(product => {
                    let matchedVariants = product.VariantProducts.filter(vp =>
                        vp.BatchesInfo.some(b => batchObjectIds.some(bid => b._id.equals(bid)))
                    );
                    return { ...product, VariantProducts: matchedVariants };
                }).filter(p => p.VariantProducts.length > 0);
            }
            if (BatchIds) {
                let batchIdsArray = Array.isArray(BatchIds) ? BatchIds : [BatchIds];
                let batchObjectIds = batchIdsArray.map(id => validateObjectId(id, 'BatchId'));

                filteredData = filteredData
                    .map(product => {
                        let matchedVariants = product.VariantProducts
                            .map(vp => {
                                let matchedBatches = vp.BatchesInfo.filter(b =>
                                    batchObjectIds.some(bid => b._id.equals(bid))
                                );
                                let otherBatches = vp.BatchesInfo.filter(b =>
                                    !batchObjectIds.some(bid => b._id.equals(bid))
                                );

                                let reorderedBatches = [...matchedBatches, ...otherBatches];

                                return { ...vp, BatchesInfo: reorderedBatches };
                            })
                            .filter(vp =>
                                vp.BatchesInfo.some(b =>
                                    batchObjectIds.some(bid => b._id.equals(bid))
                                )
                            );

                        return { ...product, VariantProducts: matchedVariants };
                    })
                    .filter(p => p.VariantProducts.length > 0);
            }

            if (BatchName) {
                let regex = new RegExp(BatchName, 'i');

                filteredData = filteredData
                    .map(product => {
                        let matchedVariants = product.VariantProducts
                            .map(vp => {
                                let matchedBatches = vp.BatchesInfo.filter(b => regex.test(b.BatchName));
                                let otherBatches = vp.BatchesInfo.filter(b => !regex.test(b.BatchName));

                                let reorderedBatches = [...matchedBatches, ...otherBatches];

                                return { ...vp, BatchesInfo: reorderedBatches };
                            })
                            .filter(vp => vp.BatchesInfo.some(b => regex.test(b.BatchName)));

                        return { ...product, VariantProducts: matchedVariants };
                    })
                    .filter(p => p.VariantProducts.length > 0);
            }

            if (BrandName) {
                let regex = new RegExp(BrandName, 'i');
                filteredData = filteredData.filter(product =>
                    product.Brands &&
                    product.Brands.some(brand => regex.test(brand.BrandName))
                );
            }
            if (CategoryName) {
                let regex = new RegExp(CategoryName, 'i');
                filteredData = filteredData.filter(product =>
                    (product.SubCategories &&
                        product.SubCategories.some(sub => regex.test(sub.categoryName))) ||
                    (product.HeadCategory &&
                        product.HeadCategory.some(head => regex.test(head.categoryName)))
                );
            }

            let AllRelatedData = {
                allRelatedBrands: [],
                allRelatedSubCategories: [],
                allRelatedHeadCategories: []
            };

            if (MixedName) {
                let keywords = MixedName.split(/[\s,\.]+/).filter(Boolean);
                let regexList = keywords.map(k => new RegExp(k, 'i'));
                let matchesAny = str => str && regexList.some(r => r.test(str));

                filteredData = filteredData.filter(product => {
                    let productMatch =
                        matchesAny(product.ProductName) ||
                        (product.Brands && product.Brands.some(b => matchesAny(b.BrandName))) ||
                        (product.SubCategories && product.SubCategories.some(sub => matchesAny(sub.categoryName))) ||
                        (product.HeadCategory && product.HeadCategory.some(head => matchesAny(head.categoryName)));

                    let variantMatch = product.VariantProducts.some(vp =>
                        matchesAny(vp.VariantProductName) ||
                        (vp.BatchesInfo && vp.BatchesInfo.some(b => matchesAny(b.BatchName)))
                    );

                    return productMatch || variantMatch;
                });

                const checkMatch = str => {
                    if (!str) return false;
                    str = str.toLowerCase();
                    return keywords.some(kw => str.includes(kw.toLowerCase()));
                };

                const existsById = (arr, id) => arr.some(item => String(item.id) === String(id));

                filteredData.forEach(product => {

                    if (product.Brands) {
                        product.Brands.forEach(b => {
                            if (checkMatch(b.BrandName) && !existsById(AllRelatedData.allRelatedBrands, b._id)) {
                                AllRelatedData.allRelatedBrands.push({
                                    id: b._id,
                                    name: b.BrandName,
                                    image: b.BrandImage
                                });
                            }
                        });
                    }

                    if (product.SubCategories) {
                        product.SubCategories.forEach(sub => {
                            if (checkMatch(sub.categoryName) && !existsById(AllRelatedData.allRelatedSubCategories, sub._id)) {
                                AllRelatedData.allRelatedSubCategories.push({
                                    id: sub._id,
                                    name: sub.categoryName,
                                    image: sub.imageName
                                });
                            }
                        });
                    }

                    if (product.HeadCategory) {
                        product.HeadCategory.forEach(head => {
                            if (checkMatch(head.categoryName) && !existsById(AllRelatedData.allRelatedHeadCategories, head._id)) {
                                AllRelatedData.allRelatedHeadCategories.push({
                                    id: head._id,
                                    name: head.categoryName,
                                    image: head.imageName
                                });
                            }
                        });
                    }

                });
            }




            if (VariantProductId) {
                let variantObjectIds = Array.isArray(VariantProductId)
                    ? VariantProductId.map(id => new mongoose.Types.ObjectId(String(id)))
                    : [new mongoose.Types.ObjectId(String(VariantProductId))];

                filteredData = filteredData
                    .map(product => {
                        let matchedVariants = product.VariantProducts.filter(vp =>
                            variantObjectIds.some(vid => vp._id.equals(vid))
                        );
                        let unmatchedVariants = product.VariantProducts.filter(vp =>
                            !variantObjectIds.some(vid => vp._id.equals(vid))
                        );

                        if (matchedVariants.length > 0) {
                            return { ...product, VariantProducts: [...matchedVariants, ...unmatchedVariants] };
                        }

                        return product;
                    })
                    .filter(p => p.VariantProducts && p.VariantProducts.length > 0);
            }


            if (InventoryBase) {
                filteredData = filteredData.filter(product =>
                    product.VariantProducts.some(vp =>
                        vp.InventoryBaseStock?.InventoryBase === InventoryBase
                    )
                );
            }
            if (VariantProductIds) {
                let variantIds = Array.isArray(VariantProductIds)
                    ? VariantProductIds
                    : [VariantProductIds];

                let variantObjectIds = variantIds.map(id => validateObjectId(id, 'VariantProductId'));

                filteredData = filteredData
                    .map(product => {
                        let matchedVariants = product.VariantProducts.filter(vp =>
                            variantObjectIds.some(vid => vp._id.equals(vid))
                        );

                        return { ...product, VariantProducts: matchedVariants };
                    })
                    .filter(p => p.VariantProducts.length > 0);
            }

            if (SortOrder || StartDate || EndDate || PriceSort || MinPrice || MaxPrice) {
                let sortDirection =
                    SortOrder?.toLowerCase() === 'newer'
                        ? -1
                        : SortOrder?.toLowerCase() === 'older'
                            ? 1
                            : 0;

                let priceSortDirection =
                    PriceSort?.toLowerCase() === 'lowtohigh'
                        ? 1
                        : PriceSort?.toLowerCase() === 'hightolow'
                            ? -1
                            : 0;

                let startDate = StartDate ? new Date(StartDate) : null;
                let endDate = EndDate ? new Date(EndDate) : null;

                let minPrice = MinPrice ? Number(MinPrice) : null;
                let maxPrice = MaxPrice ? Number(MaxPrice) : null;

                let flattened = [];

                filteredData.forEach(product => {
                    let { Reviews, ...productWithoutReviews } = product;

                    product.VariantProducts.forEach(variant => {
                        flattened.push({
                            ...productWithoutReviews,
                            VariantProducts: [variant],
                        });
                    });
                });

                if (startDate || endDate) {
                    flattened = flattened.filter(item => {
                        let createdAt = new Date(item.VariantProducts[0].createdAt);
                        if (startDate && endDate) return createdAt >= startDate && createdAt <= endDate;
                        if (startDate) return createdAt >= startDate;
                        if (endDate) return createdAt <= endDate;
                        return true;
                    });
                }

                if (minPrice || maxPrice) {
                    flattened = flattened.filter(item => {
                        let price = Number(item.VariantProducts[0].Price);
                        if (minPrice && maxPrice) return price >= minPrice && price <= maxPrice;
                        if (minPrice) return price >= minPrice;
                        if (maxPrice) return price <= maxPrice;
                        return true;
                    });
                }

                if (SortOrder) {
                    flattened.sort((a, b) => {
                        let createdAtA = new Date(a.VariantProducts[0].createdAt);
                        let createdAtB = new Date(b.VariantProducts[0].createdAt);
                        return sortDirection * (createdAtA - createdAtB);
                    });
                }

                if (PriceSort) {
                    flattened.sort((a, b) => {
                        let priceA = Number(a.VariantProducts[0].Price);
                        let priceB = Number(b.VariantProducts[0].Price);
                        return priceSortDirection * (priceA - priceB);
                    });
                }

                filteredData = flattened;
            }
            let ActiveSubCategoryIds = [];

            if (filteredData && filteredData.length !== 0) {

                ActiveSubCategoryIds = [
                    ...new Set(filteredData.map(p => p?.SubCategoryId?.toString()))
                ].filter(Boolean)

            }

            if (ListType === 'ProductList') {

                let variantList = [];

                filteredData.forEach((product) => {
                    product?.VariantProducts.forEach((variant) => {
                        variantList.push({
                            AboutProduct: variant.AboutProduct,
                            BatchesInfo: variant.BatchesInfo,
                            OfferPercentage: variant.OfferPercentage,
                            Price: variant.Price,
                            VariantFields: variant.VariantFields,
                            VariantProductName: variant.VariantProductName,
                            RatingStar: product.RatingStar,
                            TotalReviews: product.TotalReviews,
                            InventoryBaseStock: variant.InventoryBaseStock,
                            VariantProductImage: variant.VariantProductImage,
                            ProductId: variant.ProductId,
                            _id: variant._id,
                            isActive: variant.isActive
                        });
                    });
                });

                if (VariantProductIsActive === true) {
                    variantList = variantList.filter(v => v.isActive === true);
                }
                if (UserId) {
                    const FoundWishList = await Wishlist.find({ UserId, companyId });

                    if (FoundWishList?.length > 0) {

                        let wishlistVariantIds = new Set();

                        FoundWishList.forEach(folder => {
                            folder?.Products?.forEach(p => {
                                wishlistVariantIds.add(String(p.VariantProductId));
                            });
                        });

                        variantList = variantList.map(variant => {
                            const isInWishlist = wishlistVariantIds.has(String(variant._id));
                            return {
                                ...variant,
                                WishList: isInWishlist
                            };
                        });
                    }
                }

                filteredData = variantList;
            }
            else {
                if (VariantProductIsActive === true) {

                    filteredData = filteredData
                        .map((product) => {
                            let activeVariants = product?.VariantProducts.filter(v => v.isActive === true);

                            if (activeVariants.length > 0) {
                                return { ...product, VariantProducts: activeVariants };
                            }

                            return null;
                        })
                        .filter(Boolean);
                }
                if (UserId) {
                    const FoundWishList = await Wishlist.find({ UserId, companyId });

                    if (FoundWishList?.length > 0) {

                        const wishlistVariantIds = new Set();

                        FoundWishList.forEach(folder => {
                            folder?.Products?.forEach(p => {
                                wishlistVariantIds.add(String(p.VariantProductId));
                            });
                        });

                        filteredData = filteredData.map((product) => {
                            const VariantProducts = product.VariantProducts.map((EachVariant) => {

                                const isInWishlist = wishlistVariantIds.has(String(EachVariant._id));

                                return {
                                    ...EachVariant,
                                    WishList: isInWishlist
                                };
                            });

                            return { ...product, VariantProducts };
                        });
                    }
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Products fetched successfully',
                data: filteredData,
                ActiveSubCategoryIds,
                AllRelatedData
            });

        } catch (error) {
            console.error("getProductsByIdError:", error);
            return res.status(500).json({
                message: 'Internal Server Error',
                error: error.message,
                success: false
            });
        }
    },

    addBatch: async (req, res) => {
        let { BatchName } = req.body;

        let cleanupFiles = (file) => {
            try {
                if (file) {
                    let filePath = path.join(__dirname, "..", "..", "public", "BatchImages", file);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            } catch (error) {
                console.warn("Error deleting batch image:", error.message);
            }
        };

        try {
            if (!BatchName) {
                cleanupFiles(req?.file?.filename);
                return res.status(400).json({ message: "Please provide all fields", success: false });
            }

            if (!req?.file?.filename) {
                return res.status(400).json({ message: "Please provide a batch image", success: false });
            }

            let BatchData = {
                BatchName,
                BatchLogo: req.file.filename,
            };

            let SaveBatch = await new Batch(BatchData).save();

            if (!SaveBatch) {
                cleanupFiles(req?.file?.filename);
                return res.status(400).json({ message: "Batch not added", success: false });
            }

            return res.status(200).json({
                message: "Batch added successfully",
                success: true,
                data: SaveBatch,
            });

        } catch (error) {
            console.error("BatchAddError:", error.message);
            cleanupFiles(req?.file?.filename);
            return res.status(500).json({
                message: "Internal server error",
                success: false,
                error: error.message,
            });
        }
    },
    getBatch: async (req, res) => {
        let { BatchId, BatchName } = req.query;

        try {
            let matchCondition = {}
            if (BatchId) {
                matchCondition._id = new mongoose.Types.ObjectId(String(BatchId));
            }

            if (BatchName) {
                matchCondition.BatchName = { $regex: BatchName, $options: "i" };
            }

            let data = await Batch.find(matchCondition)
            if (!data.length) {
                return res.status(404).json({
                    message: "No batches found",
                    success: false
                });
            }

            return res.status(200).json({
                message: "Batch data fetched successfully",
                success: true,
                data
            });

        } catch (error) {
            console.error("getBatchError:", error.message);
            return res.status(500).json({
                message: "Internal server error",
                success: false,
                error: error.message
            });
        }
    },
    updateBatch: async (req, res) => {
        let { BatchId } = req.body;

        let cleanupFiles = (file) => {
            try {
                if (file) {
                    let filePath = path.join(__dirname, "..", "..", "public", "BatchImages", file);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            } catch (error) {
                console.warn("Error deleting batch image:", error.message);
            }
        };

        try {
            if (!BatchId) {
                cleanupFiles(req?.file?.filename);
                return res.status(400).json({
                    message: "BatchId and companyId are required",
                    success: false
                });
            }

            let existingBatch = await Batch.findOne({ _id: BatchId });
            if (!existingBatch) {
                cleanupFiles(req?.file?.filename);
                return res.status(404).json({
                    message: "Batch not found",
                    success: false
                });
            }

            let updatedLogo = existingBatch.BatchLogo;
            if (req?.file?.filename) {
                cleanupFiles(existingBatch.BatchLogo);
                updatedLogo = req.file.filename;
            }

            let updateData = {};
            if (updatedLogo) updateData.BatchLogo = updatedLogo;

            let updatedBatch = await Batch.findByIdAndUpdate(
                BatchId,
                { $set: updateData },
                { new: true }
            );

            return res.status(200).json({
                message: "Batch updated successfully",
                success: true,
                data: updatedBatch
            });

        } catch (error) {
            console.error("BatchUpdateError:", error.message);
            cleanupFiles(req?.file?.filename);
            return res.status(500).json({
                message: "Internal server error",
                success: false,
                error: error.message
            });
        }
    },
    EditBatchOfVariantProduct: async (req, res) => {
        let { VarianProductIds, BatchIds, companyId, Operation } = req.body;

        try {
            if (!companyId) {
                return res.status(400).json({ message: "companyId is required", success: false });
            }

            if (VarianProductIds) VarianProductIds = Array.isArray(VarianProductIds) ? VarianProductIds : [VarianProductIds];
            if (BatchIds) BatchIds = Array.isArray(BatchIds) ? BatchIds : [BatchIds];

            if (!VarianProductIds.length) {
                return res.status(400).json({ message: "Please provide VariantProductIds", success: false });
            }

            if (!BatchIds.length) {
                return res.status(400).json({ message: "Please provide BatchIds", success: false });
            }

            if (!Operation || !["add", "delete"].includes(Operation)) {
                return res.status(400).json({ message: "Invalid or missing Operation type (use 'add' or 'delete')", success: false });
            }

            let validBatches = await Batch.find({ _id: { $in: BatchIds } }).select("_id");
            if (validBatches.length === 0) {
                return res.status(404).json({ message: "No valid batches found", success: false });
            }

            let validBatchIds = validBatches.map(b => b._id);

            let updatedCount = 0;

            for (let variantProductId of VarianProductIds) {
                let variantProduct = await VariantProduct.findOne({ _id: variantProductId, companyId });

                if (!variantProduct) continue;
                if (Operation === "add") {

                    await VariantProduct.findByIdAndUpdate(variantProductId, {
                        $addToSet: { BatchIds: { $each: validBatchIds } }
                    });
                } else if (Operation === "delete") {
                    await VariantProduct.findByIdAndUpdate(variantProductId, {
                        $pull: { BatchIds: { $in: validBatchIds } }
                    });
                }

                updatedCount++;
            }

            if (updatedCount === 0) {
                return res.status(404).json({
                    message: "No matching VariantProducts found or updated",
                    success: false
                });
            }
            for (let EachVariantId of VarianProductIds) {
                try {
                    await updateElasticById({ type: 'variantProduct', id: EachVariantId })
                    console.log(`✅ Successfully updated Elasticsearch for variantProduct: ${EachVariantId}`);
                } catch (error) {
                    console.error(`❌ Failed to update Elasticsearch for variantProduct ${EachVariantId}:`, error.message);
                }
            }

            return res.status(200).json({
                message: `Batches ${Operation === "add" ? "added to" : "removed from"} ${updatedCount} variant product(s) successfully`,
                success: true,
                updatedCount
            });

        } catch (error) {
            console.error("addBatchToVariantProductError:", error.message);
            return res.status(500).json({
                message: "Internal server error",
                success: false,
                error: error.message
            });
        }
    },
    serchProduct: async (req, res) => {
        try {
            const { q } = req.query;
            if (!q || q.trim() === "") return res.json({ suggestions: [] });

            const { body } = await client.search({
                index: "products_search",
                body: {
                    size: 10,
                    query: {
                        multi_match: {
                            query: q,
                            fields: [
                                "productName^3",
                                "variantProductName^2",
                                "brandName^2",
                                "headCategoryName",
                                "subCategoryName",
                                "variantValues",
                                "batchNames"
                            ],
                            fuzziness: "AUTO"
                        }
                    },
                    highlight: {
                        fields: {
                            productName: {},
                            variantProductName: {},
                            brandName: {},
                            headCategoryName: {},
                            subCategoryName: {},
                            variantValues: {},
                            batchNames: {}
                        }
                    }
                }
            });

            const suggestions = body.hits.hits.map(hit => ({
                variantProductId: hit._source.variantProductId,
                productId: hit._source.productId,
                productName: hit._source.productName,
                variantProductName: hit._source.variantProductName,
                brandName: hit._source.brandName,
                headCategoryName: hit._source.headCategoryName,
                subCategoryName: hit._source.subCategoryName,
                variantValues: hit._source.variantValues,
                batchNames: hit._source.batchNames
            }));

            res.json({ suggestions });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }

};
