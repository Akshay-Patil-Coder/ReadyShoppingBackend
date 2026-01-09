
const mongoose = require('mongoose');
const { type } = require('os');

const CoachingCourseOrderSchema = new mongoose.Schema({
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    CourseId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    CourseContent: [
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
    CourseCompleted: {
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
    TokenOfCourse: {
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

module.exports = mongoose.model('CoachingCourseOrder', CoachingCourseOrderSchema);

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





