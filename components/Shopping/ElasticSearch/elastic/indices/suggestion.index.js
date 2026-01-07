const client = require('../client');

async function createSuggestionIndex() {
  const exists = await client.indices.exists({ index: 'suggestions' });
  if (exists) return;

  await client.indices.create({
    index: 'suggestions',
    mappings: {
      properties: {
        companyId: { type: 'keyword' },
        type: { type: 'keyword' }, 
        label: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        searchText: { type: 'text' },
        image: { type: 'keyword' },
        ids: { type: 'object', enabled: true },
        price: { type: 'float' }
      }
    }
  });
}

module.exports = createSuggestionIndex;
