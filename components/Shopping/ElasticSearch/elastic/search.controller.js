const client = require('./client');
const {parseSearchQuery} = require('../utils/queryParser');

exports.searchSuggestions = async (req, res) => {
  try {
    const { companyId, q } = req.body;

    if (!companyId || !q) {
      return res.status(400).json({
        success: false,
        message: 'companyId and q are required'
      });
    }

    const { keyword, minPrice, maxPrice } = await parseSearchQuery(q, companyId);

    const filters = [
      { term: { companyId } }
    ];

    if (minPrice || maxPrice) {
      const range = {};
      if (minPrice) range.gte = minPrice;
      if (maxPrice) range.lte = maxPrice;

      filters.push({
        range: { price: range }
      });
    }

    const result = await client.search({
      index: 'search_suggestions',
      size: 15,
      query: {
        bool: {
          must: keyword
            ? [{
                multi_match: {
                  query: keyword,
                  fields: [
                    "searchText^4",    
                    "label^3",          
                    "variantFields.*"   
                  ],
                  fuzziness: "AUTO"
                }
              }]
            : [],
          filter: filters
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
    console.error('SearchSuggestionError:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.autoSuggest = async ({ query, companyId, limit = 10 }) => {
  const result = await client.search({
    index: 'search_suggestions',
    size: limit,
    query: {
      function_score: {
        query: {
          bool: {
            must: [{
              multi_match: {
                query,
                fields: ['label^5', 'searchText^3'],
                fuzziness: 'AUTO'
              }
            }],
            filter: [{ term: { companyId } }]
          }
        },
        field_value_factor: {
          field: 'popularity.score',
          factor: 0.2,
          missing: 0
        },
        boost_mode: 'sum'
      }
    }
  });

  return result.hits.hits.map(h => ({
    id: h._id,
    type: h._source.type,
    label: h._source.label,
    image: h._source.image,
    score: h._score,
    ids: h._source.ids
  }));
};
