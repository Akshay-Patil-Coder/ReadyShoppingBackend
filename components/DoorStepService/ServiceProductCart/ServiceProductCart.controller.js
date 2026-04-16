const serviceProductCartModel = require('./ServiceProductCart.model');
const ServiceAppointmentModel = require('../ServiceAppointment/ServiceAppointment.model')
const serviceProductsModel = require('../ServiceProducts/ServiceProducts.model')
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const path = require('path')
const fs = require('fs');
module.exports = {
    addServiceToCart: async (req, res) => {
        let {
            UserId,
            companyId,
            ServiceProductId,
            ProviderId,
            AppointmentId,
            Parts = [],
            Operation
        } = req.body;

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        try {
            if (!UserId || !companyId)
                return res.status(400).json({ message: "User or Company missing", success: false });

            let FoundCart = await serviceProductCartModel.findOne({ UserId, companyId });
            if (!FoundCart) {
                FoundCart = new serviceProductCartModel({ UserId, companyId, Services: [] });
            }

            let existingIndex = FoundCart.Services.findIndex(
                s =>
                    s.ServiceProductId.toString() === ServiceProductId.toString() &&
                    s.AppointmentId.toString() === AppointmentId.toString()
            );

            let FoundService = await serviceProductsModel.findOne({
                _id: ServiceProductId,
                companyId,
                isActive: true
            });

            if (!FoundService)
                return res.status(404).json({ message: "Service not found", success: false });

            let calculateService = (service, parts) => {
                let base = service.service_base_price || 0;

                let partsTotal = parts.reduce(
                    (sum, p) => sum + (p.partPrice || 0),
                    0
                );

                let discount = 0;
                if (service.offerPercentage > 0) {
                    discount = (base * service.offerPercentage) / 100;
                }

                let total = base + partsTotal;

                let final = (base - discount) + partsTotal;

                return { total, discount, final, partsTotal };
            };

            if (Operation === "add") {
                let appointmentDoc = await ServiceAppointmentModel.findOne({
                    companyId,
                    ServiceProviderId: ProviderId,
                    ServiceProductId,
                    isActive: true,
                    "schedule.appointments._id": AppointmentId
                });

                if (!appointmentDoc) {
                    return res.status(404).json({
                        message: "Appointment not found",
                        success: false
                    });
                }

                let foundSlot = null;

                for (let sch of appointmentDoc.schedule) {
                    let slot = sch.appointments.find(
                        a => a._id.toString() === AppointmentId.toString()
                    );
                    if (slot) {
                        foundSlot = slot;
                        break;
                    }
                }

                if (!foundSlot) {
                    return res.status(404).json({
                        message: "Slot not found",
                        success: false
                    });
                }

                if (foundSlot.booked === true) {
                    return res.status(400).json({
                        message: "Slot already booked",
                        success: false
                    });
                }
                if (existingIndex !== -1) {
                    FoundCart.Services.splice(existingIndex, 1);
                }

                let { total, discount, final, partsTotal } =
                    calculateService(FoundService, Parts);

                FoundCart.Services.push({
                    ServiceProductId,
                    ProviderId,
                    AppointmentId,
                    Parts,
                    PartsTotal: partsTotal,
                    TotalPrice: total,
                    DiscountPrice: discount,
                    FinalPrice: final,
                    IsActive: true
                });

            }

            else if (Operation === "update") {

                if (existingIndex === -1)
                    return res.status(404).json({ message: "Service not in cart", success: false });

                let item = FoundCart.Services[existingIndex];

                let { total, discount, final, partsTotal } =
                    calculateService(FoundService, Parts || item.Parts);

                item.Parts = Parts || item.Parts;
                item.PartsTotal = partsTotal;
                item.TotalPrice = total;
                item.DiscountPrice = discount;
                item.FinalPrice = final;

                FoundCart.Services[existingIndex] = item;
            }

            else if (Operation === "remove") {

                if (existingIndex === -1)
                    return res.status(404).json({ message: "Service not found", success: false });

                FoundCart.Services.splice(existingIndex, 1);
            }

            else {
                return res.status(400).json({ message: "Invalid operation", success: false });
            }

            let total = 0, discount = 0, final = 0;

            for (let s of FoundCart.Services) {
                if (s.IsActive !== false) {
                    total += s.TotalPrice || 0;
                    discount += s.DiscountPrice || 0;
                    final += s.FinalPrice || 0;
                }
            }

            FoundCart.TotalCartPrice = total;
            FoundCart.DiscountCartPrice = discount;
            FoundCart.FinalCartPrice = final;

            let saved = await FoundCart.save();

            await module.exports.validateServiceCart({ body: { UserId, companyId } });

            return res.status(200).json({
                message: "Service cart updated",
                success: true,
                data: saved
            });

        } catch (err) {
            console.error("ServiceCart Error:", err);
            return res.status(500).json({
                message: "Internal error",
                error: err.message,
                success: false
            });
        }
    },
    validateServiceCart: async ({ body }) => {
        let { UserId, companyId } = body;

        let FoundCart = await serviceProductCartModel.findOne({ UserId, companyId });
        if (!FoundCart) return;

        let updated = [];

        for (let item of FoundCart.Services) {

            let service = await serviceProductsModel.findOne({
                _id: item.ServiceProductId,
                companyId,
                isActive: true
            });

            if (!service) continue;

            let base = service.service_base_price || 0;

            let validParts = service.service_parts || [];
            let cleanedParts = [];

            for (let cartPart of item.Parts || []) {
                let match = validParts.find(p => p.partName === cartPart.partName);

                if (match) {
                    cleanedParts.push({
                        partName: match.partName,
                        partPrice: match.partPrice,
                        selected: cartPart.selected
                    });
                }
            }

            item.Parts = cleanedParts;

            let partsTotal = cleanedParts
                .filter(p => p.selected)
                .reduce((sum, p) => sum + (p.partPrice || 0), 0);

            let discount = 0;
            if (service.offerPercentage > 0) {
                discount = (base * service.offerPercentage) / 100;
            }

            let total = base + partsTotal;
            let final = (base - discount) + partsTotal;

            item.TotalPrice = total;
            item.DiscountPrice = discount;
            item.FinalPrice = final;
            item.PartsTotal = partsTotal;

            updated.push(item);
        }

        FoundCart.Services = updated;

        FoundCart.TotalCartPrice = updated.reduce((s, i) => s + (i.TotalPrice || 0), 0);
        FoundCart.DiscountCartPrice = updated.reduce((s, i) => s + (i.DiscountPrice || 0), 0);
        FoundCart.FinalCartPrice = updated.reduce((s, i) => s + (i.FinalPrice || 0), 0);

        await FoundCart.save();
    },
    // addtocart: async (req, resp) => {
    //     try {
    //         let { companyId, UserId, serviceId, SelectedParts, TotalServiceParts, TotalServicePrice, SheduledTime } = req.body;
    //         console.log("uiiu", req.body)


    //         if (!companyId || !UserId || !serviceId) {
    //             return resp.status(400).json({ message: "please provide all required fields", success: false })
    //         }

    //         let cartObject = {
    //             serviceId,
    //             SelectedParts
    //         }
    //         let calculatedPrice = 0
    //         if (!TotalServicePrice && !TotalServiceParts) {
    //             return resp.status(400).json({ message: "please provide Service Price or Service Parts", success: false })
    //         }

    //         if (TotalServicePrice && TotalServicePrice > 0) {
    //             cartObject.TotalServicePrice = TotalServicePrice;
    //         }
    //         else {
    //             TotalServiceParts.forEach((data) => {
    //                 if (TotalServiceParts[0].selected == true)
    //                     calculatedPrice = calculatedPrice + parseFloat(data.partPrice)
    //             });
    //             cartObject.TotalServicePrice = calculatedPrice;
    //         }
    //         if (TotalServiceParts && TotalServiceParts.length !== 0) {
    //             cartObject.TotalServiceParts = TotalServiceParts
    //         }
    //         //pri
    //         // if (SheduledTime) {
    //         //     cartObject.SheduledTime = SheduledTime
    //         // }
    //         let oldData = await serviceProductCartModel.serviceProductCartModel.findOne({ companyId: companyId, UserId: UserId })
    //         if (oldData) {
    //             let existingSchedule = [];
    //             //pri
    //             // existingSchedule.push(SheduledTime)
    //             let serviceExists = oldData.CartServices.some(cartService => cartService.serviceId == serviceId)
    //             let sheduleexisting = oldData.CartServices.find(eachcart => eachcart.serviceId == serviceId)
    //             //pri
    //             // sheduleexisting.SheduledTime.forEach((appointmentsId)=>{
    //             //     if(!existingSchedule.some(newappointments => newappointments.appointmentId == appointmentsId.appointmentId)){
    //             //       existingSchedule.push(appointmentsId)
    //             //     }
    //             // })
    //             // if(existingSchedule){
    //             // cartObject.SheduledTime = existingSchedule
    //             // }
    //             if (serviceExists) {
    //                 let updateservice = await serviceProductCartModel.serviceProductCartModel.findOneAndUpdate(
    //                     { companyId: companyId, UserId: UserId },
    //                     { $pull: { CartServices: { serviceId: serviceId } } },
    //                     { new: true }
    //                 )
    //                 if (updateservice) {
    //                     let addservice = await serviceProductCartModel.serviceProductCartModel.findOneAndUpdate(
    //                         { companyId: companyId, UserId: UserId },
    //                         { $addToSet: { CartServices: cartObject } },
    //                         { new: true }
    //                     )
    //                     if (!addservice) {
    //                         return resp.status(400).json({ message: "sevice not added to cart", success: false })
    //                     }
    //                     return resp.status(200).json({ message: "service added to cart", data: addservice, success: true })

    //                 }
    //             }
    //             else {
    //                 let addservice = await serviceProductCartModel.serviceProductCartModel.findOneAndUpdate(
    //                     { companyId: companyId, UserId: UserId },
    //                     { $addToSet: { CartServices: cartObject } },
    //                     { new: true }
    //                 )
    //                 if (!addservice) {
    //                     return resp.status(400).json({ message: "sevice not added to cart", success: false })
    //                 }
    //                 return resp.status(200).json({ message: "service added to cart", data: addservice, success: true })

    //             }


    //         }
    //         else {
    //             let result = new serviceProductCartModel.serviceProductCartModel({ companyId, UserId, CartServices: [cartObject] })
    //             result = await result.save();
    //             if (!result) {
    //                 return resp.status(400).json({ message: "sevice not added to cart", success: false })
    //             }
    //             return resp.status(200).json({ message: "service added to cart", data: result, success: true })
    //         }


    //     } catch (error) {
    //         return resp.status(400).json({ message: "something went wrong", error: error.message, success: false })
    //     }
    // },
    // updateCartServiceParts: async (req, resp) => {
    //     console.log("xxxxxxxxxxxxxxx", req.body)
    //     try {
    //         let { serviceId, UserId, TotalServiceParts } = req.body;
    //         let companyId = req.query.companyId;
    //         let operation = req.query.operation;
    //         console.log("xxxxxxxxxxxxxxx", req.query.operation)
    //         if (!serviceId || !companyId || !UserId || !TotalServiceParts) {
    //             return resp.status(400).json({ message: "please provide all required fields", success: false })
    //         }
    //         else {
    //             let result = await serviceProductCartModel.serviceProductCartModel.findOne({
    //                 companyId, UserId,
    //                 CartServices: { $elemMatch: { serviceId: serviceId } }
    //             })
    //             if (!result) {
    //                 return resp.status(400).json({ message: "service or user not found", success: false })
    //             }
    //             if (operation == "add") {
    //                 let serviceIndex = result.CartServices.findIndex(s => s.serviceId == serviceId)
    //                 let existingParts = result.CartServices[serviceIndex].TotalServiceParts || [];

    //                 let newParts = TotalServiceParts.filter(newPart =>
    //                     !existingParts.some(existingPart => existingPart.partName === newPart.partName)
    //                 );
    //                 if (newParts.length === 0) {
    //                     return resp.status(400).json({ message: "not new data to add", success: false })
    //                 }
    //                 let updatedResult = await serviceProductCartModel.serviceProductCartModel.updateOne(
    //                     { companyId, UserId, "CartServices.serviceId": serviceId },
    //                     { $push: { "CartServices.$.TotalServiceParts": { $each: newParts } } },
    //                     { new: true }
    //                 )
    //                 if (updatedResult) {
    //                     let calculatedPrice = null;

    //                     let findData = await serviceProductCartModel.serviceProductCartModel.findOne({
    //                         companyId, UserId,
    //                         CartServices: { $elemMatch: { serviceId: serviceId } }
    //                     })

    //                     if (findData) {
    //                         let serviceIndex = findData.CartServices.findIndex(s => s.serviceId == serviceId)
    //                         let updatedExistingPart = findData.CartServices[serviceIndex].TotalServiceParts || [];
    //                         updatedExistingPart.forEach((data) => {
    //                             if (data.partPrice) {
    //                                 calculatedPrice = calculatedPrice + parseFloat(data.partPrice)
    //                             }
    //                         });
    //                     }
    //                     if (calculatedPrice) {
    //                         let updatePrice = await serviceProductCartModel.serviceProductCartModel.updateOne(
    //                             { companyId, UserId, "CartServices.serviceId": serviceId },
    //                             { $set: { "CartServices.$.TotalServicePrice": calculatedPrice } },
    //                             { new: true }
    //                         )
    //                     }
    //                 }

    //                 if (!updatedResult) {
    //                     return resp.status(400).json({ message: "something went wrong", success: false })

    //                 }
    //                 return resp.status(200).json({ message: "part added succesfully", success: true, data: updatedResult })
    //             }
    //             else if (operation == "delete") {
    //                 let deltedResult = await serviceProductCartModel.serviceProductCartModel.updateOne(
    //                     { companyId, UserId, "CartServices.serviceId": serviceId },
    //                     { $pull: { "CartServices.$.TotalServiceParts": { partName: { $in: TotalServiceParts.map(p => p.partName) } } } },
    //                     { new: true }
    //                 )
    //                 if (deltedResult) {
    //                     let calculatedPrice = 0;

    //                     let findData = await serviceProductCartModel.serviceProductCartModel.findOne({
    //                         companyId, UserId,
    //                         CartServices: { $elemMatch: { serviceId: serviceId } }
    //                     })

    //                     if (findData) {
    //                         let serviceIndex = findData.CartServices.findIndex(s => s.serviceId == serviceId)
    //                         let updatedExistingPart = findData.CartServices[serviceIndex].TotalServiceParts || [];
    //                         updatedExistingPart.forEach((data) => {
    //                             if (data.partPrice) {
    //                                 calculatedPrice = calculatedPrice + parseFloat(data.partPrice)
    //                             }
    //                         });
    //                     }
    //                     if (calculatedPrice != null) {
    //                         let updatePrice = await serviceProductCartModel.serviceProductCartModel.updateOne(
    //                             { companyId, UserId, "CartServices.serviceId": serviceId },
    //                             { $set: { "CartServices.$.TotalServicePrice": calculatedPrice } },
    //                             { new: true }
    //                         )
    //                     }
    //                 }

    //                 if (!deltedResult) {
    //                     return resp.status(400).json({ message: "something went wrong", success: false })

    //                 }
    //                 return resp.status(200).json({ message: "part deleted succesfully", success: true, data: deltedResult })
    //             }
    //         }
    //     } catch (error) {
    //         return resp.status(400).json({ message: "something went wrong", success: false, error: error.message })
    //     }
    // },
    deletetocart: async (req, resp) => {
        console.log("^^^^^^^", req.body)
        try {
            let { UserId, serviceId } = req.body;
            let companyId = req.query.companyId;
            if (!companyId || !UserId || !serviceId) {
                return resp.status(400).json({ message: "please provide proper data", success: false })

            }
            let result = await serviceProductCartModel.serviceProductCartModel.findOne({
                companyId, UserId,
                CartServices: { $elemMatch: { serviceId: serviceId } }
            })
            if (!result) {
                return resp.status(400).json({ message: "service or user not found", success: false })
            }
            let updateservice = await serviceProductCartModel.serviceProductCartModel.findOneAndUpdate(
                { companyId: companyId, UserId: UserId, CartServices: { $elemMatch: { serviceId: serviceId } } },
                { $pull: { CartServices: { serviceId: serviceId } } },
                { new: true }
            )
            if (!updateservice) {
                return resp.status(400).json({ message: "sevice not deleted from cart", success: false })

            }
            return resp.status(200).json({ message: "service deleted succesfully", success: true, data: updateservice })


        } catch (error) {
            return resp.status(400).json({ message: "something went wrong", success: false, error: error.message })

        }
    },
    getServiceCartData: async (matchCondition) => {
        return await serviceProductCartModel.serviceProductCartModel.aggregate([
            {
                $match: matchCondition
            },
            {
                $lookup: {
                    from: "users",
                    localField: "UserId",
                    foreignField: "_id",
                    as: "UserInfo"
                }
            },
            {
                $lookup: {
                    from: "serviceproducts",
                    localField: "CartServices.serviceId",
                    foreignField: "_id",
                    as: "ServiceInfo"
                }
            },
            {
                $lookup: {
                    from: "serviceappointments",
                    localField: "CartServices.SheduledTime.appointmentId",
                    foreignField: "schedule.appointments._id",
                    as: "appointmentInfo"
                }
            },

            {
                $addFields: {
                    CartServices: {
                        $map: {
                            input: "$CartServices",
                            as: "cartService",
                            in: {
                                $mergeObjects: [
                                    "$$cartService",
                                    {
                                        serviceDetails: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$ServiceInfo",
                                                        as: "service",
                                                        cond: { $eq: ["$$service._id", "$$cartService.serviceId"] }
                                                    }
                                                },
                                                0
                                            ]
                                        },
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    CartServices: {
                        $map: {
                            input: "$CartServices",
                            as: "cartService",
                            in: {
                                $mergeObjects: [
                                    "$$cartService",
                                    {
                                        appointmentMatches: {
                                            $map: {
                                                input: "$$cartService.SheduledTime",
                                                as: "sheduledTime",
                                                in: {
                                                    $let: {
                                                        vars: {
                                                            flattenedAppointments: {
                                                                $reduce: {
                                                                    input: "$appointmentInfo",
                                                                    initialValue: [],
                                                                    in: {
                                                                        $concatArrays: [
                                                                            "$$value",
                                                                            {
                                                                                $map: {
                                                                                    input: "$$this.schedule",
                                                                                    as: "schedule",
                                                                                    in: "$$schedule.appointments"
                                                                                }
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        in: {

                                                            // matchedAppointment: {
                                                            $arrayElemAt: [
                                                                {
                                                                    $filter: {
                                                                        input: {
                                                                            $reduce: {
                                                                                input: "$$flattenedAppointments",
                                                                                initialValue: [],
                                                                                in: { $concatArrays: ["$$value", "$$this"] }
                                                                            }
                                                                        },
                                                                        as: "appointment",
                                                                        cond: {
                                                                            $and: [
                                                                                { $eq: ["$$appointment._id", "$$sheduledTime.appointmentId"] },
                                                                            ]
                                                                        }
                                                                    }
                                                                },
                                                                0
                                                            ]
                                                            // }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    appointmentInfo: 0
                }
            }
        ]);
    },
    gettocart: async (req, res) => {
        let { companyId, UserId, serviceId } = req.query;

        try {
            if (!companyId || !UserId) {
                return res.status(400).json({ message: "please provide company id and user id", success: false })
            }
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (UserId) {
                if (!mongoose.Types.ObjectId.isValid(UserId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.UserId = mongoose.Types.ObjectId.createFromHexString(UserId);
            }
            if (serviceId) {
                if (!mongoose.Types.ObjectId.isValid(serviceId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition["CartServices.serviceId"] = mongoose.Types.ObjectId.createFromHexString(serviceId);
            }

            const data = await module.exports.getServiceCartData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Services Found', success: false });
            }

            // console.log('result of populated data', data);
            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            return res.status(404).json({ message: 'Something went wrong', success: false, error: error.message });
        }
    }
}