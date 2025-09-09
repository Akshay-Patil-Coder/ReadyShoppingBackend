
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
                    //pri
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
