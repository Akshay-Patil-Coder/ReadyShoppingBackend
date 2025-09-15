const UserRoutes = require('../components/UserBase/User/User.routes')

const apiString = `/api/${process.env.API_VERSION}`;

const UserString = apiString + '/user'


exports.default = (app) => {
    app.use(UserString, UserRoutes)
}