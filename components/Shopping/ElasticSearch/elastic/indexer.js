const client = require('./client');

const normalize = v => v ? String(v).toLowerCase().trim() : "";

// ---------- BRAND ----------
exports.indexBrand = async (brand) => {
  await client.index({
    index: 'search_suggestions',
    id: `brand_${brand._id}`,
    document: {
      companyId: brand.companyId,
      type: 'brand',
      label: brand.BrandName,
      searchText: normalize(brand.BrandName),
      image: brand.BrandImage,
      popularity: { views: 0, clicks: 0, orders: 0, score: 0 },
      ids: { brandId: brand._id }
    }
  });
};

// ---------- CATEGORY ----------
exports.indexCategory = async (cat) => {
  await client.index({
    index: 'search_suggestions',
    id: `cat_${cat._id}`,
    document: {
      companyId: cat.companyId,
      type: cat.level === 1 ? 'headCategory' : 'subCategory',
      label: cat.categoryName,
      searchText: normalize(cat.categoryName),
      image: cat.imageName,
      popularity: { views: 0, clicks: 0, orders: 0, score: 0 },
      ids: {
        headCategoryId: cat.level === 1 ? cat._id : cat.ParentId,
        subCategoryId: cat.level === 2 ? cat._id : null
      }
    }
  });
};

// ---------- PRODUCT ----------
exports.indexProduct = async (product) => {
  const searchText = [
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
      searchText,
      image: product.CommonImages?.[0],
      popularity: { views: 0, clicks: 0, orders: 0, score: 0 },
      ids: {
        productId: product._id,
        brandId: product.BrandId,
        headCategoryId: product.HeadCategoryId,
        subCategoryId: product.SubCategoryId
      }
    }
  });
};

// ---------- VARIANT ----------
const popularityScore = (v) =>
  (v.views || 0) * 0.2 +
  (v.clicks || 0) * 0.5 +
  (v.orders || 0) * 2;

exports.indexVariant = async (variant, product) => {
  const variantFieldsText = (variant.VariantFields || [])
    .map(v => `${v.VariantName} ${v.VariantValue}${v.Extension || ""}`)
    .map(normalize)
    .join(" ");

  const batchText = (variant.BatchesInfo || [])
    .map(b => normalize(b.BatchName))
    .join(" ");

  const searchText = [
    product.ProductName,
    variant.VariantProductName,
    product.BrandName,
    product.categoryName,
    product.headCategoryName,
    variantFieldsText,
    batchText
  ].map(normalize).join(" ");

  await client.index({
    index: 'search_suggestions',
    id: `variant_${variant._id}`,
    document: {
      companyId: variant.companyId,
      type: 'variant',
      label: variant.VariantProductName,
      searchText,
      variantFields: variantFieldsText,
      price: variant.Price || 0,
      image: variant.VariantProductImage?.[0],
      batchInfo: variant.BatchesInfo || [],
      popularity: {
        views: variant.views || 0,
        clicks: variant.clicks || 0,
        orders: variant.orders || 0,
        score: popularityScore(variant)
      },
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
