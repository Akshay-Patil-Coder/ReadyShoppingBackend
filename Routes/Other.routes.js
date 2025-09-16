const UserRoutes = require('../components/UserBase/User/User.routes')
const AdminRoutes = require('../components/CompanyBase/Admin/Admin.routes')
const CompanyRoutes = require('../components/CompanyBase/Company/Company.routes')

const apiString = `/api/${process.env.API_VERSION}`;

const UserString = apiString + '/user'
const AdminString = apiString + '/admin'
const CompanyString = apiString + '/companies'


exports.default = (app) => {
    app.use(UserString, UserRoutes)
    app.use(AdminString, AdminRoutes)
    app.use(CompanyString, CompanyRoutes)
}