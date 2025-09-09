const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');
const routes = require('./common/routes');

const app = express();
app.use(express.json());

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1);
  }
})();

routes.default(app); 

const staticPaths = {
  '/api/v1/report': '../outputfiles/',
  '/api/v1/docImgReport': './public/images',
  '/api/v1/doctorImage': './public/images/doctorImage',
  '/api/v1/userImages': './public/images/userImages',
  '/api/v1/consultationDocs': './public/consultationDocs',
  '/api/v1/labReports': './public/labReports',
  '/api/v1/varients': './public/varients',
  '/api/v1/BrandImage': './public/BrandImage',
  '/api/v1/BannerImage': './public/BannerImage',
  '/api/v1/master_categories': './public/master_categories',
  '/api/v1/master_services': './public/master_services',
  '/api/v1/CompanyLogos': './public/CompanyLogos',
  '/api/v1/FunctionallityLogos': './public/FunctionallityLogos',
  '/api/v1/ServiceCategoryImage': './public/ServiceCategoryImage',
  '/api/v1/ServiceProviderImage': './public/ServiceProviderImage',
  '/api/v1/ServiceProductImage': './public/ServiceProductImage',
  '/api/v1/ServiceBannerImage': './public/ServiceBannerImage',
  '/api/v1/serviceCsv': './public/serviceCsv',
  '/api/v1/coachingCategoriesImage': './public/CoachingCategoryImage',
  '/api/v1/deliveryprofileimages': './public/deliveryprofileimages',
  '/api/v1/coachingClassImage': './public/CoachingClassesImage',
  '/api/v1/coachingCompanyImage': './public/CoachingCompanyImage',
  '/api/v1/coachingTutorImage': './public/CoachingTutorImage',
  '/api/v1/coachingUniversityImage': './public/CoachingUniversityImage',
  '/api/v1/coachingCourceImage': './public',
  '/api/v1/coachingBannerImage': './public/CoachingBannerImage',
  '/api/v1/courceProviderTypeImages': './public/CourceProviderTypeImages',
  '/api/v1/streams': './public/streams',
  '/api/v1/blankproducts': '../outputfiles/blankproducts',
};

// ✅ Register static paths dynamically
Object.entries(staticPaths).forEach(([route, dir]) => {
  app.use(route, express.static(path.join(__dirname, dir)));
});

// ✅ Start Server
const PORT = process.env.PORT || 5296;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
