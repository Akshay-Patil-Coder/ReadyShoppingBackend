const { ProductCart, ProductOrder } = require('./ProductCart.model');
const { Product, VariantProduct } = require('../VariantsProducts/VariantsProducts.model')
const { User } = require('../../UserBase/User/User.model')
const { ProductService } = require('../ProductServices/ProductServices.model')
const mongoose = require('mongoose');
const PaytmChecksum = require("paytmchecksum");
const https = require("https");
const crypto = require('crypto');
const cron = require('node-cron');
const { brandmodel } = require('../ProductsBrand/ProductsBrand.model')
module.exports = {


    addtocart: async (req, res) => {
        let {
            UserId,
            companyId,
            ProductId,
            VariantProductId,
            ProductServicesIds = [],
            Quantity,
            Operation,
            ProductServiceId,
            ServiceActive,
            IsActive,
        } = req.body;

        if (req.user.UserId) UserId = req.user.UserId
        if (req.user.companyId) companyId = req.user.companyId
        try {
            if (!UserId || !companyId)
                return res
                    .status(400)
                    .json({ message: "User or Company not found", success: false });

            if (!ProductId || !VariantProductId)
                return res
                    .status(400)
                    .json({ message: "Please provide valid product details", success: false });

            const FoundUser = await User.findOne({ _id: UserId, companyId });
            if (!FoundUser)
                return res
                    .status(404)
                    .json({ message: "User not found", success: false });

            let FoundCart = await ProductCart.findOne({ UserId, companyId });



            if (!FoundCart) {
                FoundCart = new ProductCart({ UserId, companyId, Products: [] });
            }

            let existingIndex = FoundCart.Products.findIndex(
                (p) =>
                    p.ProductId.toString() === ProductId.toString() &&
                    p.VariantProductId.toString() === VariantProductId.toString() &&
                    p.Reserved !== true
            );


            const FoundProduct = await Product.findOne({
                _id: ProductId,
                companyId,
                VariantProductIds: VariantProductId,
            });
            if (!FoundProduct)
                return res.status(404).json({ message: "Product not found", success: false });

            const FoundVariantProduct = await VariantProduct.findOne({
                _id: VariantProductId,
                ProductId,
                companyId,
            });
            if (!FoundVariantProduct)
                return res.status(404).json({ message: "Variant not found", success: false });

            const calculateProductTotals = (variant, qty, activePaidServices = []) => {
                let total = variant.Price * qty;
                let discount = 0;
                if (variant.OfferPercentage > 0)
                    discount = (total * variant.OfferPercentage) / 100;

                let final = total - discount;
                if (activePaidServices.length > 0) {
                    const servicePrice = activePaidServices.reduce(
                        (sum, s) => sum + (s.ProductServiceAmount || 0),
                        0
                    );
                    total += servicePrice;
                    final += servicePrice;
                }

                return { total, discount, final };
            };

            const recalcCartTotals = (cart) => {
                let total = 0,
                    discount = 0,
                    final = 0;
                for (const p of cart.Products) {
                    if (p.IsActive !== false && p.Reserved !== true) {
                        total += p.TotalPrice || 0;
                        discount += p.DiscountPrice || 0;
                        final += p.FinalPrice || 0;
                    }
                }
                cart.TotalCartPrice = total;
                cart.DiscountCartPrice = discount;
                cart.FinalCartPrice = final;
            };
            if (Operation === "add") {
                if (!Quantity || Quantity <= 0) Quantity = 1;

                if (FoundVariantProduct.InventoryBaseStock?.InventoryBase) {
                    const stock = FoundVariantProduct.InventoryBaseStock.AvailableStock || 0;
                    if (stock <= 0)
                        return res.status(400).json({ message: "Out of stock", success: false });
                    if (stock < Quantity) Quantity = stock;
                }

                const paidServices = FoundProduct.ProductServices.filter((s) => s.Paid);
                const freeServices = FoundProduct.ProductServices.filter((s) => !s.Paid);

                const selectedPaidServices = paidServices.filter((s) =>
                    ProductServicesIds.includes(s.ProductServiceId.toString())
                );

                if (existingIndex !== -1 && FoundCart.Products[existingIndex].Reserved !== true) {
                    FoundCart.Products.splice(existingIndex, 1);
                }

                const { total, discount, final } = calculateProductTotals(
                    FoundVariantProduct,
                    Quantity,
                    selectedPaidServices
                );

                FoundCart.Products.push({
                    ProductId,
                    VariantProductId,
                    Quantity,
                    TotalPrice: total,
                    DiscountPrice: discount,
                    FinalPrice: final,
                    IsActive: true,
                    ProductServices: selectedPaidServices.map((s) => ({
                        ProductServiceId: s.ProductServiceId,
                        ServiceActive: true,
                    })),
                    ProductFreeServices: freeServices.map((s) => s.ProductServiceId),
                });

                recalcCartTotals(FoundCart);
                const saved = await FoundCart.save();

                try {
                    await module.exports.ValidateCart(req, res);
                } catch (e) {
                    console.warn("Cart validation failed:", e.message);
                }

                return res.status(200).json({ message: "Product added/updated", success: true, data: saved });
            }



            else if (Operation === "update") {
                if (existingIndex === -1)
                    return res.status(404).json({ message: "Product not found in cart", success: false });

                let existingProduct = FoundCart.Products[existingIndex];
                if (existingProduct.Reserved === true) {
                    return res.status(200).json({
                        message: "This product is reserved and cannot be updated",
                        success: true,
                        data: FoundCart
                    });
                }
                if (typeof IsActive !== "undefined") existingProduct.IsActive = IsActive;
                if (ProductServiceId && typeof ServiceActive !== "undefined") {
                    const sIndex = existingProduct.ProductServices.findIndex(
                        (s) => s.ProductServiceId.toString() === ProductServiceId.toString()
                    );

                    if (ServiceActive === true) {
                        if (sIndex === -1) {
                            existingProduct.ProductServices.push({
                                ProductServiceId,
                                ServiceActive: true
                            });
                        } else {
                            existingProduct.ProductServices[sIndex].ServiceActive = true;
                        }
                    }

                    if (ServiceActive === false) {
                        if (sIndex !== -1) {
                            existingProduct.ProductServices.splice(sIndex, 1);
                        }
                    }
                }

                if (typeof Quantity !== "undefined") {
                    if (Quantity <= 0)
                        return res.status(400).json({ message: "Quantity must be > 0", success: false });

                    if (FoundVariantProduct.InventoryBaseStock?.InventoryBase) {
                        const stock = FoundVariantProduct.InventoryBaseStock.AvailableStock || 0;
                        if (stock < Quantity)
                            Quantity = stock;
                    }

                    existingProduct.Quantity = Quantity;
                }

                const paidServices = FoundProduct.ProductServices.filter((s) => s.Paid);
                const activePaid = existingProduct.ProductServices.filter((s) => s.ServiceActive);
                const fullServiceData = paidServices.filter((s) =>
                    activePaid.some((ap) => ap.ProductServiceId.toString() === s.ProductServiceId.toString())
                );

                const { total, discount, final } = calculateProductTotals(
                    FoundVariantProduct,
                    existingProduct.Quantity,
                    fullServiceData
                );

                existingProduct.TotalPrice = total;
                existingProduct.DiscountPrice = discount;
                existingProduct.FinalPrice = final;

                FoundCart.Products[existingIndex] = existingProduct;

                recalcCartTotals(FoundCart);
                const saved = await FoundCart.save();
                try {
                    await module.exports.ValidateCart(req, res);
                } catch (e) {
                    console.warn("Cart validation failed:", e.message);
                }


                return res.status(200).json({ message: "Cart updated successfully", success: true, data: saved });
            }



            else if (Operation === "remove") {
                if (existingIndex === -1)
                    return res.status(404).json({ message: "Product not found in cart", success: false });

                let existingProduct = FoundCart.Products[existingIndex];

                if (existingProduct.Reserved === true) {
                    return res.status(200).json({
                        message: "This product is reserved and cannot be removed",
                        success: true,
                        data: FoundCart
                    });
                }
                FoundCart.Products.splice(existingIndex, 1);

                recalcCartTotals(FoundCart);

                const saved = await FoundCart.save();
                try {
                    await module.exports.ValidateCart(req, res);
                } catch (e) {
                    console.warn("Cart validation failed:", e.message);
                }


                return res.status(200).json({ message: "Product removed successfully", success: true, data: saved });
            }

            else {
                return res.status(400).json({ message: "Invalid Operation", success: false });
            }
        } catch (err) {
            console.error("AddToCart Error:", err);
            return res
                .status(500)
                .json({ message: "Internal Server Error", error: err.message, success: false });
        }
    },

    ValidateCart: async (req, res) => {
        const { UserId, companyId } = req.body;
        try {
            if (!UserId || !companyId)
                return res.status(400).json({ message: 'User Or Company Not Found', success: false });

            const FoundUser = await User.findOne({ _id: UserId, companyId });
            if (!FoundUser)
                return res.status(400).json({ message: 'User Not Found', success: false });

            let FoundCart = await ProductCart.findOne({ UserId, companyId });
            if (!FoundCart)
                return res.status(404).json({ message: 'Cart is empty', success: false });


            const calculateProductTotals = (variant, qty, activeServices = []) => {
                let total = variant.Price * qty;
                let discount = 0;
                if (variant.OfferPercentage > 0)
                    discount = (total * variant.OfferPercentage) / 100;

                let final = total - discount;

                if (activeServices.length) {
                    const serviceTotal = activeServices.reduce(
                        (sum, s) => sum + (s.ProductServiceAmount || 0),
                        0
                    );
                    total += serviceTotal;
                    final += serviceTotal;
                }

                return { total, discount, final };
            };


            let updatedProducts = [];

            for (let EachProduct of FoundCart.Products) {

                EachProduct.Reserved = EachProduct.Reserved || false;

                let FoundProduct = await Product.findOne({
                    _id: EachProduct.ProductId,
                    companyId,
                    isActive: true,
                });

                let FoundVariantProduct = await VariantProduct.findOne({
                    ProductId: EachProduct.ProductId,
                    _id: EachProduct.VariantProductId,
                    companyId,
                    isActive: true,
                });

                if (!FoundProduct || !FoundVariantProduct) continue;



                if (!EachProduct.Reserved && FoundVariantProduct.InventoryBaseStock?.InventoryBase === true) {
                    const availableStock = FoundVariantProduct.InventoryBaseStock.AvailableStock || 0;

                    if (availableStock <= 0) continue;

                    if (EachProduct.Quantity > availableStock) {
                        EachProduct.Quantity = availableStock;
                    }
                }


                const ProductServicesList = FoundProduct.ProductServices || [];
                const PaidServices = ProductServicesList.filter(s => s.Paid === true);
                const FreeServices = ProductServicesList.filter(s => s.Paid === false);

                let activePaidServices = [];
                let NewProductServices = [];
                let NewFreeServices = [];

                for (let EachService of EachProduct.ProductServices || []) {
                    const serviceData = await ProductService.findOne({
                        _id: EachService.ProductServiceId,
                        companyId,
                        isActive: true
                    });

                    if (
                        serviceData &&
                        PaidServices.some(
                            (ps) => ps.ProductServiceId.toString() === EachService.ProductServiceId.toString()
                        )
                    ) {
                        if (EachService.ServiceActive === true) {
                            const matchedConfig = PaidServices.find(
                                (ps) => ps.ProductServiceId.toString() === EachService.ProductServiceId.toString()
                            );

                            if (matchedConfig) {
                                activePaidServices.push({
                                    ...serviceData.toObject(),
                                    ProductServiceAmount: matchedConfig.ProductServiceAmount || 0
                                });
                            }

                            NewProductServices.push(EachService)
                        }
                    }
                }

                for (let EachService of FreeServices || []) {
                    const serviceData = await ProductService.findOne({
                        _id: EachService.ProductServiceId,
                        companyId,
                        isActive: true
                    });

                    if (serviceData) {
                        NewFreeServices.push(EachService);
                    }
                }

                EachProduct.ProductServices = NewProductServices;
                EachProduct.ProductFreeServices = NewFreeServices.map(s => s.ProductServiceId);


                if (!EachProduct.Reserved) {
                    const { total, discount, final } = calculateProductTotals(
                        FoundVariantProduct,
                        EachProduct.Quantity,
                        activePaidServices
                    );

                    EachProduct.TotalPrice = total;
                    EachProduct.DiscountPrice = discount;
                    EachProduct.FinalPrice = final;
                }


                updatedProducts.push(EachProduct);
            }


            FoundCart.Products = updatedProducts;



            const activeProducts = updatedProducts.filter(p => p.Reserved !== true && p.IsActive !== false);

            FoundCart.TotalCartPrice = parseFloat(activeProducts.reduce((sum, p) => sum + (p.TotalPrice || 0), 0).toFixed(2));
            FoundCart.DiscountCartPrice = parseFloat(activeProducts.reduce((sum, p) => sum + (p.DiscountPrice || 0), 0).toFixed(2));
            FoundCart.FinalCartPrice = parseFloat(activeProducts.reduce((sum, p) => sum + (p.FinalPrice || 0), 0).toFixed(2));


            await FoundCart.save();

        } catch (error) {
            console.warn("GetCartError:", error.message);
            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }

    },

    getCartData: async (matchCondition) => {
        try {
            const data = await ProductCart.aggregate([
                { $match: matchCondition },

                {
                    $lookup: {
                        from: "readyshoppingusers",
                        localField: "UserId",
                        foreignField: "_id",
                        as: "UserData"
                    }
                },

                {
                    $lookup: {
                        from: "companies",
                        localField: "companyId",
                        foreignField: "_id",
                        as: "CompanyData"
                    }
                },

                {
                    $lookup: {
                        from: "products",
                        localField: "Products.ProductId",
                        foreignField: "_id",
                        as: "ProductInfo"
                    }
                },
                {
                    $lookup: {
                        from: "productservices",
                        localField: "ProductInfo.ProductServices.ProductServiceId",
                        foreignField: "_id",
                        as: "ProductServiceInfo"
                    }
                },
                {
                    $lookup: {
                        from: "productservices",
                        localField: "Products.ProductFreeServices",
                        foreignField: "_id",
                        as: "FreeServiceInfo"
                    }
                },
                {
                    $addFields: {
                        ProductInfo: {
                            $map: {
                                input: "$ProductInfo",
                                as: "pi",
                                in: {
                                    $mergeObjects: [
                                        "$$pi",
                                        {
                                            ProductServices: {
                                                $map: {
                                                    input: "$$pi.ProductServices",
                                                    as: "ps",
                                                    in: {
                                                        $mergeObjects: [
                                                            "$$ps",
                                                            {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $filter: {
                                                                            input: "$ProductServiceInfo",
                                                                            as: "psi",
                                                                            cond: { $eq: ["$$psi._id", "$$ps.ProductServiceId"] }
                                                                        }
                                                                    },
                                                                    0
                                                                ]
                                                            }
                                                        ]
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
                    $lookup: {
                        from: "variantproducts",
                        localField: "Products.VariantProductId",
                        foreignField: "_id",
                        as: "VariantProductInfo"
                    }
                },

                {
                    $lookup: {
                        from: "variants",
                        localField: "VariantProductInfo.VariantFields.VariantId",
                        foreignField: "_id",
                        as: "VariantNames"
                    }
                },

                {
                    $lookup: {
                        from: "batches",
                        localField: "VariantProductInfo.BatchIds",
                        foreignField: "_id",
                        as: "Batches"
                    }
                },

                {
                    $addFields: {
                        VariantProductInfo: {
                            $map: {
                                input: "$VariantProductInfo",
                                as: "vp",
                                in: {
                                    $mergeObjects: [
                                        "$$vp",
                                        {
                                            VariantFields: {
                                                $map: {
                                                    input: "$$vp.VariantFields",
                                                    as: "vf",
                                                    in: {
                                                        $mergeObjects: [
                                                            "$$vf",
                                                            {
                                                                VariantName: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $map: {
                                                                                input: {
                                                                                    $filter: {
                                                                                        input: "$VariantNames",
                                                                                        as: "vn",
                                                                                        cond: { $eq: ["$$vn._id", "$$vf.VariantId"] }
                                                                                    }
                                                                                },
                                                                                as: "vn",
                                                                                in: "$$vn.VariantName"
                                                                            }
                                                                        },
                                                                        0
                                                                    ]
                                                                },
                                                                Extension: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $map: {
                                                                                input: {
                                                                                    $filter: {
                                                                                        input: "$VariantNames",
                                                                                        as: "vn",
                                                                                        cond: { $eq: ["$$vn._id", "$$vf.VariantId"] }
                                                                                    }
                                                                                },
                                                                                as: "vn",
                                                                                in: "$$vn.Extension"
                                                                            }
                                                                        },
                                                                        0
                                                                    ]
                                                                }
                                                            }
                                                        ]
                                                    }
                                                }
                                            },
                                            BatchesInfo: {
                                                $map: {
                                                    input: {
                                                        $filter: {
                                                            input: "$Batches",
                                                            as: "b",
                                                            cond: { $in: ["$$b._id", { $ifNull: ["$$vp.BatchIds", []] }] }
                                                        }
                                                    },
                                                    as: "b",
                                                    in: {
                                                        _id: "$$b._id",
                                                        BatchName: "$$b.BatchName",
                                                        BatchLogo: "$$b.BatchLogo"
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
                    $lookup: {
                        from: "productservices",
                        localField: "Products.ProductServices.ProductServiceId",
                        foreignField: "_id",
                        as: "PaidServiceMeta"
                    }
                },

                {
                    $addFields: {
                        Products: {
                            $map: {
                                input: "$Products",
                                as: "prod",
                                in: {
                                    $mergeObjects: [
                                        "$$prod",

                                        {
                                            ProductInfo: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$ProductInfo",
                                                            as: "pi",
                                                            cond: { $eq: ["$$pi._id", "$$prod.ProductId"] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },

                                        {
                                            VariantInfo: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$VariantProductInfo",
                                                            as: "vi",
                                                            cond: { $eq: ["$$vi._id", "$$prod.VariantProductId"] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },

                                        {
                                            ServiceInfo: {
                                                $map: {
                                                    input: { $ifNull: ["$$prod.ProductServices", []] },
                                                    as: "ps",
                                                    in: {
                                                        $let: {
                                                            vars: {
                                                                matchedService: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $filter: {
                                                                                input: {
                                                                                    $ifNull: [
                                                                                        {
                                                                                            $arrayElemAt: [
                                                                                                {
                                                                                                    $map: {
                                                                                                        input: {
                                                                                                            $filter: {
                                                                                                                input: "$ProductInfo",
                                                                                                                as: "pi",
                                                                                                                cond: { $eq: ["$$pi._id", "$$prod.ProductId"] }
                                                                                                            }
                                                                                                        },
                                                                                                        as: "pi",
                                                                                                        in: "$$pi.ProductServices"
                                                                                                    }
                                                                                                },
                                                                                                0
                                                                                            ]
                                                                                        },
                                                                                        []
                                                                                    ]
                                                                                },
                                                                                as: "pSrv",
                                                                                cond: { $eq: ["$$pSrv.ProductServiceId", "$$ps.ProductServiceId"] }
                                                                            }
                                                                        },
                                                                        0
                                                                    ]
                                                                },
                                                                meta: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $filter: {
                                                                                input: "$PaidServiceMeta",
                                                                                as: "m",
                                                                                cond: { $eq: ["$$m._id", "$$ps.ProductServiceId"] }
                                                                            }
                                                                        },
                                                                        0
                                                                    ]
                                                                }
                                                            },
                                                            in: {
                                                                $mergeObjects: [
                                                                    "$$ps",
                                                                    { ProductServiceAmount: { $ifNull: ["$$matchedService.ProductServiceAmount", 0] } },
                                                                    { ExpiryDate: "$$matchedService.ExpiryDate" },
                                                                    { Paid: "$$matchedService.Paid" },
                                                                    { $cond: [{ $ifNull: ["$$meta", false] }, "$$meta", {}] }
                                                                ]
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        },

                                        {
                                            FreeServiceInfo: {
                                                $map: {
                                                    input: { $ifNull: ["$$prod.ProductFreeServices", []] },
                                                    as: "fs",
                                                    in: {
                                                        $let: {
                                                            vars: {
                                                                freeDoc: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $filter: {
                                                                                input: "$FreeServiceInfo",
                                                                                as: "fsi",
                                                                                cond: { $eq: ["$$fsi._id", "$$fs"] }
                                                                            }
                                                                        },
                                                                        0
                                                                    ]
                                                                },
                                                                freeMatchedFromProduct: {
                                                                    $arrayElemAt: [
                                                                        {
                                                                            $filter: {
                                                                                input: {
                                                                                    $ifNull: [
                                                                                        {
                                                                                            $arrayElemAt: [
                                                                                                {
                                                                                                    $map: {
                                                                                                        input: {
                                                                                                            $filter: {
                                                                                                                input: "$ProductInfo",
                                                                                                                as: "pi",
                                                                                                                cond: { $eq: ["$$pi._id", "$$prod.ProductId"] }
                                                                                                            }
                                                                                                        },
                                                                                                        as: "pi",
                                                                                                        in: "$$pi.ProductServices"
                                                                                                    }
                                                                                                },
                                                                                                0
                                                                                            ]
                                                                                        },
                                                                                        []
                                                                                    ]
                                                                                },
                                                                                as: "pfs",
                                                                                cond: { $eq: ["$$pfs.ProductServiceId", "$$fs"] }
                                                                            }
                                                                        },
                                                                        0
                                                                    ]
                                                                }
                                                            },
                                                            in: {
                                                                $mergeObjects: [
                                                                    { $ifNull: ["$$freeDoc", {}] },
                                                                    { ExpiryDate: "$$freeMatchedFromProduct.ExpiryDate" }
                                                                ]
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
                        Products: 1,
                        TotalCartPrice: 1,
                        DiscountCartPrice: 1,
                        ShippingCharges: 1,
                        FinalCartPrice: 1,
                        CartType: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ]);


            return data || null;
        } catch (error) {
            console.error("getCartDataError:", error);
            throw new Error("Failed to fetch cart data");
        }
    },

    getCart: async (req, res) => {
        let { UserId, companyId } = req.query;
        if (req.user.UserId) UserId = req.user.UserId
        if (req.user.companyId) companyId = req.user.companyId
        try {
            let matchCondition = {};
            if (!mongoose.isValidObjectId(companyId) || !mongoose.isValidObjectId(UserId)) {
                return res.status(400).json({ message: 'Not Found Proper Data Of Company Or User', success: false })
            }


            try {
                req.body = req.body || {};
                req.body.UserId = UserId;
                req.body.companyId = companyId;
                await module.exports.ValidateCart(req, res);
            } catch (e) {
                console.warn("Cart validation failed:", e.message);
            }

            matchCondition.companyId = new mongoose.Types.ObjectId(String(companyId));
            matchCondition.UserId = new mongoose.Types.ObjectId(String(UserId));

            let data = await module.exports.getCartData(matchCondition)
            if (data && data[0]?.Products?.length == 0) {
                return res.status(400).json({ message: 'Cart is empty', success: false })
            }
            if (data?.length) {
                data = data.map(cart => {
                    cart.Products = cart.Products.map(prod => {
                        if (prod?.ProductInfo?.ProductServices && prod?.ServiceInfo) {
                            const existingServiceIds = prod.ServiceInfo.map(s => s.ProductServiceId?.toString());
                            const allServiceIds = prod.ProductInfo.ProductServices.map(s => s.ProductServiceId?.toString());

                            let remainingServices = prod.ProductInfo.ProductServices.filter(
                                s => !existingServiceIds.includes(s.ProductServiceId?.toString())
                            ).filter(EachService => EachService.Paid == true)

                            prod.RemainingServices = remainingServices;
                        } else {
                            prod.RemainingServices = [];
                        }
                        if (prod.ProductInfo.ProductServices) delete prod.ProductInfo.ProductServices
                        return prod;
                    });
                    cart.Products = cart.Products.sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    cart.Products = cart.Products.filter(EachProduct => EachProduct.Reserved !== true)
                    return cart;
                });

            }
            return res.status(200).json({
                message: "Cart fetched and recalculated successfully",
                success: true,
                data: data
            });

        } catch (error) {
            console.warn("GetCartError:", error.message);
            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }
    },

    proceedToPaymentForCart: async (req, res) => {
        let { UserId, companyId, AddressId } = req.body;
        if (req.user.UserId) UserId = req.user.UserId
        if (req.user.companyId) companyId = req.user.companyId
        let rollback = { orderId: null, stockUpdates: [], ReservedUpdated: [] };

        const RollBackFunction = async (rollback) => {
            try {
                try {
                    if (rollback.stockUpdates && rollback.stockUpdates.length !== 0) {
                        await Promise.all(rollback.stockUpdates.map(async ({ variantId, quantity }) => {
                            await VariantProduct.updateOne(
                                { _id: variantId, 'InventoryBaseStock.InventoryBase': true },
                                {
                                    $inc: {
                                        "InventoryBaseStock.AvailableStock": quantity,
                                        "InventoryBaseStock.ReservedStock": -quantity
                                    }
                                }
                            )
                        }));
                    }
                } catch (error) {
                    console.error('RollBackError for stock updates', error.message)
                }
                try {
                    if (rollback.ReservedUpdated && rollback.ReservedUpdated.length !== 0) {
                        await Promise.all(
                            rollback.ReservedUpdated.map(p =>
                                ProductCart.findOneAndUpdate(
                                    { companyId, UserId, 'Products._id': p._id },
                                    { $set: { 'Products.$.Reserved': p.Reserved } }
                                )
                            )
                        );
                    }
                } catch (error) {
                    console.error('RollBackError for reserved updates', error.message)

                }
                try {
                    if (rollback.orderId) {
                        await ProductOrder.findOneAndDelete({ _id: rollback.orderId })
                    }
                } catch (error) {
                    console.error('RollBackError for delete order', error.message)

                }
            } catch (error) {

            }
        }
        try {
            await module.exports.ValidateCart(req, res);

            const FoundCart = await ProductCart.findOne({ UserId, companyId })
            if (!FoundCart || !FoundCart.Products?.length)
                return res.status(400).json({ message: "Cart is empty", success: false });

            let OrderData = {};
            let FoundOrder;
            let data;
            const FoundUser = await User.findOne({ companyId, _id: UserId });
            if (!FoundUser) {

                return res.status(400).json({ message: "User Not Found", success: false });
            }

            try {
                let matchCondition = {};
                matchCondition.companyId = new mongoose.Types.ObjectId(String(companyId))
                matchCondition.UserId = new mongoose.Types.ObjectId(String(UserId))
                data = await module.exports.getCartData(matchCondition);

                OrderData = {
                    UserId,
                    companyId,
                    CartId: FoundCart._id,
                    Products: [],
                    ReservationStartedAt: new Date()
                };

                if (!FoundUser.Address || FoundUser.Address.length == 0) {

                    return res.status(400).json({ message: 'address not found', success: false });
                } else {
                    let FoundedAddress;
                    if (!AddressId) {
                        FoundedAddress = FoundUser.Address.find(EachAddress => EachAddress.DefaultAddress == true);
                        if (!FoundedAddress) FoundedAddress = FoundUser.Address[0];
                    } else {
                        FoundedAddress = FoundUser.Address.find(EachAddress => EachAddress._id == AddressId);
                    }

                    if (!FoundedAddress) {

                        return res.status(400).json({ message: 'address not found', success: false });
                    }

                    OrderData.UserDetails = {
                        UserName: FoundUser?.UserName || '',
                        Email: FoundUser?.Email || '',
                        Phone: FoundUser?.Phone,
                        AddresserName: FoundedAddress?.AddresserName || FoundUser?.UserName || 'Guest',
                        AddresserNumber: FoundedAddress?.AddresserNumber || FoundUser?.Phone,
                        AddressType: FoundedAddress?.AddressType || 'Home',
                        Street: FoundedAddress?.Street || '',
                        City: FoundedAddress?.City || '',
                        State: FoundedAddress?.State || '',
                        Country: FoundedAddress?.Country || '',
                        PostalCode: FoundedAddress?.PostalCode || '',
                        Latitude: FoundedAddress?.Latitude || '',
                        Longitude: FoundedAddress?.Longitude || '',
                        ManualAddress: FoundedAddress?.ManualAddress || ''
                    };
                }

                if (data && data[0]) {
                    if (data.length) {
                        data = data.map(cart => {
                            cart.Products = cart.Products.map(prod => {
                                if (prod?.ProductInfo?.ProductServices && prod?.ServiceInfo) {
                                    const existingServiceIds = prod.ServiceInfo.map(s => s.ProductServiceId?.toString());
                                    let remaining = prod.ProductInfo.ProductServices
                                        .filter(s => !existingServiceIds.includes(s.ProductServiceId?.toString()))
                                        .filter(s => s.Paid == true);
                                    prod.RemainingServices = remaining;
                                } else prod.RemainingServices = [];
                                delete prod.ProductInfo.ProductServices;
                                return prod;
                            });
                            return cart;
                        });
                    }

                    for (let p of data[0].Products) {
                        if (p.IsActive == false || p.Reserved == true) continue;

                        const variantInfo = await VariantProduct.findById(p.VariantProductId)

                        let ProductEntry = {
                            CartProductId: p._id,
                            OrderStatus: [{ Status: 'INITIATED', StatusAt: Date.now() }],
                            Quantity: p.Quantity,
                            TotalPrice: p.TotalPrice,
                            DiscountPrice: p.DiscountPrice,
                            FinalPrice: p.FinalPrice,
                            ProductData: { ProductInfo: {}, VariantProductInfo: {} },
                            ProductServices: [],
                            ProductFreeServices: []
                        };

                        let ProductInfo = {
                            ProductId: p.ProductId,
                            ProductName: p.ProductInfo.ProductName,
                            CommonImages: p.ProductInfo.CommonImages,
                            CommonVideos: p.ProductInfo.CommonVideos,
                            CommonDescription: p.ProductInfo.CommonDescription
                        };

                        let FoundBrand = await brandmodel.findOne({
                            companyId,
                            _id: p.ProductInfo.BrandId
                        })

                        if (FoundBrand) {
                            ProductInfo.BrandId = FoundBrand._id;
                            ProductInfo.BrandName = FoundBrand.BrandName;
                        }

                        ProductEntry.ProductData.ProductInfo = ProductInfo;

                        if (variantInfo) {
                            ProductEntry.ProductData.VariantProductInfo = {
                                VariantProductId: variantInfo._id,
                                VariantProductName: variantInfo.VariantProductName,
                                VariantFields: p.VariantInfo.VariantFields,
                                OfferPercentage: variantInfo.OfferPercentage,
                                Price: variantInfo.Price,
                                Specification: variantInfo.Specification,
                                AboutProduct: variantInfo.AboutProduct
                            };
                        }

                        ProductEntry.ProductServices = (p.ServiceInfo || []).map(s => ({
                            ProductServiceId: s.ProductServiceId,
                            ServiceName: s.ServiceName,
                            Description: s.Description,
                            ServiceImages: s.ServiceImages,
                            ProductServiceAmount: s.ProductServiceAmount,
                            ExpiryDate: s.ExpiryDate
                        }));

                        ProductEntry.ProductFreeServices = (p.FreeServiceInfo || []).map(s => ({
                            ProductServiceId: s._id,
                            ServiceName: s.ServiceName,
                            Description: s.Description,
                            ServiceImages: s.ServiceImages,
                            ProductServiceAmount: s.ProductServiceAmount,
                            ExpiryDate: s.ExpiryDate
                        }));

                        OrderData.Products.push(ProductEntry);
                    }
                }
                if (OrderData.Products.length == 0) {
                    return res.status(400).json({ message: 'No Valid Products Have To Make Order', success: false })
                }
                OrderData.TotalCartPrice = parseFloat(OrderData.Products.reduce((a, b) => a + (b.TotalPrice || 0), 0).toFixed(2));
                OrderData.DiscountCartPrice = parseFloat(OrderData.Products.reduce((a, b) => a + (b.DiscountPrice || 0), 0).toFixed(2));
                OrderData.FinalCartPrice = parseFloat(OrderData.Products.reduce((a, b) => a + (b.FinalPrice || 0), 0).toFixed(2));

                const SaveOrder = await new ProductOrder(OrderData).save();
                rollback.orderId = SaveOrder._id
                FoundOrder = await ProductOrder.findOne({ _id: SaveOrder._id });

            } catch (err) {
                await RollBackFunction(rollback)
                console.error("Order Build Error:", err);
                return res.status(500).json({ message: "Unable to create order", success: false });
            }

            if (!FoundOrder) {
                await RollBackFunction(rollback)

                return res.status(500).json({ message: "Order initialization failed", success: false });
            }

            try {
                let productsToUpdate = [];

                for (let item of FoundOrder.Products) {
                    if (item.Reserved === true || item.IsActive === false) continue;

                    const variant = await VariantProduct.findOne({
                        _id: item.ProductData.VariantProductInfo.VariantProductId,
                        ProductId: item.ProductData.ProductInfo.ProductId,
                        companyId,
                        isActive: true
                    })

                    if (!variant) {
                        await RollBackFunction(rollback)

                        return res.status(400).json({ message: "Some products are unavailable", success: false });
                    }

                    if (variant.InventoryBaseStock?.InventoryBase === true) {
                        const available = variant.InventoryBaseStock?.AvailableStock || 0;
                        if (item.Quantity > available) {

                            await RollBackFunction(rollback)

                            return res.status(400).json({
                                message: `Not enough stock for ${variant.VariantProductName || "product"}`,
                                success: false
                            });
                        }

                        productsToUpdate.push({
                            variantId: variant._id,
                            quantity: item.Quantity
                        });
                    }
                }

                await Promise.all(productsToUpdate.map(async ({ variantId, quantity }) => {
                    await VariantProduct.updateOne(
                        { _id: variantId, 'InventoryBaseStock.InventoryBase': true },
                        {
                            $inc: {
                                "InventoryBaseStock.AvailableStock": -quantity,
                                "InventoryBaseStock.ReservedStock": quantity
                            }
                        }
                    )
                    rollback.stockUpdates.push({ variantId, quantity })
                }));

            } catch (err) {
                console.error("Stock Check Error:", err);
                await RollBackFunction(rollback)

                return res.status(500).json({ message: "Stock validation failed, order deleted", success: false });
            }

            try {
                const orderId = `ORDER_${FoundOrder._id.toString().slice(-6)}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
                const totalAmount = FoundOrder.FinalCartPrice || FoundOrder.TotalCartPrice;

                const paytmParams = {
                    body: {
                        requestType: "Payment",
                        mid: process.env.PAYTM_MID,
                        websiteName: process.env.PAYTM_WEBSITE,
                        orderId,
                        callbackUrl: `${process.env.BASE_URL}productcart/handlePaymentStatus`,
                        txnAmount: { value: totalAmount.toString(), currency: "INR" },
                        userInfo: { custId: UserId.toString() }
                    }
                };

                const checksum = await PaytmChecksum.generateSignature(
                    JSON.stringify(paytmParams.body),
                    process.env.PAYTM_KEY
                );
                paytmParams.head = { signature: checksum };
                const post_data = JSON.stringify(paytmParams);

                const options = {
                    hostname: process.env.PAYTM_HOSTNAME,
                    port: 443,
                    path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(post_data)
                    }
                };

                const paytmResponse = await new Promise((resolve, reject) => {
                    let response = "";
                    const paytmReq = https.request(options, (paytmRes) => {
                        paytmRes.on("data", chunk => response += chunk);
                        paytmRes.on("end", () => {
                            try {
                                resolve(JSON.parse(response));
                            } catch (err) {
                                reject(err);
                            }
                        });
                    });
                    paytmReq.on("error", reject);
                    paytmReq.write(post_data);
                    paytmReq.end();
                });

                FoundOrder.PaymentSession = {
                    orderId,
                    txnId: null,
                    status: "INITIATED",
                    amount: totalAmount,
                    paymentGateway: "Paytm"
                };

                FoundOrder.ReservationStartedAt = new Date();



                for (let Product of FoundOrder.Products) {
                    let FoundedProduct = FoundCart.Products.find((EachProduct) => Product.CartProductId.toString() == EachProduct._id.toString());
                    if (FoundedProduct) {
                        rollback.ReservedUpdated.push({ _id: FoundedProduct._id, Reserved: FoundedProduct.Reserved })
                        FoundedProduct.Reserved = true;
                    }
                }

                await FoundCart.save();
                await FoundOrder.save();


                if (!paytmResponse?.body?.txnToken) {
                    await RollBackFunction(rollback)
                    console.error("No txnToken in Paytm response:", paytmResponse);
                    return res.status(500).json({ message: "Payment gateway did not return txnToken", success: false });
                }

                return res.status(200).json({
                    success: true,
                    message: "Payment Initiated",
                    url: `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                    txnToken: paytmResponse.body.txnToken,
                    orderId,
                    mid: process.env.PAYTM_MID,
                    amount: totalAmount
                })

            } catch (err) {
                console.error("Payment Initiation Error:", err);
                await RollBackFunction(rollback)
                return res.status(500).json({ message: "Failed to initiate payment", success: false });
            }

        } catch (err) {
            console.error("ProceedToPayment Error:", err);
            await RollBackFunction(rollback)
            return res.status(500).json({ message: "Internal Server Error", success: false });
        }
    },

    handlePaymentStatus: async (req, res) => {
        const paytmResponse = req.body;
        const orderId = paytmResponse?.body?.orderId;
        const body = paytmResponse.body || {};
        const paymentInfo = {
            orderId: body.orderId,
            txnId: body.txnId,
            amount: body.txnAmount?.value || 0,
            resultInfo: body.resultInfo
        };

        const safeId = (v) => (v === undefined || v === null) ? null : (typeof v === "string" ? v : (v.toString ? v.toString() : String(v)));
        const isReserved = (p) => Boolean(p && (p.Reserved == true || p.Reserved == "true" || p.Reserved == 1 || p.Reserved == "1"));
        const pullCartProduct = async (cartId, cartProductId) => {
            try {
                await ProductCart.updateOne({ _id: cartId }, { $pull: { Products: { _id: cartProductId } } });
            } catch (err) {
                console.error('pullCartProduct Error', err?.message || err);
            }
        };
        const unreserveCartProduct = async (cartId, cartProductId) => {
            try {
                await ProductCart.updateOne({ _id: cartId, "Products._id": cartProductId }, { $set: { "Products.$.Reserved": false } });
            } catch (err) {
                console.error('unreserveCartProduct Error', err?.message || err);
            }
        };
        const adjustVariantStock = async (variantId, incObj = {}) => {
            if (!variantId) return;
            try {
                await VariantProduct.updateOne({ _id: variantId, 'InventoryBaseStock.InventoryBase': true }, { $inc: incObj });
            } catch (err) {
                console.error('adjustVariantStock Error', err?.message || err);
            }
        };

        const groupCartByKey = (cartProducts = [], orderKeySet = new Set()) => {
            const map = new Map();
            for (const p of (cartProducts || [])) {
                const key = `${safeId(p?.ProductId)}|${safeId(p?.VariantProductId)}`;
                if (!orderKeySet.has(key)) continue;
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(p);
            }
            return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
        };

        const cleanupGroupForOrder = async (cartId, group, order) => {
            const cartItems = group.items || [];
            if (!cartItems.length) return;

            const [prodId, varId] = group.key.split('|');
            const orderItemsForKey = (order.Products || []).filter(p =>
                safeId(p?.ProductData?.ProductInfo?.ProductId) === prodId &&
                safeId(p?.ProductData?.VariantProductInfo?.VariantProductId) === varId
            );

            const orderWithCartIds = orderItemsForKey.filter(p => safeId(p?.CartProductId));
            if (orderWithCartIds.length) {
                for (const oi of orderWithCartIds) {
                    const cartProdId = safeId(oi.CartProductId);
                    const cartEntry = cartItems.find(c => safeId(c._id) === cartProdId);
                    if (!cartEntry) continue;
                    if (isReserved(cartEntry)) {
                        await pullCartProduct(cartId, cartProdId);
                    } else {
                        await pullCartProduct(cartId, cartProdId);
                    }
                }
                return;
            }

            let totalOrderQty = orderItemsForKey.reduce((s, it) => s + (Number(it.Quantity) || 0), 0);
            if (totalOrderQty <= 0) return;

            const reserved = cartItems.filter(isReserved);
            const unreserved = cartItems.filter(ci => !isReserved(ci));

            if (reserved.length && unreserved.length) {
                const reservedSorted = reserved.slice().sort((a, b) => (Number(a.Quantity) || 0) - (Number(b.Quantity) || 0));
                let toRemove = totalOrderQty;
                for (const r of reservedSorted) {
                    if (toRemove <= 0) break;
                    const q = Number(r.Quantity) || 0;
                    await pullCartProduct(cartId, r._id);
                    toRemove -= q;
                }
                return;
            }

            if (reserved.length && !unreserved.length) {
                if (reserved.length === 1) {
                    await unreserveCartProduct(cartId, reserved[0]._id);
                    return;
                }
                const highest = reserved.reduce((max, p) => (Number(p.Quantity) > Number(max.Quantity) ? p : max), reserved[0]);
                await Promise.all(reserved.map(async (r) => {
                    if (safeId(r._id) !== safeId(highest._id)) {
                        await pullCartProduct(cartId, r._id);
                    }
                }));
                await unreserveCartProduct(cartId, highest._id);
                return;
            }

            return;
        };


        try {
            const paytmParams = { body: { mid: process.env.PAYTM_MID, orderId: paymentInfo.orderId } };
            const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), process.env.PAYTM_KEY);
            paytmParams.head = { signature: checksum };
            const post_data = JSON.stringify(paytmParams);

            const options = {
                hostname: "securegw.paytm.in",
                port: 443,
                path: `/v3/order/status`,
                method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(post_data) }
            };

            const verifyPaytmStatus = await new Promise((resolve, reject) => {
                let response = "";
                const paytmReq = https.request(options, (paytmRes) => {
                    paytmRes.on("data", chunk => response += chunk);
                    paytmRes.on("end", () => {
                        try { resolve(JSON.parse(response)); } catch (err) { reject(err); }
                    });
                });
                paytmReq.on("error", reject);
                paytmReq.write(post_data);
                paytmReq.end();
            });

            const resultStatus = verifyPaytmStatus?.body?.resultInfo?.resultStatus;
            let FoundOrder = await ProductOrder.findOne({ "PaymentSession.orderId": orderId });

            if (!FoundOrder) return res.redirect(`${process.env.FRONTEND_URL}/order-checked?paytmorderId=${paymentInfo.orderId}&status=ORDER-NOT-FOUND`);

            const UserId = FoundOrder.UserId;
            const companyId = FoundOrder.companyId;
            let FoundCart = await ProductCart.findOne({ UserId, companyId, _id: FoundOrder.CartId });

            if (resultStatus === "TXN_SUCCESS") {
                if (FoundOrder.PaymentSession?.status === 'SUCCESS') {
                    return res.redirect(`${process.env.FRONTEND_URL}/order-checked?orderId=${paymentInfo.orderId}&Status=SUCCESS&cartorderid=${FoundOrder._id}`);
                    // return res.status(200).json({ message: "✅ Payment verified and order placed successfully.", success: true });
                }

                for (const item of (FoundOrder.Products || [])) {
                    try {
                        const variantId = safeId(item?.ProductData?.VariantProductInfo?.VariantProductId);
                        await adjustVariantStock(variantId, { "InventoryBaseStock.ReservedStock": -(Number(item.Quantity) || 0) });
                    } catch (err) {
                        console.error('Stock Deduct On Payment Success Error:', err?.message || err);
                    }
                }

                FoundOrder.PaymentSession = FoundOrder.PaymentSession || {};
                FoundOrder.PaymentSession.status = "SUCCESS";
                FoundOrder.PaymentSession.txnId = paymentInfo.txnId;
                FoundOrder.PaymentSession.amount = paymentInfo.amount;

                try {
                    for (const cartProd of (FoundCart?.Products || [])) {
                        const referenced = (FoundOrder.Products || []).filter(p => safeId(p?.CartProductId) === safeId(cartProd._id));
                        if (referenced.length && isReserved(cartProd)) {
                            await pullCartProduct(FoundCart._id, cartProd._id);
                        }
                    }
                } catch (err) {
                    console.error('Delete Reserved Product From Cart On Payment Success Error:', err?.message || err);
                }

                await FoundOrder.save();
                return res.redirect(`${process.env.FRONTEND_URL}/order-checked?paytmorderId=${paymentInfo.orderId}&status=SUCCESS&cartorderid=${FoundOrder._id}`);
                // return res.status(200).json({ message: "✅ Payment verified and order placed successfully.", success: true });
            }

            if (resultStatus === "TXN_FAILURE" || resultStatus === "FAILURE") {
                if (FoundOrder.PaymentSession?.status === 'FAILED') {
                    return res.redirect(`${process.env.FRONTEND_URL}/order-checked?paytmorderId=${paymentInfo.orderId}&status=FAILED&cartorderid=${FoundOrder._id}`);

                    // return res.status(200).json({ message: "❌ Payment failed. Stock restored and cart reactivated.", success: false });
                }

                const orderKeySet = new Set((FoundOrder.Products || []).map(p => {
                    const pid = safeId(p?.ProductData?.ProductInfo?.ProductId);
                    const vid = safeId(p?.ProductData?.VariantProductInfo?.VariantProductId);
                    return pid && vid ? `${pid}|${vid}` : null;
                }).filter(Boolean));

                if (FoundCart) {
                    const groups = groupCartByKey(FoundCart.Products || [], orderKeySet);
                    for (const g of groups) {
                        await cleanupGroupForOrder(FoundCart._id, g, FoundOrder);
                    }
                }

                FoundOrder.PaymentSession = FoundOrder.PaymentSession || {};
                FoundOrder.PaymentSession.status = "FAILED";
                FoundOrder.PaymentSession.txnId = paymentInfo.txnId || FoundOrder.PaymentSession.txnId;
                FoundOrder.PaymentSession.amount = paymentInfo.amount || FoundOrder.PaymentSession.amount;
                await FoundOrder.save();

                try {
                    for (const item of (FoundOrder.Products || [])) {
                        const variantId = safeId(item?.ProductData?.VariantProductInfo?.VariantProductId);
                        await adjustVariantStock(variantId, {
                            "InventoryBaseStock.AvailableStock": (Number(item.Quantity) || 0),
                            "InventoryBaseStock.ReservedStock": -(Number(item.Quantity) || 0)
                        });
                    }
                } catch (err) {
                    console.error('Restored Stock On Payment Failed Error', err?.message || err);
                }
                const isCancelled = verifyPaytmStatus?.body?.resultInfo?.resultMsg?.includes('cancelled');
                if (isCancelled) {
                    return res.redirect(`${process.env.FRONTEND_URL}/order-checked?paytmorderId=${paymentInfo.orderId}&status=CANCELLED&cartorderid=${FoundOrder._id}`);
                }

                return res.redirect(`${process.env.FRONTEND_URL}/order-checked?paytmorderId=${paymentInfo.orderId}&status=FAILED&cartorderid=${FoundOrder._id}`);

                // return res.status(200).json({ message: "❌ Payment failed. Stock restored and cart reactivated.", success: false });
            }
            return res.redirect(`${process.env.FRONTEND_URL}/order-checked?paytmorderId=${paymentInfo.orderId}&status=${resultStatus}&cartorderid=${FoundOrder._id}`);

            // return res.status(200).json({ message: `Payment status: ${resultStatus}. No action taken.`, success: false });

        } catch (err) {
            console.error("handlePaymentStatus Error:", err);
            return res.redirect(`${process.env.FRONTEND_URL}/order-checked?paytmorderId=${paymentInfo.orderId}&status=INTERNAL-SERVER-ERROR`);
            // return res.status(500).json({ message: "Internal Server Error", success: false });
        }
    },

    getOrders: async (req, res) => {
        try {
            let { UserId, companyId, Status, ProductOrderId } = req.query;
            if (req.user.UserId) UserId = req.user.UserId
            if (req.user.companyId) companyId = req.user.companyId
            if (!mongoose.isValidObjectId(companyId) || !mongoose.isValidObjectId(UserId)) {
                return res.status(400).json({ message: 'Not Found Proper Data Of Company Or User', success: false });
            }

            const Orders = await ProductOrder.find({ UserId, companyId });

            if (!Orders.length) {
                return res.status(400).json({ message: "Orders Not Found", success: false });
            }

            let FilteredOrders = Orders.map(order => {
                let products = order.Products;

                if (Status && !['INITIATED', 'PENDING', 'SHIPPED', 'OUTFORDELIVERY', 'CANCELED', 'ASSIGNED'].includes(Status)) {
                    return res.status(400).json({ message: 'Provide Proper Status Of Product', success: false })
                }
                else if (Status) {
                    products = products.filter(p => {
                        const lastStatus = p.OrderStatus[p.OrderStatus.length - 1]?.Status;
                        return lastStatus == Status;
                    });
                }

                if (mongoose.isValidObjectId(ProductOrderId)) {
                    products = products.filter(p => p._id.equals(ProductOrderId));
                }

                return { ...order.toObject(), Products: products };
            });

            FilteredOrders = FilteredOrders.filter(o => o.Products.length > 0);

            return res.status(200).json({
                message: "Orders Fetched",
                data: FilteredOrders,
                success: true
            });

        } catch (error) {
            console.log("getOrdersError:", error.message);
            return res.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
        }
    },

    getAllOrders: async (req, res) => {
        try {
            let { UserId, companyId, Status, ProductOrderId, SortOrder, StartDate, EndDate } = req.query;
            if (req.user.companyId) companyId = req.user.companyId

            if (!mongoose.isValidObjectId(companyId)) {
                return res.status(400).json({ message: 'Not Found Proper Data Of Company Or User', success: false });
            }

            let matchCondition = { companyId };

            if (UserId && mongoose.isValidObjectId(UserId)) {
                matchCondition.UserId = UserId;
            }

            if (StartDate || EndDate) {
                matchCondition.createdAt = {};
                if (StartDate) matchCondition.createdAt.$gte = new Date(StartDate);
                if (EndDate) matchCondition.createdAt.$lte = new Date(EndDate);
            }

            let Orders = await ProductOrder.find(matchCondition);

            if (!Orders.length) {
                return res.status(400).json({ message: "Orders Not Found", success: false });
            }

            let FilteredOrders = Orders.map(order => {
                let products = order.Products;
                if (Status && !['INITIATED', 'PENDING', 'SHIPPED', 'OUTFORDELIVERY', 'CANCELED', 'ASSIGNED'].includes(Status)) {
                    return res.status(400).json({ message: 'Provide Proper Status Of Product', success: false })
                }
                else if (Status) {
                    products = products.filter(p => {
                        const lastStatus = p.OrderStatus[p.OrderStatus.length - 1]?.Status;
                        return lastStatus == Status;
                    });
                }
                if (mongoose.isValidObjectId(ProductOrderId)) {
                    products = products.filter(p => p._id.equals(ProductOrderId));
                }

                return { ...order.toObject(), Products: products };
            });

            FilteredOrders = FilteredOrders.filter(o => o.Products.length > 0);


            if (SortOrder === "older") {
                FilteredOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            }
            else if (SortOrder === "newer") {
                FilteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            return res.status(200).json({
                message: "Orders Fetched",
                data: FilteredOrders,
                success: true
            });

        } catch (error) {
            console.log("getAllOrdersError:", error.message);
            return res.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
        }
    }


};


