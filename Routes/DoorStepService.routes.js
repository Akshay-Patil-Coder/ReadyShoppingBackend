const ServiceCategoryRoutes = require('../components/DoorStepService/ServiceCategory/ServiceCategory.routes')



const apiString = `/api/${process.env.API_VERSION}`;
const ServiceCategoryString = apiString + '/serviceCategories'



exports.default = (app) => {
    app.use(ServiceCategoryString, ServiceCategoryRoutes)
   
}