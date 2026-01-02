
const mongoose = require('mongoose');

const serviceAppointmentSchema = mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        ServiceProviderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceProvider',
            required: true,
        },
        ServiceProductId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceProduct',
            required: true
        },
        ServiceTime: {
            type: Number,
            required: true,
        },
        opdDate: [{
            _id: 0,
            startDate: String,
            endDate: String,
        }],
        schedule: [{
            date: String,
            day: String,
            startTime: {},
            endTime: {},
            appointments: [
                {
                    ServiceStartTime: {},
                    ServiceEndTime: {},
                    selected: {
                        type: Boolean,
                        default: false
                    },
                    booked: {
                        type: Boolean,
                        default: false
                    }
                }
            ]
        }],
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true
    }
);

serviceAppointmentSchema.index({ companyId: 1, ServiceProviderId: 1, ServiceProductId: 1 });

const ServiceAppointmentModel = mongoose.model('ServiceAppointment', serviceAppointmentSchema);
module.exports.ServiceAppointmentModel = ServiceAppointmentModel;

// const mongoose = require('mongoose');

// const serviceAppointmentSchema = mongoose.Schema(
//     {
//         companyId: {
//             type: mongoose.Schema.Types.ObjectId,
//             required: true
//         },
//         ServiceProductId: {
//             type: mongoose.Schema.Types.ObjectId,
//             required: true
//         },
//         ServiceProviderId: {
//                 type: mongoose.Schema.Types.ObjectId
//         },
//         ServiceTime: {
//             type: Number,
//             required: true,
//         },
//         OpdDate: {
//             type: Date
//         },
//         StartTime: { type: String },
//         EndTime: { type: String },
//             AppointmentIdsStaffWise: [
//                 {
//                     type: mongoose.Schema.Types.ObjectId,
//                 }
//             ]
//         isActive: {
//             type: Boolean,
//             default: true,
//         }
//     },
//     {
//         timestamps: true
//     }
// );


// const ServiceAppointmentModel = mongoose.model('ServiceAppointment', serviceAppointmentSchema);
// module.exports.ServiceAppointmentModel = ServiceAppointmentModel;

// const serviceStaffWiseAppointmentSchema = mongoose.Schema(
//     {
//         companyId: {
//             type: mongoose.Schema.Types.ObjectId,
//             required: true
//         },
//         ServiceProviderId: {
//             type: mongoose.Schema.Types.ObjectId,
//             required: true,
//         },
//         ServiceProductId: {
//             type: mongoose.Schema.Types.ObjectId,
//             required: true
//         },
//         ProviderWiseAppointmentId: {
//             type: mongoose.Schema.Types.ObjectId,
//             required: true
//         },
//         StaffId: {
//             type: mongoose.Schema.Types.ObjectId,
//         },
//        
//         Shedule: [{
//             Date: {
//                 type: Date,
//             },
//             Day: {
//                 type: String
//             },
//             Appointments: [
//                 {
//                     ServiceStartTime: { type: String },
//                     ServiceEndTime: { type: String },
//                     Selected: {
//                         type: Boolean,
//                         default: false
//                     },
//                     BookedBy: {
//                         type: mongoose.Schema.Types.ObjectId,
//                         ref: 'User',
//                         default: null
//                     },
//                     Booked: {
//                         type: Boolean,
//                         default: false
//                     }
//                 }
//             ]
//         }],

//         isActive: {
//             type: Boolean,
//             default: true,
//         }
//     },
//     {
//         timestamps: true
//     }
// );


// const ServiceStaffWiseAppointmentModel = mongoose.model('ServiceStaffWiseAppointment', serviceStaffWiseAppointmentSchema);
// module.exports.ServiceStaffWiseAppointmentModel = ServiceStaffWiseAppointmentModel;
