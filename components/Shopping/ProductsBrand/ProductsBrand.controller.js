const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Product, VariantProduct } = require('../VariantsProducts/VariantsProducts.model')
const { ProductRating } = require('../ProductRating/ProductRating.model')
const { brandmodel } = require('./ProductsBrand.model')
const BannerModel = require('../ShoppingBanners/ShoppingBanners.model');
const { updateElasticById, deleteElasticById } = require('../ElasticSearch/elastic/CRUD');
module.exports = {
  addbrands: async (req, resp) => {
    try {
      let { BrandName, companyId, HeadCategoryId, SubCategoryId } = req.body;
      if (req.user.companyId) companyId = req.user.companyId

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
            let newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
            if (fs.existsSync(newImagePath)) {
              fs.unlinkSync(newImagePath);
            }
          }
          return resp.status(400).json({ message: 'Invalid SubCategoryId format', success: false });
        }
      }
      if (!BrandName || !companyId || !HeadCategoryId || SubCategoryId.length == 0) {
        if (req.file?.filename) {
          let newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
          if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
        }
        return resp.status(400).json({ message: 'Please fill in all required fields', success: false });
      }

      let brandData = { BrandName, companyId, HeadCategoryId, SubCategoryId };
      if (req.file?.filename) brandData.BrandImage = req.file.filename;

      let newBrand = new brandmodel(brandData);
      let result = await newBrand.save();

      if (!result) {
        if (req.file?.filename) {
          let newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
          if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
        }
        return resp.status(400).json({ message: 'Something went wrong while saving the brand', success: false });
      }

      return resp.status(200).json({ data: result, success: true, message: 'Brand added successfully' });
    } catch (error) {
      if (req.file?.filename) {
        let newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
        if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
      }
      return resp.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
    }
  },

  getBrandData: async (matchCondition) => {
    return await brandmodel.aggregate([
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
    let { HeadCategoryId, SubCategoryId, companyId, BrandId, BrandName } = req.query;

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
      let data = await module.exports.getBrandData(matchCondition);

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
      let companyId = req.query.companyId;
      let operation = req.query.operation;
      if (req.user.companyId) companyId = req.user.companyId

      if (!BrandId || !SubCategoryId || SubCategoryId.length === 0) {
        return resp.status(400).send({ message: 'Please insert valid data', success: false });
      }

      let updatedResult;
      if (operation === 'delete') {
        updatedResult = await brandmodel.findOneAndUpdate(
          { _id: BrandId, companyId },
          { $pull: { SubCategoryId: { $in: SubCategoryId } } },
          { new: true }
        );
      } else if (operation === 'add') {
        updatedResult = await brandmodel.findOneAndUpdate(
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
      let { BrandId, BrandName, SubCategoryId } = req.body;
      let companyId = req.query.companyId;
      if (req.user.companyId) companyId = req.user.companyId
      if (!BrandId || !BrandName) {
        if (req.file?.filename) {
          let newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
          if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
        }
        return resp.status(400).send({ message: 'Please insert valid data', success: false });
      }

      let brandData = { BrandName };
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
            let newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
            if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
          }
          return resp.status(400).json({
            message: 'Invalid SubCategoryId format',
            success: false,
          });
        }
      }
      if (req.file?.filename) {
        let existingBrand = await brandmodel.findOne({ _id: BrandId, companyId });
        if (existingBrand?.BrandImage) {
          let oldImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', existingBrand.BrandImage);
          if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }
        brandData.BrandImage = req.file.filename;
      }

      let updatedResult = await brandmodel.updateOne(
        { _id: BrandId, companyId },
        { $set: brandData }
      );

      if (!updatedResult) {
        return resp.status(400).json({ message: 'Not updated', success: false, message: "Brand detail not updated" });
      }
      try {
        await updateElasticById({ type: 'brand', id: BrandId });
        console.log(`✅ Successfully updated Elasticsearch for brand: ${BrandId}`);
      } catch (error) {
        console.error(`❌ Failed to update Elasticsearch for brand ${BrandId}:`, error.message);
      }


      return resp.status(200).json({ data: updatedResult, success: true, message: "Brand detail updated successfully" });
    } catch (error) {
      if (req.file?.filename) {
        let newImagePath = path.join(__dirname, '..', '..', 'public', 'BrandImage', req.file.filename);
        if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
      }
      return resp.status(400).json({ message: "Internal Server Error", error: error.message, success: false });
    }
  },
  previewDeleteBrand: async (req, res) => {
    try {
      const { brandId, companyId } = req.query;

      if (!brandId || !companyId) {
        return res.status(400).json({
          success: false,
          message: "BrandId and CompanyId are required"
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(brandId) ||
        !mongoose.Types.ObjectId.isValid(companyId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid BrandId or CompanyId"
        });
      }

      const brand = await brandmodel.findOne({ _id: brandId, companyId });
      if (!brand) {
        return res.status(404).json({ success: false, message: "Brand not found" });
      }

      const productsRaw = await Product.find({ BrandId: brandId }).select(
        "ProductName CommonImages CommonVideos CommonDescription VariantProductIds _id"
      );

      const variantProductIds = productsRaw.flatMap(p => p.VariantProductIds || []).filter(Boolean);
      const variantProducts = await VariantProduct.find({
        _id: { $in: variantProductIds }
      }).select(
        "VariantProductName Price VariantProductImage OfferPercentage VariantFields _id"
      );

      const mergeVariantProductsIntoProducts = (products, variantProducts) => {
        const vpMap = {};
        variantProducts.forEach(vp => {
          vpMap[vp._id.toString()] = vp.toObject();
        });

        return products.map(product => ({
          ...product.toObject(),
          VariantProducts: (product.VariantProductIds || [])
            .map(id => vpMap[id.toString()])
            .filter(Boolean)
        }));
      };

      const products = mergeVariantProductsIntoProducts(productsRaw, variantProducts);

      const banners = await BannerModel.find({ BrandId: brandId }).select(
        "BannerName BannerImage BannerType Position OfferPercentage _id"
      );

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            brand: 1,
            products: products.length,
            variantProducts: variantProducts.length,
            banners: banners.length
          },
          brand,
          products,
          banners
        }
      });

    } catch (error) {
      console.error("previewDeleteBrand error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message
      });
    }
  },
  ToggleStatusOfBrand: async (req, res) => {
    try {
      const { brandId, companyId, isActive } = req.query;

      if (!brandId || !companyId) {
        return res.status(400).json({
          success: false,
          message: "BrandId and CompanyId are required"
        });
      }

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Provide valid status (true / false)"
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(brandId) ||
        !mongoose.Types.ObjectId.isValid(companyId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid BrandId or CompanyId"
        });
      }

      const brand = await brandmodel.findOne({ _id: brandId, companyId });
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found"
        });
      }

      if (isActive === false && brand.isActive !== false) {
        await brandmodel.findByIdAndUpdate(brandId, {
          $set: { isActive: false, isActiveBy: "Self" }
        });
      }

      if (
        isActive === true &&
        brand.isActive === false &&
        ["Self", "Category", "Company"].includes(brand.isActiveBy)
      ) {
        await brandmodel.findByIdAndUpdate(brandId, {
          $set: { isActive: true, isActiveBy: "Self" }
        });
      }

      if (!brand.isActiveBy) {
        await brandmodel.findByIdAndUpdate(brandId, {
          $set: { isActive, isActiveBy: "Self" }
        });
      }

      const products = await Product.find({ BrandId: brandId });

      for (const product of products) {

        if (isActive === false && product.isActive !== false) {
          await Product.findByIdAndUpdate(product._id, {
            $set: { isActive: false, isActiveBy: "Brand" }
          });
        }

        if (
          isActive === true &&
          product.isActive === false &&
          ["Self", "Brand"].includes(product.isActiveBy)
        ) {
          await Product.findByIdAndUpdate(product._id, {
            $set: { isActive: true, isActiveBy: "Brand" }
          });
        }

        if (!product.isActiveBy) {
          await Product.findByIdAndUpdate(product._id, {
            $set: { isActive, isActiveBy: "Brand" }
          });
        }

        await VariantProduct.updateMany(
          { ProductId: product._id },
          { $set: { isActive, isActiveBy: "Brand" } }
        );
      }

      const banners = await BannerModel.find({ BrandId: brandId });

      for (const banner of banners) {

        if (isActive === false && banner.isActive !== false) {
          await BannerModel.findByIdAndUpdate(banner._id, {
            $set: { isActive: false, isActiveBy: "Brand" }
          });
        }

        if (
          isActive === true &&
          banner.isActive === false &&
          ["Self", "Brand"].includes(banner.isActiveBy)
        ) {
          await BannerModel.findByIdAndUpdate(banner._id, {
            $set: { isActive: true, isActiveBy: "Brand" }
          });
        }

        if (!banner.isActiveBy) {
          await BannerModel.findByIdAndUpdate(banner._id, {
            $set: { isActive, isActiveBy: "Brand" }
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: "Brand status updated successfully",
        affected: {
          brand: 1,
          products: products.length,
          banners: banners.length
        }
      });

    } catch (error) {
      console.error("ToggleStatusOfBrand error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error"
      });
    }
  },
  deleteBrand: async (req, res) => {
    try {
      let { _id, companyId } = req.query;
      if (req.user.companyId) companyId = req.user.companyId;

      if (!_id || !companyId) {
        return res.status(400).json({ success: false, message: "BrandId and CompanyId required" });
      }

      const brand = await brandmodel.findOne({ _id, companyId });
      if (!brand) {
        return res.status(404).json({ success: false, message: "Brand not found" });
      }

      const deleteFiles = async (files, folder) => {
        for (let file of files) {
          const filePath = path.join(__dirname, "..", "..", "public", folder, file);
          try {
            await fs.promises.unlink(filePath);
          } catch (err) {
            if (err.code !== "ENOENT") {
              console.error(`File delete error: ${filePath}`, err.message);
            }
          }
        }
      };

      const products = await Product.find({ BrandId: _id });

      for (const product of products) {

        if (Array.isArray(product.CommonImages))
          await deleteFiles(product.CommonImages, "ProductImage");

        if (Array.isArray(product.CommonVideos))
          await deleteFiles(product.CommonVideos, "ProductVideo");

        if (Array.isArray(product.VariantProductIds)) {
          for (const variantId of product.VariantProductIds) {
            const variantProduct = await VariantProduct.findById(variantId);
            if (!variantProduct) continue;

            if (Array.isArray(variantProduct.VariantProductImage)) {
              await deleteFiles(variantProduct.VariantProductImage, "ProductImage");
            }

            if (Array.isArray(variantProduct.VariantFields)) {
              for (const field of variantProduct.VariantFields) {
                try {
                  await Variant.findOneAndUpdate(
                    {
                      _id: field.VariantId,
                      "VariantValues.Value": field.VariantValue,
                      "VariantValues.Count": { $gt: 0 }
                    },
                    { $inc: { "VariantValues.$.Count": -1 } }
                  );
                } catch (err) {
                  console.warn("Variant count update failed:", err.message);
                }
              }
            }

            await VariantProduct.deleteOne({ _id: variantId });
            try {
              await deleteElasticById({type:'variant', id:variantId})
              console.log(`✅ Successfully deleted Elasticsearch for variant: ${variantId}`);
            } catch (error) {
              console.error(`❌ Failed to delete Elasticsearch for variant ${variantId}:`, error.message);
            }
          }
        }

        if (Array.isArray(product.RatingIds)) {
          for (const reviewId of product.RatingIds) {
            const review = await ProductRating.findById(reviewId);
            if (!review) continue;

            if (Array.isArray(review.ReviewImages)) {
              await deleteFiles(review.ReviewImages, "ProductSRatingImage");
            }
            await ProductRating.deleteOne({ _id: reviewId });
          }
        }

        await Product.deleteOne({ _id: product._id });
        try {
          await deleteElasticById({type:'product', id:product._id})
          console.log(`✅ Successfully deleted Elasticsearch for product: ${product._id}`);
        } catch (error) {
          console.error(`❌ Failed to delete Elasticsearch for product ${product._id}:`, error.message);
        }
      }

      const banners = await BannerModel.find({ BrandId: _id });
      for (const banner of banners) {
        if (banner.BannerImage) {
          await deleteFiles([banner.BannerImage], "BannerImage");
        }
        await BannerModel.deleteOne({ _id: banner._id });
      }

      if (brand.BrandImage) {
        await deleteFiles([brand.BrandImage], "BrandImage");
      }

      await brandmodel.deleteOne({ _id });
      try {
        await deleteElasticById({type:'brand', id:_id})
        console.log(`✅ Successfully deleted Elasticsearch for brand: ${_id}`);
      } catch (error) {
        console.error(`❌ Failed to delete Elasticsearch for brand ${_id}:`, error.message);
      }

      return res.status(200).json({
        success: true,
        message: "Brand and all related data deleted successfully"
      });

    } catch (error) {
      console.error("deleteBrand error:", error);
      res.status(500).json({
        success: false,
        message: "Something went wrong",
        error: error.message
      });
    }
  },



};
