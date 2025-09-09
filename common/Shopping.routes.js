const dynamicCategoriesRoutes = require("../components/Shopping/ProductCategories/ProductCategories.routes");
const productsRoutes = require("../components/Shopping/Products/Products.routes")
const varientsRoutes = require('./components/varients/varients.routes')
const servicesRoutes = require('./components/master_services/services.routes')
const servicecategoriesRoutes = require('./components/servicecategories/servicescategories.routes')
const trendingproductsRotes = require('./components/trending_products/trending.routes')
const brandRoutes = require('./components/brand/brand.routes')
const cartRoutes = require('./components/cart/cart.routes')
const shoppingpaymentRoutes = require('./components/shoppingpayment/shoppingpayment.routes')
const productordersRoutes = require('./components/product_orders/productorders.routes')
const cartsRoutes = require('./components/cart/cart.routes')
const registerRoutes = require('./components/register/register.routes')
const masterbannersRoutes = require('./components/master_banners/banners.routes')
const masterusersRoutes = require('./components/master_users/masterusers.routes')
const adminuserRoutes = require('./components/adminuser/adminuser.routes')
const masterServiceCategoriesRoutes = require('./components/masterServiceCategories/masterServiceCategories.routes')
const assigingdeliverysRoutes = require('./components/assigingorderstodelivery/delivery.routes');

const apiString = `/api/${process.env.API_VERSION}`;
const dynamicCategories = apiString + '/dynamicCategories'
const products = apiString + '/products'
const varients = apiString + '/varients'
const services = apiString + '/masterservices'
const servicecategories = apiString + '/servicecategories'
const trendingproducts = apiString + '/trendingproducts'
const brands = apiString + '/brands'
const carts = apiString + '/carts'
const register = apiString + '/register'
const shoppingpayment = apiString + '/shoppingpayment'
const productorders = apiString + '/productorders'
const masterbanners = apiString + '/masterbanners'
const adminuser = apiString + '/adminUser'
const masterusers = apiString + '/masterusers'
const masterServiceCatString = apiString + '/mastersercategory'

exports.default = (app) => {
  app.use(dynamicCategories, dynamicCategoriesRoutes)
  app.use(products, productsRoutes)
  app.use(varients, varientsRoutes)
  // app.use(ServiceProductImage,ServiceProductImageRoutes)
  app.use(services, servicesRoutes)
  app.use(servicecategories, servicecategoriesRoutes)
  app.use(trendingproducts, trendingproductsRotes)
  app.use(brands, brandRoutes)
  app.use(carts, cartRoutes)
  app.use(register, registerRoutes)
  app.use(shoppingpayment, shoppingpaymentRoutes)
  app.use(productorders, productordersRoutes)
  // app.use(carts,cartsRoutes)
  app.use(masterbanners,masterbannersRoutes)
  app.use(adminuser,adminuserRoutes)
  app.use(masterusers,masterusersRoutes)
  app.use(masterServiceCatString,masterServiceCategoriesRoutes)

};
//# sourceMappingURL=routes.js.map
