const client = require('./client');

const normalize = (v) =>
  v ? String(v).toLowerCase().trim() : "";

exports.indexBrand = async (brand) => {
  const text = [
    brand.BrandName,
  ].map(normalize).join(" ");

  await client.index({
    index: 'search_suggestions',
    id: `brand_${brand._id}`,
    document: {
      companyId: brand.companyId,
      type: 'brand',
      label: brand.BrandName,
      searchText: text,
      image: brand.BrandImage,
      ids: { brandId: brand._id }
    }
  });
};

exports.indexCategory = async (cat) => {
  const text = [
    cat.categoryName
  ].map(normalize).join(" ");

  await client.index({
    index: 'search_suggestions',
    id: `cat_${cat._id}`,
    document: {
      companyId: cat.companyId,
      type: cat.level === 1 ? 'headCategory' : 'subCategory',
      label: cat.categoryName,
      searchText: text,
      image: cat.imageName,
      ids: {
        headCategoryId: cat.level === 1 ? cat._id : cat.ParentId,
        subCategoryId: cat.level === 2 ? cat._id : null
      }
    }
  });
};

exports.indexProduct = async (product) => {
  const text = [
    product.ProductName,
    product.BrandName,
    product.categoryName,
    product.headCategoryName
  ].map(normalize).join(" ");

  await client.index({
    index: 'search_suggestions',
    id: `product_${product._id}`,
    document: {
      companyId: product.companyId,
      type: 'product',
      label: product.ProductName,
      searchText: text,
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

exports.indexVariant = async (variant, product) => {
  const normalize = (v) =>
    v ? String(v).toLowerCase().trim() : "";

  let variantFields = {};

  (variant.VariantFields || []).forEach(v => {
    if (!v?.VariantName) return;

    variantFields[v.VariantName] = normalize(
      `${v.VariantValue ?? ""}${v.Extension ?? ""}`
    );
  });

  const variantText = Object.entries(variantFields)
    .map(([k, v]) => `${normalize(k)} ${v}`)
    .join(" ");

  const batchText = (variant.BatchesInfo || [])
    .map(b => b?.BatchName)
    .filter(Boolean)
    .map(normalize)
    .join(" ");

  const searchText = [
    product.ProductName,
    variant.VariantProductName,
    product.BrandName,
    product.categoryName,
    product.headCategoryName,
    variantText,
    batchText
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");

  await client.index({
    index: 'search_suggestions',
    id: `variant_${variant._id}`,
    document: {
      companyId: variant.companyId,
      type: 'variant',
      label: variant.VariantProductName,
      searchText,
      price: variant.Price,
      image: variant.VariantProductImage?.[0],
      variantFields,
      batchInfo: variant.BatchesInfo || [],
      ids: {
        productId: variant.ProductId,
        variantProductId: variant._id,
        brandId: product.BrandId,
        headCategoryId: product.HeadCategoryId,
        subCategoryId: product.SubCategoryId
      }
    }
  });
};

