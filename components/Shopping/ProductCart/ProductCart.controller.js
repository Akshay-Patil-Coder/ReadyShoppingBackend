const { ProductCart } = require('./ProductCart.model');
const { Product, VariantProduct } = require('../VariantsProducts/VariantsProducts.model')
const { User } = require('../../UserBase/User/User.model')
const { ProductService } = require('../ProductServices/ProductServices.model')
const mongoose = require('mongoose');
const { truncate } = require('lodash');

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

            const existingIndex = FoundCart.Products.findIndex(
                (p) =>
                    p.ProductId.toString() === ProductId.toString() &&
                    p.VariantProductId.toString() === VariantProductId.toString()
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
                    if (p.IsActive !== false) {
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
                if (FoundVariantProduct.InventoryBaseStock?.InventoryBase) {
                    const stock = FoundVariantProduct.InventoryBaseStock.AvailableStock || 0;
                    if (stock <= 0)
                        return res.status(400).json({ message: "Out of stock", success: false });
                    if (stock < Quantity) Quantity = stock;
                }

                if (!Quantity || Quantity <= 0) Quantity = 1;

                const paidServices = FoundProduct.ProductServices.filter((s) => s.Paid);
                const freeServices = FoundProduct.ProductServices.filter((s) => !s.Paid);

                let selectedPaidServices = paidServices.filter((s) =>
                    ProductServicesIds.includes(s.ProductServiceId.toString())
                );

                if (existingIndex !== -1) {
                    let existingProduct = FoundCart.Products[existingIndex];

                    if (!existingProduct.IsActive) {
                        existingProduct.IsActive = true;
                    }

                    if (Quantity >= existingProduct.Quantity) {
                        existingProduct.Quantity = Quantity;
                    }
                    else {
                        if (FoundVariantProduct.InventoryBaseStock?.InventoryBase) {
                            const stock = FoundVariantProduct.InventoryBaseStock.AvailableStock || 0;
                            if (stock <= 0)
                                return res.status(400).json({ message: "Out of stock", success: false });
                            if (stock < existingProduct.Quantity) existingProduct.Quantity = stock;
                        }
                    }

                    const existingIds = existingProduct.ProductServices.map((s) =>
                        s.ProductServiceId.toString()
                    );

                    for (const newService of selectedPaidServices) {
                        const existingService = existingProduct.ProductServices.find(
                            (ps) => ps.ProductServiceId.toString() === newService.ProductServiceId.toString()
                        );

                        if (existingService) {
                            if (!existingService.ServiceActive) {
                                existingService.ServiceActive = true;
                            }
                        } else {
                            existingProduct.ProductServices.push({
                                ProductServiceId: newService.ProductServiceId,
                                ServiceActive: true,
                            });
                        }
                    }
                    let NewFreeServices = [
                        ...new Set([
                            ...(existingProduct.ProductFreeServices || []),
                            ...freeServices.filter(Boolean).map((s) => s.ProductServiceId),
                        ]),
                    ];



                    existingProduct.ProductFreeServices = NewFreeServices;
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
                } else {
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
                }

                recalcCartTotals(FoundCart);
                const saved = await FoundCart.save();
                try {
                    await module.exports.ValidateCart(UserId, companyId);
                } catch (e) {
                    console.warn("Cart validation failed:", e.message);
                }

                return res.status(200).json({ message: "Product added/updated", success: true, data: saved });
            }


            else if (Operation === "update") {
                if (existingIndex === -1)
                    return res.status(404).json({ message: "Product not found in cart", success: false });

                let existingProduct = FoundCart.Products[existingIndex];

                if (typeof IsActive !== "undefined") existingProduct.IsActive = IsActive;

                if (ProductServiceId && typeof ServiceActive !== "undefined") {
                    const sIndex = existingProduct.ProductServices.findIndex(
                        (s) => s.ProductServiceId.toString() === ProductServiceId.toString()
                    );
                    if (sIndex !== -1)
                        existingProduct.ProductServices[sIndex].ServiceActive = ServiceActive;
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
                    await module.exports.ValidateCart(UserId, companyId);
                } catch (e) {
                    console.warn("Cart validation failed:", e.message);
                }


                return res.status(200).json({ message: "Cart updated successfully", success: true, data: saved });
            }

            else if (Operation === "remove") {
                if (existingIndex === -1)
                    return res.status(404).json({ message: "Product not found in cart", success: false });

                FoundCart.Products.splice(existingIndex, 1);
                recalcCartTotals(FoundCart);

                const saved = await FoundCart.save();
                try {
                    await module.exports.ValidateCart(UserId, companyId);
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


    getCartData: async (matchCondition) => {
        try {
            const data = await ProductCart.aggregate([
                { $match: matchCondition },

                {
                    $lookup: {
                        from: "users",
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

    ValidateCart: async (UserId, companyId) => {
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

                let availableStock = FoundVariantProduct.InventoryBaseStock?.AvailableStock || 0;
                if (availableStock <= 0) continue;
                if (EachProduct.Quantity > availableStock) EachProduct.Quantity = availableStock;

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
                            activePaidServices.push(serviceData);
                        }
                        NewProductServices.push(EachService)
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
                EachProduct.ProductServices = NewProductServices
                NewFreeServices = NewFreeServices.map(s => s.ProductServiceId)
                EachProduct.ProductFreeServices = NewFreeServices;

                const { total, discount, final } = calculateProductTotals(
                    FoundVariantProduct,
                    EachProduct.Quantity,
                    activePaidServices
                );

                EachProduct.TotalPrice = total;
                EachProduct.DiscountPrice = discount;
                EachProduct.FinalPrice = final;
                EachProduct.IsActive = true;

                updatedProducts.push(EachProduct);
            }

            FoundCart.Products = updatedProducts;

            FoundCart.TotalCartPrice = updatedProducts.reduce((sum, p) => sum + (p.TotalPrice || 0), 0);
            FoundCart.DiscountCartPrice = updatedProducts.reduce((sum, p) => sum + (p.DiscountPrice || 0), 0);
            FoundCart.FinalCartPrice = updatedProducts.reduce((sum, p) => sum + (p.FinalPrice || 0), 0);

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
    getCart: async (req, res) => {
        let { UserId, companyId } = req.query;
        try {
            let matchCondition = {};
            if (!mongoose.isValidObjectId(companyId) || !mongoose.isValidObjectId(UserId)) {
                return res.status(400).json({ message: 'Not Found Proper Data Of Company Or User', success: false })
            }
            await module.exports.ValidateCart(UserId, companyId)
            matchCondition.companyId = new mongoose.Types.ObjectId(String(companyId));
            matchCondition.UserId = new mongoose.Types.ObjectId(String(UserId));

            let data = await module.exports.getCartData(matchCondition)
            console.log(data, 'data')

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

                        return prod;
                    });
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


};