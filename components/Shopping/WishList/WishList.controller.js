const { ObjectId } = require('mongodb');
const { Wishlist } = require('./WishList.model');
const { User } = require('../../UserBase/User/User.model')
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

module.exports = {
    addWishlist: async (req, res) => {
        try {
            let { companyId, UserId, VariantProductIds, Operation } = req.body;

            if (VariantProductIds) VariantProductIds = Array.isArray(VariantProductIds) ? VariantProductIds : [VariantProductIds];

            if (!companyId || !UserId || !VariantProductIds || VariantProductIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please fill in all required fields'
                });
            }

            if (!Operation || !['add', 'delete'].includes(Operation)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Operation'
                });
            }

            const FoundUser = await User.findOne({ companyId, _id: UserId });
            if (!FoundUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User Not Found'
                });
            }

            let updatedWishlist;
            const FoundWishlist = await Wishlist.findOne({ UserId, companyId });

            if (Operation === 'add') {
                if (FoundWishlist) {
                    updatedWishlist = await Wishlist.findOneAndUpdate(
                        { UserId, companyId },
                        { $addToSet: { VariantProductIds: { $each: VariantProductIds } } },
                        { new: true }
                    );
                } else {
                    updatedWishlist = await new Wishlist({ UserId, companyId, VariantProductIds }).save();
                }
            } else if (Operation === 'delete') {
                if (FoundWishlist) {
                    updatedWishlist = await Wishlist.findOneAndUpdate(
                        { UserId, companyId },
                        { $pull: { VariantProductIds: { $in: VariantProductIds } } },
                        { new: true }
                    );
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Wishlist not found'
                    });
                }
            }

            return res.status(200).json({
                success: true,
                message: Operation === 'add' ? 'Variant added to wishlist successfully' : 'Variant removed from wishlist successfully',
                data: updatedWishlist
            });

        } catch (error) {
            console.error("WishlistOperationError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },



    getWishlistData: async (matchCondition) => {
            return await bannersSchema.aggregate([
                { $match: matchCondition },
        
                {
                    $lookup: {
                        from: "categories",
                        localField: "HeadCategoryId",
                        foreignField: "_id",
                        as: "HeadCategory"
                    }
                },
        
                {
                    $lookup: {
                        from: "categories",
                        localField: "SubCategoryId",
                        foreignField: "_id",
                        as: "SubCategory"
                    }
                },
        
                {
                    $lookup: {
                        from: "variantproducts",
                        localField: "VariantProductIds",
                        foreignField: "_id",
                        as: "VariantProducts"
                    }
                },
        
                {
                    $lookup: {
                        from: "products",
                        localField: "VariantProducts.ProductId",
                        foreignField: "_id",
                        as: "ProductData"
                    }
                },
        
                {
                    $lookup: {
                        from: "productservices",
                        localField: "ProductData.ProductServices.ProductServiceId",
                        foreignField: "_id",
                        as: "ProductServicesData"
                    }
                },
        
                {
                    $addFields: {
                        "ProductData": {
                            $map: {
                                input: "$ProductData",
                                as: "p",
                                in: {
                                    $mergeObjects: [
                                        "$$p",
                                        {
                                            ProductServices: {
                                                $map: {
                                                    input: "$$p.ProductServices",
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
                                    ]
                                }
                            }
                        }
                    }
                },
        
                {
                    $lookup: {
                        from: "variants",
                        localField: "VariantProducts.VariantFields.VariantId",
                        foreignField: "_id",
                        as: "VariantDetails"
                    }
                },
        
                {
                    $lookup: {
                        from: "batches",
                        localField: "VariantProducts.BatchIds",
                        foreignField: "_id",
                        as: "BatchesInfo"
                    }
                },
        
                {
                    $addFields: {
                        "VariantProducts": {
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
                                                                                        input: "$VariantDetails",
                                                                                        as: "v",
                                                                                        cond: { $eq: ["$$v._id", "$$vf.VariantId"] }
                                                                                    }
                                                                                },
                                                                                as: "v",
                                                                                in: "$$v.VariantName"
                                                                            }
                                                                        },
                                                                        0
                                                                    ]
                                                                },
                                                                VariantValue: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $map: {
                                                                                input: {
                                                                                    $filter: {
                                                                                        input: "$VariantDetails",
                                                                                        as: "v",
                                                                                        cond: { $eq: ["$$v._id", "$$vf.VariantId"] }
                                                                                    }
                                                                                },
                                                                                as: "v",
                                                                                in: "$$v.Value"
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
                                                $filter: {
                                                    input: "$BatchesInfo",
                                                    as: "b",
                                                    cond: { $in: ["$$b._id", "$$vp.BatchIds"] }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
        
                {
                    $addFields: {
                        ProductData: {
                            $map: {
                                input: "$ProductData",
                                as: "p",
                                in: {
                                    $mergeObjects: [
                                        "$$p",
                                        {
                                            VariantProducts: {
                                                $filter: {
                                                    input: "$VariantProducts",
                                                    as: "vp",
                                                    cond: { $eq: ["$$vp.ProductId", "$$p._id"] }
                                                }
                                            },
                                            Brands: "$BrandId" ? [{ _id: "$BrandId" }] : [],
                                            HeadCategory: "$HeadCategory",
                                            SubCategory: "$SubCategory"
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);

    },

    getWishlistById: async (req, res) => {
        try {
            const { UserId, companyId } = req.query;

            if (!companyId) {
                return res.status(400).json({ message: 'companyId is required', success: false });
            }

            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (UserId) {
                if (!mongoose.Types.ObjectId.isValid(UserId)) {
                    return res.status(400).json({ message: 'Invalid UserId format', success: false });
                }
                matchCondition.UserId = mongoose.Types.ObjectId.createFromHexString(UserId);
            }

            const data = await module.exports.getWishlistData(matchCondition);

            if (!data || data.length === 0) {
                return res.status(404).json({ message: 'No wishlist found for this criteria', success: false });
            }

            return res.status(200).json({ data, success: true, message: 'wishlist fetched successfully' });

        } catch (error) {
            console.error("getWishlistById error:", error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message, success: false });
        }
    },


};
