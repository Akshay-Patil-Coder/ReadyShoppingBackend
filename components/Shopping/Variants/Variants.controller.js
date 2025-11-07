const { ObjectId } = require('mongodb');
const { Variant } = require('./Variants.model');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

module.exports = {
    addVariant: async (req, res) => {
        try {
            const { companyId, HeadCategoryId, SubCategoryId, VariantName, VariantType, VariantValues, Extension } = req.body;

            if (!companyId || !HeadCategoryId || !SubCategoryId || !VariantName || !VariantType) {
                return res.status(400).json({
                    success: false,
                    message: 'Please fill in all required fields'
                });
            }

            const allowedTypes = ["String", "Number", "Date"];
            if (!allowedTypes.includes(VariantType)) {
                return res.status(400).json({
                    success: false,
                    message: `Variant Type must be one of: ${allowedTypes.join(", ")}`
                });
            }

            const VariantData = {
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
            const { HeadCategoryId, SubCategoryId, companyId, VariantId, VariantName, VariantType, Extension, VariantValue } = req.query;

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

            const data = await module.exports.getVariantData(matchCondition);

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
            const { VariantId, VariantName, VariantValues, Extension } = req.body;
            const companyId = req.query.companyId;

            if (!VariantId || !companyId) {
                return res.status(400).json({ message: 'Please insert valid data', success: false });
            }

            const FoundVariant = await Variant.findOne({ _id: VariantId, companyId });
            if (!FoundVariant) {
                return res.status(404).json({ message: 'Variant not found', success: false });
            }

            if (Array.isArray(VariantValues) && VariantValues.length > 0) {
                const existing = FoundVariant.VariantValues || [];

                const updatedVariantValues = VariantValues.map(newVar => {
                    const oldVar = existing.find(v => v.Value === newVar.Value);
                    return oldVar
                        ? { ...oldVar, ...newVar }
                        : { ...newVar, Count: newVar.Count ?? 0 };
                });

                const remainingOld = existing.filter(oldVar =>
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
    }

};
