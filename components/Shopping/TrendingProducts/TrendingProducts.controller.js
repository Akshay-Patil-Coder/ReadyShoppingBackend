const trendingmodel = require('./TrendingProducts.model')
const { error } = require('console');
const mongoose = require('mongoose');

module.exports = {
    addtrendingproducts: async (req, res) => {
        try {
            const { categoryId, productsId, companyId,SubCategoryId } = req.body;
            console.log(req.body, 'new testing');

            if (!categoryId || !SubCategoryId || !productsId || productsId.length === 0) {
                return res.status(400).send('Please insert valid data');
            }

            let result = await trendingmodel.trendingsproducts.findOne({ SubCategoryId, companyId });

            if (!result) {
                let newResult = new trendingmodel.trendingsproducts(req.body);
                newResult = await newResult.save();
                return res.status(200).json({ data: newResult, success: true });
            } else {
                let updatedResult = await trendingmodel.trendingsproducts.findOneAndUpdate(
                    { SubCategoryId, companyId },
                    { $addToSet: { productsId: { $each: productsId } } },
                    { new: true }
                );

                return res.status(200).json({ data: updatedResult, success: true });
            }
        } catch (error) {
            console.error(error);
            return res.status(400).json({ error: error.message, success: false });
        }
    },

    gettrendingproducts: async (req, res) => {
        const { companyId, categoryId, SubCategoryId } = req.query;
        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId(companyId) };
            if (categoryId) {
                if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.categoryId = mongoose.Types.ObjectId(categoryId);
            }
            if (SubCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCategoryId = mongoose.Types.ObjectId(SubCategoryId);
            }
           

            const data = await trendingmodel.trendingsproducts.aggregate([
                {
                    $match: matchCondition
                },
                {
                    $lookup: {
                        from: "categgggories",
                        localField: "categoryId",
                        foreignField: "_id",
                        as: "categories",
                    }
                },
                {
                    $lookup: {
                        from: "categgggories",
                        localField: "SubCategoryId",
                        foreignField: "_id",
                        as: "subCategories",
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        localField: "productsId",
                        foreignField: "_id",
                        as: "products",
                    }
                },


            ])


            if (data.length === 0) {
                return res.status(404).json({ message: 'No trending products found for this category', success: false });
            }
            // console.log('result of populated data', data);
            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: error.message, success: false });
        }
    },

    deletetrendingproducts: async (req, res) => {
        try {
            const { SubCategoryId, productsId } = req.body;
            const companyId = req.query.companyId;
            console.log(req.body, 'new testing');

            if (!SubCategoryId || !productsId || productsId.length === 0) {
                return res.status(400).send('Please insert valid data');
            }


            else {
                let updatedResult = await trendingmodel.trendingsproducts.findOneAndUpdate(
                    { SubCategoryId, companyId },
                    { $pull: { productsId: { $in: productsId } } },
                    { new: true }
                );

                return res.status(200).json({ data: updatedResult, success: true });
            }
        } catch (error) {
            console.error(error);
            return res.status(400).json({ error: error.message, success: false });
        }

    },

    // deletetrendingproductsList: async (req, res) => {
    //     try {

    //         const data = await trendingmodel.trendingsproducts.findOneAndDelete({ _id: req.params._id })
    //         res.status(200).send({
    //             success: "true",
    //             message: "successfully deleted",
    //             data: data
    //         })
    //     } catch (error) {
    //         res.status(200).send({
    //             success: "false",
    //             message: "Unsuccessfully deleted",
    //             error: error.message
    //         })
    //     }
    // },

}