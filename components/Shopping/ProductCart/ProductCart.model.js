
const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId, 
        required: true
    },
    Products:[
        {
            ProductId:{
                type:mongoose.Schema.Types.ObjectId
            },
            VariantProductId:{
                type:mongoose.Schema.Types.ObjectId
            },
            ProductServicesIds:[
                {
                    type:mongoose.Schema.Types.ObjectId
                }
            ],
            VariantProductName:{
                type:String
            },
            Price:{
                type:String
            }

        }
    ]
}, {
    timestamps: true
});

module.exports = mongoose.model("Cart", cartSchema);
