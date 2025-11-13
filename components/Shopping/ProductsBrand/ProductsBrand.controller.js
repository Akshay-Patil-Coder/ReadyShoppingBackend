const { ObjectId } = require('mongodb');
const brandmodel = require('./ProductsBrand.model');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

module.exports = {
  addbrands: async (req, resp) => {
    try {
      let { BrandName, companyId, HeadCategoryId, SubCategoryId } = req.body;
      if (SubCategoryId) {
        try {
          if (typeof SubCategoryId === "string") {
            SubCategoryId = JSON.parse(SubCategoryId);
          }
          if (!Array.isArray(SubCategoryId)) {
            throw new Error("SubCategoryId must be an array");
          }
        } catch {
          if (req.file?.filename) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
              fs.unlinkSync(newImagePath);
            }
          }
          return resp.status(400).json({ message: 'Invalid SubCategoryId format', success: false });
        }
      }
      if (!BrandName || !companyId || !HeadCategoryId || SubCategoryId.length == 0) {
        if (req.file?.filename) {
          const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
          if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
        }
        return resp.status(400).json({ message: 'Please fill in all required fields', success: false });
      }

      const brandData = { BrandName, companyId, HeadCategoryId, SubCategoryId };
      if (req.file?.filename) brandData.BrandImage = req.file.filename;

      const newBrand = new brandmodel.brandmodel(brandData);
      const result = await newBrand.save();

      if (!result) {
        if (req.file?.filename) {
          const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
          if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
        }
        return resp.status(400).json({ message: 'Something went wrong while saving the brand', success: false });
      }

      return resp.status(200).json({ data: result, success: true, message: 'Brand added successfully' });
    } catch (error) {
      if (req.file?.filename) {
        const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
        if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
      }
      return resp.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
    }
  },

  getBrandData: async (matchCondition) => {
    return await brandmodel.brandmodel.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'categgggories',
          localField: 'HeadCategoryId',
          foreignField: '_id',
          as: 'HeadCategory',
        },
      },
      {
        $lookup: {
          from: 'categgggories',
          localField: 'SubCategoryId',
          foreignField: '_id',
          as: 'SubCategories',
        },
      },
    ]);
  },

  getBrandsById: async (req, res) => {
    const { HeadCategoryId, SubCategoryId, companyId, BrandId, BrandName } = req.query;

    try {
      let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

      if (HeadCategoryId) {
        if (!mongoose.Types.ObjectId.isValid(HeadCategoryId)) {
          return res.status(400).json({ message: 'Invalid ID format', success: false });
        }
        matchCondition.HeadCategoryId = mongoose.Types.ObjectId.createFromHexString(HeadCategoryId);
      }
      if (SubCategoryId) {
        if (!mongoose.Types.ObjectId.isValid(SubCategoryId)) {
          return res.status(400).json({ message: 'Invalid ID format', success: false });
        }
        matchCondition.SubCategoryId = { $in: [mongoose.Types.ObjectId.createFromHexString(SubCategoryId)] };
      }
      if (BrandId) {
        if (!mongoose.Types.ObjectId.isValid(BrandId)) {
          return res.status(400).json({ message: 'Invalid ID format', success: false });
        }
        matchCondition._id = mongoose.Types.ObjectId.createFromHexString(BrandId);
      }
      if (BrandName && BrandName.trim() !== "") {
        matchCondition.BrandName = { $regex: new RegExp(BrandName.trim(), "i") };
      }
      const data = await module.exports.getBrandData(matchCondition);

      if (data.length === 0) {
        return res.status(404).json({ message: 'No Brands found for this category', success: false });
      }

      return res.status(200).json({ data, success: true, message: "brands fetched successfully" });
    } catch (error) {
      return res.status(400).json({ message: "Internal Server Error", error: error.message, success: false });
    }
  },

  updateSubCategoryList: async (req, resp) => {
    try {
      let { BrandId, SubCategoryId } = req.body;
      const companyId = req.query.companyId;
      const operation = req.query.operation;

      if (!BrandId || !SubCategoryId || SubCategoryId.length === 0) {
        return resp.status(400).send({ message: 'Please insert valid data', success: false });
      }

      let updatedResult;
      if (operation === 'delete') {
        updatedResult = await brandmodel.brandmodel.findOneAndUpdate(
          { _id: BrandId, companyId },
          { $pull: { SubCategoryId: { $in: SubCategoryId } } },
          { new: true }
        );
      } else if (operation === 'add') {
        updatedResult = await brandmodel.brandmodel.findOneAndUpdate(
          { _id: BrandId, companyId },
          { $addToSet: { SubCategoryId: { $each: SubCategoryId } } },
          { new: true }
        );
      }

      return resp.status(200).json({ data: updatedResult, success: true, message: "updated successfully" });
    } catch (error) {
      console.error(error);
      return resp.status(400).json({ message: "Internal Server Error", error: error.message, success: false });
    }
  },

  updateBrandDetails: async (req, resp) => {
    try {
      const { BrandId, BrandName, SubCategoryId } = req.body;
      const companyId = req.query.companyId;

      if (!BrandId || !BrandName) {
        if (req.file?.filename) {
          const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
          if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
        }
        return resp.status(400).send({ message: 'Please insert valid data', success: false });
      }

      const brandData = { BrandName };
      if (SubCategoryId) {
        try {
          if (typeof SubCategoryId === "string") {
            SubCategoryId = JSON.parse(SubCategoryId);
          }
          if (!Array.isArray(SubCategoryId)) {
            throw new Error("SubCategoryId must be an array");
          }
          if (SubCategoryId.length > 0) {
            brandData.SubCategoryId = SubCategoryId;
          }
        } catch (err) {
          if (req.file?.filename) {
            const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
            if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
          }
          return resp.status(400).json({
            message: 'Invalid SubCategoryId format',
            success: false,
          });
        }
      }
      if (req.file?.filename) {
        const existingBrand = await brandmodel.brandmodel.findOne({ _id: BrandId, companyId });
        if (existingBrand?.BrandImage) {
          const oldImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', existingBrand.BrandImage);
          if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }
        brandData.BrandImage = req.file.filename;
      }

      let updatedResult = await brandmodel.brandmodel.updateOne(
        { _id: BrandId, companyId },
        { $set: brandData }
      );

      if (!updatedResult) {
        return resp.status(400).json({ message: 'Not updated', success: false, message: "Brand detail not updated" });
      }

      return resp.status(200).json({ data: updatedResult, success: true, message: "Brand detail updated successfully" });
    } catch (error) {
      if (req.file?.filename) {
        const newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
        if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
      }
      return resp.status(400).json({ message: "Internal Server Error", error: error.message, success: false });
    }
  },
};
