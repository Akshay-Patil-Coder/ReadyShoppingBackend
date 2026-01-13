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
    addVariantProductCSV: async (req, res) => {
        let csvFilePath = req.files?.CSVFile?.[0]?.path;
        if (req.user.companyId) companyId = req.user.companyId

        if (!csvFilePath) {
            return res.status(400).json({ success: false, message: 'CSV file is required.' });
        }
        let uploadedImages = req.files?.ProductImages?.map(f => f.filename) || [];
        let uploadedVideos = req.files?.ProductVideos?.map(f => f.filename) || [];
        let usedImages = [];
        let usedVideos = [];

        let lastProductRow = {};
        let groupedProducts = {};

        try {
            await new Promise((resolve, reject) => {
                fs.createReadStream(csvFilePath)
                    .pipe(csvParser())
                    .on('data', async (row) => {
                        row.ProductName = row.ProductName || lastProductRow.ProductName;
                        row.ProductServices = row.ProductServices || lastProductRow.ProductServices;
                        row.CommonDescription = row.CommonDescription || lastProductRow.CommonDescription;
                        row.CommonImages = row.CommonImages || lastProductRow.CommonImages;
                        row.CommonVideos = row.CommonVideos || lastProductRow.CommonVideos;
                        row.VariantProductImage = row.VariantProductImage || lastProductRow.VariantProductImage;
                        lastProductRow = { ...row };

                        if (!row.ProductName) return;

                        if (!groupedProducts[row.ProductName]) {
                            groupedProducts[row.ProductName] = {
                                ProductName: row.ProductName,
                                ProductServices: row.ProductServices ? JSON.parse(row.ProductServices) : [],
                                CommonDescription: row.CommonDescription ? JSON.parse(row.CommonDescription) : {},
                                CommonImages: row.CommonImages ? JSON.parse(row.CommonImages) : [],
                                CommonVideos: row.CommonVideos ? JSON.parse(row.CommonVideos) : [],
                                VariantProductDatas: []
                            };
                        }

                        let variantFieldsArray = [];
                        if (row.VariantFields) {
                            let vfObj = JSON.parse(row.VariantFields);
                            for (let [VariantId, VariantValue] of Object.entries(vfObj)) {
                                if (!VariantId || !VariantValue) continue;
                                let FoundVariant = await Variant.findById(VariantId);
                                if (FoundVariant) variantFieldsArray.push({ VariantId, VariantValue });
                            }
                        }

                        let specArray = [];
                        if (row.Specification) {
                            let specObj = JSON.parse(row.Specification);
                            specArray = Object.entries(specObj).map(([key, value]) => ({
                                SpecificationKey: key,
                                SpecificationValue: value
                            }));
                        }

                        let filterFilesEndsWith = (csvFiles, uploaded) =>
                            (csvFiles || []).filter(csvFile => uploaded.some(u => u.endsWith(csvFile)));

                        let commonImagesFiltered = filterFilesEndsWith(JSON.parse(row.CommonImages || '[]'), uploadedImages);
                        let commonVideosFiltered = filterFilesEndsWith(JSON.parse(row.CommonVideos || '[]'), uploadedVideos);
                        let variantImagesFiltered = filterFilesEndsWith(JSON.parse(row.VariantProductImage || '[]'), uploadedImages);

                        usedImages.push(...commonImagesFiltered, ...variantImagesFiltered);
                        usedVideos.push(...commonVideosFiltered);

                        groupedProducts[row.ProductName].VariantProductDatas.push({
                            VariantProductName: row.VariantProductName,
                            Price: Number(row.Price || 0),
                            OfferPercentage: Number(row.OfferPercentage || 0),
                            BatchIds: row.BatchIds ? JSON.parse(row.BatchIds) : [],
                            InventoryBaseStock: {
                                InventoryBase: row.InventoryBase === 'true',
                                Stock: Number(row.Stock || 0),
                                AvailableStock: Number(row.AvailableStock || 0)
                            },
                            Specification: specArray,
                            VariantFields: variantFieldsArray,
                            AboutProduct: row.AboutProduct ? JSON.parse(row.AboutProduct) : {},
                            VariantProductImage: variantImagesFiltered,
                            CommonImages: commonImagesFiltered,
                            CommonVideos: commonVideosFiltered
                        });
                    })
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });

            let savedProducts = [];

            for (let productName in groupedProducts) {
                let p = groupedProducts[productName];
                let ProductData = { ProductName: p.ProductName };

                if (Array.isArray(p.ProductServices) && p.ProductServices.length > 0) {
                    let ProductServicesData = [];
                    for (let EachService of p.ProductServices) {
                        let FoundService = await ProductService.findById(EachService?.ProductServiceId);
                        if (FoundService) ProductServicesData.push(EachService);
                    }
                    if (ProductServicesData.length > 0) ProductData.ProductServices = ProductServicesData;
                }

                if (Array.isArray(p.CommonImages) && p.CommonImages.length > 0) ProductData.CommonImages = p.CommonImages;
                if (Array.isArray(p.CommonVideos) && p.CommonVideos.length > 0) ProductData.CommonVideos = p.CommonVideos;
                if (p.CommonDescription && (p.CommonDescription.Head || (Array.isArray(p.CommonDescription.Points) && p.CommonDescription.Points.length) || p.CommonDescription.TextDescription)) {
                    ProductData.CommonDescription = p.CommonDescription;
                }

                let AddProduct = await new Product(ProductData).save();
                if (!AddProduct) continue;

                let VariantIds = [];

                for (let EachVariantProduct of p.VariantProductDatas) {
                    if (!EachVariantProduct?.Price) continue;
                    if (p.CommonImages.length == 0 && EachVariantProduct.VariantProductImage.lengh == 0) continue;
                    let VariantData = { ProductId: AddProduct._id };
                    VariantData.VariantProductImage = EachVariantProduct.VariantProductImage ? EachVariantProduct.VariantProductImage : [p.CommonImages[0]];
                    VariantData.BatchIds = EachVariantProduct.BatchIds || [];
                    VariantData.VariantProductName = EachVariantProduct.VariantProductName || ProductData.ProductName;
                    VariantData.Price = EachVariantProduct.Price;
                    if (EachVariantProduct.OfferPercentage) VariantData.OfferPercentage = EachVariantProduct.OfferPercentage;
                    VariantData.InventoryBaseStock = EachVariantProduct.InventoryBaseStock || { InventoryBase: false, Stock: 0, AvailableStock: 0 };
                    VariantData.Specification = EachVariantProduct.Specification || [];
                    VariantData.VariantFields = EachVariantProduct.VariantFields || [];
                    VariantData.AboutProduct = EachVariantProduct.AboutProduct || {};

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

                if (VariantIds.length > 0) {
                    await Product.findByIdAndUpdate(AddProduct._id, { $set: { VariantProductIds: VariantIds } }, { new: true });
                    savedProducts.push(AddProduct);
                } else {
                    if (AddProduct?._id) await Product.findByIdAndDelete(AddProduct._id);
                }
            }

            let cleanupFiles = (folder, uploaded, used) => {
                let folderPath = path.join(__dirname, '..', '..', 'public', folder);
                if (!fs.existsSync(folderPath)) return;
                fs.readdirSync(folderPath).forEach(file => {
                    if (uploaded.includes(file) && !used.some(u => u.endsWith(file))) {
                        fs.unlinkSync(path.join(folderPath, file));
                    }
                });
            };

            cleanupFiles('ProductImage', uploadedImages, usedImages);
            cleanupFiles('ProductImage', uploadedImages, usedImages);
            cleanupFiles('ProductVideo', uploadedVideos, usedVideos);

            fs.unlinkSync(req.file.path);

            return res.status(201).json({ success: true, message: 'Products and variants uploaded successfully.', data: savedProducts });

        } catch (error) {
            console.error('❌ CSV Upload Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
        }
    },
    getVariantProductCsv: async (req, res) => {
        try {
            let csvFilePath = path.join(__dirname, "..", "..", "public", "ProductCsv", 'products_template.csv');

            if (fs.existsSync(csvFilePath)) {
                fs.unlinkSync(csvFilePath);
                console.log('🗑️ Old CSV deleted');
            }
            let csvWriter = createCsvWriter({
                path: csvFilePath,
                header: [
                    { id: 'ProductName', title: 'ProductName' },
                    { id: 'ProductServices', title: 'ProductServices' },
                    { id: 'CommonDescription', title: 'CommonDescription' },
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
                    { id: 'AboutProduct', title: 'AboutProduct' },
                    { id: 'VariantProductImage', title: 'VariantProductImage' },
                ]
            });

            await csvWriter.writeRecords([]);
            console.log('✅New CSV template generated');

            res.download(csvFilePath, 'products_template.csv', (err) => {
                if (err) console.error('❌ Error sending CSV:', err);
            });

        } catch (error) {
            console.error('❌ CSV Generation Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
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
        let { BatchId, BatchName } = req.body;

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
            if (BatchName) updateData.BatchName = BatchName;
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
