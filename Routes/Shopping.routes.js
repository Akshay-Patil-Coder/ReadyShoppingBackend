const CategoryRoutes = require('../components/Shopping/ProductCategories/ProductCategories.routes')
// const ProductsRoutes = require('../components/Shopping/Products/Products.routes')
const BrandRoutes = require('../components/Shopping/ProductsBrand/ProductsBrand.routes')
const BannerRoutes = require('../components/Shopping/ShoppingBanners/ShoppingBanners.routes')
const TrendingProductRoutes = require('../components/Shopping/TrendingProducts/TrendingProducts.routes')
const VariantsRoutes = require('../components/Shopping/Variants/Variants.routes')
const ProductsRoutes = require('../components/Shopping/VariantsProducts/VariantsProducts.routes')
const ProductServiceRoutes = require('../components/Shopping/ProductServices/ProductServices.routes')
const ProductReviewRoutes = require('../components/Shopping/ProductRating/ProductRating.routes')


const apiString = `/api/${process.env.API_VERSION}`;
const CategoryString = apiString + '/dynamicCategories'
const ProductsString = apiString + '/products'
const BrandString = apiString + '/brands'
const BannerString = apiString + '/masterbanners'
const VariantsString = apiString + '/variants'
const ProductServicesString = apiString + '/productservices'
const TrendingProductString = apiString + '/trendingproducts'
const ProductReviewString = apiString + '/productreview'


exports.default = (app) => {
    app.use(CategoryString, CategoryRoutes)
    app.use(ProductsString, ProductsRoutes)
    app.use(BrandString, BrandRoutes)
    app.use(BannerString, BannerRoutes)
    app.use(TrendingProductString, TrendingProductRoutes)
    app.use(VariantsString, VariantsRoutes)
    app.use(ProductServicesString, ProductServiceRoutes)
    app.use(ProductReviewString,ProductReviewRoutes )
}