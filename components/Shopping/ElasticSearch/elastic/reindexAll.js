// const mongoose = require('mongoose');
// const client = require('./client');

// const {
//   indexBrand,
//   indexCategory,
//   indexProduct,
//   indexVariant,
//   indexWishlist
// } = require('./indexer');

// const { Product } = require('../../VariantsProducts/VariantsProducts.model');
// const { Wishlist } = require('../../WishList/WishList.model')


// mongoose.connect(process.env.MONGO_URL);

// async function getProductData(matchCondition) {
//   return Product.aggregate([
//     { $match: matchCondition },

//     {
//       $lookup: {
//         from: 'categgggories',
//         let: { headId: '$HeadCategoryId' },
//         pipeline: [
//           { $match: { $expr: { $eq: ['$_id', '$$headId'] } } },
//           { $project: { categoryName: 1, imageName: 1, isActive: 1 } }
//         ],
//         as: 'HeadCategory'
//       }
//     },
//     {
//       $lookup: {
//         from: 'categgggories',
//         let: { subId: '$SubCategoryId' },
//         pipeline: [
//           { $match: { $expr: { $eq: ['$_id', '$$subId'] } } },
//           { $project: { categoryName: 1, imageName: 1, isActive: 1 } }
//         ],
//         as: 'SubCategories'
//       }
//     },

//     {
//       $lookup: {
//         from: 'brands',
//         let: { brandId: '$BrandId' },
//         pipeline: [
//           { $match: { $expr: { $eq: ['$_id', '$$brandId'] } } },
//           { $project: { BrandName: 1, BrandImage: 1, isActive: 1 } }
//         ],
//         as: 'Brands'
//       }
//     },

//     {
//       $lookup: {
//         from: 'variantproducts',
//         localField: 'VariantProductIds',
//         foreignField: '_id',
//         as: 'VariantProducts'
//       }
//     },

//     {
//       $lookup: {
//         from: 'variants',
//         localField: 'VariantProducts.VariantFields.VariantId',
//         foreignField: '_id',
//         as: 'VariantNames'
//       }
//     },

//     {
//       $lookup: {
//         from: 'batches',
//         localField: 'VariantProducts.BatchIds',
//         foreignField: '_id',
//         as: 'Batches'
//       }
//     },
//     {
//       $addFields: {
//         VariantProducts: {
//           $map: {
//             input: "$VariantProducts",
//             as: "vp",
//             in: {
//               $mergeObjects: [
//                 "$$vp",
//                 {
//                   VariantFields: {
//                     $map: {
//                       input: "$$vp.VariantFields",
//                       as: "vf",
//                       in: {
//                         VariantId: "$$vf.VariantId",

//                         VariantName: {
//                           $arrayElemAt: [
//                             {
//                               $map: {
//                                 input: {
//                                   $filter: {
//                                     input: "$VariantNames",
//                                     cond: { $eq: ["$$this._id", "$$vf.VariantId"] }
//                                   }
//                                 },
//                                 as: "vn",
//                                 in: "$$vn.VariantName"
//                               }
//                             },
//                             0
//                           ]
//                         },

//                         VariantValue: "$$vf.VariantValue",

//                         Extension: {
//                           $arrayElemAt: [
//                             {
//                               $map: {
//                                 input: {
//                                   $filter: {
//                                     input: "$VariantNames",
//                                     cond: { $eq: ["$$this._id", "$$vf.VariantId"] }
//                                   }
//                                 },
//                                 as: "vn",
//                                 in: "$$vn.Extension"
//                               }
//                             },
//                             0
//                           ]
//                         }
//                       }
//                     }
//                   },

//                   BatchesInfo: {
//                     $map: {
//                       input: {
//                         $filter: {
//                           input: "$Batches",
//                           cond: { $in: ["$$this._id", { $ifNull: ["$$vp.BatchIds", []] }] }
//                         }
//                       },
//                       as: "b",
//                       in: {
//                         _id: "$$b._id",
//                         BatchName: "$$b.BatchName",
//                         BatchLogo: "$$b.BatchLogo"
//                       }
//                     }
//                   }
//                 }
//               ]
//             }
//           }
//         }
//       }
//     },


//     { $project: { VariantNames: 0, Batches: 0 } }
//   ]);
// }


// async function clearElasticIndex() {
//   const exists = await client.indices.exists({ index: 'search_suggestions' });

//   if (exists) {
//     await client.deleteByQuery({
//       index: 'search_suggestions',
//       body: { query: { match_all: {} } }
//     });
//     console.log('🗑 Old Elastic data deleted');
//   }
// }


// async function reindexAll() {
//   console.log('🚀 Reindex started...');

//   await clearElasticIndex();

//   const products = await getProductData({ isActive: true });

//   for (let product of products) {
//     const companyId = product.companyId;

//     const HeadCategoryData = product.HeadCategory?.[0];
//     const SubCategoryData = product.SubCategories?.[0];
//     const BrandData = product.Brands?.[0];
//     const VariantProductData = product.VariantProducts || [];

//     if (BrandData?.isActive) {
//       await indexBrand({ ...BrandData, companyId });
//     }

//     if (HeadCategoryData?.isActive) {
//       await indexCategory({
//         ...HeadCategoryData,
//         companyId,
//         level: 1
//       });
//     }

//     if (SubCategoryData?.isActive) {
//       await indexCategory({
//         ...SubCategoryData,
//         companyId,
//         level: 2,
//         ParentId: product.HeadCategoryId
//       });
//     }

//     const enrichedProduct = {
//       ...product,
//       BrandName: BrandData?.BrandName,
//       categoryName:
//         SubCategoryData?.categoryName || HeadCategoryData?.categoryName,
//       headCategoryName: HeadCategoryData?.categoryName
//     };

//     if (product.isActive) {
//       await indexProduct(enrichedProduct);
//     }

//     for (let variant of VariantProductData) {
//       if (variant.isActive) {
//         await indexVariant(variant, enrichedProduct);
//       }
//     }
//   }


//   console.log(`✅ Products indexed: ${products.length}`);
//   console.log('🎉 Reindex completed');
//   process.exit(0);
// }

// // reindexAll().catch(err => {
// //   console.error('❌ Reindex failed:', err);
// //   process.exit(1);
// // });



// async function reindexWishlistES() {
//   console.log("🔁 Reindexing Wishlist to Elasticsearch...");

//   const wishlists = await Wishlist.find({}).lean();

//   if (!wishlists.length) {
//     console.log("⚠️ No wishlist records found");
//     return;
//   }


//   const wishlistMap = new Map();

//   for (const wl of wishlists) {
//     if (!wl.companyId || !wl.UserId) continue;

//     const companyId = String(wl.companyId);
//     const userId = String(wl.UserId);
//     const key = `${companyId}_${userId}`;

//     if (!wishlistMap.has(key)) {
//       wishlistMap.set(key, {
//         companyId,
//         userId,
//         variantProductIds: new Set()
//       });
//     }

//     const entry = wishlistMap.get(key);

//     for (const item of wl.Products || []) {
//       if (item?.VariantProductId) {
//         entry.variantProductIds.add(String(item.VariantProductId));
//       }
//     }
//   }

//   const body = [];

//   for (const [, data] of wishlistMap) {
//     body.push({
//       index: {
//         _index: "search_suggestions",
//         _id: `wishlist_${data.companyId}_${data.userId}`
//       }
//     });

//     body.push({
//       companyId: data.companyId,
//       userId: data.userId,
//       type: "wishlist",
//       variantProductIds: [...data.variantProductIds],
//       createdAt: new Date(),
//       updatedAt: new Date()
//     });
//   }

//   if (!body.length) {
//     console.log("⚠️ No wishlist documents to index");
//     return;
//   }

//   await client.bulk({
//     refresh: true,
//     body
//   });

//   console.log(`✅ Wishlist reindexed successfully: ${wishlistMap.size} documents`);
//   process.exit(0);
// };

// reindexWishlistES().catch(err => {
//   console.error('❌ Wishlist reindexed failed:', err);
//   process.exit(1);
// });




const client = require('./client');

const {
  indexBrand,
  indexCategory,
  indexProduct,
  indexVariant,
} = require('./indexer');

const { Product } = require('../../VariantsProducts/VariantsProducts.model');
const { Wishlist } = require('../../WishList/WishList.model');

// ─── mongoose.connect REMOVED (server.js already connects) ───────────────────

async function getProductData(matchCondition) {
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
                        VariantId: "$$vf.VariantId",
                        VariantName: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: { $filter: { input: "$VariantNames", cond: { $eq: ["$$this._id", "$$vf.VariantId"] } } },
                                as: "vn",
                                in: "$$vn.VariantName"
                              }
                            },
                            0
                          ]
                        },
                        VariantValue: "$$vf.VariantValue",
                        Extension: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: { $filter: { input: "$VariantNames", cond: { $eq: ["$$this._id", "$$vf.VariantId"] } } },
                                as: "vn",
                                in: "$$vn.Extension"
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
                          input: "$Batches",
                          cond: { $in: ["$$this._id", { $ifNull: ["$$vp.BatchIds", []] }] }
                        }
                      },
                      as: "b",
                      in: { _id: "$$b._id", BatchName: "$$b.BatchName", BatchLogo: "$$b.BatchLogo" }
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
}

// ─── only wipes data, does NOT recreate the index ────────────────────────────
async function clearElasticData() {
  const exists = await client.indices.exists({ index: 'search_suggestions' });
  if (exists) {
    await client.deleteByQuery({
      index: 'search_suggestions',
      body: { query: { match_all: {} } }
    });
    console.log('🗑  [Reindex] Old Elastic data wiped');
  } else {
    console.warn('⚠️  [Reindex] Index "search_suggestions" does not exist — skipping wipe');
  }
}

// ─── exported: reindex products ───────────────────────────────────────────────
async function reindexProducts() {
  console.log('🚀 [Reindex] Products reindex started...');

  await clearElasticData();

  const products = await getProductData({ isActive: true });

  for (const product of products) {
    const companyId = product.companyId;
    const HeadCategoryData  = product.HeadCategory?.[0];
    const SubCategoryData   = product.SubCategories?.[0];
    const BrandData         = product.Brands?.[0];
    const VariantProductData = product.VariantProducts || [];

    if (BrandData?.isActive)       await indexBrand({ ...BrandData, companyId });
    if (HeadCategoryData?.isActive) await indexCategory({ ...HeadCategoryData, companyId, level: 1 });
    if (SubCategoryData?.isActive)  await indexCategory({ ...SubCategoryData, companyId, level: 2, ParentId: product.HeadCategoryId });

    const enrichedProduct = {
      ...product,
      BrandName:        BrandData?.BrandName,
      categoryName:     SubCategoryData?.categoryName || HeadCategoryData?.categoryName,
      headCategoryName: HeadCategoryData?.categoryName
    };

    if (product.isActive) await indexProduct(enrichedProduct);

    for (const variant of VariantProductData) {
      if (variant.isActive) await indexVariant(variant, enrichedProduct);
    }
  }

  console.log(`✅ [Reindex] Products done — ${products.length} indexed`);
}

// ─── exported: reindex wishlist ───────────────────────────────────────────────
async function reindexWishlist() {
  console.log('🔁 [Reindex] Wishlist reindex started...');

  const wishlists = await Wishlist.find({}).lean();

  if (!wishlists.length) {
    console.log('⚠️  [Reindex] No wishlist records found — skipping');
    return;
  }

  const wishlistMap = new Map();

  for (const wl of wishlists) {
    if (!wl.companyId || !wl.UserId) continue;

    const companyId = String(wl.companyId);
    const userId    = String(wl.UserId);
    const key       = `${companyId}_${userId}`;

    if (!wishlistMap.has(key)) {
      wishlistMap.set(key, { companyId, userId, variantProductIds: new Set() });
    }

    for (const item of wl.Products || []) {
      if (item?.VariantProductId) {
        wishlistMap.get(key).variantProductIds.add(String(item.VariantProductId));
      }
    }
  }

  const body = [];
  for (const [, data] of wishlistMap) {
    body.push({
      index: { _index: 'search_suggestions', _id: `wishlist_${data.companyId}_${data.userId}` }
    });
    body.push({
      companyId:         data.companyId,
      userId:            data.userId,
      type:              'wishlist',
      variantProductIds: [...data.variantProductIds],
      createdAt:         new Date(),
      updatedAt:         new Date()
    });
  }

  if (!body.length) {
    console.log('⚠️  [Reindex] No wishlist documents to bulk-insert — skipping');
    return;
  }

  await client.bulk({ refresh: true, body });
  console.log(`✅ [Reindex] Wishlist done — ${wishlistMap.size} documents indexed`);
}

module.exports = { reindexProducts, reindexWishlist };