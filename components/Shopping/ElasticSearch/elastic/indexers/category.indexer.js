module.exports.indexCategory = async (cat) => {
  await client.index({
    index: 'suggestions',
    id: `cat_${cat._id}`,
    document: {
      companyId: cat.companyId,
      type: cat.level === 1 ? 'headCategory' : 'subCategory',
      label: cat.CategoryName,
      searchText: cat.CategoryName,
      image: cat.CategoryImage,
      ids: { categoryId: cat._id }
    }
  });
};
