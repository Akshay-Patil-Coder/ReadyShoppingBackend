const { ObjectId } = require('mongodb');
const { Product } = require('../VariantsProducts/VariantsProducts.model');
const { ProductRating } = require('../ProductRating/ProductRating.model')
const { ProductOrder } = require('../ProductCart/ProductCart.model')

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

module.exports = {

    addProductReview: async (req, res) => {
        let { companyId, ProductId, UserId, ReviewText, RatingStar } = req.body;
        if (req.user.UserId) UserId = req.user.UserId
        if (req.user.companyId) companyId = req.user.companyId
        let ReviewImages = req.files?.map(f => f.filename) || [];

        let clearFiles = (files) => {
            files.forEach(file => {
                let filePath = path.join(__dirname, '..', '..', 'public', 'ProductSRatingImage', file);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        };

        let addedReview = null;

        try {
            if (!companyId || !ProductId || !UserId) {
                clearFiles(ReviewImages);
                return res.status(400).json({ success: false, message: "Missing required fields." });
            }
            if (RatingStar !== undefined && RatingStar !== null) {
                RatingStar = Number(RatingStar);
            }

            if ((!ReviewText?.trim()) && (RatingStar === undefined || RatingStar === null)) {
                clearFiles(ReviewImages);
                return res.status(400).json({ success: false, message: "Provide review text or rating star." });
            }



            if (RatingStar !== undefined && (typeof RatingStar !== 'number' || RatingStar < 0 || RatingStar > 5)) {
                clearFiles(ReviewImages);
                return res.status(400).json({ success: false, message: "Rating star must be between 0 and 5." });
            }

            let product = await Product.findOne({ _id: ProductId, companyId });
            if (!product) {
                clearFiles(ReviewImages);
                return res.status(404).json({ success: false, message: "Product not found." });
            }
            const FoundOrder = await ProductOrder.findOne({
                companyId,
                UserId,
                "PaymentSession.status": "SUCCESS",
                Products: {
                    $elemMatch: {
                        "ProductData.ProductInfo.ProductId": ProductId,
                        "OrderStatus.Status": "SHIPPED"
                    }
                }
            });

            if (!FoundOrder) {
                clearFiles(ReviewImages);
                return res.status(400).json({
                    message: "You must purchase this product before adding a rating.",
                    success: false
                });
            }

            let reviewData = { companyId, ProductId, UserId };
            if (ReviewText?.trim()) reviewData.ReviewText = ReviewText;
            if (ReviewImages.length) reviewData.ReviewImages = ReviewImages;
            if (RatingStar !== undefined) reviewData.RatingStar = RatingStar;

            addedReview = await new ProductRating(reviewData).save();

            if (!addedReview) {
                clearFiles(ReviewImages);
                return res.status(400).json({ success: false, message: "Review not added." });
            }

            let productObjectId = new mongoose.Types.ObjectId(String(ProductId));
            let companyObjectId = new mongoose.Types.ObjectId(String(companyId));
            let m = 30;

            try {
                let productData = await ProductRating.aggregate([
                    { $match: { ProductId: productObjectId } },
                    {
                        $group: {
                            _id: "$ProductId",
                            avgRating: { $avg: "$RatingStar" },
                            totalReviews: { $sum: 1 },
                            ratingsArray: { $push: "$RatingStar" }
                        }
                    }
                ]);

                if (productData.length) {
                    let { avgRating: R, totalReviews: v, ratingsArray } = productData[0];

                    let globalData = await ProductRating.aggregate([
                        { $match: { companyId: companyObjectId } },
                        { $group: { _id: null, globalAvg: { $avg: "$RatingStar" } } }
                    ]);
                    let C = globalData[0]?.globalAvg || 3.5;

                    let weightedAvg = ((v / (v + m)) * R) + ((m / (v + m)) * C);
                    let finalRating = Math.min(Math.max(weightedAvg, 0), 5);

                    let distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                    ratingsArray.forEach(r => {
                        let star = Math.round(r);
                        if (star >= 1 && star <= 5) distribution[star]++;
                    });

                    await Product.findByIdAndUpdate(
                        productObjectId,
                        {
                            $set: {
                                RatingStar: Number(finalRating.toFixed(1)),
                                TotalReviews: v,
                                RatingDistribution: distribution
                            },
                            $addToSet: { RatingIds: addedReview._id }
                        }
                    );
                }

                return res.status(200).json({ success: true, message: "Review added successfully!" });

            } catch (err) {
                if (addedReview) await ProductRating.findByIdAndDelete(addedReview._id);
                clearFiles(ReviewImages);
                console.error("AddProductReviewError during aggregation/update:", err);
                return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
            }

        } catch (error) {
            if (addedReview) await ProductRating.findByIdAndDelete(addedReview._id);
            clearFiles(ReviewImages);
            console.error("AddProductReviewError:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
        }
    },

    DeleteReview: async (req, res) => {
        let { companyId, ProductId, ReviewIds } = req.body;
        if (req.user.companyId) companyId = req.user.companyId
        let clearFiles = (files) => {
            files.forEach((file) => {
                let CurrentImagePath = path.join(__dirname, '..', '..', 'public', 'ProductSRatingImage', file);
                try {
                    if (fs.existsSync(CurrentImagePath)) fs.unlinkSync(CurrentImagePath);
                } catch (error) {
                    console.warn('Image Not Deleted:', error.message);
                }
            });
        };

        try {
            ReviewIds = Array.isArray(ReviewIds) ? ReviewIds : [ReviewIds];

            if (!companyId || !ProductId || ReviewIds.length === 0) {
                return res.status(400).json({ success: false, message: "Missing required fields." });
            }

            let foundProduct = await Product.findOne({ companyId, _id: ProductId });
            if (!foundProduct) {
                return res.status(400).json({ success: false, message: "Product not found." });
            }

            let deletedReviewIds = [];

            for (let eachId of ReviewIds) {
                let foundReview = await ProductRating.findOne({ _id: eachId, companyId });
                if (foundReview) {
                    if (Array.isArray(foundReview.ReviewImages) && foundReview.ReviewImages.length > 0) {
                        clearFiles(foundReview.ReviewImages);
                    }
                    await ProductRating.deleteOne({ _id: eachId, companyId });
                    deletedReviewIds.push(foundReview._id);
                }
            }

            await Product.findByIdAndUpdate(ProductId, {
                $pull: { RatingIds: { $in: deletedReviewIds } }
            });
            let productObjectId = new mongoose.Types.ObjectId(String(ProductId))
            let m = 30;
            let productData = await ProductRating.aggregate([
                { $match: { ProductId: productObjectId } },
                {
                    $group: {
                        _id: "$ProductId",
                        avgRating: { $avg: "$RatingStar" },
                        totalReviews: { $sum: 1 },
                        ratingsArray: { $push: "$RatingStar" }
                    }
                }
            ]);

            if (productData.length) {
                let { avgRating: R, totalReviews: v, ratingsArray } = productData[0];
                let companyObjectId = new mongoose.Types.ObjectId(String(companyId))
                let globalData = await ProductRating.aggregate([
                    { $match: { companyId: companyObjectId } },
                    { $group: { _id: null, globalAvg: { $avg: "$RatingStar" } } }
                ]);
                let C = globalData[0]?.globalAvg || 3.5;

                let weightedAvg = ((v / (v + m)) * R) + ((m / (v + m)) * C);
                let finalRating = Math.min(Math.max(weightedAvg, 0), 5);

                let distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                ratingsArray.forEach(r => {
                    let star = Math.round(r);
                    if (star >= 1 && star <= 5) distribution[star]++;
                });

                await Product.findByIdAndUpdate(ProductId, {
                    $set: {
                        RatingStar: Number(finalRating.toFixed(1)),
                        TotalReviews: v,
                        RatingDistribution: distribution
                    }
                });
            } else {
                await Product.findByIdAndUpdate(ProductId, {
                    $set: {
                        RatingStar: 0,
                        TotalReviews: 0,
                        RatingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    }
                });
            }

            return res.status(200).json({ success: true, message: "Review(s) deleted successfully!" });

        } catch (error) {
            console.error("DeleteReviewError:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
        }
    },

    getReviewByData: async (matchCondition) => {
        return await ProductRating.aggregate([
            { $match: matchCondition },

            {
                $lookup: {
                    from: 'readyshoppingusers',
                    let: { userId: '$UserId' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
                        { $project: { UserName: 1, UserProfile: 1, _id: 1 } }
                    ],
                    as: 'UserData'
                }
            },

            {
                $lookup: {
                    from: 'products',
                    let: { productId: '$ProductId' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$productId'] } } },
                        { $project: { ProductName: 1, firstImage: { $arrayElemAt: ['$CommonImages', 0] }, _id: 1 } }
                    ],
                    as: 'ProductData'
                }
            },

            {
                $unwind: { path: '$ResponseOnReview', preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: 'readyshoppingusers',
                    let: { responseUserId: '$ResponseOnReview.UserId' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$responseUserId'] } } },
                        { $project: { UserName: 1, UserProfile: 1, _id: 1 } }
                    ],
                    as: 'ResponseOnReview.UserData'
                }
            },
            { $unwind: { path: '$ResponseOnReview.UserData', preserveNullAndEmptyArrays: true } },

            {
                $group: {
                    _id: '$_id',
                    ProductId: { $first: '$ProductId' },
                    UserId: { $first: '$UserId' },
                    RatingStar: { $first: '$RatingStar' },
                    ReviewText: { $first: '$ReviewText' },
                    TotalLike: { $first: '$TotalLike' },
                    TotalDislike: { $first: '$TotalDislike' },
                    ReviewImages: { $first: '$ReviewImages' },
                    ResponseOnReview: { $push: '$ResponseOnReview' },
                    UserData: { $first: '$UserData' },
                    ProductData: { $first: '$ProductData' },
                    createdAt: { $first: '$createdAt' },
                    updatedAt: { $first: '$updatedAt' }
                }
            },
            { $sort: { createdAt: -1 } },
        ]);

    },

    getReview: async (req, res) => {
        try {
            let { companyId, ProductId, ReviewId, RatingStar, UserId } = req.query;

            if (!companyId)
                return res.status(400).json({ message: 'companyId is required', success: false });

            let matchCondition = { companyId: new mongoose.Types.ObjectId(String(companyId)) };

            if (ProductId) {
                if (!mongoose.Types.ObjectId.isValid(ProductId))
                    return res.status(400).json({ message: 'Invalid ProductId format', success: false });
                matchCondition.ProductId = new mongoose.Types.ObjectId(String(ProductId));
            }

            if (RatingStar !== undefined) {
                let star = Number(RatingStar);
                if (Number.isNaN(star) || star < 0 || star > 5)
                    return res.status(400).json({ success: false, message: "Rating star must be between 0 and 5." });
                matchCondition.RatingStar = star;
            }

            if (ReviewId) {
                if (!mongoose.Types.ObjectId.isValid(ReviewId))
                    return res.status(400).json({ message: 'Invalid ReviewId format', success: false });
                matchCondition._id = new mongoose.Types.ObjectId(String(ReviewId));
            }

            if (UserId) {
                if (!mongoose.Types.ObjectId.isValid(UserId))
                    return res.status(400).json({ message: 'Invalid UserId format', success: false });
                matchCondition.UserId = new mongoose.Types.ObjectId(String(UserId));
            }

            // Fetch enriched reviews using aggregation
            let data = await module.exports.getReviewByData(matchCondition);

            if (!data || data.length === 0)
                return res.status(404).json({ message: 'No reviews found for this criteria', success: false });

            return res.status(200).json({ data, success: true, message: 'Reviews fetched successfully' });

        } catch (error) {
            console.error("getReview error:", error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message, success: false });
        }
    },
    MakeResponseReview: async (req, res) => {
        let { companyId, ReviewId, UserId, ProductId, Reaction } = req.body;
        if (req.user.UserId) UserId = req.user.UserId
        if (req.user.companyId) companyId = req.user.companyId
        try {
            if (!companyId || !ReviewId || !UserId || !ProductId || !Reaction) {
                return res.status(400).json({ success: false, message: "Missing required fields." });
            }

            let review = await ProductRating.findOne({ _id: ReviewId, companyId, ProductId });
            if (!review) {
                return res.status(404).json({ success: false, message: "Review not found." });
            }

            let existingResponseIndex = review.ResponseOnReview.findIndex(
                r => r.UserId.toString() === UserId
            );

            let message = "";

            if (existingResponseIndex !== -1) {
                let existingResponse = review.ResponseOnReview[existingResponseIndex];

                if (existingResponse.LikeOrDislike === Reaction) {
                    review.ResponseOnReview.splice(existingResponseIndex, 1);
                    message = "Reaction removed.";
                } else {
                    review.ResponseOnReview.splice(existingResponseIndex, 1);
                    review.ResponseOnReview.push({
                        UserId,
                        LikeOrDislike: Reaction,
                        createdAt: new Date()
                    });
                    message = "Reaction updated.";
                }
            } else {
                review.ResponseOnReview.push({
                    UserId,
                    LikeOrDislike: Reaction,
                    createdAt: new Date()
                });
                message = "Reaction added.";
            }

            let totalLike = 0, totalDislike = 0;
            review.ResponseOnReview.forEach(r => {
                if (r.LikeOrDislike === "Like") totalLike++;
                if (r.LikeOrDislike === "Dislike") totalDislike++;
            });

            review.TotalLike = totalLike;
            review.TotalDislike = totalDislike;

            await review.save();

            return res.status(200).json({
                success: true,
                message,
                TotalLike: totalLike,
                TotalDislike: totalDislike
            });

        } catch (error) {
            console.error("MakeResponseReviewError:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
        }
    }


};
