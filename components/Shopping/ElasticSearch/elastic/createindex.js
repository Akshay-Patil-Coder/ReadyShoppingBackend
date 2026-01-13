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
                userId: { type: 'keyword' },
                type: { type: 'keyword' },

                label: {
                    type: 'text',
                    analyzer: 'autocomplete_index',
                    search_analyzer: 'autocomplete_search',
                    fields: {
                        keyword: { type: 'keyword' }
                    }
                },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                variantProductIds: {
                    type: 'keyword'
                },
                searchText: {
                    type: 'text',
                    analyzer: 'autocomplete_index',
                    search_analyzer: 'autocomplete_search'
                },
                variantFields: {
                    type: "nested",
                    properties: {
                        VariantId: { type: "keyword" },
                        VariantName: { type: "text" },

                        VariantValue: {
                            type: "keyword"
                        },

                        Extension: { type: "keyword" }
                    }
                },

                batchInfo: {
                    type: "nested",
                    properties: {
                        _id: { type: "keyword" },
                        BatchName: {
                            type: "text",
                            fields: {
                                keyword: { type: "keyword" }
                            }
                        },
                        BatchLogo: { type: "keyword" }
                    }
                },

                price: { type: 'integer' },
                image: { type: 'keyword' },
                ratingStar: { type: 'float' },
                totalReviews: { type: 'integer' },
                offerPercentage: { type: 'integer' },
                aboutProduct: {
                    type: 'object',
                    enabled: false
                },

                inventoryBaseStock: {
                    properties: {
                        InventoryBase: { type: 'boolean' },
                        Stock: { type: 'integer' },
                        AvailableStock: { type: 'integer' },
                        ReservedStock: { type: 'integer' }
                    }
                },


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
