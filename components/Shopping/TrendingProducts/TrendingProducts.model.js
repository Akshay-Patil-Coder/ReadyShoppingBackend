
const mongoose = require('mongoose')

const trendingSchema = mongoose.Schema(
    {

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required : true
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:'Categgggory',
            required : true,
        },
        SubCategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:'Categgggory',
            required : true,
        },
      productsId:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Product',            
        }
      ],
        
        isActive: {
            type: Boolean,
            default :true,
  
}},{
    timestamps:true
}
)
const trendingsproducts = mongoose.model('trendingsproducts',trendingSchema)
module.exports.trendingsproducts = trendingsproducts;
