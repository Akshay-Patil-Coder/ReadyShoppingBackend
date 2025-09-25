const UserRoutes = require('../components/UserBase/User/User.routes')
const AdminRoutes = require('../components/CompanyBase/Admin/Admin.routes')
const CompanyRoutes = require('../components/CompanyBase/Company/Company.routes')
const FunctionallityRoutes = require('../components/CompanyBase/Functionallity/Functionallity.routes')
const AccessManagmentRoutes = require('../components/CompanyBase/AccessManagment/AccessManagment.routes')

const apiString = `/api/${process.env.API_VERSION}`;

const UserString = apiString + '/user'
const AdminString = apiString + '/admin'
const CompanyString = apiString + '/companies'
const FunctionallityString = apiString + '/masterusers'
const AccessManagmentString = apiString + '/adminUser'


exports.default = (app) => {
    app.use(UserString, UserRoutes)
    app.use(AdminString, AdminRoutes)
    app.use(CompanyString, CompanyRoutes)
    app.use(FunctionallityString, FunctionallityRoutes)
    app.use(AccessManagmentString, AccessManagmentRoutes)
}