const CategoryRoutes = require('../components/Shopping/ProductCategories/ProductCategories.routes')
const ProductsRoutes = require('../components/Shopping/Products/Products.routes')
const BrandRoutes = require('../components/Shopping/ProductsBrand/ProductsBrand.routes')
const BannerRoutes = require('../components/Shopping/ShoppingBanners/ShoppingBanners.routes')
const TrendingProductRoutes = require('../components/Shopping/TrendingProducts/TrendingProducts.routes')


const apiString = `/api/${process.env.API_VERSION}`;
const CategoryString = apiString + '/dynamicCategories'
const ProductsString = apiString + '/products'
const BrandString = apiString + '/brands'
const BannerString = apiString + '/masterbanners'
const TrendingProductString = apiString + '/trendingproducts'


exports.default = (app) => {
    app.use(CategoryString, CategoryRoutes)
    app.use(ProductsString, ProductsRoutes)
    app.use(BrandString, BrandRoutes)
    app.use(BannerString, BannerRoutes)
    app.use(TrendingProductString, TrendingProductRoutes)
 
}