const client = require('../client');

module.exports.indexProduct = async (product) => {
  await client.index({
    index: 'suggestions',
    id: `product_${product._id}`,
    document: {
      companyId: product.companyId,
      type: 'product',
      label: product.ProductName,
      searchText: product.ProductName,
      image: product.CommonImages?.[0],
      ids: {
        productId: product._id,
        brandId: product.BrandId,
        headCategoryId: product.HeadCategoryId,
        subCategoryId: product.SubCategoryId
      }
    }
  });
};
