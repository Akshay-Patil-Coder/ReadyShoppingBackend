const client = require('./client');
const { parseSearchQuery } = require('../utils/queryParser');

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
