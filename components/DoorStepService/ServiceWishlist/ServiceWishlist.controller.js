const { default: mongoose } = require("mongoose");
const { ServiceWishlist } = require("./ServiceWishlist.model");

module.exports = {
    addWishlistService: async (req, res) => {
        try {
            let { UserId, companyId, ServiceProductId, Operation } = req.body;

            if (!mongoose.Types.ObjectId.isValid(UserId) || !mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    message: 'Please provide valid UserId and companyId',
                    success: false
                });
            }

            if (!ServiceProductId) {
                return res.status(400).json({
                    message: 'Please provide ServiceProductId',
                    success: false
                });
            }

            let productIds = Array.isArray(ServiceProductId)
                ? ServiceProductId
                : [ServiceProductId];

            if (Operation === 'add') {

                let existingWishlist = await ServiceWishlist.findOne({ UserId, companyId });

                let updatedWishlist;

                if (!existingWishlist) {
                    updatedWishlist = await new ServiceWishlist({
                        UserId,
                        companyId,
                        ServiceProductsIds: productIds
                    }).save();

                } else {
                    updatedWishlist = await ServiceWishlist.findOneAndUpdate(
                        { UserId, companyId },
                        {
                            $addToSet: { ServiceProductsIds: { $each: productIds } }
                        },
                        { new: true }
                    );
                }

                return res.status(200).json({
                    message: "Service added to wishlist",
                    success: true,
                    data: updatedWishlist
                });
            }

            if (Operation === 'remove') {
                let updatedWishlist = await ServiceWishlist.findOneAndUpdate(
                    { UserId, companyId },
                    {
                        $pull: { ServiceProductsIds: { $in: productIds } }
                    },
                    { new: true }
                );

                return res.status(200).json({
                    message: "Service removed from wishlist",
                    success: true,
                    data: updatedWishlist
                });
            }

            return res.status(400).json({
                message: "Invalid Operation",
                success: false
            });

        } catch (error) {
            console.log('addWishlistServiceError:', error.message)
            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }
    },
    getWishlist: async (req, res) => {
        try {
            let { UserId, companyId } = req.query;

            if (!mongoose.Types.ObjectId.isValid(UserId) || !mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    message: 'Please provide valid UserId and companyId',
                    success: false
                });
            }

            let matchCondition = {
                UserId: new mongoose.Types.ObjectId(String(UserId)),
                companyId: new mongoose.Types.ObjectId(String(companyId))
            };

            const data = await ServiceWishlist.aggregate([
                {
                    $match: matchCondition
                },
                {
                    $lookup: {
                        from: "serviceproducts",
                        localField: "ServiceProductsIds",
                        foreignField: "_id",
                        as: "ServiceProductDatas"
                    }
                },
            ]);

            if (!data || data.length === 0) {
                return res.status(200).json({
                    message: "Wishlist is empty",
                    success: true,
                    data: []
                });
            }

            return res.status(200).json({
                message: "Wishlist fetched successfully",
                success: true,
                data: data
            });

        } catch (error) {
            console.log('getWishlistError:', error.message);

            return res.status(500).json({
                message: "Internal Server Error",
                error: error.message,
                success: false
            });
        }
    },
}