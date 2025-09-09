const { ObjectID } = require('mongodb')
const ServieOrderSchema = require('./ServiceOrder.model')
const { error } = require('console')

module.exports = {

    // addorders: async (req, res) => {
    //     try {
    //         const add = new ServieOrderSchema(req.body);
    //         await add.save();

    //         // Fetch the latest added order
    //         const lastOrder = await ServieOrderSchema.findOne().sort({ _id: -1 });
    //         res.status(200).send({
    //             success: true,
    //             message: "Successfully added",
    //             data: lastOrder
    //         });

    //     } catch (error) {
    //         res.status(400).send({
    //             success: false,
    //             message: "Unsuccessfully added",
    //             error: error.message
    //         });
    //     }
    // },


    addorders: async (req, res) => {
        try {
            const { cartId } = req.body;

            await ServieOrderSchema.deleteMany({ cartId });

            const newOrder = new ServieOrderSchema(req.body);
            const data = await newOrder.save();

            res.status(200).send({
                success: true,
                message: "Successfully added order",
                data: data
            });
        } catch (error) {
            res.status(400).send({
                success: false,
                message: "Unsuccessfully added",
                error: error.message
            });
        }
    },
    getorders: async (req, res) => {
        let query = {}
        console.log("pri", req.query)
        if (req.query.user) {
            query.user = ObjectID(req.query.user)
        }
        if (req.query.comapnyId) {
            query.comapnyId = ObjectID(req.query.comapnyId)
        }
        // if(req.query.cartId){
        //     query.cartId  = ObjectID(req.query.cartId)
        // }
        try {
            const data = await ServieOrderSchema.aggregate([
                {
                    $match: query
                },
                {
                    $sort: { createdAt: -1 }  // Sort orders by latest first
                },
                {
                    $limit: 1  // Get only the latest order
                },
                {
                    $lookup: {
                        from: 'serviceproducts',
                        localField: 'UpdatedCartData.serviceId',
                        foreignField: '_id',
                        as: 'serviceDetails'
                    }
                },
                {
                    $addFields: {
                        "UpdatedCartData": {
                            $map: {
                                input: "$UpdatedCartData",
                                as: "cart",
                                in: {
                                    $mergeObjects: [
                                        "$$cart",
                                        {
                                            "serviceDetails": {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$serviceDetails",
                                                            as: "details",
                                                            cond: { $eq: ["$$details._id", "$$cart.serviceId"] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);

            res.status(200).send({
                success: true,
                message: "Successfully fetched latest order",
                data: data.length > 0 ? data[0] : null
            });
        } catch (error) {
            res.status(400).send({
                success: false,
                message: "Failed to fetch orders",
                error: error.message
            });
        }
    },

    updateScheduleTime: async (req, res) => {
        if (!req.query.companyId) return res.status(400).send({ success: false, message: "Please send companyId" })
        try {

            const data = await ServieOrderSchema.findOneAndUpdate(
                { _id: req.body.cartId },
                {
                    $set: {
                        UpdatedCartData: req.body.Data.UpdatedCartData,
                    }
                },
                { new: true }
            );

            res.status(200).send({
                success: true,
                message: "Successfully data added",
                data
            })
        } catch (error) {
            console.log("error", error)
            res.status(500).send({
                success: false,
                message: "Something went wrong",
                error: error.message
            })

        }
    },

    upadteorders: async (req, res) => {
        try {
            const data = await ServieOrderSchema.findByIdAndUpdate({ _id: req.params.id }, {
                $set: {
                    ...req.body
                }
            })

            res.status(200).send({
                success: true,
                message: "Successfully Updated",
                data: data,
            })
        } catch (error) {
            res.status(400).send({
                success: false,
                message: "UnSuccessfully Updated",
                error: error.message,
            })
        }
    },

    deleteorders: async (req, res) => {
        try {
            const data = await ServieOrderSchema.findByIdAndDelete({ _id: req.params.id })


            res.status(200).send({
                success: true,
                message: "deleted Successfully",
                data: data
            })
        } catch (error) {
            res.status(400).send({
                success: false,
                message: "deleted UnSuccessfully",
                error: error.message
            })
        }
    }
}