const ServiceCategoryRoutes = require('../components/DoorStepService/ServiceCategory/ServiceCategory.routes')
const ServiceBannerRoutes = require('../components/DoorStepService/ServiceBanners/ServiceBanners.routes')
const ServiceProductsRoutes = require('../components/DoorStepService/ServiceProducts/ServiceProducts.routes')
const ServiceProvidersRoutes = require('../components/DoorStepService/ServiceProvider/ServiceProvider.routes')
const ServiceAppointmentRoutes = require('../components/DoorStepService/ServiceAppointment/ServiceAppointment.routes')
const ServiceCartRoutes = require('../components/DoorStepService/ServiceProductCart/ServiceProductCart.routes')
const ServiceWishlistRoutes = require('../components/DoorStepService/ServiceWishlist/ServiceWishlist.routes')
const ServiceRatingRoutes = require('../components/DoorStepService/ServiceRating/ServiceRating.routes')


const apiString = `/api/${process.env.API_VERSION}`;
const ServiceCategoryString = apiString + '/serviceCategories'
const ServiceBannersString = apiString + '/serviceBanners'
const ServiceProductsString = apiString + '/serviceProducts'
const ServiceProvidersString = apiString + '/serviceProviders'
const ServiceAppointmentsString = apiString + '/serviceAppointments'
const ServiceCartString = apiString + '/serviceCart'
const ServiceWishlistString = apiString + '/serviceWishlist'
const ServiceRatingString = apiString + '/serviceRating'



exports.default = (app) => {
    app.use(ServiceCategoryString, ServiceCategoryRoutes)
    app.use(ServiceBannersString, ServiceBannerRoutes)
    app.use(ServiceProductsString, ServiceProductsRoutes)
    app.use(ServiceProvidersString, ServiceProvidersRoutes)
    app.use(ServiceAppointmentsString, ServiceAppointmentRoutes)
    app.use(ServiceCartString, ServiceCartRoutes)
    app.use(ServiceWishlistString,ServiceWishlistRoutes)
    app.use(ServiceRatingString,ServiceRatingRoutes)
}