
const mongoose = require('mongoose');
const { type } = require('os');

const serviceProductCartSchema = mongoose.Schema(
    {

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        UserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        CartServices: [{
            serviceId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ServiceProduct'
            },
            SelectedParts: [{
                partName: {
                    type: String,
                },
                partPrice: {
                    type: Number
                },
                selected: {
                    type: Boolean
                }
            }],
            TotalServiceParts: [{
                partName: {
                    type: String,
                },
                partPrice: {
                    type: Number
                },
                selected: {
                    type: Boolean
                }
            }],
            TotalServicePrice: {
                type: Number,
                default: null
            },
            // SheduledTime: {
            //     type: Date,
            //     // required: true
            // },

            SheduledTime: [
                {
                    date: String,
                    day: String,
                    appointmentId:{
                        type:mongoose.Schema.Types.ObjectId,
                    }
                }
            ]
        }],

        isActive: {
            type: Boolean,
            default: true,

        }
    }, {
    timestamps: true
}
)
const serviceProductCartModel = mongoose.model('ServiceProductCart', serviceProductCartSchema)
module.exports.serviceProductCartModel = serviceProductCartModel;

