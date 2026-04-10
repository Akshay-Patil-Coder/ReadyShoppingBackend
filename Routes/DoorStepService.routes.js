const ServiceCategoryRoutes = require('../components/DoorStepService/ServiceCategory/ServiceCategory.routes')
const ServiceBannerRoutes = require('../components/DoorStepService/ServiceBanners/ServiceBanners.routes')
const ServiceProductsRoutes = require('../components/DoorStepService/ServiceProducts/ServiceProducts.routes')
const ServiceProvidersRoutes = require('../components/DoorStepService/ServiceProducts/ServiceProducts.routes')


const apiString = `/api/${process.env.API_VERSION}`;
const ServiceCategoryString = apiString + '/serviceCategories'
const ServiceBannersString = apiString + '/serviceBanners'
const ServiceProductsString = apiString + '/serviceProducts'
const ServiceProvidersString = apiString + '/serviceProviders'



exports.default = (app) => {
    app.use(ServiceCategoryString, ServiceCategoryRoutes)
    app.use(ServiceBannersString, ServiceBannerRoutes)
    app.use(ServiceProductsString, ServiceProductsRoutes)
    app.use(ServiceProvidersString, ServiceProvidersRoutes)
}