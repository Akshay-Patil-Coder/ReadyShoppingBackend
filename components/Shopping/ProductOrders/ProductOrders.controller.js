const { ObjectID } = require('mongodb')
const OrderSchema = require('./ProductOrders.model')
const { error } = require('console');
const { ObjectId } = require('mongodb');


module.exports = {

    addorders: async (req, res) => {
        try {
            const { cartId } = req.body;
            console.log("rrrrrrrrrrr", cartId)
            await OrderSchema.deleteMany({ cartId });

            const newOrder = new OrderSchema(req.body);
            const data = await newOrder.save();

            res.status(200).send({
                success: true,
                message: "Successfully added and old orders (if any) removed",
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
        if(req.query.deliveryboyId){
            query.deliveryboyId = ObjectID(req.query.deliveryboyId)
        }
        if (req.query.user) {
            query.user = ObjectID(req.query.user)
        }
        if (req.query.companyId) {
            query.companyId = ObjectID(req.query.companyId)
        }
        if (req.query.cartId) {
            query.cartId = ObjectID(req.query.cartId)
        }
        if (req.query.status) {
            query.status = req.query.status
        }
        try {
            const data = await OrderSchema.aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: 'delivery_assigns',
                        localField: 'deliveryboyId',
                        foreignField: '_id',
                        as: 'delivery_assign'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'users'
                    }
                },
                {
                    $lookup: {
                        from: 'carts',
                        localField: 'cartId',
                        foreignField: '_id',
                        as: 'carts'
                    }
                },
                {
                $lookup: {
                    from: 'products',
                    localField: 'carts.products.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
                // {
                //     $sort:{createdAt:-1}
                // }
            ])
            res.status(200).send({
                success: true,
                message: "Successfully fetched orders",
                data: data
            })
        } catch (error) {
            res.status(400).send({
                success: false,
                message: "UnSuccessfully fetched orders",
                error: error.message
            })
        }
    },


    // getorders: async (req, res) => {
    //     let query = {}

    //     if (req.query.user) {
    //         query.user = ObjectID(req.query.user)
    //     }
    //     if (req.query.comapnyId) {
    //         query.comapnyId = ObjectID(req.query.comapnyId)
    //     }

    //     try {
    //         const data = await OrderSchema.aggregate([
    //             {
    //                 $match: query
    //             },

    //             {
    //                 $lookup: {
    //                     from: 'carts',
    //                     localField: 'user',
    //                     foreignField: 'userId',
    //                     as: 'carts'

    //                 }
    //             }
    //         ])

    //         res.status(200).send({
    //             success: true,
    //             message: "Successfully fetched orders",
    //             data: data
    //         })
    //     } catch (error) {
    //         res.status(400).send({
    //             success: false,
    //             message: "UnSuccessfully fetched orders",
    //             error: error.message
    //         })
    //     }
    // },



    getorderdeatils: async (req, res) => {
        try {
            const { user, companyId, productId } = req.query;

            let query = {};
            if (user) query.user = ObjectId(user);
            if (companyId) query.companyId = ObjectId(companyId);
            console.log("req.qusssssss", req.query.productId)
            const data = await OrderSchema.aggregate([
                { $match: query },

                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'userData'
                    }
                },
                {
                    $unwind: {
                        path: '$userData',
                        preserveNullAndEmptyArrays: true
                    }
                },

                {
                    $addFields: {
                        cartData: {
                            $filter: {
                                input: '$cartData',
                                as: 'item',
                                cond: {
                                    $eq: ['$$item._id', req.query.productId]
                                }
                            }
                        }
                    }
                },

                // Optional: Flatten the cartData if you only expect one item
                {
                    $addFields: {
                        cartItem: { $arrayElemAt: ['$cartData', 0] }
                    }
                },

                // Optional: Limit fields returned
                {
                    $project: {
                        cartItem: 1,
                        // cartData: 1,
                        userData: 1,
                        createdAt: 1,
                        status: 1,
                        time: 1,
                        payment_method: 1,
                        shoppingId: 1
                    }
                }
            ]);

            res.status(200).send({
                success: true,
                message: 'Successfully fetched order and filtered cart item',
                data
            });
        } catch (error) {
            res.status(400).send({
                success: false,
                message: 'Error fetching data',
                error: error.message
            });
        }
    },

    // getorderdeatils: async (req, res) => {
    //     console.log("rrrrrrrcc",req.query.productId)
    //     console.log("rrrrrrrcc",req.query.user)
    //     console.log("rrrrrrrcc",req.query.companyId)



    //     let query = {};

    //     if (req.query.user) {
    //         query.user = ObjectId(req.query.user);
    //     }
    //     if (req.query.companyId) {
    //         query.companyId = ObjectId(req.query.companyId);
    //     }
    //     console.log("rrrrrrr",req.query.productId,req.query.user)
    //     try {
    //         const productId = req.query.productId ? ObjectId(req.query.productId) : null;

    //         const data = await OrderSchema.aggregate([
    //             { $match: query },

    //             // Lookup user details
    //             {
    //                 $lookup: {
    //                     from: 'users',
    //                     localField: 'user',
    //                     foreignField: '_id',
    //                     as: 'userInfo'
    //                 }
    //             },
    //             {
    //                 $unwind: {
    //                     path: '$userInfo',
    //                     preserveNullAndEmptyArrays: true
    //                 }
    //             },

    //             // Lookup cart by userId
    //             {
    //                 $lookup: {
    //                     from: 'carts',
    //                     localField: 'user',
    //                     foreignField: 'userId',
    //                     as: 'carts'
    //                 }
    //             },

    //             // Filter only carts that include the matching productId (if given)
    //             ...(productId
    //                 ? [
    //                     {
    //                         $addFields: {
    //                             carts: {
    //                                 $filter: {
    //                                     input: '$carts',
    //                                     as: 'cart',
    //                                     cond: {
    //                                         $gt: [
    //                                             {
    //                                                 $size: {
    //                                                     $filter: {
    //                                                         input: '$$cart.products',
    //                                                         as: 'product',
    //                                                         cond: { $eq: ['$$product._id', productId] }
    //                                                     }
    //                                                 }
    //                                             },
    //                                             0
    //                                         ]
    //                                     }
    //                                 }
    //                             }
    //                         }
    //                     }
    //                 ]
    //                 : [])
    //         ]);

    //         res.status(200).send({
    //             success: true,
    //             message: 'Successfully fetched orders',
    //             data: data
    //         });
    //     } catch (error) {
    //         res.status(400).send({
    //             success: false,
    //             message: 'UnSuccessfully fetched orders',
    //             error: error.message
    //         });
    //     }
    // },


    // getorders:async(req,res)=>{
    //     let query = {}

    //     if(req.query.user){
    //         query.user  = ObjectID(req.query.user)
    //     }
    //     if(req.query.comapnyId){
    //         query.comapnyId  = ObjectID(req.query.comapnyId)
    //     }
    //     if(req.query.cartId){
    //         query.cartId  = ObjectID(req.query.cartId)
    //     }
    //     try {
    //         const data = await OrderSchema.aggregate([
    //             {
    //                 $match:query
    //             },
    //             {
    //                 $lookup:{
    //                     from:'users',
    //                     localField:'user',
    //                     foreignField:'_id',
    //                     as:'users'
    //                 }
    //             },
    //             {
    //                 $lookup:{
    //                     from:'carts',
    //                     localField:'cartId',
    //                     foreignField:'_id',
    //                     as:'carts'

    //                 }
    //             }
    //         ])

    //         res.status(200).send({
    //             success:true,
    //             message:"Successfully fetched orders",
    //             data:data
    //         })
    //     } catch (error) {
    //         res.status(400).send({
    //             success:false,
    //             message:"UnSuccessfully fetched orders",
    //             error:error.message
    //         })
    //     }
    // },

    upadteorders: async (req, res) => {
        try {
            const data = await OrderSchema.findByIdAndUpdate({ _id: req.params.id }, {
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
            const { productId } = req.body;
            const cartId = req.params.id; // <-- Fix here
            console.log("%%%%%%%%%%%% 444", cartId, productId);
            const cart = await Cart.findById(cartId);
            
      
          if (!cart) {
            return res.status(404).send({
              success: false,
              message: "Cart not found"
            });
          }
      
          if (productId) {
            const productIndex = cart.products.findIndex(
              (p) => p.productId.toString() === productId
            );
      
            if (productIndex === -1) {
              return res.status(404).send({
                success: false,
                message: "Product not found in cart"
              });
            }
      
            cart.products.splice(productIndex, 1); // Remove product
      
            const updatedCart = await cart.save();
      
            return res.status(200).send({
              success: true,
              message: "Product successfully deleted from cart",
              data: updatedCart
            });
          }
      
          return res.status(400).send({
            success: false,
            message: "No productId provided"
          });
      
        } catch (error) {
          res.status(500).send({
            success: false,
            message: "Failed to delete product from cart",
            error: error.message
          });
        }
      },
    // deleteorders: async (req, res) => {
    //     try {
    //         const { productId } = req.body;
    //         const data = req.params.id; // <-- Fix here
    //         console.log("%%%%%%%%%%%% 444", data, productId);
    //         const orderData = await OrderSchema.findById(data);
            
      
    //       if (!orderData) {
    //         return res.status(404).send({
    //           success: false,
    //           message: "Order not found"
    //         });
    //       }
      
    //       if (productId) {
    //         const productIndex = orderData.products.findIndex(
    //           (p) => p.productId.toString() === productId
    //         );
      
    //         if (productIndex === -1) {
    //           return res.status(404).send({
    //             success: false,
    //             message: "Product not found in Orders"
    //           });
    //         }
      
    //         orderData.products.splice(productIndex, 1); // Remove product
      
    //         const updatedOrder = await orderData.save();
      
    //         return res.status(200).send({
    //           success: true,
    //           message: "Product successfully deleted from Orders",
    //           data: updatedOrder
    //         });
    //       }
      
    //       return res.status(400).send({
    //         success: false,
    //         message: "No productId provided"
    //       });
      
    //     } catch (error) {
    //       res.status(500).send({
    //         success: false,
    //         message: "Failed to delete product from Orders",
    //         error: error.message
    //       });
    //     }
    //   },

    // deleteorders: async (req, res) => {
    //     try {
    //         const data = await OrderSchema.findByIdAndDelete({ _id: req.params.id })


    //         res.status(200).send({
    //             success: true,
    //             message: "deleted Successfully",
    //             data: data
    //         })
    //     } catch (error) {
    //         res.status(400).send({
    //             success: false,
    //             message: "deleted UnSuccessfully",
    //             error: error.message
    //         })
    //     }
    // }
}