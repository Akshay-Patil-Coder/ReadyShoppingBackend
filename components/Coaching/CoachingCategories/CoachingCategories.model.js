const mongoose = require("mongoose")

const coachingCategorySchema = new mongoose.Schema({
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    coachingCategoryName:{
        type:String,
        required:true
    },
    coachingParentCategoryId:{
        type:mongoose.Schema.Types.ObjectId,
        default:null
    },
    coachingLevel:{
        type:Number,
        required:true
    },
    isActive:{
        type:Boolean,
        default:true,
        // required:true
    },
    coachingImage:{
        type:String,
    },
    Description:{
        type:String,
    }
},{
    timestamps:true
})

const CoachingCategory = mongoose.model('CoachingCategory',coachingCategorySchema)

module.exports = CoachingCategory