const client = require('./client');

async function createIndex() {
  const exists = await client.indices.exists({ index: 'search_suggestions' });
  if (exists) {
    await client.indices.delete({ index: 'search_suggestions' });
    console.log('🗑 Old search_suggestions index deleted');
  }

  await client.indices.create({
    index: 'search_suggestions',
    settings: {
      analysis: {
        tokenizer: {
          autocomplete_tokenizer: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 20,
            token_chars: ['letter', 'digit']
          }
        },
        analyzer: {
          autocomplete_index: {
            tokenizer: 'autocomplete_tokenizer',
            filter: ['lowercase']
          },
          autocomplete_search: {
            tokenizer: 'lowercase'
          }
        }
      }
    },
    mappings: {
      properties: {
        companyId: { type: 'keyword' },
        type: { type: 'keyword' },

        label: {
          type: 'text',
          analyzer: 'autocomplete_index',
          search_analyzer: 'autocomplete_search',
          fields: {
            keyword: { type: 'keyword' }
          }
        },

        searchText: {
          type: 'text',
          analyzer: 'autocomplete_index',
          search_analyzer: 'autocomplete_search'
        },

        variantFields: {
          type: 'text',
          analyzer: 'autocomplete_index',
          search_analyzer: 'autocomplete_search'
        },

        price: { type: 'integer' },
        image: { type: 'keyword' },

        popularity: {
          properties: {
            views: { type: 'integer' },
            clicks: { type: 'integer' },
            orders: { type: 'integer' },
            score: { type: 'float' }
          }
        },

        ids: {
          properties: {
            brandId: { type: 'keyword' },
            productId: { type: 'keyword' },
            variantProductId: { type: 'keyword' },
            headCategoryId: { type: 'keyword' },
            subCategoryId: { type: 'keyword' }
          }
        }
      }
    }
  });

  console.log('✅ search_suggestions index created');
}

createIndex();
