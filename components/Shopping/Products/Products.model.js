const mongoose = require('mongoose');
const ProductsSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required : true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required : true
    },
    isActive: {
        type: Boolean,
        default :true
    },
    productimages:[{
        type:String
    }],
    productName: {
        type: String,
        required : true
    },
    categoryName: {
        type: String,
    },
    product_description: {
        type: String
    },
    product_base_price: {
        type: String
    },
    offerPercentage:{
     type:Number,
     default:null
    },
    BrandId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'brands'
    },
    services:[{
        type:mongoose.Schema.Types.ObjectId
    }],
    dynamicFields : {
        type : mongoose.Schema.Types.Mixed,
        default: {}
    }
},{
    timestamps : true
});
const Products = mongoose.model('products', ProductsSchema);
module.exports.Products = Products;

const ProductsImagesSchema = new mongoose.Schema({
    images: [{
        imageName: String,
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    isActive:{
         type:Boolean,
         default:true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required:true,
    },
    varientsId: {
        type: mongoose.Schema.Types.ObjectId,
        required:true,
    }
}, { timestamps: true });
const ProductsImages = mongoose.model('product_images',ProductsImagesSchema)
module.exports.ProductsImages = ProductsImages

const productKeysSchema = new mongoose.Schema({
    companyId : {
        type : mongoose.Schema.Types.ObjectId,
        required : true
    },
    isActive : {
        type : Boolean,
        default : true
    },
    categoryId : {
        type : mongoose.Schema.Types.ObjectId,
        required : true
    },
    keys : [{
        type : String
    }]
},{
    timestamps : true
})
const productKeysModel = mongoose.model("productKey", productKeysSchema)
module.exports.productKeysModel = productKeysModel;