const mongoose = require('mongoose');

const VariantProductSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    HeadCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    SubCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    VariantProductImage: {
        type: [String],
        default: []
    },
    ProductId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    VariantProductName: {
        type: String,
        required: true
    },
    VariantFields: [{
        VariantId: {
            type: mongoose.Schema.Types.ObjectId
        },
        VariantValue: {
            type: mongoose.Schema.Types.Mixed
        }
    }],
    OfferPercentage: {
        type: Number,
        default: null
    },
    Price: {
        type: Number,
        required: true
    },
    InventoryBaseStock: {
        InventoryBase: {
            type: Boolean,
            default: true
        },
        Stock: {
            type: Number,
            default: 0
        },
        AvailableStock: {
            type: Number,
            default: 0
        },
        ReservedStock:{
            type:Number,
            default:0
        }
    },
    BatchIds: [{
        type: mongoose.Schema.Types.ObjectId,
    }],
    Specification: [{
        SpecificationKey: {
            type: String
        },
        SpecificationValue: {
            type: String
        }
    }],
    AboutProduct: {
        Head: {
            type: String,
            default: ""
        },
        Points: {
            type: [String],
            default: []
        },
        TextDescription: {
            type: String,
            default: ""
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isActiveBy: {
        type: String,
        default: 'Self'
    }
}, {
    timestamps: true
});


const VariantProduct = mongoose.model('VariantProduct', VariantProductSchema);



const ProductSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    HeadCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    SubCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    BrandId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    RatingIds: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    RatingStar: {
        type: Number,
        default: 0
    },
    TotalReviews: { type: Number, default: 0 },
    RatingDistribution: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 }
    },
    VariantProductIds: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    ProductServices: [{
        Paid: {
            type: Boolean,
            default: false
        },
        ProductServiceId: {
            type: mongoose.Schema.Types.ObjectId
        },
        ProductServiceAmount: {
            type: Number,
            default: 0
        },
        ExpiryDate: {
            Hour: { type: Number, default: 0 },
            Minute: { type: Number, default: 0 },
            Second: { type: Number, default: 0 },
            Day: { type: Number, default: 0 },
            Week: { type: Number, default: 0 },
            Month: { type: Number, default: 0 },
            Year: { type: Number, default: 0 }
        }

    }],
    ProductName: {
        type: String,
        default: null
    },
    CommonImages: {
        type: [String],
        default: []
    },
    CommonVideos: {
        type: [String],
        default: []
    },
    CommonDescription: {
        Head: {
            type: String,
            default: ""
        },
        Points: {
            type: [String],
            default: []
        },
        TextDescription: {
            type: String,
            default: ""
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
const Product = mongoose.model('Product', ProductSchema);


const BatchSchema = new mongoose.Schema({
    BatchName: {
        type: String
    },
    BatchLogo: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
const Batch = mongoose.model('Batch', BatchSchema);
module.exports = { Product, VariantProduct, Batch };