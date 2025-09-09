const { ObjectID } = require('mongodb')
const brandmodel = require('./ProductsBrand.model')
const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path')
module.exports = {


    addbrands: async (req, resp) => {

        try {

            let { BrandName, companyId, HeadCategoryId, SubCategoryId } = req.body;
            SubCategoryId = JSON.parse(SubCategoryId)
            console.log(SubCategoryId);

            if (!BrandName || !companyId || !HeadCategoryId || !SubCategoryId) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }

                return resp.status(400).json({ message: 'Please fill in all required fields', success: false });
            }

            const brandData = {
                BrandName,
                companyId,
                HeadCategoryId,
                SubCategoryId
            };

            if (req.file) {
                brandData.BrandImage = req.file.filename;

            }

            const newBrand = new brandmodel.brandmodel(brandData);
            const result = await newBrand.save();


            if (!result) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }

                return resp.status(400).json({ message: 'Something went wrong while saving the brand', success: false });
            }

            return resp.status(200).json({ data: result, success: true });
        } catch (error) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            return resp.status(500).json({ error: error.message, success: false });
        }
    },


    getBrandData: async (matchCondition) => {
        return await brandmodel.brandmodel.aggregate([
            { $match: matchCondition },
            {
                $lookup: {
                    from: "categgggories",
                    localField: "HeadCategoryId",
                    foreignField: "_id",
                    as: "HeadCategory",
                }
            },
            {
                $lookup: {
                    from: "categgggories",
                    localField: "SubCategoryId",
                    foreignField: "_id",
                    as: "SubCategories",
                }
            }
        ]);
    },

    getBrandsById: async (req, res) => {
        const { HeadCategoryId, SubCategoryId, companyId, BrandId } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId(companyId) };

            if (HeadCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCategoryId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCategoryId = mongoose.Types.ObjectId(HeadCategoryId);
            } 
             if (SubCategoryId) {
                if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCategoryId = { $in: [mongoose.Types.ObjectId(SubCategoryId)] };
            } 
             if (BrandId) {
                if (!mongoose.Types.ObjectId.isValid(BrandId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId(BrandId);
            }

            const data = await module.exports.getBrandData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Brands found for this category', success: false });
            }

            // console.log('result of populated data', data);
            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            res.status(400).json({ error: error.message, success: false });
        }
    },

    updateSubCategoryList: async (req, resp) => {
        try {
            let { BrandId, SubCategoryId } = req.body;
            const companyId = req.query.companyId;
            const operation = req.query.operation;
            if (!BrandId || !SubCategoryId || SubCategoryId.length === 0) {
                return resp.status(400).send('Please insert valid data');
            }


            else {
                if (operation === 'delete') {
                    let updatedResult = await brandmodel.brandmodel.findOneAndUpdate(
                        { _id: BrandId, companyId: companyId },
                        { $pull: { SubCategoryId: { $in: SubCategoryId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }
                if (operation === 'add') {
                    let updatedResult = await brandmodel.brandmodel.findOneAndUpdate(
                        { _id: BrandId, companyId: companyId },
                        { $addToSet: { SubCategoryId: { $each: SubCategoryId } } },
                        { new: true }
                    );

                    return resp.status(200).json({ data: updatedResult, success: true });
                }

            }
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });
        }

    },
    updateBrandDetails: async (req, resp) => {
        try {
            const { BrandId, BrandName } = req.body;
            const companyId = req.query.companyId;
            console.log(req.body, 'new testing');

            if (!BrandId || !BrandName) {
                const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
                return resp.status(400).send('Please insert valid data');

            }


            else {
                const brandData = {
                    BrandName
                }
                if (req.file) {
                    const existingBrand = await brandmodel.brandmodel.findOne({ _id: BrandId, companyId: companyId })
                    if (existingBrand && existingBrand.BrandImage) {
                        const oldImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', existingBrand.BrandImage);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    brandData.BrandImage = req.file.filename;
                }

                let updatedResult = await brandmodel.brandmodel.updateOne(
                    { _id: BrandId, companyId: companyId },
                    {
                        $set: brandData
                    }
                );
                if (!updatedResult) {
                    return resp.status(400).json({ message: 'not updated', success: false });
                }
                else {
                    return resp.status(200).json({ data: updatedResult, success: true });
                }

            }
        } catch (error) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
                if (fs.existsSync(newImagePath)) {
                    fs.unlinkSync(newImagePath);
                }
            return resp.status(400).json({ error: error.message, success: false });
        }
    }
}