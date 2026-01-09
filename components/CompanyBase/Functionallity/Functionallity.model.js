const mongoose = require('mongoose')

const masterusersSchema  = new mongoose.Schema({
    FunctionallityName:{
        type:String,
        required:true
    },
    FunctionallityLogo:{
        type:String,
        required:true
    },
    isActive:{
        type:Boolean,
        default:true,
        required:true
    }
},{
    timestamps:true
})
module.exports=mongoose.model('masterusers',masterusersSchema)