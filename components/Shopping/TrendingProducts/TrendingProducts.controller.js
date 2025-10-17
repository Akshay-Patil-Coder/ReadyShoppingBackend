const trendingmodel = require('./TrendingProducts.model')
const { error } = require('console');
const mongoose = require('mongoose');

module.exports = {
    addtrendingproducts: async (req, res) => {
        try {
            const { HeadCategoryId, VariantsProductsIds, companyId, SubCategoryId } = req.body;
            console.log(req.body, 'new testing');

            if (!HeadCategoryId || !SubCategoryId || !companyId || !Array.isArray(VariantsProductsIds) || VariantsProductsIds.length === 0) {
                return res.status(400).json({ message: 'Please insert valid data', success: false });
            }

            let existingRecord = await trendingmodel.trendingsproducts.findOne({ SubCategoryId, companyId });

            if (!existingRecord) {
                const newTrending = new trendingmodel.trendingsproducts({
                    HeadCategoryId,
                    SubCategoryId,
                    companyId,
                    VariantsProductsIds
                });

                const saved = await newTrending.save();
                return res.status(201).json({ data: saved, success: true, message: 'Trending product created successfully' });
            }

            const updated = await trendingmodel.trendingsproducts.findOneAndUpdate(
                { SubCategoryId, companyId },
                { $addToSet: { VariantsProductsIds: { $each: VariantsProductsIds } } },
                { new: true }
            );

            return res.status(200).json({ data: updated, success: true, message: 'Trending product(s) added successfully' });

        } catch (error) {
            console.error('Error in addtrendingproducts:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
        }
    },


    gettrendingproducts: async (req, res) => {
        try {
            const { companyId, HeadCategoryId, SubCategoryId } = req.query;

            if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({ message: 'Invalid or missing companyId', success: false });
            }

            const matchCondition = {
                companyId: new mongoose.Types.ObjectId(String(companyId))
            };

            if (HeadCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCategoryId)) {
                    return res.status(400).json({ message: 'Invalid HeadCategoryId format', success: false });
                }
                matchCondition.HeadCategoryId = new mongoose.Types.ObjectId(String(HeadCategoryId));
            }

            if (SubCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
                    return res.status(400).json({ message: 'Invalid SubCategoryId format', success: false });
                }
                matchCondition.SubCategoryId = new mongoose.Types.ObjectId(String(SubCategoryId));
            }

            const data = await trendingmodel.trendingsproducts.aggregate([
                { $match: matchCondition },

                {
                    $lookup: {
                        from: "categgggories",
                        localField: "HeadCategoryId",
                        foreignField: "_id",
                        as: "HeadCategoryInfo"
                    }
                },

                {
                    $lookup: {
                        from: "categgggories",
                        localField: "SubCategoryId",
                        foreignField: "_id",
                        as: "SubCategoriesInfo"
                    }
                },

                {
                    $lookup: {
                        from: "variantproducts",
                        localField: "VariantsProductsIds",
                        foreignField: "_id",
                        as: "ProductsInfo"
                    }
                },

                {
                    $lookup: {
                        from: "products",
                        localField: "ProductsInfo.ProductId",
                        foreignField: "_id",
                        as: "ProductList"
                    }
                },

                {
                    $addFields: {
                        ProductsInfo: {
                            $map: {
                                input: "$ProductsInfo",
                                as: "pi",
                                in: {
                                    $mergeObjects: [
                                        "$$pi",
                                        {
                                            ProductData: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$ProductList",
                                                            as: "pd",
                                                            cond: { $eq: ["$$pd._id", "$$pi.ProductId"] }
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
                        from: "variants",
                        localField: "ProductsInfo.VariantFields.VariantId",
                        foreignField: "_id",
                        as: "VariantDetails"
                    }
                },

                {
                    $addFields: {
                        "ProductsInfo": {
                            $map: {
                                input: "$ProductsInfo",
                                as: "pi",
                                in: {
                                    $mergeObjects: [
                                        "$$pi",
                                        {
                                            VariantFields: {
                                                $map: {
                                                    input: "$$pi.VariantFields",
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
                        from: "productservices",
                        localField: "ProductsInfo.ProductData.ProductServices.ProductServiceId",
                        foreignField: "_id",
                        as: "AllProductServices"
                    }
                },

                {
                    $addFields: {
                        ProductsInfo: {
                            $map: {
                                input: "$ProductsInfo",
                                as: "pi",
                                in: {
                                    $mergeObjects: [
                                        "$$pi",
                                        {
                                            ProductData: {
                                                $mergeObjects: [
                                                    "$$pi.ProductData",
                                                    {
                                                        ProductServices: {
                                                            $map: {
                                                                input: "$$pi.ProductData.ProductServices",
                                                                as: "ps",
                                                                in: {
                                                                    $mergeObjects: [
                                                                        "$$ps",
                                                                        {
                                                                            ProductServiceData: {
                                                                                $arrayElemAt: [
                                                                                    {
                                                                                        $filter: {
                                                                                            input: "$AllProductServices",
                                                                                            as: "asd",
                                                                                            cond: { $eq: ["$$asd._id", "$$ps.ProductServiceId"] }
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
                                    ]
                                }
                            }
                        }
                    }
                },

                {
                    $project: {
                        HeadCategoryInfo: { CategoryName: 1, _id: 1 },
                        SubCategoriesInfo: { CategoryName: 1, _id: 1 },
                        ProductsInfo: {
                            _id: 1,
                            ProductId: 1,
                            VariantFields: 1,
                            ProductData: {
                                ProductName: 1,
                                CommonImages: 1,
                                CommonDescription: 1,
                                Price: 1,
                                ProductServices: 1
                            }
                        },
                        createdAt: 1,
                        updatedAt: 1
                    }
                },
                { $sort: { _id: -1 } }
            ]);

            if (!data || data.length === 0) {
                return res.status(404).json({ message: 'No trending products found', success: false });
            }

            return res.status(200).json({
                data,
                success: true,
                message: 'Trending products fetched successfully'
            });

        } catch (error) {
            console.error('Error in gettrendingproducts:', error);
            return res.status(500).json({
                message: 'Internal Server Error',
                error: error.message,
                success: false
            });
        }
    },


    deletetrendingproducts: async (req, res) => {
        try {
            const { SubCategoryId, VariantsProductsIds } = req.body;
            const { companyId } = req.query;

            console.log(req.body, 'new testing');

            if (!SubCategoryId || !companyId || !Array.isArray(VariantsProductsIds) || VariantsProductsIds.length === 0) {
                return res.status(400).json({ message: 'Please insert valid data', success: false });
            }

            const existingRecord = await trendingmodel.trendingsproducts.findOne({ SubCategoryId, companyId });
            if (!existingRecord) {
                return res.status(404).json({ message: 'No trending products found for this subcategory', success: false });
            }

            const updatedResult = await trendingmodel.trendingsproducts.findOneAndUpdate(
                { SubCategoryId, companyId },
                { $pull: { VariantsProductsIds: { $in: VariantsProductsIds } } },
                { new: true }
            );

            if (updatedResult?.VariantsProductsIds?.length === 0) {

                return res.status(200).json({
                    message: 'Trending products deleted successfully (list now empty)',
                    data: updatedResult,
                    success: true
                });
            }

            return res.status(200).json({
                message: 'Trending product(s) deleted successfully',
                data: updatedResult,
                success: true
            });

        } catch (error) {
            console.error('Error in deletetrendingproducts:', error);
            return res.status(500).json({
                message: 'Internal Server Error',
                error: error.message,
                success: false
            });
        }
    },

}