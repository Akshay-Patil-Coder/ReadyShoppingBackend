const { ObjectId } = require('mongodb');
const { Variant } = require('./Variants.model');
const { brandmodel } = require('../ProductsBrand/ProductsBrand.model')
const { VariantProduct, Product, Batch } = require('../VariantsProducts/VariantsProducts.model')
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

module.exports = {
    addVariant: async (req, res) => {
        try {
            let { companyId, HeadCategoryId, SubCategoryId, VariantName, VariantType, VariantValues, Extension } = req.body;
            if (req.user.companyId) companyId = req.user.companyId

            if (!companyId || !HeadCategoryId || !SubCategoryId || !VariantName || !VariantType) {
                return res.status(400).json({
                    success: false,
                    message: 'Please fill in all required fields'
                });
            }

            let allowedTypes = ["String", "Number", "Date"];
            if (!allowedTypes.includes(VariantType)) {
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
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a Number`
                        });
                    }
                    if (VariantType === "Number") {
                        val = Number(val)
                    }
                    if (VariantType === "Date" && isNaN(new Date(val).getTime())) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a valid Date`
                        });
                    }

                    if (VariantType === "String" && typeof val !== "string") {
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

            const newVariant = new Variant(VariantData);
            const result = await newVariant.save();

            return res.status(201).json({
                success: true,
                message: 'Variant added successfully',
                data: result
            });

        } catch (error) {
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
        try {
            let { VariantId, VariantName, VariantValues, Extension } = req.body;
            let companyId = req.query.companyId;
            if (req.user.companyId) companyId = req.user.companyId

            if (!VariantId || !companyId) {
                return res.status(400).json({ message: 'Please insert valid data', success: false });
            }

            let FoundVariant = await Variant.findOne({ _id: VariantId, companyId });
            if (!FoundVariant) {
                return res.status(404).json({ message: 'Variant not found', success: false });
            }

            if (Array.isArray(VariantValues) && VariantValues.length > 0) {
                const existing = FoundVariant.VariantValues || [];
                for (const v of VariantValues) {
                    let val = v.Value;

                    if (FoundVariant.VariantType === "Number" && isNaN(Number(val))) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a Number`
                        });
                    }
                    if (FoundVariant.VariantType === "Number") {
                        val = Number(val)
                    }
                    if (FoundVariant.VariantType === "Date" && isNaN(new Date(val).getTime())) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value '${val}' — must be a valid Date`
                        });
                    }

                    if (FoundVariant.VariantType === "String" && typeof val !== "string") {
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

            await FoundVariant.save();

            return res.status(200).json({
                success: true,
                message: "Variant details updated successfully",
                data: FoundVariant
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }
    },
    // getAvailableFilters: async (req, res) => {
    //     try {
    //         let { SubCategoryId, companyId } = req.query;
    //         if (!companyId) {
    //             return res.status(400).json({ message: 'company not found', success: false });
    //         }
    //         if (!SubCategoryId) {
    //             return res.status(400).json({ message: 'category not found', success: false });
    //         }

    //         let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

    //         if (SubCategoryId) {
    //             if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
    //                 return res.status(400).json({ message: 'Invalid SubCategoryId format', success: false });
    //             }
    //             matchCondition.SubCategoryId = mongoose.Types.ObjectId.createFromHexString(SubCategoryId);
    //         }

    //         let data = await module.exports.getVariantData(matchCondition);
    //         let Filter = {};

    //         if (data?.length) {
    //             data = data
    //                 .map((eachData) => {
    //                     eachData.VariantValues = (eachData.VariantValues || []).filter(
    //                         (eachValue) => eachValue.Value && eachValue.Count > 0
    //                     );
    //                     return eachData;
    //                 })
    //                 .filter((eachData) => eachData.VariantValues.length > 0);

    //             if (data.length) Filter.VariantFilter = data;
    //         }

    //         try {
    //             let BrandData = await brandmodel
    //                 .find({
    //                     companyId,
    //                     SubCategoryId,
    //                     isActive: true,
    //                 })
    //                 .select('_id BrandName BrandImage');

    //             if (BrandData?.length) {
    //                 const FilteredBrands = await Promise.all(
    //                     BrandData.map(async (EachBrand) => {
    //                         const EachVariantProduct = await VariantProduct.find({
    //                             BrandId: EachBrand._id,
    //                             companyId,
    //                             SubCategoryId,
    //                         });
    //                         return EachVariantProduct.length !== 0 ? EachBrand : null;
    //                     })
    //                 );

    //                 const ValidBrands = FilteredBrands.filter((b) => b !== null);

    //                 if (ValidBrands.length) Filter.BrandFilter = ValidBrands;
    //             }
    //         } catch (error) {
    //             console.error('Error fetching brand data:', error);
    //         }

    //         try {
    //             let BadgesData = await Batch.find({ isActive: true }).select('_id BatchName BatchLogo');

    //             if (BadgesData?.length) {
    //                 const FilteredBadges = await Promise.all(
    //                     BadgesData.map(async (EachBadge) => {
    //                         const EachVariantProduct = await VariantProduct.find({
    //                             BatchIds: EachBadge._id,
    //                             companyId,
    //                             SubCategoryId,
    //                         });
    //                         return EachVariantProduct.length !== 0 ? EachBadge : null;
    //                     })
    //                 );

    //                 const ValidBadges = FilteredBadges.filter((b) => b !== null);

    //                 if (ValidBadges.length) Filter.BadgeFilter = ValidBadges;
    //             }
    //         } catch (error) {
    //             console.error('Error fetching Badges data:', error);
    //         }

    //         try {
    //             const PriceRange = await VariantProduct.aggregate([
    //                 {
    //                     $match: {
    //                         companyId: new mongoose.Types.ObjectId(String(companyId)),
    //                         SubCategoryId: new mongoose.Types.ObjectId(String(SubCategoryId)),
    //                     },
    //                 },
    //                 {
    //                     $group: {
    //                         _id: null,
    //                         minPrice: { $min: '$Price' },
    //                         maxPrice: { $max: '$Price' },
    //                     },
    //                 },
    //             ]);

    //             if (PriceRange?.length) {
    //                 Filter.PriceFilter = {
    //                     minPrice: PriceRange[0].minPrice || 0,
    //                     maxPrice: PriceRange[0].maxPrice || 0,
    //                 };
    //                 Filter.PriceSort = {
    //                     lowToHigh: 'lowToHigh',
    //                     highToLow: 'highToLow'
    //                 }

    //             }


    //         } catch (error) {
    //             console.error('Error fetching price range:', error);
    //         }
    //         try {
    //             const FoundProducts = await VariantProduct.find({ companyId, SubCategoryId })
    //             if (FoundProducts && FoundProducts.length !== 0) {
    //                 Filter.SortByArrivalsFilter = {
    //                     Newer: 'Newer',
    //                     Older: 'Older'
    //                 }
    //             }
    //         } catch (error) {
    //             console.error('Error fetching sort by arrivals:', error);
    //         }
    //         if (!Object.keys(Filter).length) {
    //             return res.status(404).json({
    //                 message: 'No filters found for this criteria',
    //                 success: false,
    //             });
    //         }



    //         return res.status(200).json({
    //             data: Filter,
    //             success: true,
    //             message: 'Filters fetched successfully',
    //         });
    //     } catch (error) {
    //         console.error('getAvailableFilters error:', error);
    //         return res.status(500).json({
    //             message: 'Internal Server Error',
    //             error: error.message,
    //             success: false,
    //         });
    //     }
    // },
    getAvailableFilters: async (req, res) => {
        try {
            let { SubCategoryId, companyId } = req.query;

            // --------------------- VALIDATION ---------------------
            if (!companyId)
                return res.status(400).json({ message: "company not found", success: false });

            if (!SubCategoryId)
                return res.status(400).json({ message: "SubCategory not found", success: false });

            if (!mongoose.Types.ObjectId.isValid(companyId))
                return res.status(400).json({ message: "Invalid companyId format", success: false });

            // Convert companyId
            const companyObj = new mongoose.Types.ObjectId(companyId);

            // --------------------- HANDLE MULTIPLE SUBCATEGORY IDS ---------------------
            let SubCatArray = [];

            if (Array.isArray(SubCategoryId)) {
                SubCatArray = SubCategoryId;
            } else if (typeof SubCategoryId === "string" && SubCategoryId.includes(",")) {
                SubCatArray = SubCategoryId.split(",");
            } else {
                SubCatArray = [SubCategoryId];
            }

            // Validate all ids
            for (let id of SubCatArray) {
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return res.status(400).json({ message: "Invalid SubCategoryId format", success: false });
                }
            }

            let SubCategoryIds = SubCatArray.map(id => new mongoose.Types.ObjectId(String(id)));

            // MATCH CONDITION
            let matchCondition = {
                companyId: companyObj,
                SubCategoryId: { $in: SubCategoryIds }
            };

            let Filter = {};

            // --------------------- VARIANT FILTER ---------------------
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

                if(Filter.VariantFilter){
                    Filter.VariantFilter=Filter.VariantFilter.map(EachVariant=>{return {
                        _id:EachVariant._id,
                        VariantName:EachVariant.VariantName,
                        VariantValues:EachVariant.VariantValues,
                        Extension:EachVariant.Extension
                    }})
                }
            }

            try {
                const BrandData = await brandmodel
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

            // --------------------- BADGE FILTER ---------------------
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

            // --------------------- PRICE FILTER ---------------------
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

            // --------------------- SORT BY ARRIVALS ---------------------
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

            // --------------------- NO FILTERS FOUND ---------------------
            if (!Object.keys(Filter).length) {
                return res.status(404).json({
                    message: "No filters found",
                    success: false
                });
            }

            // --------------------- SUCCESS ---------------------
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
