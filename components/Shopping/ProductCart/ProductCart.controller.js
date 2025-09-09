// const Cart = require('./ProductCart.model');
// const mongoose = require('mongoose');

// const { ObjectID } = require('mongodb');
// const { data } = require('jquery');

// module.exports = {




//     addtocart: async (req, res) => {
//         console.log("prasad", req.body)
//         try {
//             const { productId, userId, quantity, companyId, price } = req.body;

//             const existingCart = await Cart.findOne({ userId: ObjectID(userId), companyId: ObjectID(companyId) });

//             if (existingCart) {
//                 const productIndex = existingCart.products.findIndex(p => p.productId.toString() === productId);

//                 if (productIndex > -1) {
//                     existingCart.products[productIndex].quantity += quantity;
//                     existingCart.products[productIndex].totalPrice = existingCart.products[productIndex].quantity * existingCart.products[productIndex].price;
//                 } else {
//                     existingCart.products.push({
//                         productId: ObjectID(productId),
//                         quantity,
//                         price,
//                         totalPrice: quantity * price
//                     });
//                 }

//                 const updatedCart = await existingCart.save();

//                 return res.status(200).send({
//                     success: true,
//                     message: "Cart updated successfully",
//                     data: updatedCart
//                 });
//             } else {
//                 const newCart = new Cart({
//                     userId: ObjectID(userId),
//                     companyId: ObjectID(companyId),
//                     products: [{
//                         productId: ObjectID(productId),
//                         quantity,
//                         price,
//                         totalPrice: quantity * price
//                     }]
//                 });

//                 const data = await newCart.save();
//                 res.status(200).send({
//                     success: true,
//                     message: "Successfully added to cart",
//                     data: data
//                 });
//             }
//         } catch (error) {
//             res.status(400).send({
//                 success: false,
//                 message: "Failed to add to cart",
//                 error: error.message
//             });
//         }
//     },
//     gettocart: async (req, res) => {
//         // console.log("prasadheloooooooo", req.query)

//         try {
//             let query = {};

//             if (req.query.companyId) {
//                 query.companyId = ObjectID(req.query.companyId);
//             }
//             if (req.query.userId) {
//                 query.userId = ObjectID(req.query.userId);
//             }

//             const data = await Cart.aggregate([
//                 {
//                     $match: query
//                 },
//                 {
//                     $lookup: {
//                         from: "products",
//                         localField: "products.productId",
//                         foreignField: "_id",
//                         as: "addedDetails"
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: "users",
//                         localField: "userId",
//                         foreignField: "_id",
//                         as: "userDetails"
//                     }
//                 },
//                 {
//                     $addFields: {
//                         products: {
//                             $map: {
//                                 input: "$products",
//                                 as: "product",
//                                 in: {
//                                     $mergeObjects: [
//                                         "$$product",
//                                         {
//                                             addedDetails: {
//                                                 $arrayElemAt: [
//                                                     {
//                                                         $filter: {
//                                                             input: "$addedDetails",
//                                                             as: "item",
//                                                             cond: { $eq: ["$$item._id", { $toObjectId: "$$product.productId" }] }
//                                                         }
//                                                     },
//                                                     0
//                                                 ]
//                                             },
//                                             totalPrice: { $multiply: ["$$product.quantity", "$$product.price"] } // Calculate totalPrice
//                                         }
//                                     ]
//                                 }
//                             }
//                         },

//                     }
//                 },
//                 {
//                     $project: {
//                         addedDetails: 0
//                     }
//                 }
//             ]);

//             if (data.length > 0) {
//                 res.status(200).send({
//                     success: true,
//                     message: "Successfully Fetched Cart Data",
//                     data: data
//                 });
//             } else {
//                 res.status(404).send({
//                     success: false,
//                     message: "No Cart Data Found"
//                 });
//             }
//         } catch (error) {
//             res.status(400).send({
//                 success: false,
//                 message: "Failed to Fetch Cart Data",
//                 error: error.message
//             });
//         }
//     },


//     // deletetocart: async (req, res) => {
//     //     console.log("req.body",req.body,req.query.cartId)
//     //     try {
//     //         const { productId } = req.body;
//     //         const cartId = req.query.cartId;

//     //         if (!cartId) {
//     //             return res.status(400).send({
//     //                 success: false,
//     //                 message: "Cart ID is required"
//     //             });
//     //         }

//     //         const cart = await Cart.findById(cartId);
//     //         if (!cart) {
//     //             return res.status(404).send({
//     //                 success: false,
//     //                 message: "Cart not found"
//     //             });
//     //         }

//     //         if (productId) {
//     //             const productIndex = cart.products.findIndex(
//     //                 (p) => p.productId.toString() === productId
//     //             );

//     //             if (productIndex === -1) {
//     //                 return res.status(404).send({
//     //                     success: false,
//     //                     message: "Product not found in cart"
//     //                 });
//     //             }

//     //             cart.products.splice(productIndex, 1);
//     //             const updatedCart = await cart.save();

//     //             return res.status(200).send({
//     //                 success: true,
//     //                 message: "Product successfully deleted from cart",
//     //                 data: updatedCart
//     //             });
//     //         }

//     //         // Optional: delete whole cart if no productId provided
//     //         await Cart.findByIdAndDelete(cartId);
//     //         return res.status(200).send({
//     //             success: true,
//     //             message: "Successfully deleted the cart",
//     //             data: cart
//     //         });

//     //     } catch (error) {
//     //         res.status(500).send({
//     //             success: false,
//     //             message: "Failed to delete from cart",
//     //             error: error.message
//     //         });
//     //     }
//     // },



//     deletetocart: async (req, res) => {
//         try {
//             const { productId } = req.body;
//             const cartId = req.params.id; // <-- Fix here
//             console.log("%%%%%%%%%%%% 444", cartId, productId);
//             const cart = await Cart.findById(cartId);
            
      
//           if (!cart) {
//             return res.status(404).send({
//               success: false,
//               message: "Cart not found"
//             });
//           }
      
//           if (productId) {
//             const productIndex = cart.products.findIndex(
//               (p) => p.productId.toString() === productId
//             );
      
//             if (productIndex === -1) {
//               return res.status(404).send({
//                 success: false,
//                 message: "Product not found in cart"
//               });
//             }
      
//             cart.products.splice(productIndex, 1); // Remove product
      
//             const updatedCart = await cart.save();
      
//             return res.status(200).send({
//               success: true,
//               message: "Product successfully deleted from cart",
//               data: updatedCart
//             });
//           }
      
//           return res.status(400).send({
//             success: false,
//             message: "No productId provided"
//           });
      
//         } catch (error) {
//           res.status(500).send({
//             success: false,
//             message: "Failed to delete product from cart",
//             error: error.message
//           });
//         }
//       },
      


// updatecart: async (req, res) => {
//     try {
//         const { productId, quantity, price } = req.body;

//         if (!productId || !quantity || !price) {
//             return res.status(400).send({
//                 success: false,
//                 message: "Missing required fields: productId, quantity, or price"
//             });
//         }

//         const cart = await Cart.findById(req.params.id);
//         if (!cart) {
//             return res.status(404).send({
//                 success: false,
//                 message: "Cart not found"
//             });
//         }


//         const product = cart.products.find((p) => p.productId.toString() === productId);

//         if (!product) {
//             return res.status(404).send({
//                 success: false,
//                 message: "Product not found in cart"
//             });
//         }

//         product.quantity = quantity;
//         product.price = price;
//         product.totalPrice = quantity * price;

//         const updatedCart = await cart.save();

//         res.status(200).send({
//             success: true,
//             message: "Successfully Updated Cart",
//             data: updatedCart
//         });
//     } catch (error) {
//         res.status(500).send({
//             success: false,
//             message: "Failed to update cart",
//             error: error.message
//         });
//     }
// },
// };




//new  code

const Cart = require('./ProductCart.model');
const mongoose = require('mongoose');

module.exports = {
    addtocart: async (req, res) => {
        console.log("prasad", req.body);
        try {
            const { productId, userId, quantity, companyId, price } = req.body;

            const existingCart = await Cart.findOne({ 
                userId: mongoose.Types.ObjectId(userId), 
                companyId: mongoose.Types.ObjectId(companyId) 
            });

            if (existingCart) {
                const productIndex = existingCart.products.findIndex(p => p.productId.toString() === productId);

                if (productIndex > -1) {
                    existingCart.products[productIndex].quantity += quantity;
                    existingCart.products[productIndex].totalPrice = existingCart.products[productIndex].quantity * existingCart.products[productIndex].price;
                } else {
                    existingCart.products.push({
                        productId: mongoose.Types.ObjectId(productId),
                        quantity,
                        price,
                        totalPrice: quantity * price
                    });
                }

                const updatedCart = await existingCart.save();

                return res.status(200).send({
                    success: true,
                    message: "Cart updated successfully",
                    data: updatedCart
                });
            } else {
                const newCart = new Cart({
                    userId: mongoose.Types.ObjectId(userId),
                    companyId: mongoose.Types.ObjectId(companyId),
                    products: [{
                        productId: mongoose.Types.ObjectId(productId),
                        quantity,
                        price,
                        totalPrice: quantity * price
                    }]
                });

                const data = await newCart.save();
                res.status(200).send({
                    success: true,
                    message: "Successfully added to cart",
                    data: data
                });
            }
        } catch (error) {
            res.status(400).send({
                success: false,
                message: "Failed to add to cart",
                error: error.message
            });
        }
    },

    gettocart: async (req, res) => {
        try {
            let query = {};

            if (req.query.companyId) {
                query.companyId = mongoose.Types.ObjectId(req.query.companyId); 
            }
            if (req.query.userId) {
                query.userId = mongoose.Types.ObjectId(req.query.userId);
            }

            const data = await Cart.aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: "products",
                        localField: "products.productId",
                        foreignField: "_id",
                        as: "addedDetails"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "userDetails"
                    }
                },
                {
                    $addFields: {
                        products: {
                            $map: {
                                input: "$products",
                                as: "product",
                                in: {
                                    $mergeObjects: [
                                        "$$product",
                                        {
                                            addedDetails: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$addedDetails",
                                                            as: "item",
                                                            cond: { $eq: ["$$item._id", "$$product.productId"] } // Fixed: Removed ObjectId conversion
                                                        }
                                                    },
                                                    0
                                                ]
                                            },
                                            totalPrice: { $multiply: ["$$product.quantity", "$$product.price"] }
                                        }
                                    ]
                                }
                            }
                        },
                    }
                },
                {
                    $project: {
                        addedDetails: 0
                    }
                }
            ]);

            if (data.length > 0) {
                res.status(200).send({
                    success: true,
                    message: "Successfully Fetched Cart Data",
                    data: data
                });
            } else {
                res.status(404).send({
                    success: false,
                    message: "No Cart Data Found"
                });
            }
        } catch (error) {
            res.status(400).send({
                success: false,
                message: "Failed to Fetch Cart Data",
                error: error.message
            });
        }
    },

    deletetocart: async (req, res) => {
        try {
            const { productId } = req.body;
            const cartId = req.params.id;
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

                cart.products.splice(productIndex, 1);

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

    updatecart: async (req, res) => {
        try {
            const { productId, quantity, price } = req.body;

            if (!productId || !quantity || !price) {
                return res.status(400).send({
                    success: false,
                    message: "Missing required fields: productId, quantity, or price"
                });
            }

            const cart = await Cart.findById(req.params.id);
            if (!cart) {
                return res.status(404).send({
                    success: false,
                    message: "Cart not found"
                });
            }

            const product = cart.products.find((p) => p.productId.toString() === productId);

            if (!product) {
                return res.status(404).send({
                    success: false,
                    message: "Product not found in cart"
                });
            }

            product.quantity = quantity;
            product.price = price;
            product.totalPrice = quantity * price;

            const updatedCart = await cart.save();

            res.status(200).send({
                success: true,
                message: "Successfully Updated Cart",
                data: updatedCart
            });
        } catch (error) {
            res.status(500).send({
                success: false,
                message: "Failed to update cart",
                error: error.message
            });
        }
    }
};