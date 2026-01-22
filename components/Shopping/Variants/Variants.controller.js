const { ObjectId } = require('mongodb');
const { Variant } = require('./Variants.model');
const { brandmodel } = require('../ProductsBrand/ProductsBrand.model')
const { VariantProduct, Product, Batch } = require('../VariantsProducts/VariantsProducts.model')
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

module.exports = {
    addVariant: async (req, res) => {
        const cleanFile = async () => {
            try {
                if (req?.file) {
                    let filepath = path.join(__dirname, "..", "..", "VariantImage", req.file);
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath)
                    }
                }
            } catch (error) {
                console.warn('error at deleting variant image:', error.message)
            }
        }
        try {
            let { companyId, HeadCategoryId, SubCategoryId, VariantName, VariantType, VariantValues, Extension } = req.body;
            if (req.user.companyId) companyId = req.user.companyId

            if (!companyId || !HeadCategoryId || !SubCategoryId || !VariantName || !VariantType) {
                await cleanFile();
                return res.status(400).json({
                    success: false,
                    message: 'Please fill in all required fields'
                });
            }

            let allowedTypes = ["String", "Number", "Date"];
            if (!allowedTypes.includes(VariantType)) {
                await cleanFile();
                return res.status(400).json({
                    success: false,
                    message: `Variant Type must be one of: ${allowedTypes.join(", ")}`
                });
            }

            let VariantData = {
                companyId,
                HeadCategoryId,
                SubCategoryId,
                VariantName,
                VariantType,

            };
            if (Array.isArray(VariantValues) && VariantValues.length > 0) {
                VariantValues = VariantValues.filter(v =>
                    v && v.Value !== '' && v.Value !== 'undefined' && v.Value !== null
                );
                if (VariantValues.length > 0) {
                    VariantData.VariantValues = VariantValues;
                }
                for (let v of VariantValues) {
                    let val = v.Value;

                    if (VariantType === "Number" && isNaN(Number(val))) {
                        await cleanFile();
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a Number`
                        });
                    }
                    if (VariantType === "Number") {
                        val = Number(val)
                    }
                    if (VariantType === "Date" && isNaN(new Date(val).getTime())) {
                        await cleanFile();
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a valid Date`
                        });
                    }

                    if (VariantType === "String" && typeof val !== "string") {
                        await cleanFile();
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a String`
                        });
                    }
                }
            }

            if (Extension && Extension !== 'undefined') {
                VariantData.Extension = Extension;
            }
            if (req?.file) {
                VariantData.VariantImage = req.file
            }

            let newVariant = new Variant(VariantData);
            let result = await newVariant.save();

            return res.status(201).json({
                success: true,
                message: 'Variant added successfully',
                data: result
            });

        } catch (error) {
            await cleanFile();
            console.error("VariantAddError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },


    getVariantData: async (matchCondition) => {
        return await Variant.aggregate([
            { $match: matchCondition },
            {
                $lookup: {
                    from: 'categgggories',
                    localField: 'HeadCategoryId',
                    foreignField: '_id',
                    as: 'HeadCategory',
                },
            },
            {
                $lookup: {
                    from: 'categgggories',
                    localField: 'SubCategoryId',
                    foreignField: '_id',
                    as: 'SubCategories',
                },
            },
        ]);
    },

    getVariantsById: async (req, res) => {
        try {
            let { HeadCategoryId, SubCategoryId, companyId, VariantId, VariantName, VariantType, Extension, VariantValue } = req.query;

            if (!companyId) {
                return res.status(400).json({ message: 'companyId is required', success: false });
            }

            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (HeadCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCategoryId)) {
                    return res.status(400).json({ message: 'Invalid HeadCategoryId format', success: false });
                }
                matchCondition.HeadCategoryId = mongoose.Types.ObjectId.createFromHexString(HeadCategoryId);
            }

            if (SubCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
                    return res.status(400).json({ message: 'Invalid SubCategoryId format', success: false });
                }
                matchCondition.SubCategoryId = mongoose.Types.ObjectId.createFromHexString(SubCategoryId);
            }

            if (VariantId) {
                if (!mongoose.Types.ObjectId.isValid(VariantId)) {
                    return res.status(400).json({ message: 'Invalid VariantId format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId.createFromHexString(VariantId);
            }

            if (VariantName) matchCondition.VariantName = { $regex: VariantName, $options: 'i' };
            if (VariantType) matchCondition.VariantType = VariantType;
            if (Extension) matchCondition.Extension = { $regex: Extension, $options: 'i' };
            if (VariantValue) matchCondition['VariantValues.Value'] = VariantValue

            let data = await module.exports.getVariantData(matchCondition);

            if (!data || data.length === 0) {
                return res.status(404).json({ message: 'No Variants found for this criteria', success: false });
            }

            return res.status(200).json({ data, success: true, message: 'Variants fetched successfully' });

        } catch (error) {
            console.error("getVariantsById error:", error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message, success: false });
        }
    },
    updateVariantDetails: async (req, res) => {
        const cleanFile = async () => {
            try {
                if (req?.file) {
                    let filepath = path.join(__dirname, "..", "..", "VariantImage", req.file);
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath)
                    }
                }
            } catch (error) {
                console.warn('error at deleting variant image:', error.message)
            }
        }
        try {
            let { VariantId, VariantName, VariantValues, Extension, VariantType } = req.body;
            let companyId = req.query.companyId;
            if (req.user.companyId) companyId = req.user.companyId

            if (!VariantId || !companyId) {
                await cleanFile();
                return res.status(400).json({ message: 'Please insert valid data', success: false });
            }

            let FoundVariant = await Variant.findOne({ _id: VariantId, companyId });
            if (!FoundVariant) {
                await cleanFile();
                return res.status(404).json({ message: 'Variant not found', success: false });
            }
            if (typeof VariantType == "string" && VariantType.trim() !== "") {
                const allowedTypes = ["String", "Number", "Date"];

                const normalizedVariantType =
                    VariantType.trim().charAt(0).toUpperCase() +
                    VariantType.trim().slice(1).toLowerCase();

                if (!allowedTypes.includes(normalizedVariantType)) {
                    await cleanFile();
                    return res.status(400).json({
                        success: false,
                        message: `Variant Type must be one of: ${allowedTypes.join(", ")}`
                    });
                }

                FoundVariant.VariantType = normalizedVariantType;
            }


            if (Array.isArray(VariantValues) && VariantValues.length > 0) {
                let existing = FoundVariant.VariantValues || [];
                for (let v of VariantValues) {
                    let val = v.Value;

                    if (FoundVariant.VariantType === "Number" && isNaN(Number(val))) {
                        await cleanFile();
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a Number`
                        });
                    }
                    if (FoundVariant.VariantType === "Number") {
                        val = Number(val)
                    }
                    if (FoundVariant.VariantType === "Date" && isNaN(new Date(val).getTime())) {
                        await cleanFile();
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a valid Date`
                        });
                    }

                    if (FoundVariant.VariantType === "String" && typeof val !== "string") {
                        await cleanFile();
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a String`
                        });
                    }
                }
                let updatedVariantValues = VariantValues.map(newVar => {
                    let oldVar = existing.find(v => v.Value === newVar.Value);
                    return oldVar
                        ? { ...oldVar, ...newVar }
                        : { ...newVar, Count: newVar.Count ?? 0 };
                });

                let remainingOld = existing.filter(oldVar =>
                    !VariantValues.some(newVar => newVar.Value === oldVar.Value)
                );

                FoundVariant.VariantValues = [...updatedVariantValues, ...remainingOld];
            }

            if (Extension && Extension !== 'undefined' && Extension !== null && Extension !== '') {
                FoundVariant.Extension = Extension;
            }

            if (VariantName && VariantName !== 'undefined' && VariantName !== null && VariantName !== '') {
                FoundVariant.VariantName = VariantName;
            }
            if (req?.file) {
                try {
                    if (FoundVariant?.VariantImage) {
                        let existingImage = path.join(__dirname, "..", "..", "VariantImage", FoundVariant.VariantImage);
                        if (fs.existsSync(existingImage)) {
                            fs.unlinkSync(existingImage)
                        }
                    }
                    FoundVariant.VariantImage = req.file
                } catch (error) {
                    console.warn('error at update variant image:', error.message)
                }
            }

            await FoundVariant.save();

            return res.status(200).json({
                success: true,
                message: "Variant details updated successfully",
                data: FoundVariant
            });

        } catch (error) {
            await cleanFile();
            console.error(error);
            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }
    },

    getAvailableFilters: async (req, res) => {
        try {
            let { SubCategoryId, companyId } = req.query;

            if (!companyId)
                return res.status(400).json({ message: "company not found", success: false });

            if (!SubCategoryId)
                return res.status(400).json({ message: "SubCategory not found", success: false });

            if (!mongoose.Types.ObjectId.isValid(companyId))
                return res.status(400).json({ message: "Invalid companyId format", success: false });

            let companyObj = new mongoose.Types.ObjectId(String(companyId));

            let SubCatArray = [];

            if (Array.isArray(SubCategoryId)) {
                SubCatArray = SubCategoryId;
            } else if (typeof SubCategoryId === "string" && SubCategoryId.includes(",")) {
                SubCatArray = SubCategoryId.split(",");
            } else {
                SubCatArray = [SubCategoryId];
            }

            for (let id of SubCatArray) {
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return res.status(400).json({ message: "Invalid SubCategoryId format", success: false });
                }
            }

            let SubCategoryIds = SubCatArray.map(id => new mongoose.Types.ObjectId(String(id)));

            let matchCondition = {
                companyId: companyObj,
                SubCategoryId: { $in: SubCategoryIds }
            };

            let Filter = {};

            let VariantData = await module.exports.getVariantData(matchCondition);

            if (VariantData?.length) {
                VariantData = VariantData
                    .map(v => ({
                        ...v,
                        VariantValues: (v.VariantValues || []).filter(
                            x => x.Value && x.Count > 0
                        )
                    }))
                    .filter(v => v.VariantValues.length > 0);

                if (VariantData.length)
                    Filter.VariantFilter = VariantData;

                if (Filter.VariantFilter) {
                    Filter.VariantFilter = Filter.VariantFilter.map(EachVariant => {
                        return {
                            _id: EachVariant._id,
                            VariantName: EachVariant.VariantName,
                            VariantValues: EachVariant.VariantValues,
                            Extension: EachVariant.Extension
                        }
                    })
                }
            }

            try {
                let BrandData = await brandmodel
                    .find({
                        companyId: companyObj,
                        SubCategoryId: { $in: SubCategoryIds },
                        isActive: true
                    })
                    .select("_id BrandName BrandImage");

                if (BrandData?.length) {
                    let ValidBrands = await Promise.all(
                        BrandData.map(async brand => {
                            let exists = await Product.exists({
                                BrandId: brand._id,
                                companyId: companyObj,
                                SubCategoryId: { $in: SubCategoryIds }
                            });
                            return exists ? brand : null;
                        })
                    );

                    let Filtered = ValidBrands.filter(b => b);
                    if (Filtered.length)
                        Filter.BrandFilter = Filtered;
                }
            } catch (err) {
                console.error("Brand filter error:", err);
            }

            try {
                let BadgesData = await Batch.find({ isActive: true })
                    .select("_id BatchName BatchLogo");

                if (BadgesData?.length) {
                    let ValidBadges = await Promise.all(
                        BadgesData.map(async badge => {
                            let exists = await VariantProduct.exists({
                                BatchIds: badge._id,
                                companyId: companyObj,
                                SubCategoryId: { $in: SubCategoryIds }
                            });
                            return exists ? badge : null;
                        })
                    );

                    let Filtered = ValidBadges.filter(b => b);
                    if (Filtered.length)
                        Filter.BadgeFilter = Filtered;
                }
            } catch (err) {
                console.error("Badge filter error:", err);
            }

            try {
                let PriceRange = await VariantProduct.aggregate([
                    {
                        $match: {
                            companyId: companyObj,
                            SubCategoryId: { $in: SubCategoryIds }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            minPrice: { $min: "$Price" },
                            maxPrice: { $max: "$Price" }
                        }
                    }
                ]);

                if (PriceRange?.length) {
                    Filter.PriceFilter = {
                        minPrice: PriceRange[0].minPrice || 0,
                        maxPrice: PriceRange[0].maxPrice || 0
                    };

                    Filter.PriceSort = {
                        lowToHigh: "lowToHigh",
                        highToLow: "highToLow"
                    };
                }
            } catch (err) {
                console.error("Price range error:", err);
            }

            try {
                let hasProducts = await VariantProduct.exists({
                    companyId: companyObj,
                    SubCategoryId: { $in: SubCategoryIds }
                });

                if (hasProducts) {
                    Filter.SortByArrivalsFilter = {
                        Newer: "Newer",
                        Older: "Older"
                    };
                }
            } catch (err) {
                console.error("Sort by arrivals error:", err);
            }

            if (!Object.keys(Filter).length) {
                return res.status(404).json({
                    message: "No filters found",
                    success: false
                });
            }

            return res.status(200).json({
                data: Filter,
                success: true,
                message: "Filters fetched successfully"
            });

        } catch (error) {
            console.error("getAvailableFilters error:", error);
            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }
    },

};
