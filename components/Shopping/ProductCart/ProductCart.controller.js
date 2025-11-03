const { ProductCart } = require('./ProductCart.model');
const { Product, VariantProduct } = require('../VariantsProducts/VariantsProducts.model')
const mongoose = require('mongoose');

module.exports = {
    addtocart: async (req, res) => {
        let { UserId, companyId, ProductId, VariantProductId, ProductServicesIds, Quantity } = req.body
        try {
            if (!UserId || !companyId) {
                return res.status(400).json({ message: "User Or Company Not Found", success: false })
            }
            let FoundVariantProduct;
            let FoundProduct;
            if (ProductId && VariantProductId) {
                FoundProduct = await Product.findOne({ _id: ProductId, companyId: companyId, VariantProductIds: VariantProductId })
                if (!FoundProduct) {
                    return res.status(400).json({ message: "Product Not Found", success: false })
                }
                FoundVariantProduct = await VariantProduct.findOne({ _idP: VariantProductId, ProductId, companyId })
                if (!FoundVariantProduct) {
                    return res.status(400).json({ message: "Product Not Found", success: false })
                }
            }
            else {
                return res.status(400).json({ message: "Please Provide Valid Product", success: false })
            }
            if (FoundVariantProduct?.InventoryBaseStock) {
                if (FoundVariantProduct.InventoryBaseStock.InventoryBase == true) {
                    if (FoundVariantProduct.InventoryBaseStock.AvailableStock == 0) {
                        return res.status(400).json({ message: "Stock Not Available", success: false })
                    }
                    else if (FoundVariantProduct.InventoryBaseStock.AvailableStock < Quantity) {
                        Quantity = FoundVariantProduct.InventoryBaseStock.AvailableStock
                    }
                    else {
                        Quantity = Quantity
                    }
                }
                else {
                    Quantity = Quantity
                }
            }
            let FoundCart = await ProductCart.findOne({ UserId, companyId })

            if (FoundCart) {

            }
        } catch (error) {

        }
    },

    gettocart: async (req, res) => {
        try {
            let query = {};

            if (req.query.companyId) {
                query.companyId = mongoose.Types.ObjectId.createFromHexString(req.query.companyId);
            }
            if (req.query.userId) {
                query.userId = mongoose.Types.ObjectId.createFromHexString(req.query.userId);
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
                        from: "readyshoppingusers",
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