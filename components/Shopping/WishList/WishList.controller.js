const { ProductCart, ProductOrder } = require('../ProductCart/ProductCart.model');
const { Product, VariantProduct } = require('../VariantsProducts/VariantsProducts.model')
const { Wishlist } = require('./WishList.model')
const { User } = require('../../UserBase/User/User.model')
const { ProductService } = require('../ProductServices/ProductServices.model')
const CompanyModel = require('../../CompanyBase/Company/Company.model')
const mongoose = require('mongoose');
const PaytmChecksum = require("paytmchecksum");
const https = require("https");
const crypto = require('crypto');
const cron = require('node-cron');
const { brandmodel } = require('../ProductsBrand/ProductsBrand.model')
module.exports = {

    addWishlist: async (req, res) => {
        let {
            UserId,
            companyId,
            ProductId,
            VariantProductId,
            ProductServicesIds = [],
            Quantity = 1,
            Operation,
            FolderName = "Your Liked Items",
            ProductServiceId,
            ServiceActive,
            IsActive,
            WishListId,
            WishlistProductIds
        } = req.body;

        if (req.user.UserId) UserId = req.user.UserId;
        if (req.user.companyId) companyId = req.user.companyId;

        try {
            if (!UserId || !companyId)
                return res.status(400).json({ message: "User or Company not found", success: false });


            let FoundUser = await User.findOne({ _id: UserId, companyId });
            if (!FoundUser)
                return res.status(404).json({ message: "User not found", success: false });

            let FolderQuery = new RegExp(`^${FolderName}$`, "i");
            let FoundWishlist = await Wishlist.findOne({ UserId, companyId, FolderName: FolderQuery });
            let calculateProductTotals = (variant, qty, activePaidServices = []) => {
                let total = variant.Price * qty;
                let discount = 0;

                if (variant.OfferPercentage > 0)
                    discount = (total * variant.OfferPercentage) / 100;

                let final = total - discount;

                if (activePaidServices.length > 0) {
                    let servicePrice = activePaidServices.reduce(
                        (sum, s) => sum + (s.ProductServiceAmount || 0),
                        0
                    );
                    total += servicePrice;
                    final += servicePrice;
                }

                return { total, discount, final };
            };

            let recalcTotals = (wl) => {
                let total = 0,
                    discount = 0,
                    final = 0;

                for (let p of wl.Products) {
                    if (p.IsActive !== false) {
                        total += p.TotalPrice || 0;
                        discount += p.DiscountPrice || 0;
                        final += p.FinalPrice || 0;
                    }
                }

                wl.TotalCartPrice = total;
                wl.DiscountCartPrice = discount;
                wl.FinalCartPrice = final;
            };
            if (Operation === "removeAll") {

                if (!Array.isArray(WishlistProductIds) || WishlistProductIds.length === 0) {
                    return res.status(400).json({
                        message: "WishlistProductIds array is required",
                        success: false
                    });
                }

                const initialLength = FoundWishlist.Products.length;

                FoundWishlist.Products = FoundWishlist.Products.filter(
                    product => !WishlistProductIds.includes(String(product._id))
                );

                if (FoundWishlist.Products.length === initialLength) {
                    return res.status(404).json({
                        message: "No matching products found in wishlist",
                        success: false
                    });
                }

                recalcTotals(FoundWishlist);

                const saved = await FoundWishlist.save();

                try {
                    await module.exports.ValidateWishlist(req, res);
                } catch (e) {
                    console.warn("wishlist validation failed:", e.message);
                }

                return res.status(200).json({
                    message: "Selected products removed from wishlist",
                    success: true,
                    data: saved
                });
            }

            if (WishListId) {
                if (!FoundWishlist) {
                    FoundWishlist = await Wishlist.findOneAndUpdate(
                        { UserId, companyId, _id: WishListId },
                        { $set: { FolderName: FolderName.trim() } },
                        { new: true }
                    );
                    return res.status(200).json({
                        message: `Folder '${FolderName}' Renamed successfully`,
                        success: true,
                        data: FoundWishlist
                    });
                } else {
                    return res.status(200).json({
                        message: `Folder '${FolderName}' already exists`,
                        success: true,
                        data: FoundWishlist
                    });
                }
            }
            if (!ProductId || !VariantProductId) {
                if (!FoundWishlist) {
                    FoundWishlist = new Wishlist({
                        UserId,
                        companyId,
                        FolderName: FolderName.trim(),
                        Products: []
                    });
                    await FoundWishlist.save();
                    return res.status(200).json({
                        message: `Folder '${FolderName}' created successfully`,
                        success: true,
                        data: FoundWishlist
                    });
                } else {
                    return res.status(200).json({
                        message: `Folder '${FolderName}' already exists`,
                        success: true,
                        data: FoundWishlist
                    });
                }
            }
            else {
                if (!FoundWishlist) {
                    FoundWishlist = new Wishlist({
                        UserId,
                        companyId,
                        FolderName: FolderName.trim(),
                        Products: []
                    });
                    await FoundWishlist.save();
                }
            }

            let existingIndex;
            if (FoundWishlist?.Products.length) {
                existingIndex = FoundWishlist?.Products.findIndex(
                    (p) =>
                        p.ProductId.toString() === ProductId.toString() &&
                        p.VariantProductId.toString() === VariantProductId.toString()
                );

            }

            let FoundProduct = await Product.findOne({
                _id: ProductId,
                companyId,
                VariantProductIds: VariantProductId
            });
            if (!FoundProduct)
                return res.status(404).json({ message: "Product not found", success: false });

            let FoundVariantProduct = await VariantProduct.findOne({
                _id: VariantProductId,
                ProductId,
                companyId
            });
            if (!FoundVariantProduct)
                return res.status(404).json({ message: "Variant not found", success: false });




            if (Operation === "add") {
                if (Quantity <= 0) Quantity = 1;

                let paidServices = FoundProduct.ProductServices.filter((s) => s.Paid);
                let freeServices = FoundProduct.ProductServices.filter((s) => !s.Paid);

                let selectedPaidServices = paidServices.filter((s) =>
                    ProductServicesIds.includes(s.ProductServiceId.toString())
                );

                if (existingIndex !== -1) FoundWishlist.Products.splice(existingIndex, 1);

                let { total, discount, final } = calculateProductTotals(
                    FoundVariantProduct,
                    Quantity,
                    selectedPaidServices
                );

                FoundWishlist.Products.push({
                    ProductId,
                    VariantProductId,
                    Quantity,
                    TotalPrice: total,
                    DiscountPrice: discount,
                    FinalPrice: final,
                    IsActive: true,
                    ProductServices: selectedPaidServices.map((s) => ({
                        ProductServiceId: s.ProductServiceId,
                        ServiceActive: true
                    })),
                    ProductFreeServices: freeServices.map((s) => s.ProductServiceId)
                });

                recalcTotals(FoundWishlist);
                let saved = await FoundWishlist.save();

                try {
                    await module.exports.ValidateWishlist(req, res);
                } catch (e) {
                    console.warn("wishlist validation failed:", e.message);
                }
                return res.status(200).json({
                    message: "Product added to wishlist",
                    success: true,
                    data: saved
                });
            }

            else if (Operation === "update") {

                if (existingIndex === -1)
                    return res.status(404).json({ message: "Product not found in wishlist", success: false });

                let existingProduct = FoundWishlist.Products[existingIndex];

                if (typeof IsActive !== "undefined") existingProduct.IsActive = IsActive;

                if (ProductServiceId && typeof ServiceActive !== "undefined") {
                    let sIndex = existingProduct.ProductServices.findIndex(
                        (s) => s.ProductServiceId.toString() === ProductServiceId.toString()
                    );

                    if (ServiceActive) {
                        if (sIndex === -1) {
                            existingProduct.ProductServices.push({
                                ProductServiceId,
                                ServiceActive: true
                            });
                        } else {
                            existingProduct.ProductServices[sIndex].ServiceActive = true;
                        }
                    } else {
                        if (sIndex !== -1) existingProduct.ProductServices.splice(sIndex, 1);
                    }
                }

                if (Quantity) {
                    if (Quantity <= 0)
                        return res.status(400).json({ message: "Quantity must be > 0", success: false });

                    if (FoundVariantProduct.InventoryBaseStock?.InventoryBase) {
                        let stock = FoundVariantProduct.InventoryBaseStock.AvailableStock || 0;
                        if (stock < Quantity)
                            Quantity = stock;
                    }

                    existingProduct.Quantity = Quantity;
                }

                let paidServices = FoundProduct.ProductServices.filter((s) => s.Paid);
                let activePaid = existingProduct.ProductServices.filter((s) => s.ServiceActive);

                let fullServiceData = paidServices.filter((s) =>
                    activePaid.some((ap) => ap.ProductServiceId.toString() === s.ProductServiceId.toString())
                );

                let { total, discount, final } = calculateProductTotals(
                    FoundVariantProduct,
                    existingProduct.Quantity,
                    fullServiceData
                );

                existingProduct.TotalPrice = total;
                existingProduct.DiscountPrice = discount;
                existingProduct.FinalPrice = final;

                FoundWishlist.Products[existingIndex] = existingProduct;

                recalcTotals(FoundWishlist);
                let saved = await FoundWishlist.save();
                try {
                    await module.exports.ValidateWishlist(req, res);
                } catch (e) {
                    console.warn("wishlist validation failed:", e.message);
                }
                return res.status(200).json({
                    message: "Wishlist updated successfully",
                    success: true,
                    data: saved
                });
            }

            else if (Operation === "remove") {
                if (existingIndex === -1)
                    return res.status(404).json({ message: "Product not found in wishlist", success: false });

                FoundWishlist.Products.splice(existingIndex, 1);

                recalcTotals(FoundWishlist);
                let saved = await FoundWishlist.save();
                try {
                    await module.exports.ValidateWishlist(req, res);
                } catch (e) {
                    console.warn("wishlist validation failed:", e.message);
                }
                return res.status(200).json({
                    message: "Product removed from wishlist",
                    success: true,
                    data: saved
                });
            }
            else {
                return res.status(400).json({ message: "Invalid Operation", success: false });
            }
        } catch (err) {
            console.error("Wishlist Error:", err);
            return res.status(500).json({
                message: "Internal Server Error",
                error: err.message,
                success: false
            });
        }
    },


    ValidateWishlist: async (req, res) => {
        let { UserId, companyId } = req.body;

        try {
            if (!UserId || !companyId)
                return res.status(400).json({ message: 'User or Company Not Found', success: false });

            let FoundUser = await User.findOne({ _id: UserId, companyId });
            if (!FoundUser)
                return res.status(400).json({ message: 'User Not Found', success: false });

            let FoundWishlist = await Wishlist.findOne({ UserId, companyId });
            if (!FoundWishlist)
                return res.status(404).json({ message: 'Wishlist is Empty', success: false });


            let calculateProductTotals = (variant, qty, activeServices = []) => {
                let total = variant.Price * qty;
                let discount = 0;

                if (variant.OfferPercentage > 0)
                    discount = (total * variant.OfferPercentage) / 100;

                let final = total - discount;

                if (activeServices.length) {
                    let serviceTotal = activeServices.reduce(
                        (sum, s) => sum + (s.ProductServiceAmount || 0),
                        0
                    );
                    total += serviceTotal;
                    final += serviceTotal;
                }

                return { total, discount, final };
            };

            let updatedProducts = [];

            for (let EachProduct of FoundWishlist.Products) {
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

                if (!FoundProduct || !FoundVariantProduct)
                    continue;

                if (FoundVariantProduct.InventoryBaseStock?.InventoryBase === true) {
                    let availableStock = FoundVariantProduct.InventoryBaseStock.AvailableStock || 0;

                    if (availableStock <= 0) continue;

                    if (EachProduct.Quantity > availableStock) {
                        EachProduct.Quantity = availableStock;
                    }
                }

                let ProductServicesList = FoundProduct.ProductServices || [];
                let PaidServices = ProductServicesList.filter(s => s.Paid === true);
                let FreeServices = ProductServicesList.filter(s => s.Paid === false);

                let activePaidServices = [];
                let NewProductServices = [];
                let NewFreeServices = [];

                for (let EachService of EachProduct.ProductServices || []) {
                    let serviceData = await ProductService.findOne({
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
                            let matchedConfig = PaidServices.find(
                                ps => ps.ProductServiceId.toString() === EachService.ProductServiceId.toString()
                            );

                            if (matchedConfig) {
                                activePaidServices.push({
                                    ...serviceData.toObject(),
                                    ProductServiceAmount: matchedConfig.ProductServiceAmount || 0
                                });
                            }

                            NewProductServices.push(EachService);
                        }
                    }
                }

                for (let EachService of FreeServices || []) {
                    NewFreeServices.push({ ProductServiceId: EachService.ProductServiceId });
                }

                EachProduct.ProductServices = NewProductServices;
                EachProduct.ProductFreeServices = NewFreeServices.map(s => s.ProductServiceId);

                let { total, discount, final } = calculateProductTotals(
                    FoundVariantProduct,
                    EachProduct.Quantity,
                    activePaidServices
                );

                EachProduct.TotalPrice = total;
                EachProduct.DiscountPrice = discount;
                EachProduct.FinalPrice = final;

                updatedProducts.push(EachProduct);
            }

            FoundWishlist.Products = updatedProducts;

            let activeProducts = updatedProducts.filter(p => p.IsActive !== false);

            FoundWishlist.TotalCartPrice = parseFloat(activeProducts.reduce((sum, p) => sum + (p.TotalPrice || 0), 0).toFixed(2));
            FoundWishlist.DiscountCartPrice = parseFloat(activeProducts.reduce((sum, p) => sum + (p.DiscountPrice || 0), 0).toFixed(2));
            FoundWishlist.FinalCartPrice = parseFloat(activeProducts.reduce((sum, p) => sum + (p.FinalPrice || 0), 0).toFixed(2));

            await FoundWishlist.save();

        } catch (error) {
            console.warn("ValidateWishlist Error:", error.message);
            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }
    },

    getWishListData: async (matchCondition) => {
        try {
            let data = await Wishlist.aggregate([
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
                        FolderName: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ]);


            return data || null;
        } catch (error) {
            console.error("getWishListDataError:", error);
            throw new Error("Failed to fetch WishList data");
        }
    },

    getWishList: async (req, res) => {
        let { UserId, companyId, FolderName } = req.query;
        if (req.user.UserId) UserId = req.user.UserId
        if (req.user.companyId) companyId = req.user.companyId
        try {
            let matchCondition = {};
            if (!mongoose.isValidObjectId(companyId) || !mongoose.isValidObjectId(UserId)) {
                return res.status(400).json({ message: 'Not Found Proper Data Of Company Or User', success: false })
            }

            if (FolderName) FolderName = FolderName.trim().toLowerCase();
            try {
                req.body = req.body || {};
                req.body.UserId = UserId;
                req.body.companyId = companyId;
                await module.exports.ValidateWishlist(req, res);
            } catch (e) {
                console.warn("Wishlist validation failed:", e.message);
            }

            matchCondition.companyId = new mongoose.Types.ObjectId(String(companyId));
            matchCondition.UserId = new mongoose.Types.ObjectId(String(UserId));

            if (FolderName) {
                matchCondition.FolderName = { $regex: new RegExp(`^${FolderName}$`, "i") };
            }

            let data = await module.exports.getWishListData(matchCondition)
            if (data && data[0]?.Products?.length == 0) {
                return res.status(200).json({ message: 'Cart is empty', success: true, data: data })
            }
            if (data?.length) {
                data = data.map(cart => {
                    cart.Products = cart.Products.map(prod => {
                        if (prod?.ProductInfo?.ProductServices && prod?.ServiceInfo) {
                            let existingServiceIds = prod.ServiceInfo.map(s => s.ProductServiceId?.toString());
                            let allServiceIds = prod.ProductInfo.ProductServices.map(s => s.ProductServiceId?.toString());

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
                message: "WishList fetched and recalculated successfully",
                success: true,
                data: data
            });

        } catch (error) {
            console.warn("getWishListError:", error.message);
            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }
    },

    proceedToPaymentForWishList: async (req, res) => {
        let { UserId, companyId, AddressId, WishListId } = req.body;
        let { RenderingDomain } = req.query;

        RenderingDomain = ["private", "public"].includes((RenderingDomain || "").toLowerCase())
            ? RenderingDomain.toLowerCase()
            : "public";

        if (req.user.UserId) UserId = req.user.UserId;
        if (req.user.companyId) companyId = req.user.companyId;

        let rollback = {
            orderId: null,
            stockUpdates: []
        };

        const RollBackFunction = async () => {
            try {
                if (rollback.stockUpdates?.length) {
                    await Promise.all(
                        rollback.stockUpdates.map(async ({ variantId, quantity }) =>
                            VariantProduct.updateOne(
                                { _id: variantId, "InventoryBaseStock.InventoryBase": true },
                                {
                                    $inc: {
                                        "InventoryBaseStock.AvailableStock": quantity,
                                        "InventoryBaseStock.ReservedStock": -quantity
                                    }
                                }
                            )
                        )
                    );
                }

                if (rollback.orderId) {
                    await ProductOrder.findByIdAndDelete(rollback.orderId);
                }

            } catch (err) {
                console.error("Rollback Error:", err.message);
            }
        };

        try {
            await module.exports.ValidateWishlist(req, res);

            let WishList = await Wishlist.findOne({
                _id: WishListId,
                UserId,
                companyId
            });

            if (!WishList || !WishList.Products?.length)
                return res.status(400).json({ message: "Wishlist is empty", success: false });

            let FoundUser = await User.findOne({ _id: UserId, companyId });
            if (!FoundUser)
                return res.status(400).json({ message: "User not found", success: false });

            let OrderData = {
                UserId,
                companyId,
                Products: [],
                ReservationStartedAt: new Date()
            };

            let FoundedAddress;
            if (!FoundUser.Address || FoundUser.Address.length === 0)
                return res.status(400).json({ message: "Address not found", success: false });

            if (!AddressId) {
                FoundedAddress = FoundUser.Address.find(a => a.DefaultAddress) || FoundUser.Address[0];
            } else {
                FoundedAddress = FoundUser.Address.find(a => a._id.toString() === AddressId);
            }

            if (!FoundedAddress)
                return res.status(400).json({ message: "Address not found", success: false });

            OrderData.UserDetails = {
                UserName: FoundUser.UserName || "",
                Email: FoundUser.Email || "",
                Phone: FoundUser.Phone,
                AddresserName: FoundedAddress.AddresserName || FoundUser.UserName || "Guest",
                AddresserNumber: FoundedAddress.AddresserNumber || FoundUser.Phone,
                AddressType: FoundedAddress.AddressType || "Home",
                Street: FoundedAddress.Street || "",
                City: FoundedAddress.City || "",
                State: FoundedAddress.State || "",
                Country: FoundedAddress.Country || "",
                PostalCode: FoundedAddress.PostalCode || "",
                Latitude: FoundedAddress.Latitude || "",
                Longitude: FoundedAddress.Longitude || "",
                ManualAddress: FoundedAddress.ManualAddress || ""
            };

            let matchCondition = {
                companyId: new mongoose.Types.ObjectId(String(companyId)),
                UserId: new mongoose.Types.ObjectId(String(UserId))
            };

            let data = await module.exports.getWishListData(matchCondition);

            if (data && data[0]) {
                if (data.length) {
                    data = data.map(cart => {
                        cart.Products = cart.Products.map(prod => {
                            if (prod?.ProductInfo?.ProductServices && prod?.ServiceInfo) {
                                let existingServiceIds = prod.ServiceInfo.map(s => s.ProductServiceId?.toString());
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
                let WLProducts = data[0].Products;

                for (let p of WLProducts) {
                    if (p.IsActive == false) continue;

                    let variantInfo = await VariantProduct.findById(p.VariantProductId);

                    let ProductEntry = {
                        WishListProductId: p._id,
                        OrderStatus: [{ Status: "INITIATED", StatusAt: new Date() }],
                        Quantity: p.Quantity,
                        TotalPrice: p.TotalPrice,
                        DiscountPrice: p.DiscountPrice,
                        FinalPrice: p.FinalPrice,
                        ProductData: { ProductInfo: {}, VariantProductInfo: {} },
                        ProductServices: [],
                        ProductFreeServices: []
                    };

                    ProductEntry.ProductData.ProductInfo = {
                        ProductId: p.ProductId,
                        ProductName: p.ProductInfo.ProductName,
                        CommonImages: p.ProductInfo.CommonImages,
                        CommonVideos: p.ProductInfo.CommonVideos,
                        CommonDescription: p.ProductInfo.CommonDescription
                    };

                    let FoundBrand = await brandmodel.findOne({
                        companyId,
                        _id: p.ProductInfo.BrandId
                    });

                    if (FoundBrand) {
                        ProductEntry.ProductData.ProductInfo.BrandId = FoundBrand._id;
                        ProductEntry.ProductData.ProductInfo.BrandName = FoundBrand.BrandName;
                    }

                    if (variantInfo) {
                        ProductEntry.ProductData.VariantProductInfo = {
                            VariantProductId: variantInfo._id,
                            VariantProductName: variantInfo.VariantProductName,
                            VariantFields: p.VariantInfo.VariantFields,
                            VariantProductImage: p.VariantInfo.VariantProductImage,
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

            if (!OrderData.Products.length)
                return res.status(400).json({ message: "No valid products found", success: false });

            OrderData.TotalCartPrice = parseFloat(
                OrderData.Products.reduce((a, b) => a + (b.TotalPrice || 0), 0).toFixed(2)
            );
            OrderData.DiscountCartPrice = parseFloat(
                OrderData.Products.reduce((a, b) => a + (b.DiscountPrice || 0), 0).toFixed(2)
            );
            OrderData.FinalCartPrice = parseFloat(
                OrderData.Products.reduce((a, b) => a + (b.FinalPrice || 0), 0).toFixed(2)
            );

            let SavedOrder = await new ProductOrder(OrderData).save();
            rollback.orderId = SavedOrder._id;

            let FoundOrder = await ProductOrder.findById(SavedOrder._id);
            if (!FoundOrder) {
                await RollBackFunction();
                return res.status(500).json({ message: "Order initialization failed", success: false });
            }


            try {
                let productsToUpdate = [];

                for (let item of FoundOrder.Products) {
                    let variant = await VariantProduct.findOne({
                        _id: item.ProductData.VariantProductInfo.VariantProductId,
                        ProductId: item.ProductData.ProductInfo.ProductId,
                        companyId,
                        isActive: true
                    });

                    if (!variant) {
                        await RollBackFunction();
                        return res.status(400).json({ message: "Some products are unavailable", success: false });
                    }

                    if (variant.InventoryBaseStock?.InventoryBase == true) {
                        let available = variant.InventoryBaseStock.AvailableStock || 0;

                        if (item.Quantity > available) {
                            await RollBackFunction();
                            return res.status(400).json({
                                message: `Not enough stock for ${variant.VariantProductName || "product"}`,
                                success: false
                            });
                        }

                        productsToUpdate.push({ variantId: variant._id, quantity: item.Quantity });
                    }
                }

                await Promise.all(
                    productsToUpdate.map(async ({ variantId, quantity }) => {
                        await VariantProduct.updateOne(
                            { _id: variantId, "InventoryBaseStock.InventoryBase": true },
                            {
                                $inc: {
                                    "InventoryBaseStock.AvailableStock": -quantity,
                                    "InventoryBaseStock.ReservedStock": quantity
                                }
                            }
                        );
                        rollback.stockUpdates.push({ variantId, quantity });
                    })
                );

            } catch (err) {
                console.error("Stock Validation Error:", err);
                await RollBackFunction();
                return res.status(500).json({ message: "Stock validation failed", success: false });
            }

            try {
                let orderId = `ORDER_${FoundOrder._id.toString().slice(-6)}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
                let totalAmount = FoundOrder.FinalCartPrice || FoundOrder.TotalCartPrice;

                let paytmParams = {
                    body: {
                        requestType: "Payment",
                        mid: process.env.PAYTM_MID,
                        websiteName: process.env.PAYTM_WEBSITE,
                        orderId,
                        callbackUrl: `${process.env.BASE_URL}productcart/handlePaymentStatus?RenderingDomain=${RenderingDomain}&companyId=${companyId}`,
                        txnAmount: { value: totalAmount.toString(), currency: "INR" },
                        userInfo: { custId: UserId.toString() }
                    }
                };

                let checksum = await PaytmChecksum.generateSignature(
                    JSON.stringify(paytmParams.body),
                    process.env.PAYTM_KEY
                );

                paytmParams.head = { signature: checksum };
                let post_data = JSON.stringify(paytmParams);

                let options = {
                    hostname: process.env.PAYTM_HOSTNAME,
                    port: 443,
                    path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(post_data)
                    }
                };

                let paytmResponse = await new Promise((resolve, reject) => {
                    let response = "";
                    let paytmReq = https.request(options, (paytmRes) => {
                        paytmRes.on("data", chunk => (response += chunk));
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
                await FoundOrder.save();

                if (!paytmResponse?.body?.txnToken) {
                    await RollBackFunction();
                    return res.status(500).json({ message: "Payment gateway returned no txnToken", success: false });
                }

                return res.status(200).json({
                    success: true,
                    message: "Payment Initiated",
                    url: `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${orderId}`,
                    txnToken: paytmResponse.body.txnToken,
                    orderId,
                    mid: process.env.PAYTM_MID,
                    amount: totalAmount
                });

            } catch (err) {
                console.error("Payment Initiation Error:", err);
                await RollBackFunction();
                return res.status(500).json({ message: "Failed to initiate payment", success: false });
            }

        } catch (err) {
            console.error("ProceedToPaymentForWishlist Error:", err);
            await RollBackFunction();
            return res.status(500).json({ message: "Internal server error", success: false });
        }
    },
    deleteWishList: async (req, res) => {
        let { UserId, companyId, WishListId } = req.query;

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        try {
            if (!UserId || !companyId) {
                return res.status(400).json({
                    message: "User or Company not found",
                    success: false
                });
            }

            if (!WishListId) {
                return res.status(400).json({
                    message: "WishListId is required",
                    success: false
                });
            }

            const deleted = await Wishlist.findOneAndDelete({
                _id: WishListId,
                UserId,
                companyId
            });

            if (!deleted) {
                return res.status(404).json({
                    message: "Wishlist not found or already deleted",
                    success: false
                });
            }

            return res.status(200).json({
                message: "Wishlist deleted successfully",
                success: true,
                data: deleted
            });

        } catch (error) {
            console.error("Delete Wishlist Error:", error);
            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }
    }


};


