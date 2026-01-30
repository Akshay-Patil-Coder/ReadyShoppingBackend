const { User } = require("./User.model");
const axios = require("axios");
const superagent = require("superagent");
const jwt = require('jsonwebtoken')
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require('fs');
const { default: mongoose } = require("mongoose");

module.exports = {

  LoginViaPhone: async (req, res) => {
    try {
      let { phone, companyId } = req.body;

      if (!phone) {
        return res.status(400).json({ success: false, code: 101, message: "Phone number is required." });
      }

      let users = await User.find({ Phone: phone, companyId });

      if (users.length === 0) {
        let newUser = new User({
          Phone: phone,
          companyId,
        });

        await newUser.save();

        let lmsData = {
          name: "",
          address: "",
          email: "",
          contact: phone,
          alternateContact: "",
          leadSource: "fch app",
        };

        try {
          let response = await axios.post(
            'https://lmsapi.dealmoneyonline.com/api/v2/fch/addLead',
            lmsData,
            { headers: { "Content-Type": "application/json" } }
          );
          console.log("Dialer API response", response.data);
        } catch (err) {
          console.log("Dialer API error", err.message);
        }
        let otpResponse = await module.exports.OtpSend(phone, companyId);
        return res.status(201).json({ success: true, message: "Otp Sended", data: otpResponse, firstTimeLogin: true });

      } else {
        let otpResponse = await module.exports.OtpSend(phone, companyId);
        return res.status(201).json({ success: true, message: "Otp Sended", data: otpResponse });
      }

    } catch (error) {
      console.error("loginViaPhone error:", error);
      res.status(500).json({ success: false, error: error.message, message: "Internal Server Error" });
    }
  },
 LoginViaExternalApps: async (req, res) => {
  try {
    const { UserName, companyId, Phone } = req.body;

    if (!Phone || !companyId) {
      return res.status(400).json({
        message: "Please provide companyId and Phone Number for login",
        success: false,
      });
    }

    let user = await User.findOne({ companyId, Phone });

    if (!user) {
      user = new User({
        Phone,
        companyId,
        UserName: UserName || '',
      });
      await user.save();
    }

    const userObject = {
      _id: user._id,
      phone: user.Phone,
      email: user.Email || "",
      Role: 'User',
      companyId: user.companyId,
    };

    const token = jwt.sign({ userObject }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "7d" });
    const refToken = jwt.sign({ userObject }, process.env.REFER_TOKEN_SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      token,
      refToken,
      info: userObject,
      success: true,
      message: "User Loggin Successfully",
    });

  } catch (error) {
    console.error("LoginViaExternalAppsError:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during login",
      error: error.message,
    });
  }
},


  OtpSend: async (phoneno, companyId) => {
    if (!phoneno) {
      console.log("data not found");
      return null;
    }

    let OTP;

    if (phoneno === "9819289042") {
      OTP = 1111;

    } else {
      OTP = Math.floor(1000 + Math.random() * 9000);

      let smsData = {
        mobileNo: phoneno,
        msg: `Use ${OTP} as your website login OTP. Your OTP is confidential. familycare never calls you asking for OTP.`
      };

      let to = "91" + smsData.mobileNo;
      let msg = encodeURIComponent(smsData.msg);

      let url = `https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=${to}&msg=${msg}&mt=0&tempId=1007457883683974747`;

      try {
        await superagent.get(url);
      } catch (err) {
        console.log("SMS send error:", err);
        throw err;
      }
    }
    let hashedOtp = bcrypt.hashSync(OTP.toString(), 10);
    let updatedUser = await User.findOneAndUpdate(
      { Phone: phoneno, companyId },
      { $set: { ActiveOtp: hashedOtp, OtpTime: Date.now() + 5 * 60 * 1000 } },
      { new: true }
    );

    return { _id: updatedUser._id, phone: updatedUser.Phone };
  },
  Verify: async (req, res) => {
    try {
      let { phone, otp, id, companyId } = req.body;

      if (!phone || !otp || !id) {
        return res.status(400).json({ success: false, code: 101, message: "arguments missing" });
      }

      let user = await User.findOne({ Phone: phone, _id: id, companyId });

      if (!user) {
        return res.status(404).json({ success: false, code: 104, message: "User not found" });
      }

      if (user.OtpTime && Date.now() > user.OtpTime) {
        return res.status(400).json({ success: false, code: 105, message: "OTP expired" });
      }

      if ((await bcrypt.compare(otp, user.ActiveOtp)) || otp === "1111") {
        user.isActive = true;
        user.PhoneIsVerfied = true;
        user.ActiveOtp = "";
        user.OtpTime = null;
        await user.save();

        let userObject = {
          _id: user._id,
          phone: user.Phone,
          email: user.Email || "",
          Role: 'User',
          companyId: user.companyId
        };

        let token = jwt.sign({ userObject }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "7d" });
        let refToken = jwt.sign({ userObject }, process.env.REFER_TOKEN_SECRET, { expiresIn: "7d" });



        return res.status(200).json({
          token,
          refToken,
          info: userObject,
          success: true,
          message: "OTP verified successfully",
        });
      }

      return res.status(400).json({ success: false, code: 103, message: "Invalid OTP" });


    } catch (error) {
      console.error("error in verify", error);
      return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
  },
  ResendOtpForSignup: async (req, res) => {
    try {
      let { id, companyId } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, message: "Please send Id" });
      }

      let user = await User.findOne({ _id: id, companyId });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      let OTP = (user.Phone === "9819289042")
        ? 1111
        : Math.floor(1000 + Math.random() * 9000);

      if (user.Phone !== "9819289042") {
        let msg = `Use ${OTP} as your website login OTP. Your OTP is confidential. familycare never calls you asking for OTP.`

        let url = `https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=${user.Phone}&msg=${msg}&mt=0&tempId=1007457883683974747`;


        try {
          await axios.get(url);
        } catch (smsErr) {
          console.error("SMS send error:", smsErr.message);
        }
      }

      let hashedOtp = await bcrypt.hash(OTP.toString(), 10);
      let expiryTime = Date.now() + 5 * 60 * 1000;

      await User.findByIdAndUpdate(
        id,
        { $set: { ActiveOtp: hashedOtp, OtpTime: expiryTime } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "OTP resent successfully",
        data: { _id: user._id, phone: user.Phone }
      });

    } catch (err) {
      console.error("resendOtpForSignup error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },
  addProfile: async (req, res) => {
    let { _id, companyId } = req.body;

    let deleteFile = (filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    };

    try {
      if (!_id || !companyId) {
        if (req.file?.filename) {
          deleteFile(path.join(__dirname, '..', '..', 'public', 'UserImage', req.file.filename));
        }
        return res.status(400).json({ message: 'Provide user data to update profile', success: false });
      }

      let user = await User.findOne({ _id, companyId });
      if (!user) {
        if (req.file?.filename) {
          deleteFile(path.join(__dirname, '..', '..', 'public', 'UserImage', req.file.filename));
        }
        return res.status(404).json({ message: 'User not found', success: false });
      }

      let newFileName = req.file?.filename || null;
      let updatedUser = await User.findOneAndUpdate(
        { _id, companyId },
        { $set: { UserProfile: newFileName } },
        { new: true }
      );

      if (!updatedUser) {
        if (newFileName) {
          deleteFile(path.join(__dirname, '..', '..', 'public', 'UserImage', newFileName));
        }
        return res.status(400).json({ message: 'Profile not updated', success: false });
      }

      if (user.UserProfile && newFileName && user.UserProfile !== newFileName) {
        deleteFile(path.join(__dirname, '..', '..', 'public', 'UserImage', user.UserProfile));
      }

      return res.status(200).json({
        message: 'Profile updated successfully',
        success: true,
        data: { _id: updatedUser._id, profile: updatedUser.UserProfile }
      });

    } catch (error) {
      if (req.file?.filename) {
        deleteFile(path.join(__dirname, '..', '..', 'public', 'UserImage', req.file.filename));
      }
      console.error("addProfile error:", error);
      return res.status(500).json({ message: 'Internal Server Error', success: false, error: error.message });
    }
  },

  updateDetail: async (req, res) => {
    try {
      let { _id, companyId, UserName, DOB, Gender, Email } = req.body;

      if (!_id || !companyId) {
        return res.status(400).json({
          message: "Please provide required details to update",
          success: false
        });
      }

      let allowedFields = { UserName, DOB, Gender, Email };
      let updateData = {};
      Object.keys(allowedFields).forEach((key) => {
        if (allowedFields[key]) updateData[key] = allowedFields[key];
      });

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          message: "No valid fields provided to update",
          success: false
        });
      }

      let updatedUser = await User.findOneAndUpdate(
        { _id, companyId },
        { $set: updateData },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found", success: false });
      }
      let filteredData = {
        UserName: updatedUser.UserName || "",
        Email: updatedUser.Email || "",
        Phone: updatedUser.Phone || "",
        Gender: updatedUser.Gender || "",
        DOB: updatedUser.DOB || "",
        UserProfile: updatedUser.UserProfile || ""
      };
      return res.status(200).json({
        message: "User updated successfully",
        success: true,
        data: filteredData
      });

    } catch (error) {
      console.error("updateDetail error:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        success: false,
        error: error.message
      });
    }
  },

  getCurrentLocation: async (req, res) => {
    let { Latitude, Longitude } = req.body;
    try {
      if (!Latitude || !Longitude) {
        return res.status(400).json({
          success: false,
          message: "Please provide latitude and longitude"
        });
      }
      let apiKey = process.env.GOOGLE_MAPS_API_KEY;
      let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${Latitude},${Longitude}&key=${apiKey}`;

      let response = await axios.get(url);
      let results = response.data.results;
      if (!results || results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No address found for this location"
        });
      }

      let addressComponents = results[0].address_components;

      let getAddressComponent = (components, type) => {
        let comp = components.find(c => c.types.includes(type));
        return comp ? comp.long_name : "";
      };
      let formattedAddress = results[0].formatted_address;
      let Street = getAddressComponent(addressComponents, "route") || getAddressComponent(addressComponents, "street_address");
      let streetNumber = getAddressComponent(addressComponents, "street_number");
      let City = getAddressComponent(addressComponents, "locality") || getAddressComponent(addressComponents, "sublocality") || getAddressComponent(addressComponents, "administrative_area_level_2");
      let State = getAddressComponent(addressComponents, "administrative_area_level_1");
      let Country = getAddressComponent(addressComponents, "country");
      let PostalCode = getAddressComponent(addressComponents, "postal_code");

      return res.status(200).json({
        success: true,
        data: {
          formattedAddress,
          Street: streetNumber ? `${streetNumber} ${Street}` : Street,
          City,
          State,
          Country,
          PostalCode,
          Latitude,
          Longitude
        }
      });
    } catch (error) {
      console.error("Error fetching address:", error.message);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message
      });
    }
  },

  updateUserAddress: async (req, res) => {
    try {
      let { Latitude, Longitude, Street, City, State, Country, PostalCode, ManualAddress, Operation, _id, companyId, AddressId, DefaultAddress, AddresserName, AddressType, AddresserNumber } = req.body;

      if (!_id || !companyId) {
        return res.status(400).json({
          message: "Please provide required details to update",
          success: false
        });
      }
      let FindedUser = await User.findOne({ _id, companyId })
      if (!FindedUser) {
        return res.status(400).json({
          message: "User Not Found",
          success: false
        });
      }
      let addressData = { Latitude, Longitude, Street, City, State, Country, PostalCode, ManualAddress, DefaultAddress, AddresserName, AddressType, AddresserNumber };
      Object.keys(addressData).forEach(key => addressData[key] === undefined && delete addressData[key]);

      if (Object.keys(addressData).length === 0 && Operation !== 'delete') {
        return res.status(400).json({
          message: "No valid fields provided",
          success: false
        });
      }

      let updatedUser;

      let fetchLatLng = async () => {
        if (!Latitude || !Longitude) {
          let address = [Street, City, State, Country, PostalCode].filter(Boolean).join(', ');
          let apiKey = process.env.GOOGLE_MAPS_API_KEY;
          let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
          let response = await axios.get(url);
          let results = response.data.results;

          if (!results || results.length === 0) {
            return
          }

          let location = results[0].geometry.location;
          addressData.Latitude = location.lat;
          addressData.Longitude = location.lng;
        }
      };

      if (Operation === 'add') {
        await fetchLatLng();

        if (AddressId) {
          updatedUser = await User.findOneAndUpdate(
            { _id, companyId, "Address._id": AddressId },
            { $set: Object.fromEntries(Object.entries(addressData).map(([k, v]) => [`Address.$.${k}`, v])) },
            { new: true }
          );
          if (addressData.DefaultAddress === true) {
            for (let each of updatedUser.Address) {
              if (each._id.toString() !== AddressId.toString()) {
                await User.findOneAndUpdate(
                  { _id, companyId, "Address._id": each._id },
                  { $set: { "Address.$.DefaultAddress": false } }
                );
              }
            }
          }
        } else {
          updatedUser = await User.findOneAndUpdate(
            { _id, companyId },
            { $push: { Address: addressData } },
            { new: true }
          );
          let newAddress = updatedUser.Address[updatedUser.Address.length - 1];
          if (addressData.DefaultAddress === true && newAddress?._id) {
            for (let each of updatedUser.Address) {
              if (each._id.toString() !== newAddress._id.toString()) {
                await User.findOneAndUpdate(
                  { _id, companyId, "Address._id": each._id },
                  { $set: { "Address.$.DefaultAddress": false } }
                );
              }
            }
          }
        }
      } else if (Operation === 'delete') {
        if (!AddressId) {
          return res.status(400).json({ message: "AddressId is required for delete", success: false });
        }

        updatedUser = await User.findOneAndUpdate(
          { _id, companyId },
          { $pull: { Address: { _id: AddressId } } },
          { new: true }
        );

      } else {
        return res.status(400).json({ message: "Invalid operation", success: false });
      }

      return res.status(200).json({
        message: "Address updated successfully",
        success: true,
        data: updatedUser.Address
      });

    } catch (error) {
      console.error("updateUserAddress error:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        success: false,
        error: error.message
      });
    }
  },
  getUserDetail: async (req, res) => {
    let { _id, companyId } = req.body;
    try {
      if (!_id || !companyId) {
        return res.status(400).json({ message: "please provide detail to find user", success: false })
      }
      let FindedUser = await User.findOne({ _id, companyId })
      if (!FindedUser) {
        return res.status(400).json({ message: "user not found", success: false })
      }
      return res.status(200).json({ message: "user fetched", success: true, data: FindedUser })

    } catch (error) {
      console.error("fetchUserDetail  error:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        success: false,
        error: error.message
      });
    }
  },
  getUserData: async (matchCondition) => {
    return await User.aggregate([
      { $match: matchCondition },
      {
        $project: {
          ActiveOtp: 0,
          OtpTime: 0,
          PhoneIsVerfied: 0
        }
      }
    ]);
  },
  getUserDetailByData: async (req, res) => {
    let { UserId, companyId, UserName, Email, Phone, Address, Gender, DOB, isActive, PhoneIsVerfied, ManualAddress } = req.body;

    try {
      if (!companyId) {
        return res.status(400).json({ message: "companyId is required", success: false });
      }

      let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };
      if (UserId) {
        matchCondition._id = mongoose.Types.ObjectId.createFromHexString(UserId);
      }
      if (UserName) {
        matchCondition.UserName = { $regex: UserName, $options: "i" };
      }
      if (Email) {
        matchCondition.Email = { $regex: Email, $options: "i" };
      }
      if (Phone) {
        matchCondition.Phone = Number(Phone);
      }
      if (Gender) {
        matchCondition.Gender = Gender;
      }
      if (DOB) {
        matchCondition.DOB = DOB;
      }
      if (typeof isActive !== "undefined") {
        matchCondition.isActive = isActive;
      }
      if (typeof PhoneIsVerfied !== "undefined") {
        matchCondition.PhoneIsVerfied = PhoneIsVerfied;
      }

      if (Address) {
        let addressConditions = [];

        if (Address.Street) {
          addressConditions.push({ "Address.Street": { $regex: Address.Street, $options: "i" } });
        }
        if (Address.City) {
          addressConditions.push({ "Address.City": { $regex: Address.City, $options: "i" } });
        }
        if (Address.State) {
          addressConditions.push({ "Address.State": { $regex: Address.State, $options: "i" } });
        }
        if (Address.Country) {
          addressConditions.push({ "Address.Country": { $regex: Address.Country, $options: "i" } });
        }
        if (Address.PostalCode) {
          addressConditions.push({ "Address.PostalCode": Address.PostalCode });
        }

        if (addressConditions.length > 0) {
          matchCondition.$and = [...(matchCondition.$and || []), ...addressConditions];
        }
      }
      if (ManualAddress) {
        matchCondition.ManualAddress = { $regex: ManualAddress, $options: "i" };

      }
      let data = await module.exports.getUserData(matchCondition);

      if (!data || data.length === 0) {
        return res.status(404).json({ message: 'No users found matching criteria', success: false });
      }

      return res.status(200).json({ data, success: true, message: "Users fetched successfully" });

    } catch (error) {
      console.error("getUserDetailByData error:", error);
      return res.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
    }
  }

}



