
const mongoose = require('mongoose');
const { type } = require('os');

const CoachingOrderRequestSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId
    },
    CourceIds: [{
      type:mongoose.Schema.Types.ObjectId
    }],
    EmployeeIds: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    GainerCompanyId: {
        type: mongoose.Schema.Types.ObjectId
    },
    ForHowManyLogins: {
        type: Number
    },
    PaidAmount: {
        type: Number,
    },
    TotalAmount: {
        type: Number,
    },
    NegotiatedAmount:{
        type:Number
    },
    PendingAmount: {
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
        enum: ["success", "failed", "not-proceed", "pending"],
        default:'not-proceed'
    },
    PaymentMethod: {
        type: String,
        default: '',
    },
    Transaction: [{
        type: mongoose.Schema.Types.ObjectId,
    }],
    valid: {
        type: Boolean,
        default: false,
    },
    TokenOfCource: {
        type: String,
    },
},
{
    timestamps:true
})
let CompanyGainerRequestModel = mongoose.model('CoachingGainerCompanyOrderRequest', CoachingOrderRequestSchema);

module.exports.CompanyGainerRequestModel = CompanyGainerRequestModel

const CoachingGainerCompanyOrderSchema = new mongoose.Schema({
    CourceId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    OrderId:[{
        type:mongoose.Schema.Types.ObjectId    
    }],
    GainerCompanyId: {
        type: mongoose.Schema.Types.ObjectId
    },
    EmployeeIds: [{
        LoginsAccess: {
            type: Boolean,
            default: false
        },
        EmployeeId:{
            type: mongoose.Schema.Types.ObjectId
        }
    }],
    MyTotalLogins: {
        type: Number
    },
    PendingLogins: {
        type: Number,
        default: 0
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId
    },
    Transaction: [{
        type: mongoose.Schema.Types.ObjectId,
    }],
    PaymentIds: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    TokenOfCource: {
        type: String,
        required: true
    },
},
    {
        timestamps: true,
    });
let CoachingGainerCompnaiesOrder =mongoose.model('CoachingGainerCompanyOrder', CoachingGainerCompanyOrderSchema);
module.exports.CoachingGainerCompnaiesOrder = CoachingGainerCompnaiesOrder

const coachingGainerCompanyEmployeeScehma = mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId
    },
    OrderId: {
        type: mongoose.Schema.Types.ObjectId
    },
    EmployeeId: {
        type: mongoose.Schema.Types.ObjectId
    },
    GainerCompanyId: {
        type: mongoose.Schema.Types.ObjectId
    },
    CourceId: {
        type: mongoose.Schema.Types.ObjectId
    },
    CourceContent: [
        {
            Heading: {
                type: String
            },
            PlayListId: {
                type: mongoose.Schema.Types.ObjectId
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
    TokenOfCource: {
        type: String
    },
    CourceCompleted: {
        type: Boolean,
        default: false
    },
    CertificatePath: {
        type: String,
        default: null
    },
    valid: {
        type: Boolean,
        default: false,
    },
},
    {
        timestamps: true,
    }
)
let coachingGainerCompanyEmployees = mongoose.model('CoachingGainerCompanyEmployee', coachingGainerCompanyEmployeeScehma);

module.exports.coachingGainerCompanyEmployees = coachingGainerCompanyEmployees