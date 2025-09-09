
const mongoose = require('mongoose');
const { type } = require('os');

const CoachingCourceOrderSchema = new mongoose.Schema({
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    CourceId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    CourceContent: [
        {
            Heading: {
                type: String
            },
            PlayListId:{
                type:mongoose.Schema.Types.ObjectId
            },
            VideoData: [
                {
                    VideoId: {
                        type: mongoose.Schema.Types.ObjectId
                    },
                    VideoCompleted: {
                        type: Boolean,
                        default: false
                    },
                    QuizData: [
                        {
                            QuizId: {
                                type: mongoose.Schema.Types.ObjectId
                            },
                            QuizCompleted: {
                                type: Boolean,
                                default: false
                            }
                        }
                    ]
                }
            ],
            PlayListCompleted: {
                type: Boolean,
                default: false
            }
        }
    ],
    CourceCompleted: {
        type: Boolean,
        default: false
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId
    },
    PaidAmount: {
        type: Number,
    },
    TotalAmount: {
        type: Number,
    },
    PendingAmount:{
        type:Number,
    },
    OfferPercentage: {
        type: Number,
    },
    OrderDate: {
        type: String,
    },
    OrderTime: {
        type: String,
    },
    PaymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Cancelled', 'In Progress'],
        default:'Pending'
    },
    PaymentMethod: {
        type: String,
        default: '',
    },
    Transaction: {
        type: mongoose.Schema.Types.ObjectId,
    },
    TokenOfCource: {
        type: String,
        required: true
    },
    CertificatePath:{
        type:String,
        default:null
    },
    valid: {
        type: Boolean,
        default: false,
      },
},
    {
        timestamps: true,
    });

module.exports = mongoose.model('CoachingCourceOrder', CoachingCourceOrderSchema);

const CoachingCertificateSchema = new mongoose.Schema({
   companyId:{
    type:mongoose.Schema.Types.ObjectId,
    required:true
   },
   CertificateToken:{
    type:String,
    required:true
   }
},
    {
        timestamps: true,
    });
let CertificateModel = mongoose.model('CoachingCertificate', CoachingCertificateSchema);

module.exports.CertificateModel = CertificateModel





