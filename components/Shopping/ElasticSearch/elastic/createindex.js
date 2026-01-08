const client = require('./client');

async function createIndex() {
  const exists = await client.indices.exists({ index: 'search_suggestions' });
 if (exists) { await client.indices.delete({ index: 'search_suggestions' }); console.log('🗑 Old search_suggestions index deleted'); }

  await client.indices.create({
    index: 'search_suggestions',
    mappings: {
      dynamic: true,
      properties: {
        companyId: { type: 'keyword' },
        type: { type: 'keyword' },

        label: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },

        searchText: {
          type: 'text',
          analyzer: 'standard'
        },

        price: { type: 'integer' },

        image: { type: 'keyword' },

        variantFields: {
          type: 'object',
          dynamic: true
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
