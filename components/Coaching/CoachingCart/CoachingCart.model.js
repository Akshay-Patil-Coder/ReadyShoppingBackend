'use strict';

const mongoose = require('mongoose');


const CoachingCartCourseSchema = new mongoose.Schema(
    {
        CourseId: {
            type:     mongoose.Schema.Types.ObjectId,
            required: true,
        },
        TotalPrice: {
            type:    Number,
            default: 0,
        },
        DiscountPrice: {
            type:    Number,
            default: 0,
        },
        FinalPrice: {
            type:    Number,
            default: 0,
        },
        IsActive: {
            type:    Boolean,
            default: true,
        },
        Reserved: {
            type:    Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const CoachingCartSchema = new mongoose.Schema(
    {
        UserId: {
            type:     mongoose.Schema.Types.ObjectId,
            required: true,
        },
        companyId: {
            type:     mongoose.Schema.Types.ObjectId,
            required: true,
        },
        Courses: [CoachingCartCourseSchema],

        TotalCartPrice: {
            type:    Number,
            default: 0,
        },
        DiscountCartPrice: {
            type:    Number,
            default: 0,
        },
        FinalCartPrice: {
            type:    Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const CoachingCart = mongoose.model('CoachingCart', CoachingCartSchema);
module.exports.CoachingCart = CoachingCart;


const UserDetailsSchema = new mongoose.Schema(
    {
        UserName:        { type: String, default: '' },
        Email:           { type: String, default: '' },
        Phone:           { type: mongoose.Schema.Types.Mixed },
        AddresserName:   { type: String, default: '' },
        AddresserNumber: { type: mongoose.Schema.Types.Mixed },
        AddressType:     { type: String, default: 'Home' },
        Street:          { type: String, default: '' },
        City:            { type: String, default: '' },
        State:           { type: String, default: '' },
        Country:         { type: String, default: '' },
        PostalCode:      { type: String, default: '' },
        Latitude:        { type: mongoose.Schema.Types.Mixed, default: '' },
        Longitude:       { type: mongoose.Schema.Types.Mixed, default: '' },
        ManualAddress:   { type: String, default: '' },
    },
    { _id: false }
);

const PaymentSessionSchema = new mongoose.Schema(
    {
        orderId:        { type: String },
        txnId:          { type: String, default: null },
        status:         { type: String, default: 'INITIATED' },
        amount:         { type: Number },
        paymentGateway: { type: String, default: 'Paytm' },
    },
    { _id: false }
);

const CoachingOrderSchema = new mongoose.Schema(
    {
        UserId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
        },

        CartId: {
            type:    mongoose.Schema.Types.ObjectId,
            default: null,
        },
        CartCourseId: {
            type:    mongoose.Schema.Types.ObjectId,
            default: null,
        },

        CourseId: {
            type: mongoose.Schema.Types.ObjectId,
        },

        CourseContent: [
            {
                Heading: { type: String },
                PlayListId: { type: mongoose.Schema.Types.ObjectId },
                VideoData: [
                    {
                        VideoId:       { type: mongoose.Schema.Types.ObjectId },
                        VideoCompleted:{ type: Boolean, default: false },
                        QuizData: [
                            {
                                QuizId:       { type: mongoose.Schema.Types.ObjectId },
                                QuizCompleted:{ type: Boolean, default: false },
                            },
                        ],
                    },
                ],
                PlayListCompleted: { type: Boolean, default: false },
            },
        ],

        CourseCompleted: {
            type:    Boolean,
            default: false,
        },

        TotalAmount: {
            type: Number,
        },
        OfferPercentage: {
            type:    Number,
            default: 0,
        },
        PaidAmount: {
            type:    Number,
            default: 0,
        },
        PendingAmount: {
            type: Number,
        },

        PaymentStatus: {
            type:    String,
            enum:    ['Pending', 'Completed', 'Cancelled', 'In Progress'],
            default: 'Pending',
        },
        PaymentMethod: {
            type:    String,
            default: '',
        },
        PaymentSession: PaymentSessionSchema,

        OrderDate: { type: String },
        OrderTime: { type: String },

        TokenOfCourse: {
            type:     String,
            required: true,
        },

        CertificatePath: {
            type:    String,
            default: null,
        },

        valid: {
            type:    Boolean,
            default: false,
        },

        UserDetails: UserDetailsSchema,

        ReservationStartedAt: { type: Date },
        ReservationExpiresAt: { type: Date },
    },
    { timestamps: true }
);

const CoachingOrder = mongoose.model('CoachingOrder', CoachingOrderSchema);
module.exports.CoachingOrder = CoachingOrder;