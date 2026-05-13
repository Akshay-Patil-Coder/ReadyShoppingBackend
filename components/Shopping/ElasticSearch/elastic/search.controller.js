const client = require('./client');
const { parseSearchQuery } = require('../utils/queryParser');
const ProductBanner = require('../../ShoppingBanners/ShoppingBanners.model')

exports.searchSuggestions = async (req, res) => {
  try {
    const { companyId, q } = req.body;
    if (!companyId || !q) {
      return res.status(400).json({
        success: false,
        message: 'companyId and q required'
      });
    }

    const { keyword, minPrice, maxPrice } = await parseSearchQuery(q);

    const filters = [{ term: { companyId } }];

    if (minPrice || maxPrice) {
      const range = {};
      if (minPrice) range.gte = minPrice;
      if (maxPrice) range.lte = maxPrice;
      filters.push({ range: { price: range } });
    }

    const result = await client.search({
      index: 'search_suggestions',
      size: 15,
      query: {
        function_score: {
          query: {
            bool: {
              must: keyword
                ? [{
                  multi_match: {
                    query: keyword,
                    fields: [
                      "searchText^4",
                      "label^3",
                      "variantFields^2"
                    ],
                    fuzziness: "AUTO"
                  }
                }]
                : [],
              filter: filters
            }
          },
          functions: [
            {
              field_value_factor: {
                field: "popularity.score",
                factor: 1.5,
                missing: 0
              }
            }
          ],
          score_mode: "sum",
          boost_mode: "sum"
        }
      }
    });

    res.json({
      success: true,
      data: result.hits.hits.map(h => ({
        ...h._source,
        score: h._score
      }))
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.searchVariantSuggestions = async (req, res) => {
  try {
    const { companyId, q } = req.body;

    if (!companyId || !q) {
      return res.status(400).json({
        success: false,
        message: 'companyId and q required'
      });
    }

    const { keyword, minPrice, maxPrice } = await parseSearchQuery(q);

    const filters = [
      { term: { companyId } },
      { term: { type: "variant" } }
    ];

    if (minPrice || maxPrice) {
      const range = {};
      if (minPrice) range.gte = minPrice;
      if (maxPrice) range.lte = maxPrice;
      filters.push({ range: { price: range } });
    }

    const result = await client.search({
      index: 'search_suggestions',
      size: 15,
      query: {
        function_score: {
          query: {
            bool: {
              must: keyword
                ? [{
                  multi_match: {
                    query: keyword,
                    fields: [
                      "searchText^4",
                      "label^3",
                      "variantFields^2"
                    ],
                    fuzziness: "AUTO"
                  }
                }]
                : [],
              filter: filters
            }
          },
          functions: [
            {
              field_value_factor: {
                field: "popularity.score",
                factor: 1.5,
                missing: 0
              }
            }
          ],
          score_mode: "sum",
          boost_mode: "sum"
        }
      }
    });

    res.json({
      success: true,
      data: result.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      }))
    });

  } catch (err) {
    console.error('Variant search error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getProductsById_ES = async (req, res) => {

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);

  const from = (page - 1) * limit;
  const buildSort = ({ SortOrder, PriceSort }) => {
    const sort = [];

    if (SortOrder === "newer") sort.push({ createdAt: "desc" });
    if (SortOrder === "older") sort.push({ createdAt: "asc" });
    if (PriceSort === "lowtohigh") sort.push({ price: "asc" });
    if (PriceSort === "hightolow") sort.push({ price: "desc" });

    if (!sort.length) sort.push({ _score: "desc" });
    return sort;
  };

  const buildESQuery = async ({
    companyId,
    q,
    parsedQ,
    HeadCategoryId,
    SubCategoryId,
    BrandId,
    ProductId,
    VariantProductIds,
    BatchIds,
    BatchName,
    VariantFilters,
    MinPrice,
    MaxPrice,
    StartDate,
    EndDate,
    derivedProductId
  }) => {

    const filter = [
      { term: { companyId } },
      { term: { type: "variant" } }
    ];

    const normalizeToArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        if (value.includes(",")) {
          return value.split(",").map(v => v.trim()).filter(Boolean);
        }
        return [value];
      }
      return [];
    };

    if (HeadCategoryId)
      filter.push({ term: { "ids.headCategoryId": HeadCategoryId } });

    const subCategoryIds = normalizeToArray(SubCategoryId);
    if (subCategoryIds.length) {
      filter.push({ terms: { "ids.subCategoryId": subCategoryIds } });
    }

    const brandIds = normalizeToArray(BrandId);
    if (brandIds.length) {
      filter.push({ terms: { "ids.brandId": brandIds } });
    }

    if (derivedProductId) {
      filter.push({ term: { "ids.productId": derivedProductId } });
    } else if (VariantProductIds?.length) {
      filter.push({ terms: { "ids.variantProductId": VariantProductIds } });
    }

    if (ProductId)
      filter.push({ term: { "ids.productId": ProductId } });

    if (BatchIds?.length) {
      filter.push({
        nested: {
          path: "batchInfo",
          query: {
            terms: {
              "batchInfo._id": BatchIds
            }
          }
        }
      });
    }

    if (BatchName) {
      filter.push({
        nested: {
          path: "batchInfo",
          query: {
            match: {
              "batchInfo.BatchName": {
                query: BatchName,
                operator: "and"
              }
            }
          }
        }
      });
    }

    const finalMinPrice = parsedQ?.minPrice ?? MinPrice;
    const finalMaxPrice = parsedQ?.maxPrice ?? MaxPrice;

    if (finalMinPrice || finalMaxPrice) {
      const range = {};
      if (finalMinPrice) range.gte = Number(finalMinPrice);
      if (finalMaxPrice) range.lte = Number(finalMaxPrice);
      filter.push({ range: { price: range } });
    }

    if (StartDate || EndDate) {
      const range = {};
      if (StartDate) range.gte = StartDate;
      if (EndDate) range.lte = EndDate;
      filter.push({ range: { createdAt: range } });
    }

    const must = [];

    if (VariantFilters?.length) {
      const grouped = VariantFilters.reduce((acc, { VariantName, VariantValue }) => {
        if (!acc[VariantName]) acc[VariantName] = new Set();
        acc[VariantName].add(VariantValue);
        return acc;
      }, {});

      const variantQueries = Object.entries(grouped).map(([variantName, valuesSet]) => ({
        nested: {
          path: "variantFields",
          query: {
            bool: {
              must: [
                { match: { "variantFields.VariantName": variantName } },
                { terms: { "variantFields.VariantValue": Array.from(valuesSet) } }
              ]
            }
          }
        }
      }));

      must.push({
        bool: {
          should: variantQueries,
          minimum_should_match: 1
        }
      });
    }
    if (parsedQ?.keyword) {
      must.push({
        multi_match: {
          query: parsedQ.keyword,
          fields: [
            "searchText^4",
            "label^3",
            "variantFields.VariantName^2",
            "variantFields.VariantValue^2"
          ],
          fuzziness: "AUTO"
        }
      });
    }


    return {
      function_score: {
        query: {
          bool: {
            must,
            filter
          }
        },
        functions: [
          {
            field_value_factor: {
              field: "popularity.score",
              factor: 1.5,
              missing: 0
            }
          }
        ],
        score_mode: "sum",
        boost_mode: "sum"
      }
    };
  };

  try {
    const {
      companyId,
      q,
      HeadCategoryId,
      SubCategoryId,
      BrandId,
      ProductId,
      MinPrice,
      MaxPrice,
      StartDate,
      EndDate,
      SortOrder,
      PriceSort,
      BatchName,
      UserId,
      VariantProductId,
      BannerId
    } = req.query;

    const {
      VariantFilters,
      BatchIds,
      VariantProductIds
    } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId required"
      });
    }

    let derivedProductId = null;

    if (BannerId) {

      if (!mongoose.Types.ObjectId.isValid(BannerId)) {

        return res.status(400).json({
          success: false,
          message: "Invalid BannerId"
        });

      }

      let FoundBanner = await ProductBanner.findOne({
        _id: mongoose.Types.ObjectId.createFromHexString(BannerId),
        companyId: mongoose.Types.ObjectId.createFromHexString(companyId)
      });

      if (!FoundBanner) {

        return res.status(404).json({
          success: false,
          message: "Banner Not Found"
        });

      }

      VariantProductIds = FoundBanner?.VariantsProductsIds || [];

      if (!VariantProductIds.length) {
        return res.status(404).json({
          success: false,
          message: "No Products Found In Banner"
        });
      }

    }
    if (VariantProductId) {
      const vpRes = await client.search({
        index: "search_suggestions",
        size: 1,
        query: {
          bool: {
            filter: [
              { term: { companyId } },
              { term: { type: "variant" } },
              { term: { "ids.variantProductId": VariantProductId } }
            ]
          }
        }
      });

      derivedProductId =
        vpRes.hits.hits?.[0]?._source?.ids?.productId || null;
    }

    let wishlistIds = [];

    if (UserId) {
      try {
        const wishlistDoc = await client.get({
          index: "search_suggestions",
          id: `wishlist_${companyId}_${UserId}`
        });

        wishlistIds = wishlistDoc._source?.variantProductIds || [];
      } catch (err) {
        if (err.meta?.statusCode !== 404) {
          throw err;
        }
      }
    }
    let parsedQ = null;
    if (q) {
      parsedQ = await parseSearchQuery(q);
    }
    const query = await buildESQuery({
      companyId,
      q,
      parsedQ,
      HeadCategoryId,
      SubCategoryId,
      BrandId,
      ProductId,
      VariantProductIds,
      BatchIds,
      BatchName,
      VariantFilters,
      MinPrice,
      MaxPrice,
      StartDate,
      EndDate,
      derivedProductId
    });
    console.log("PAGE:", page, "LIMIT:", limit, "FROM:", from);

    const result = await client.search({
      index: "search_suggestions",
      from,
      size: limit,
      query,
      sort: buildSort({ SortOrder, PriceSort }),
      _source: true,
      aggs: {
        allSubCategories: {
          global: {},
          aggs: {
            filtered: {
              filter: query.function_score.query,
              aggs: {
                uniqueSubCategories: {
                  terms: {
                    field: "ids.subCategoryId",
                    size: 1000
                  }
                }
              }
            }
          }
        }
      },
      ...(UserId && {
        script_fields: {
          WishList: {
            script: {
              lang: "painless",
              params: { wishlist: wishlistIds },
              source: `
            if (params.wishlist == null) return false;
            if (doc['ids.variantProductId'].size() == 0) return false;
            return params.wishlist.contains(doc['ids.variantProductId'].value);
          `
            }
          }
        }
      })
    });


    const data = result.hits.hits.map(h => ({
      ...h._source,
      score: h._score,
      WishList: h.fields?.WishList?.[0] || false
    }));

    const allSubCategoryIds =
      result.aggregations?.allSubCategories
        ?.filtered
        ?.uniqueSubCategories
        ?.buckets.map(b => b.key) || [];


    return res.json({
      success: true,
      total: result.hits.total.value || 0,
      data,
      allSubCategoryIds
    });

  } catch (err) {
    console.error("ES getProductsById error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};
exports.getWishlistES = async (req, res) => {
  try {
    const { companyId, userId } = req.query;

    if (companyId && userId) {
      try {
        const doc = await client.get({
          index: "search_suggestions",
          id: `wishlist_${companyId}_${userId}`
        });

        return res.json({
          success: true,
          total: 1,
          data: [{ id: doc._id, ...doc._source }]
        });

      } catch (err) {
        if (err.meta?.statusCode === 404) {
          return res.json({
            success: true,
            total: 0,
            data: []
          });
        }
        throw err;
      }
    }

    const must = [{ term: { type: "wishlist" } }];

    if (companyId) must.push({ term: { companyId } });

    const result = await client.search({
      index: "search_suggestions",
      size: 10000,
      query: { bool: { must } },
      sort: [{ updatedAt: "desc" }]
    });

    const data = result.hits.hits.map(hit => ({
      id: hit._id,
      ...hit._source
    }));

    return res.json({
      success: true,
      total: data.length,
      data
    });

  } catch (err) {
    console.error("❌ getWishlistES error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
