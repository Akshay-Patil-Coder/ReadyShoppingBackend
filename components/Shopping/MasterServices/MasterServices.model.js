const { duration } = require('moment')
const mongoose = require('mongoose')
const { type } = require('os')


const servicesSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required:true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        // required:true.

    },
    parentServiceId:{
        type: mongoose.Schema.Types.ObjectId,
        default:null,
        // required : true
    },
    serviceCategoryLevel:{
        type:Number,
    },
    service_name: {
        type: String,
        required:true
        

    },
    service_type: {
        type: String,
        
    },
    description: {
        type: String,
        required:true

    },
    imageName:{
        type:String
    },

    price: {
        type: Number,

    },
    duration: {
        type: String,

    },
    isActive:{
        type:Boolean,
        default:true
    }

},{
    timestamps:true
})

module.exports = mongoose.model('master_services',servicesSchema)
