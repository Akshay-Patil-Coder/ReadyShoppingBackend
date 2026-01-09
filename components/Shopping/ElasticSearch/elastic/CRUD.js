const mongoose = require('mongoose');
const client = require('./client');
const {
    indexBrand,
    indexCategory,
    indexProduct,
    indexVariant
} = require('./indexer');

const { Product } = require('../../VariantsProducts/VariantsProducts.model');

mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function getProductData(matchCondition) {
    try {
        return Product.aggregate([
            { $match: matchCondition },

            {
                $lookup: {
                    from: 'categgggories',
                    let: { headId: '$HeadCategoryId' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$headId'] } } },
                        { $project: { categoryName: 1, imageName: 1, isActive: 1 } }
                    ],
                    as: 'HeadCategory'
                }
            },

            {
                $lookup: {
                    from: 'categgggories',
                    let: { subId: '$SubCategoryId' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$subId'] } } },
                        { $project: { categoryName: 1, imageName: 1, isActive: 1 } }
                    ],
                    as: 'SubCategories'
                }
            },

            {
                $lookup: {
                    from: 'brands',
                    let: { brandId: '$BrandId' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$brandId'] } } },
                        { $project: { BrandName: 1, BrandImage: 1, isActive: 1 } }
                    ],
                    as: 'Brands'
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
                            input: '$VariantProducts',
                            as: 'vp',
                            in: {
                                $mergeObjects: [
                                    '$$vp',
                                    {
                                        VariantFields: {
                                            $map: {
                                                input: '$$vp.VariantFields',
                                                as: 'vf',
                                                in: {
                                                    VariantName: {
                                                        $arrayElemAt: [
                                                            {
                                                                $map: {
                                                                    input: {
                                                                        $filter: {
                                                                            input: '$VariantNames',
                                                                            cond: { $eq: ['$$this._id', '$$vf.VariantId'] }
                                                                        }
                                                                    },
                                                                    as: 'vn',
                                                                    in: '$$vn.VariantName'
                                                                }
                                                            },
                                                            0
                                                        ]
                                                    },
                                                    VariantValue: '$$vf.VariantValue',
                                                    Extension: {
                                                        $arrayElemAt: [
                                                            {
                                                                $map: {
                                                                    input: {
                                                                        $filter: {
                                                                            input: '$VariantNames',
                                                                            cond: { $eq: ['$$this._id', '$$vf.VariantId'] }
                                                                        }
                                                                    },
                                                                    as: 'vn',
                                                                    in: '$$vn.Extension'
                                                                }
                                                            },
                                                            0
                                                        ]
                                                    }
                                                }
                                            }
                                        },
                                        BatchesInfo: {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: '$Batches',
                                                        cond: { $in: ['$$this._id', { $ifNull: ['$$vp.BatchIds', []] }] }
                                                    }
                                                },
                                                as: 'b',
                                                in: { _id: '$$b._id', BatchName: '$$b.BatchName', BatchLogo: '$$b.BatchLogo' }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            { $project: { VariantNames: 0, Batches: 0 } }
        ]);
    } catch (error) {
        console.log('error to fetch data for ES', error.message)
    }
}

async function updateElasticById({ type, id }) {
    try {
        let matchCondition = {};

        switch (type) {
            case 'category':
                matchCondition = { $or: [{ HeadCategoryId: mongoose.Types.ObjectId(id) }, { SubCategoryId: mongoose.Types.ObjectId(id) }] };
                break;
            case 'brand':
                matchCondition = { BrandId: mongoose.Types.ObjectId(id) };
                break;
            case 'product':
                matchCondition = { _id: mongoose.Types.ObjectId(id) };
                break;
            case 'variantProduct':
                matchCondition = { VariantProductIds: mongoose.Types.ObjectId(id) };
                break;
            case 'company':
                matchCondition = { companyId: mongoose.Types.ObjectId(id) };
                break;
            default:
                throw new Error('Invalid type provided');
        }

        const products = await getProductData(matchCondition);

        for (let product of products) {
            const companyId = product.companyId;
            const HeadCategoryData = product.HeadCategory?.[0];
            const SubCategoryData = product.SubCategories?.[0];
            const BrandData = product.Brands?.[0];
            const VariantProductData = product.VariantProducts || [];

            if (BrandData?.isActive) {
                await indexBrand({ ...BrandData, companyId });
            }

            if (HeadCategoryData?.isActive) {
                await indexCategory({ ...HeadCategoryData, companyId, level: 1 });
            }
            if (SubCategoryData?.isActive) {
                await indexCategory({ ...SubCategoryData, companyId, level: 2, ParentId: product.HeadCategoryId });
            }

            const enrichedProduct = {
                ...product,
                BrandName: BrandData?.BrandName,
                categoryName: SubCategoryData?.categoryName || HeadCategoryData?.categoryName,
                headCategoryName: HeadCategoryData?.categoryName
            };
            if (product.isActive) {
                await indexProduct(enrichedProduct);
            }

            for (let variant of VariantProductData) {
                if (variant.isActive) {
                    await indexVariant(variant, enrichedProduct);
                }
            }
        }

        console.log(`✅ Elasticsearch updated for ${type}: ${id}`);
    } catch (error) {
        console.log('error to update ES', error.message)
    }
}

async function deleteElasticById({ type, id }) {
    try {
        switch (type) {
            case 'brand':
                id = `brand_${id}`
                break;
            case 'category':
                id = `cat_${id}`
                break;
            case 'product':
                id = `product_${id}`
                break;
            case 'variant':
                id = `variant_${id}`
                break;
            default:
                throw new Error('Invalid delete type');
        }

        await client.delete({
            index: 'search_suggestions',
            id
        });

        console.log(`🗑️ Elasticsearch deleted ${type}: ${id}`);
    } catch (err) {
        if (err.meta?.statusCode === 404) {
            console.warn(`⚠️ ${type} not found in Elasticsearch: ${id}`);
        }
        console.error(`❌ deleteElasticById failed [${type}]`, err);
    }
}
async function deleteElasticByCompanyId({ companyId }) {
    try {
        if (!companyId) return;

        const response = await client.deleteByQuery({
            index: 'search_suggestions',
            body: {
                query: {
                    term: {
                        companyId: companyId
                    }
                }
            }
        });

        console.log(
            `🗑️ Elasticsearch deleted ${response.deleted} documents for companyId: ${companyId}`
        );

    } catch (err) {
        if (err.meta?.statusCode === 404) {
            console.warn(`⚠️ No documents found for companyId: ${companyId}`);
            return;
        }

        console.error(
            `❌ deleteElasticByCompanyId failed for companyId: ${companyId}`,
            err
        );
        throw err;
    }
}
async function syncElasticByStatus({ type, id, isActive }) {
    try {
        if (isActive) {
            await updateElasticById({ type, id });
        } else {
            await deleteElasticById({ type, id });
        }
    } catch (err) {
        console.error(`❌ ES sync failed [${type}] ${id}`, err.message);
    }
}


module.exports = { updateElasticById, deleteElasticById, deleteElasticByCompanyId,syncElasticByStatus};
