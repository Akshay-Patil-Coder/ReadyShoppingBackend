const { ObjectId } = require('mongoose').Types;
const mongoose = require('mongoose');
const { ServiceCart, ServiceOrder } = require('../ServiceProductCart/ServiceProductCart.model');
const { ServiceAppointmentModel } = require('./ServiceAppointment.model');
const { serviceProductsModel } = require('../ServiceProducts/ServiceProducts.model');
const CompanyModel = require('../../CompanyBase/Company/Company.model');
const { User } = require('../../UserBase/User/User.model')

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

            let result = await ServiceAppointmentModel.findOne({
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

                let updatedRecord = await ServiceAppointmentModel.findOneAndUpdate(
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
                const newServiceAppointment = new ServiceAppointmentModel({
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


    updateTimeSlotsBooking: async (req, res) => {
        try {
            const { TimeSlot, ServiceProviderId, ServiceProductId } = req.body;
            const { operation, companyId } = req.query;

            if (
                !companyId ||
                !ServiceProviderId ||
                !ServiceProductId ||
                !TimeSlot ||
                !TimeSlot.date ||
                !TimeSlot.ServiceStartTime ||
                !TimeSlot.ServiceEndTime
            ) {
                return res.status(400).json({
                    message: 'Please provide all required data: companyId, ServiceProviderId, ServiceProductId, TimeSlot (date, ServiceStartTime, ServiceEndTime)',
                    success: false,
                });
            }

            if (!mongoose.isValidObjectId(companyId) || !mongoose.isValidObjectId(ServiceProviderId) || !mongoose.isValidObjectId(ServiceProductId)) {
                return res.status(400).json({ message: 'Invalid companyId, ServiceProviderId or ServiceProductId', success: false });
            }

            const companyObjId = new mongoose.Types.ObjectId(String(companyId));
            const providerObjId = new mongoose.Types.ObjectId(String(ServiceProviderId));
            const productObjId = new mongoose.Types.ObjectId(String(ServiceProductId));

            if (operation === 'booked') {


                const result = await ServiceAppointmentModel.findOneAndUpdate(
                    {
                        companyId: companyObjId,
                        ServiceProviderId: providerObjId,
                        ServiceProductId: productObjId,
                        'schedule.date': TimeSlot.date,
                        'schedule.appointments.ServiceStartTime': TimeSlot.ServiceStartTime,
                        'schedule.appointments.ServiceEndTime': TimeSlot.ServiceEndTime,
                    },
                    {
                        $set: {
                            'schedule.$[sch].appointments.$[appt].booked': true,
                        },
                    },
                    {
                        arrayFilters: [
                            { 'sch.date': TimeSlot.date },
                            {
                                'appt.ServiceStartTime': TimeSlot.ServiceStartTime,
                                'appt.ServiceEndTime': TimeSlot.ServiceEndTime,
                                'appt.booked': false,
                            },
                        ],
                        new: true,
                    }
                );

                if (!result) {
                    return res.status(404).json({
                        message: 'Time slot not found, already booked, or update failed',
                        success: false,
                    });
                }

                return res.status(200).json({
                    message: 'Time slot successfully marked as booked',
                    success: true,
                    data: result,
                });
            }

            else if (operation === 'unbooked') {


                const appointmentDoc = await ServiceAppointmentModel.findOne({
                    companyId: companyObjId,
                    ServiceProviderId: providerObjId,
                    ServiceProductId: productObjId,
                    'schedule.date': TimeSlot.date,
                    'schedule.appointments.ServiceStartTime': TimeSlot.ServiceStartTime,
                    'schedule.appointments.ServiceEndTime': TimeSlot.ServiceEndTime,
                });

                if (!appointmentDoc) {
                    return res.status(404).json({ message: 'Time slot not found', success: false });
                }

                let targetSlotId = null;
                let targetSchedule = null;

                for (const sch of appointmentDoc.schedule) {
                    if (sch.date !== TimeSlot.date) continue;
                    for (const appt of sch.appointments) {
                        if (
                            appt.ServiceStartTime === TimeSlot.ServiceStartTime &&
                            appt.ServiceEndTime === TimeSlot.ServiceEndTime
                        ) {
                            targetSlotId = appt._id;
                            targetSchedule = sch;
                            break;
                        }
                    }
                    if (targetSlotId) break;
                }

                if (!targetSlotId) {
                    return res.status(404).json({ message: 'Exact slot not found within schedule', success: false });
                }

                const updatedAppointment = await ServiceAppointmentModel.findOneAndUpdate(
                    {
                        companyId: companyObjId,
                        ServiceProviderId: providerObjId,
                        ServiceProductId: productObjId,
                        'schedule.date': TimeSlot.date,
                        'schedule.appointments.ServiceStartTime': TimeSlot.ServiceStartTime,
                        'schedule.appointments.ServiceEndTime': TimeSlot.ServiceEndTime,
                    },
                    {
                        $set: {
                            'schedule.$[sch].appointments.$[appt].booked': false,
                        },
                    },
                    {
                        arrayFilters: [
                            { 'sch.date': TimeSlot.date },
                            {
                                'appt.ServiceStartTime': TimeSlot.ServiceStartTime,
                                'appt.ServiceEndTime': TimeSlot.ServiceEndTime,
                            },
                        ],
                        new: true,
                    }
                );

                if (!updatedAppointment) {
                    return res.status(404).json({ message: 'Time slot update failed', success: false });
                }

                const affectedOrders = await ServiceOrder.find({
                    companyId: companyObjId,
                    'Services.ServiceData.AppointmentInfo.AppointmentId': targetSlotId,
                });

                const now = new Date();

                for (const order of affectedOrders) {

                    let orderModified = false;

                    for (const svc of order.Services) {
                        if (
                            !svc.ServiceData?.AppointmentInfo?.AppointmentId?.equals(targetSlotId)
                        ) continue;

                        const lastStatus = svc.OrderStatus?.[svc.OrderStatus.length - 1]?.Status;
                        if (lastStatus === 'COMPLETED' || lastStatus === 'CANCELLED') continue;

                        svc.OrderStatus.push({
                            Status: 'CANCELLED',
                            StatusAt: now,
                            Reason: 'Slot manually unbooked by admin',
                        });

                        orderModified = true;
                    }


                    if (
                        orderModified &&
                        ['INITIATED', 'PENDING'].includes(order.PaymentSession?.status)
                    ) {
                        order.PaymentSession.status = 'FAILED';
                    }

                    if (orderModified) {
                        await order.save();
                    }


                    try {
                        if (order.UserId) {
                            const cart = await ServiceCart.findOne({
                                UserId: order.UserId,
                                companyId: companyObjId,
                            });

                            if (cart) {
                                for (const svc of order.Services) {
                                    if (
                                        !svc.ServiceData?.AppointmentInfo?.AppointmentId?.equals(targetSlotId)
                                    ) continue;

                                    const cartItem = cart.Services.find(
                                        c => c._id.toString() === svc.CartServiceId?.toString()
                                    );
                                    if (cartItem) {
                                        cartItem.Reserved = false;
                                        cartItem.IsActive = false;
                                    }
                                }

                                let total = 0, discount = 0, final = 0;
                                for (const s of cart.Services) {
                                    if (s.IsActive !== false) {
                                        total += s.TotalPrice || 0;
                                        discount += s.DiscountPrice || 0;
                                        final += s.FinalPrice || 0;
                                    }
                                }
                                cart.TotalCartPrice = total;
                                cart.DiscountCartPrice = discount;
                                cart.FinalCartPrice = final;

                                await cart.save();
                            }
                        }
                    } catch (cartErr) {
                        console.error('Cart update error during unbook:', cartErr.message);
                    }
                }

                return res.status(200).json({
                    message: 'Time slot successfully unbooked',
                    success: true,
                    data: updatedAppointment,
                    affectedOrders: affectedOrders.length,
                });
            }

            else {
                return res.status(400).json({ message: 'Invalid operation. Use "booked" or "unbooked"', success: false });
            }

        } catch (error) {
            console.error('updateTimeSlotsBooking Error:', error);
            return res.status(500).json({ message: 'Internal Server Error', success: false });
        }
    },
    deleteTimeSlotsBooking: async (req, resp) => {
        try {
            let { ServiceProviderId, ServiceProductId, companyId } = req.query;
            if (!ServiceProviderId || !ServiceProductId || !companyId) {
                return resp.status(400).json({ message: 'please provide required data', success: false })
            }
            let existingAppointments = await ServiceAppointmentModel.findOne(
                { ServiceProviderId, ServiceProductId, companyId }
            )
            if (existingAppointments) {
                let result = await ServiceAppointmentModel.findOneAndRemove(
                    { ServiceProviderId, ServiceProductId, companyId }
                )
                if (!result) {
                    return resp.status(400).json({ message: 'appointments not deleted', success: false })
                }
                return resp.status(200).json({ message: 'appointments deleted successfully', success: false })
            }
            return resp.status(400).json({ message: 'appointment data not found', success: false })

        } catch (error) {
            return resp.status(400).json({ error: error.message, success: false, message: "Internal Server Error" })

        }
    },

    // getAppointmentsData: async (matchCondition) => {
    //     return await ServiceAppointmentModel.aggregate([
    //         { $match: matchCondition },
    //         {
    //             $lookup: {
    //                 from: "serviceproviders",
    //                 localField: "ServiceProviderId",
    //                 foreignField: "_id",
    //                 as: "ServiceProviderInfo",
    //             }
    //         },
    //         {
    //             $lookup: {
    //                 from: "serviceproducts",
    //                 localField: "ServiceProductId",
    //                 foreignField: "_id",
    //                 as: "ServiceProductInfo",
    //             }

    //         }
    //     ]);
    // },
    // getAppointments: async (req, res) => {
    //     let { companyId, ServiceProductId, ServiceProviderId } = req.query;

    //     try {
    //         let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

    //         if (ServiceProductId) {
    //             if (!mongoose.Types.ObjectId.isValid(ServiceProductId)) {
    //                 return res.status(400).json({ message: 'Invalid ID format', success: false });
    //             }
    //             matchCondition.ServiceProductId = mongoose.Types.ObjectId.createFromHexString(ServiceProductId);
    //         }
    //         if (ServiceProviderId) {
    //             if (!mongoose.Types.ObjectId.isValid(ServiceProviderId)) {
    //                 return res.status(400).json({ message: 'Invalid ID format', success: false });
    //             }
    //             matchCondition.ServiceProviderId = mongoose.Types.ObjectId.createFromHexString(ServiceProviderId);
    //         }
    //         const data = await module.exports.getAppointmentsData(matchCondition);

    //         if (data.length === 0) {
    //             return res.status(400).json({ message: 'Slots not available', success: false });
    //         }

    //         return res.status(200).json({ data: data, success: true, message: "Data Fetched" });

    //     } catch (error) {
    //         return res.status(400).json({ error: error.message, success: false, message: "Internal Server Error" });

    //     }
    // },

    getAppointmentsData: async (matchCondition) => {
        return await ServiceAppointmentModel.aggregate([
            {
                $match: {
                    ...matchCondition,
                    isActive: true
                }
            },

            // 🔽 Provider Info
            {
                $lookup: {
                    from: "serviceproviders",
                    localField: "ServiceProviderId",
                    foreignField: "_id",
                    as: "ServiceProviderInfo",
                }
            },
            {
                $unwind: {
                    path: "$ServiceProviderInfo",
                    preserveNullAndEmptyArrays: true
                }
            },

            // 🔽 Product Info
            {
                $lookup: {
                    from: "serviceproducts",
                    localField: "ServiceProductId",
                    foreignField: "_id",
                    as: "ServiceProductInfo",
                }
            },
            {
                $unwind: {
                    path: "$ServiceProductInfo",
                    preserveNullAndEmptyArrays: true
                }
            },

            // 🔽 Optional: remove unnecessary fields
            {
                $project: {
                    companyId: 1,
                    ServiceProviderId: 1,
                    ServiceProductId: 1,
                    ServiceTime: 1,
                    opdDate: 1,
                    schedule: 1,
                    ServiceProviderInfo: 1,
                    ServiceProductInfo: 1
                }
            }
        ]);
    },
    getAppointments: async (req, res) => {
        let { companyId, ServiceProductId, ServiceProviderId, Type } = req.query;

        try {
            let matchCondition = {
                companyId: mongoose.Types.ObjectId.createFromHexString(companyId)
            };

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

            if (!data || data.length === 0) {
                return res.status(400).json({ message: 'Slots not available', success: false });
            }

            function parseDate(dateStr) {
                let [day, month, year] = dateStr.split('/');
                return new Date(`${year}-${month}-${day}`);
            }

            function isDatePast(date) {
                let today = new Date();
                today.setHours(0, 0, 0, 0);

                return parseDate(date) < today;
            }

            function isToday(date) {
                let today = new Date();
                today.setHours(0, 0, 0, 0);

                return parseDate(date).getTime() === today.getTime();
            }

            function getCurrentMinutes() {
                let now = new Date();
                return now.getHours() * 60 + now.getMinutes();
            }

            function timeToMinutesSinceMidnight(timeStr) {
                let [time, modifier] = timeStr.split(' ');
                let [hours, minutes] = time.split(':').map(Number);

                if (modifier === 'PM' && hours !== 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;

                return hours * 60 + minutes;
            }

            let currentMinutes = getCurrentMinutes();

            const filteredData = data.map(service => {

                let cleanedSchedule = service.schedule
                    .map(day => {


                        if (Type === 'UserPanel') {

                            if (isDatePast(day.date)) return null;

                            let availableSlots = day.appointments.filter(slot => {
                                let slotStart = timeToMinutesSinceMidnight(slot.ServiceStartTime);

                                if (slot.booked) return false;

                                if (isToday(day.date) && slotStart < currentMinutes) {
                                    return false;
                                }

                                return true;
                            });

                            if (availableSlots.length === 0) return null;

                            return {
                                date: day.date,
                                appointments: availableSlots
                            };
                        }

                        else {

                            if (isDatePast(day.date)) {
                                let bookedSlots = day.appointments.filter(slot => slot.booked);

                                if (bookedSlots.length === 0) return null;

                                return {
                                    ...day,
                                    appointments: bookedSlots
                                };
                            }

                            let filteredSlots = day.appointments.filter(slot => {
                                let slotStart = timeToMinutesSinceMidnight(slot.ServiceStartTime);

                                if (slot.booked) return true;

                                if (isToday(day.date) && slotStart < currentMinutes) {
                                    return false;
                                }

                                return true;
                            });

                            if (filteredSlots.length === 0) return null;

                            return {
                                ...day,
                                appointments: filteredSlots
                            };
                        }

                    })
                    .filter(Boolean);

                if (cleanedSchedule.length === 0) return null;

                return {
                    ...service,
                    schedule: cleanedSchedule
                };

            }).filter(Boolean);
            return res.status(200).json({
                data: filteredData,
                success: true,
                message: Type === 'UserPanel'
                    ? "Available slots fetched"
                    : "Data Fetched"
            });

        } catch (error) {
            return res.status(400).json({
                error: error.message,
                success: false,
                message: "Internal Server Error"
            });
        }
    },

}