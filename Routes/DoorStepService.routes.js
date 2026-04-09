const ServiceCategoryRoutes = require('../components/DoorStepService/ServiceCategory/ServiceCategory.routes')
const ServiceBannerRoutes = require('../components/DoorStepService/ServiceBanners/ServiceBanners.routes')
const ServiceProductsRoutes = require('../components/DoorStepService/ServiceProducts/ServiceProducts.routes')


const apiString = `/api/${process.env.API_VERSION}`;
const ServiceCategoryString = apiString + '/serviceCategories'
const ServiceBannersString = apiString + '/serviceBanners'
const ServiceProductsString = apiString + '/serviceProducts'



exports.default = (app) => {
    app.use(ServiceCategoryString, ServiceCategoryRoutes)
    app.use(ServiceBannersString, ServiceBannerRoutes)
    app.use(ServiceProductsString, ServiceProductsRoutes)
}