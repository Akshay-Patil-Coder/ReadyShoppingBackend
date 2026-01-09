const CoachingCategoriesRoutes = require('../components/Coaching/CoachingCategories/CoachingCategories.routes')
const CoachingProviderTypeRoutes = require('../components/Coaching/CoachingProviderType/CoachingProviderType.routes')
const CoachingSkillsRoutes = require('../components/Coaching/CoachingSkills/CoachingSkills.routes')
const CoachingClassesRoutes = require('../components/Coaching/CoachingClasses/CoachingClasses.routes')
const CoachingCompanyRoutes = require('../components/Coaching/CoachingCompanies/CoachingCompanies.routes')
const CoachingUniversityRoutes = require('../components/Coaching/CoachingUniversity/CoachingUniversity.routes')
const CoachingTutorsRoutes = require('../components/Coaching/CoachingTutors/CoachingTutors.routes')
// const CoachingCourseRoutes = require('../components/Coaching/CoachingCourse/CoachingCourse.routes')
// // const CoachingOrderRoutes = require('../components/Coaching/CoachingOrder/CoachingOrder.routes')
// const CoachingGainerCompanyRoutes = require('../components/Coaching/CoachingGainerCompnay/CoachingGainerCompnay.routes')
// const CoachingCompanyGainerChatBoxRoutes = require('../components/Coaching/CoachingChatBoxForGainerCompany/CoachingChatBoxForGainerCompany.routes')
// const CoachingGainerCompanyOrderRoutes = require('../components/Coaching/CoachingGainerCompanyOrder/CoachingGainerCompanyOrder.routes')
// // const CoachingTrendingProductRoutes = require('../components/Coaching/CoachingTrendingCourse/CoachingTrendingCourse.routes')
// const CoachingBannersRoutes = require('../components/Coaching/CoachingBanners/CoachingBanners.routes')

const apiString = `/api/${process.env.API_VERSION}`;
const coachingCategoriesString = apiString + '/coachingCategory'
const coachingProviderTypeString = apiString + '/coachingProviderType'
const coachingSKillsString = apiString + '/coachingSkills'
const coachingClassesString = apiString + '/coachingClasses'
const coachingUniversityString = apiString + '/coachingUniversity'
const coachingCompanyString = apiString + '/coachingCompany'
const coachingTutorString = apiString + '/coachingTutor'
// const CoachingOrderString = apiString + '/coachingOrder'
// const coachingCourseString = apiString + '/coachingCourse'
// const CoachingGainerCompanyString = apiString + '/coachingGainerCompany'
// const CoachingCompanyGainerChatBoxString = apiString + '/coachingChatBox'
// const CoachingGainerCompanyOrderString = apiString + '/coachingGainerCompanyOrder'
// // const CoachingTrendingProductString = apiString + '/coachingTrendingCourse'
// const CoachingBannersString = apiString + '/coachingBanner'

exports.default = (app) => {
    app.use(coachingCategoriesString, CoachingCategoriesRoutes)
    app.use(coachingProviderTypeString, CoachingProviderTypeRoutes)
    app.use(coachingSKillsString, CoachingSkillsRoutes)
    app.use(coachingClassesString, CoachingClassesRoutes)
    app.use(coachingUniversityString, CoachingUniversityRoutes)
    app.use(coachingCompanyString, CoachingCompanyRoutes)
    app.use(coachingTutorString, CoachingTutorsRoutes)
    // app.use(coachingCourseString, CoachingCourseRoutes)
    // app.use(CoachingBannersString, CoachingBannersRoutes)
    // app.use(CoachingGainerCompanyOrderString, CoachingGainerCompanyOrderRoutes)
    // app.use(CoachingCompanyGainerChatBoxString, CoachingCompanyGainerChatBoxRoutes)
    // app.use(CoachingGainerCompanyString, CoachingGainerCompanyRoutes)
    // // app.use(CoachingTrendingProductString,CoachingTrendingProductRoutes)
    // app.use(CoachingOrderString, CoachingOrderRoutes)
};