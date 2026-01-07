module.exports.indexBrand = async (brand) => {
  await client.index({
    index: 'suggestions',
    id: `brand_${brand._id}`,
    document: {
      companyId: brand.companyId,
      type: 'brand',
      label: brand.BrandName,
      searchText: brand.BrandName,
      image: brand.BrandImage,
      ids: { brandId: brand._id }
    }
  });
};
