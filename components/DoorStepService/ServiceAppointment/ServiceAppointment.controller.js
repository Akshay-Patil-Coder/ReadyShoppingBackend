const ServiceAppointmentModel = require('./ServiceAppointment.model');
const { ObjectId } = require('mongoose').Types;
const mongoose = require('mongoose');
module.exports = {
    addAppointments: async (req, resp) => {
        try {
            function minutesToAMPM(minutes) {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const hour12 = hours % 12 || 12;
                const formattedMinutes = mins < 10 ? `0${mins}` : mins;
                return `${hour12}:${formattedMinutes} ${ampm}`;
            }
            function isDatePast(date) {
                let today = new Date();

                let [day, month, year] = date.split('-');
                let appointmentDate = `${year}${month}${day}`;

                appointmentDate = Number(appointmentDate);

                today = today.toISOString().split('T')[0].replace(/-/g, '');
                today = Number(today);

                console.log(today, appointmentDate, 'comparison');

                return appointmentDate < today;
            }

            function timeToMinutesSinceMidnight(time) {
                return time.hour * 60 + time.minute;
            }
            function checkForConflict(newSlot, existingSlots) {
                for (let existingSlot of existingSlots) {
                    console.log(newSlot, 'new', existingSlot, 'existing');

                    let newSlotStart = timeToMinutesSinceMidnight({
                        hour: parseInt(newSlot.ServiceStartTime.split(':')[0]),
                        minute: parseInt(newSlot.ServiceStartTime.split(':')[1].split(' ')[0]),
                        ampm: newSlot.ServiceStartTime.split(' ')[1]
                    });
                    let newSlotEnd = timeToMinutesSinceMidnight({
                        hour: parseInt(newSlot.ServiceEndTime.split(':')[0]),
                        minute: parseInt(newSlot.ServiceEndTime.split(':')[1].split(' ')[0]),
                        ampm: newSlot.ServiceEndTime.split(' ')[1]
                    });

                    let existingStart = timeToMinutesSinceMidnight({
                        hour: parseInt(existingSlot.ServiceStartTime.split(':')[0]),
                        minute: parseInt(existingSlot.ServiceStartTime.split(':')[1].split(' ')[0]),
                        ampm: existingSlot.ServiceStartTime.split(' ')[1]
                    });
                    let existingEnd = timeToMinutesSinceMidnight({
                        hour: parseInt(existingSlot.ServiceEndTime.split(':')[0]),
                        minute: parseInt(existingSlot.ServiceEndTime.split(':')[1].split(' ')[0]),
                        ampm: existingSlot.ServiceEndTime.split(' ')[1]
                    });

                    console.log(newSlotStart, newSlotEnd, existingStart, existingEnd);

                    if (newSlotStart < existingEnd && newSlotEnd > existingStart) {
                        return true;
                    }
                }

                return false;
            }

            let { opd_time, DayTime, ServiceProviderId, ServiceProductId, companyId, ServiceTime } = req.body;
            let updatedData = {
                opdDate: [{
                    startDate: opd_time[0],
                    endDate: opd_time[1]
                }],
            };

            let newSchedule = [];
            let availableShedule = [];

            let result = await ServiceAppointmentModel.ServiceAppointmentModel.findOne({
                ServiceProviderId: ServiceProviderId,
                companyId: companyId,
                ServiceProductId: ServiceProductId
            });

            if (result) {
                let existingSchedule = result.schedule || [];


                existingSchedule = existingSchedule.filter((daySchedule) => {
                    return !isDatePast(daySchedule.date);
                })
                DayTime = DayTime.filter((daySchedule) => {
                    return !isDatePast(daySchedule.date);
                })
                DayTime.forEach((EachDayTime) => {
                    let existingDaySchedule = existingSchedule.find(schedule => schedule.date === EachDayTime.date);

                    let startTimeInMinutes = timeToMinutesSinceMidnight(EachDayTime.startTime);
                    let endTimeInMinutes = timeToMinutesSinceMidnight(EachDayTime.endTime);
                    let availableTime = endTimeInMinutes - startTimeInMinutes;

                    let slotsCount = Math.floor(availableTime / ServiceTime);
                    let appointments = [];
                    let adjustServiceTime = 0;

                    if (existingDaySchedule) {
                        existingDaySchedule.appointments.forEach((existingSlot) => {
                            if (existingSlot.booked === true) {
                                appointments.push({
                                    _id: existingSlot._id,
                                    ServiceStartTime: existingSlot.ServiceStartTime,
                                    ServiceEndTime: existingSlot.ServiceEndTime,
                                    booked: true
                                });
                                availableShedule.push({
                                    ServiceStartTime: existingSlot.ServiceStartTime,
                                    ServiceEndTime: existingSlot.ServiceEndTime,
                                    booked: true
                                });
                            }
                        });

                        for (let i = 0; i < slotsCount; i++) {
                            let ServiceStartTime = minutesToAMPM(startTimeInMinutes + adjustServiceTime);
                            let ServiceEndTime = minutesToAMPM(startTimeInMinutes + adjustServiceTime + ServiceTime);
                            let newSlot = [];
                            newSlot.push({
                                ServiceStartTime: ServiceStartTime,
                                ServiceEndTime: ServiceEndTime,
                                booked: false
                            });
                            if (!checkForConflict(newSlot[0], availableShedule)) {
                                appointments.push(
                                    {
                                        ServiceStartTime: ServiceStartTime,
                                        ServiceEndTime: ServiceEndTime,
                                        booked: false
                                    }
                                )
                            }
                            newSlot = [];

                            adjustServiceTime += ServiceTime;

                        }

                        existingDaySchedule.appointments = appointments;
                    } else {
                        let appointments = [];
                        for (let i = 0; i < slotsCount; i++) {
                            let ServiceStartTime = minutesToAMPM(startTimeInMinutes + adjustServiceTime);
                            let ServiceEndTime = minutesToAMPM(startTimeInMinutes + adjustServiceTime + ServiceTime);

                            appointments.push({
                                ServiceStartTime: ServiceStartTime,
                                ServiceEndTime: ServiceEndTime,
                                booked: false
                            });

                            adjustServiceTime += ServiceTime;
                        }

                        newSchedule.push({
                            date: EachDayTime.date,
                            day: EachDayTime.day,
                            startTime: EachDayTime.startTime,
                            endTime: EachDayTime.endTime,
                            appointments: appointments
                        });
                    }
                });

                existingSchedule = existingSchedule.map(day => {
                    let newDay = newSchedule.find(newDay => newDay.date === day.date);
                    return newDay ? { ...day, appointments: [...day.appointments, ...newDay.appointments] } : day;
                });

                existingSchedule = [...existingSchedule, ...newSchedule.filter(newDay => !existingSchedule.some(day => day.date === newDay.date))];

                let updatedRecord = await ServiceAppointmentModel.ServiceAppointmentModel.findOneAndUpdate(
                    { ServiceProviderId: ServiceProviderId, companyId: companyId, ServiceProductId: ServiceProductId },
                    { $set: { schedule: existingSchedule, ServiceTime: ServiceTime } },
                    { new: true }
                );

                if (!updatedRecord) {
                    return resp.status(400).json({ message: 'Schedule Not Updated', success: false });
                }

                resp.status(200).json({ message: 'Time schedule uploaded successfully', success: true, data: updatedRecord });

            } else {
                DayTime = DayTime.filter((daySchedule) => {
                    return !isDatePast(daySchedule.date);
                })
                DayTime.forEach((EachDayTime) => {
                    let startTimeInMinutes = timeToMinutesSinceMidnight(EachDayTime.startTime);
                    let endTimeInMinutes = timeToMinutesSinceMidnight(EachDayTime.endTime);
                    let availableTime = endTimeInMinutes - startTimeInMinutes;

                    let slotsCount = Math.floor(availableTime / ServiceTime);
                    let appointments = [];
                    let adjustServiceTime = 0;
                    for (let i = 0; i < slotsCount; i++) {
                        let ServiceStartTime = minutesToAMPM(startTimeInMinutes + adjustServiceTime);
                        let ServiceEndTime = minutesToAMPM(startTimeInMinutes + adjustServiceTime + ServiceTime);

                        appointments.push({
                            ServiceStartTime: ServiceStartTime,
                            ServiceEndTime: ServiceEndTime,
                            booked: false
                        });

                        adjustServiceTime += ServiceTime;
                    }

                    newSchedule.push({
                        date: EachDayTime.date,
                        day: EachDayTime.day,
                        startTime: EachDayTime.startTime,
                        endTime: EachDayTime.endTime,
                        appointments: appointments
                    });

                });
                const newServiceAppointment = new ServiceAppointmentModel.ServiceAppointmentModel({
                    ServiceProviderId: ServiceProviderId,
                    ServiceProductId: ServiceProductId,
                    companyId: companyId,
                    ServiceTime: ServiceTime,
                    schedule: newSchedule,
                    opdDate: updatedData.opdDate
                });

                await newServiceAppointment.save();

                resp.status(200).json({ message: 'New service appointment created successfully', success: true, data: newServiceAppointment });
            }
        } catch (error) {
            return resp.status(400).json({ message: 'Something went wrong', error: error.message });
        }
    },
    updateTimeSlotsBooking: async (req, resp) => {
        try {
            let { TimeSlot, ServiceProviderId, ServiceProductId } = req.body;

            let operation = req.query.operation;
            let companyId = req.query.companyId;

            if (!TimeSlot || !TimeSlot.ServiceStartTime || !TimeSlot.ServiceEndTime || !companyId || !ServiceProductId || !ServiceProviderId) {
                return resp.status(400).json({ message: "Please provide all data", success: false });
            }

            if (operation === 'booked') {
                let result = await ServiceAppointmentModel.ServiceAppointmentModel.findOneAndUpdate(
                    {
                        companyId: companyId,
                        ServiceProviderId: ServiceProviderId,
                        ServiceProductId: ServiceProductId,
                        'schedule.date': TimeSlot.date,
                        'schedule.appointments.ServiceStartTime': TimeSlot.ServiceStartTime,
                        'schedule.appointments.ServiceEndTime': TimeSlot.ServiceEndTime,
                    },
                    {
                        $set: {
                            'schedule.$.appointments.$[appt].booked': true
                        }
                    },
                    {
                        arrayFilters: [
                            { 'appt.ServiceStartTime': TimeSlot.ServiceStartTime, 'appt.ServiceEndTime': TimeSlot.ServiceEndTime, 'appt.booked': false }
                        ],
                        new: true
                    }
                );

                if (!result) {
                    return resp.status(404).json({ message: "Time slot not found or update failed", success: false });
                }

                return resp.status(200).json({ message: "Time slot successfully updated for booked", success: true, result });
            }
            else if (operation == 'unbooked') {
                let result = await ServiceAppointmentModel.ServiceAppointmentModel.findOneAndUpdate(
                    {
                        companyId: companyId,
                        ServiceProviderId: ServiceProviderId,
                        ServiceProductId: ServiceProductId,
                        'schedule.appointments.ServiceStartTime': TimeSlot.ServiceStartTime,
                        'schedule.appointments.ServiceEndTime': TimeSlot.ServiceEndTime,
                    },
                    {
                        $set: {
                            'schedule.$.appointments.$[appt].booked': false
                        }
                    },
                    {
                        arrayFilters: [
                            { 'appt.ServiceStartTime': TimeSlot.ServiceStartTime, 'appt.ServiceEndTime': TimeSlot.ServiceEndTime }
                        ],
                        new: true
                    }
                );

                if (!result) {
                    return resp.status(404).json({ message: "Time slot not found or update failed", success: false });
                }
                return resp.status(200).json({ message: "Time slot successfully updated for unbooked", success: true, result });

            }
            else {
                return resp.status(400).json({ message: "Invalid Operation", success: false });

            }
        } catch (error) {
            console.error("Error in updating time slot booking:", error);
            return resp.status(500).json({ message: "Internal Server Error", success: false });
        }
    },
    deleteTimeSlotsBooking: async (req, resp) => {
        try {
            let { ServiceProviderId, ServiceProductId, companyId } = req.query;
            if (!ServiceProviderId || !ServiceProductId || !companyId) {
                return resp.status(400).json({ message: 'please provide required data', success: false })
            }
            let existingAppointments = await ServiceAppointmentModel.ServiceAppointmentModel.findOne(
                { ServiceProviderId, ServiceProductId, companyId }
            )
            if (existingAppointments) {
                let result = await ServiceAppointmentModel.ServiceAppointmentModel.findOneAndRemove(
                    { ServiceProviderId, ServiceProductId, companyId }
                )
                if (!result) {
                    return resp.status(400).json({ message: 'appointments not deleted', success: false })
                }
                return resp.status(200).json({ message: 'appointments deleted successfully', success: false })
            }
            return resp.status(400).json({ message: 'appointment data not found', success: false })

        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false ,message:"Internal Server Error"})

        }
    },
    getAppointmentsData: async (matchCondition) => {
        return await ServiceAppointmentModel.ServiceAppointmentModel.aggregate([
            { $match: matchCondition },
            {
                $lookup: {
                    from: "serviceproviders",
                    localField: "ServiceProviderId",
                    foreignField: "_id",
                    as: "ServiceProviderInfo",
                }
            },
            {
                $lookup: {
                    from: "serviceproducts",
                    localField: "ServiceProductId",
                    foreignField: "_id",
                    as: "ServiceProductInfo",
                }

            }
        ]);
    },
    getAppointments: async (req, res) => {
        let { companyId, ServiceProductId, ServiceProviderId } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (ServiceProductId) {
                if (!mongoose.Types.ObjectId.isValid(ServiceProductId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ServiceProductId = mongoose.Types.ObjectId.createFromHexString(ServiceProductId);
            }
            if (ServiceProviderId) {
                if (!mongoose.Types.ObjectId.isValid(ServiceProviderId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ServiceProviderId = mongoose.Types.ObjectId.createFromHexString(ServiceProviderId);
            }
            const data = await module.exports.getAppointmentsData(matchCondition);

            if (data.length === 0) {
                return res.status(400).json({ message: 'Slots not available', success: false });
            }

            return res.status(200).json({ data: data, success: true,message:"Data Fetched" });

        } catch (error) {
            return res.status(400).json({ error:error.message,success: false,message:"Internal Server Error" });

        }
    }
}