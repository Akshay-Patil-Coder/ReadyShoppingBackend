module.exports.indexVariant = async (variant, product) => {
  await client.index({
    index: 'suggestions',
    id: `variant_${variant._id}`,
    document: {
      companyId: variant.companyId,
      type: 'variant',
      label: variant.VariantProductName,
      searchText: `${product.ProductName} ${variant.VariantProductName}`,
      image: variant.VariantProductImage?.[0],
      price: variant.Price,
      ids: {
        productId: variant.ProductId,
        variantProductId: variant._id
      }
    }
  });
};
