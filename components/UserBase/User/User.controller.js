// const jwt = require("jsonwebtoken");
const {User} = require("./User.model");
const axios = require("axios");
const mongoose = require("mongoose");
const superagent = require("superagent");
const shortid = require("shortid");
const moment = require("moment");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

export const loginViaPhone = async (req, res) => {
  try {
    const { phone,companyId } = req.body;

    if (!phone) {
      return res.status(400).json({ code: 101, msg: "Phone number is required." });
    }

    let users = await User.find({ phone });

    if (users.length === 0) {
      const userid = shortid.generate();
      const newUser = new User({
        phone,
        userid,
        companyId: companyId,
        otptime: Date.now()
      });

      await newUser.save();

      const lmsData = {
        name: "",
        address: "",
        email: "",
        contact: phone,
        alternateContact: "",
        leadSource: "fch app",
      };

      axios.post('https://lmsapi.dealmoneyonline.com/api/v2/fch/addLead', lmsData, {
        headers: { "Content-Type": "application/json" }
      }).then(response => console.log("Dialer API response", response.data))
        .catch(err => console.log("Dialer API error", err.message));



      // Send OTP
      return otpsend(phone, res, (err, otpResponse) => {
        res.status(201).json({ success: true, data: otpResponse, firstTimeLogin: true });
      });

    } else {
      return otpsend(phone, res, (err, otpResponse) => {
        res.status(201).json({ success: true, data: otpResponse });
      });
    }

  } catch (error) {
    console.error("loginViaPhone error:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};
export function otpsend(phoneno, res, callback) {
  if (!phoneno) {
    console.log("data not found");
    return;
  }

  if (phoneno === "9819289042") {
    const OTP = 1111;

    User.findOneAndUpdate(
      { phone: phoneno },
      { $set: { otp: OTP } },
      (err, data) => {
        console.log("error and data------", err, data);
        if (err) {
          console.log("err");
          callback(err, null);
        } else {
          const smsData = {
            mobileNo: phoneno,
            msg: `Use ${OTP} as your website login OTP. Your OTP is confidential. familycare never calls you asking for OTP.`
          };
          callback(null, data);
        }
      }
    );
  } else {
    const OTP = Math.floor(1000 + Math.random() * 9000);

    const smsData = {
      mobileNo: phoneno,
      msg: `Use ${OTP} as your website login OTP. Your OTP is confidential. familycare never calls you asking for OTP.`
    };

    const to = "91" + smsData.mobileNo;
    const msg = encodeURIComponent(smsData.msg); // encode for URL safety

    const url = `https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=${to}&msg=${msg}&mt=0&tempId=1007457883683974747`;
    console.log(url);

    superagent.get(url).end((err, response) => {
      if (err) {
        console.log("function error", err);
        callback(err, null);
      } else {
        User.findOneAndUpdate(
          { phone: phoneno },
          { $set: { otp: OTP } },
          { new: true },
          (err, data) => {
            if (err) {
              console.log("err");
              callback(err, null);
            } else {
              console.log("OTP SEND in otp method...", data);
              callback(null, data);
            }
          }
        );
      }
    });
  }
}
// exports.GetPhoneNumber = async (req, res) => {
//   try {
//     const data = await User.find({});
//     res.status(200).json(data);
//   } catch (error) {
//     console.error("GetPhoneNumber error:", error);
//     res.status(400).json({ success: false, msg: "Failed to fetch phone numbers", error });
//   }
// };
// exports.register = async (req, res) => {
//   try {
//     const { phone, email, hms_phone, fbid, type, password, name, access_token } = req.body;

//     if (!fbid) {
//       // HMS User
//       if (type === "HMS") {
//         if (!phone && !email && !hms_phone) {
//           return res.status(400).json({ code: 101, msg: "Phone/email/hms_phone is required" });
//         }

//         const existingUser = await User.findOne({
//           phoneisverified: true,
//           $or: [{ phone }, { email }, { hms_phone }],
//         });

//         if (existingUser) {
//           return res.status(400).json({ code: 102, msg: "HMS user already exists" });
//         }

//         const id = shortid.generate();
//         const user = new User({
//           phone,
//           email,
//           hms_phone,
//           type,
//           password: User.schema.methods.generateHash(password),
//           userid: id,
//           otptime: Date.now(),
//         });

//         await user.save();

//         // OneTouch API call
//         const oneTouchData = {
//           user_type: "patient_app",
//           password: user.password,
//           phone: user.phone,
//           isverified: true,
//           name: "",
//           fname: "",
//           mname: "",
//           lname: "",
//           dob: "",
//           active: true,
//           email: user.email,
//         };

//         await axios_1.default.post(
//           "http://192.168.1.36:8004/oneTouchData/oneTouchSave",
//           oneTouchData,
//           { headers: { "Content-Type": "application/json" } }
//         );

//         // Add self to family
//         await User.updateOne(
//           { _id: user._id },
//           { $addToSet: { family: { _id: user._id, relation: "Self", profileComplete: false } } }
//         );

//         otpsend(phone);
//         return res.status(201).json({ success: true, data: user });
//       }

//       // Non-HMS Users
//       if (!phone) {
//         return res.status(400).json({ code: 101, msg: "Phone number is required" });
//       }
//       if (phone == 0) {
//         return res.status(400).json({ msg: "Please enter correct phone number" });
//       }

//       const existingUser = await User.findOne({
//         phoneisverified: true,
//         $or: [{ phone }, { email }],
//       });

//       if (existingUser) {
//         return res.status(400).json({ msg: "Phone number is already used, choose another" });
//       }

//       const id = shortid.generate();
//       const user = new User({
//         phone,
//         email,
//         password: User.schema.methods.generateHash(password),
//         userid: id,
//         otptime: Date.now(),
//       });

//       await user.save();

//       const oneTouchData = {
//         user_type: "patient_app",
//         password: user.password,
//         phone: user.phone,
//         isverified: true,
//         name: "",
//         fname: "",
//         mname: "",
//         lname: "",
//         dob: "",
//         active: true,
//         email: user.email,
//       };

//       await axios.post(
//         "http://192.168.1.36:8004/oneTouchData/oneTouchSave",
//         oneTouchData,
//         { headers: { "Content-Type": "application/json" } }
//       );

//       await User.updateOne(
//         { _id: user._id },
//         { $addToSet: { family: { _id: user._id, relation: "Self", profileComplete: false } } }
//       );

//       otpsend(phone);
//       return res.status(201).json({ success: true, data: user });
//     } else {
//       // Facebook registration
//       if (!phone || phone == 0) {
//         return res.status(400).json({ msg: "Please enter correct phone number" });
//       }

//       const existingPhoneUser = await user_model_1.default.findOne({ phone, phoneisverified: true });
//       if (existingPhoneUser) {
//         return res.status(400).json({ msg: "Phone number already used, choose another" });
//       }

//       let fbUserQuery = { facebook: fbid, phoneisverified: true };
//       if (email && email !== "undefined") {
//         fbUserQuery.email = email;
//       }

//       const existingFbUser = await user_model_1.default.findOne(fbUserQuery);
//       if (existingFbUser) {
//         return res.status(400).json({ msg: "Email already exists" });
//       }

//       const id = shortid.generate();
//       const profileImageName = id + Date.now() + ".jpg";
//       const filePath = process.env.HOME + "/Doctoroncall/dist/public/images";

//       const fbUrl = `https://graph.facebook.com/me?fields=id,name,first_name,last_name,email,picture.type(large)&access_token=${req.body.access_token}`;
//       const fbData = await axios.get(fbUrl);
//       await download.image({
//         url: fbData.data.picture.data.url,
//         dest: path.join(filePath, profileImageName),
//       });

//       const user = new User({
//         phone,
//         email,
//         facebook: fbid,
//         img: profileImageName,
//         name,
//         userid: id,
//         otptime: Date.now(),
//       });

//       await user.save();

//       const oneTouchData = {
//         user_type: "patient_app",
//         password: user.password,
//         phone: user.phone,
//         isverified: true,
//         name: user.name,
//         fname: "",
//         mname: "",
//         lname: "",
//         dob: "",
//         active: true,
//         email: user.email,
//       };

//       await axios.post(
//         "http://192.168.1.36:8004/oneTouchData/oneTouchSave",
//         oneTouchData,
//         { headers: { "Content-Type": "application/json" } }
//       );

//       await User.updateOne(
//         { _id: user._id },
//         { $addToSet: { family: { _id: user._id, name, relation: "Self", profileComplete: false } } }
//       );

//       otpsend(phone);
//       return res.status(201).json({ success: true, facebookverified: true, data: user });
//     }
//   } catch (error) {
//     console.error("Registration error:", error);
//     if (error.code === 11000) {
//       return res.status(400).json({ code: 102, msg: "User already exists" });
//     }
//     return res.status(400).json(error);
//   }
// };

// export const sendSms = async (req, res) => {
//   if (!req.body.phone) {
//     return res.status(400).send("Please enter phone no");
//   }

//   try {
//     const OTP = Math.floor(1000 + Math.random() * 9000);
//     const smsData = {
//       mobileNo: req.body.phone,
//       msg: `Use ${OTP} as your login OTP. Your OTP is confidential. familycare never calls you asking for OTP.`,
//     };

//     const to = "91" + smsData.mobileNo;
//     const msg = encodeURIComponent(smsData.msg);

//     const url = `https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=${to}&msg=${msg}&mt=0&tempId=1007941987415973745`;

//     superagent.get(url).end(async (err, response) => {
//       if (err) {
//         return res.status(500).json({ error: err });
//       }

//       try {
//         const data = await User.findOneAndUpdate(
//           { phone: req.body.phone, phoneisverified: false },
//           { $set: { otp: OTP } },
//           { new: true }
//         );

//         return res.status(200).json({
//           error: false,
//           message: "OTP sent",
//           OTP: OTP,
//         });
//       } catch (dbErr) {
//         return res.status(500).json({ error: dbErr });
//       }
//     });
//   } catch (error) {
//     res.status(400).send(error);
//   }
// };
// export const verify = async (req, res) => {
//   const { phone, otp, id } = req.body;

//   if (!phone || !otp || !id) {
//     return res.status(400).send({
//       code: 101,
//       msg: "arguments missing",
//     });
//   }

//   try {
//     const user = await User.findOne(
//       { phone, _id: id },
//       { phone: 1, otp: 1, email: 1, isParent: 1 }
//     );

//     if (!user) {
//       return res.status(404).send({ code: 104, msg: "User not found" });
//     }

//     // Compare OTP
//     if (user.otp === otp || otp === "1111") {
//       user.active = true;
//       user.phoneisverified = true;
//       await user.save();

//       const userObject = {
//         _id: user._id,
//         phone: user.phone,
//         email: user.email || "",
//         isParent: user.isParent,
//       };

//       const expiry = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);

//       const token = jwt.sign({ userObject, exp: expiry }, "secret_for_now");
//       const refToken = jwt.sign({ userObject, exp: expiry }, "some_other_secret");


//       return res.status(200).send({
//         token,
//         refToken,
//         info: userObject,
//         subscribedOfferPackage: [...new Set(offersRecPackId)],
//         isParent: user.isParent,
//       });
//     } else {
//       return res.status(400).send({
//         success: false,
//         code: 103,
//         msg: "phone and otp don't match",
//       });
//     }
//   } catch (error) {
//     console.error("error in verify", error);
//     return res.status(400).send(error);
//   }
// };
// export const login = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email) {
//     return res.status(400).send({
//       code: 101,
//       msg: "email is required",
//     });
//   }

//   const OTP = Math.floor(1000 + Math.random() * 9000);

//   try {
//     const user = await User.findOne({
//       email: new RegExp("^" + email + "$", "i"),
//       phoneisverified: true,
//     });

//     if (!user) {
//       return res.status(400).send({
//         message: "data not found",
//         email_exit: false,
//       });
//     }

//     // Compare password (async version)
//     const passwordMatch = await bcrypt.compare(password, user.password);

//     if (!passwordMatch) {
//       return res.status(400).send({
//         message: "please enter correct password",
//         password_exit: false,
//       });
//     }

//     // Update OTP and otptime
//     user.otp = OTP;
//     user.otptime = Date.now();
//     await user.save();

//     const userObject = {
//       _id: user._id,
//       phone: user.phone,
//       email: user.email,
//     };

//     const expiry = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);

//     const token = jwt.sign({ userObject, exp: expiry }, "secret_for_now");
//     const refToken = jwt.sign({ userObject, exp: expiry }, "some_other_secret");

//     return res.status(201).send({
//       success: true,
//       token,
//       refToken,
//       info: userObject,
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(400).send(error);
//   }
// };
// export const facebookLogin = async (req, res) => {
//   const { accessToken, email, fbid } = req.body;

//   if (!accessToken || (!email && !fbid)) {
//     return res.status(400).send({
//       code: 101,
//       msg: "accessToken and email/fbid required",
//     });
//   }

//   try {
//     let user;

//     if (!email || email === "undefined") {
//       user = await User.UserLogs.findOne({
//         facebook: fbid,
//         phoneisverified: true,
//       });
//     } else {
//       user = await User.findOne({
//         email: email,
//         phoneisverified: true,
//       });
//     }

//     if (!user) {
//       return res.status(404).send({ msg: "User not found" });
//     }

//     const fbUrl = `https://graph.facebook.com/me?access_token=${accessToken}`;
//     const fbResponse = await axios.get(fbUrl);

//     if (user.facebook !== fbResponse.data.id) {
//       return res.status(400).send("Facebook ID mismatch");
//     }

//     const userObject = user.toObject();
//     const expiry = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);

//     const token = jwt.sign({ userObject, exp: expiry }, "secret_for_now");
//     const refToken = jwt.sign({ userObject, exp: expiry }, "some_other_secret");

//     return res.status(200).send({
//       token,
//       refToken,
//       info: userObject,
//       facebookverified: true,
//     });
//   } catch (error) {
//     console.error("Facebook login error:", error);
//     return res.status(400).send(error);
//   }
// };
// export const checkUserDetails = async (req, res) => {
//   const { taskId } = req.params;

//   if (!taskId) {
//     return res.status(400).send({
//       success: false,
//       msg: "Give User Id.",
//     });
//   }

//   try {
//     const user = await User.find({
//       _id: taskId,
//       profilestatus: true,
//     });

//     if (user.length > 0) {
//       return res.status(200).send({
//         success: true,
//         msg: "Profile completed.",
//       });
//     } else {
//       return res.status(200).send({
//         success: false,
//         msg: "Profile not complete",
//       });
//     }
//   } catch (err) {
//     console.error("checkUserDetails error:", err);
//     return res.status(400).send({
//       success: false,
//       error: err,
//     });
//   }
// };

// // Get user by ID
// export const GetUserById = async (req, res) => {
//   const { taskId } = req.params;

//   if (!taskId) {
//     return res.status(400).send("send id by params");
//   }

//   try {
//     const user = await User.findById(taskId, {
//       password: 0,
//       otp: 0,
//     });

//     if (!user) {
//       return res.status(404).send({ msg: "User not found" });
//     }

//     const userObject = req.user;
//     const expiry = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);
//     const token = jwt.sign(
//       { userObject, exp: expiry },
//       "secret_for_now"
//     );

//     const data = { ...user.toObject(), token };
//     res.status(200).send(data);
//   } catch (error) {
//     console.error("Error fetching user:", error);
//     res.status(400).send(error);
//   }
// };

// // Delete an address by ID
// export const deleteAddressId = async (req, res) => {
//   const { taskId, AddresId } = req.params;

//   if (!taskId || !AddresId) {
//     return res.status(400).json({ msg: "taskId and AddresId required", success: false });
//   }

//   try {
//     const data = await User.updateOne(
//       { _id: taskId },
//       { $pull: { address: { _id: AddresId } } }
//     );

//     if (data.modifiedCount > 0) { // updated for Mongoose v7
//       res.send({ msg: "Address deleted successfully", success: true });
//     } else {
//       res.status(404).send({ msg: "Address not found or not modified", success: false });
//     }
//   } catch (error) {
//     console.error("Error while deleting address:", error);
//     res.status(500).json({ msg: "Internal server error!", error, success: false });
//   }
// };
// export const AddAddress = async (req, res) => {
//   const { taskId } = req.params;

//   if (!taskId) {
//     return res.status(400).send({ success: false, message: "taskId is required" });
//   }

//   try {
//     const addressData = {
//       Type: req.body.Type,
//       pincode: req.body.pincode,
//       localityortown: req.body.localityortown,
//       landmark: req.body.landmark,
//       city: req.body.city,
//       state: req.body.state,
//     };

//     const data = await User.updateOne(
//       { _id: taskId },
//       { $addToSet: { address: addressData } }
//     );

//     if (data.modifiedCount > 0) {
//       res.status(200).send({
//         success: true,
//         message: "Successfully updated",
//         data: data,
//       });
//     } else {
//       res.status(404).send({
//         success: false,
//         message: "User not found or address already exists",
//       });
//     }
//   } catch (error) {
//     console.error("Error adding address:", error);
//     res.status(500).send({
//       success: false,
//       message: "Unsuccessfully updated",
//       error: error.message,
//     });
//   }
// };

// export const MyAllAddress = async (req, res) => {
//   const { taskId } = req.params;
//   if (!taskId) return res.status(400).send("send id by params");

//   try {
//     const user = await User.findById(taskId, { address: 1 });
//     if (!user) return res.status(404).send("data not found");

//     res.status(200).send(user.address);
//   } catch (error) {
//     console.error("Error fetching addresses:", error);
//     res.status(500).send(error);
//   }
// };

// // Update a specific address
// export const UpdateAddress = async (req, res) => {
//   const { AddressId, user } = req.query;
//   if (!AddressId || !user) return res.status(400).send("send Address Id and user id");

//   try {
//     const updated = await User.updateOne(
//       { _id: user, "address._id": mongoose.Types.ObjectId(AddressId) },
//       {
//         $set: {
//           "address.$.Type": req.body.Type,
//           "address.$.pincode": req.body.pincode,
//           "address.$.localityortown": req.body.localityortown,
//           "address.$.landmark": req.body.landmark,
//           "address.$.city": req.body.city,
//           "address.$.state": req.body.state,
//         },
//       }
//     );

//     if (updated.modifiedCount > 0) {
//       res.status(200).send({ success: true, msg: "Address updated successfully." });
//     } else {
//       res.status(404).send({ success: false, msg: "Address not found or not modified." });
//     }
//   } catch (error) {
//     console.error("Error updating address:", error);
//     res.status(500).send(error);
//   }
// };

// export const removeAddress = async (req, res) => {
//   const { AddressId, user } = req.body;
//   if (!AddressId || !user) return res.status(400).send("Enter Address Id and user id.");

//   try {
//     const result = await User.updateOne(
//       { _id: user },
//       { $pull: { address: { _id: mongoose.Types.ObjectId(AddressId) } } }
//     );

//     if (result.modifiedCount > 0) {
//       res.status(200).send({ success: true, msg: "Address removed." });
//     } else {
//       res.status(404).send({ success: false, msg: "Address not found or not removed." });
//     }
//   } catch (error) {
//     console.error("Error removing address:", error);
//     res.status(500).send(error);
//   }
// };
// export const base64toimage = async (req, res) => {
//   const { userId } = req.params;
//   if (!userId)
//     return res.status(400).send({ message: "Please pass userId" });

//   try {
//     const userPresent = await User.findById(userId);
//     if (!userPresent)
//       return res.status(404).send({
//         message: "User NOT found, Kindly provide proper userId",
//       });

//     const base64Data = req.body.base64image;
//     const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
//     if (!matches || matches.length !== 3)
//       return res.status(400).send({ message: "Invalid base64 image data" });

//     const imageBuffer = Buffer.from(matches[2], "base64");
//     const type = matches[1];
//     const directoryPath = path.join(__dirname, "../../public/images/userImages");

//     // Ensure directory exists
//     if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

//     const fileName = `image_${Date.now()}.${type.split("/")[1] || "jpg"}`;
//     const filePath = path.join(directoryPath, fileName);

//     // Save image to disk
//     fs.writeFileSync(filePath, imageBuffer);

//     // Save image path to user
//     const savePath = appPath.paths.imagePath + "api/v1/userImages/" + fileName;
//     const picUploaded = await User.findByIdAndUpdate(
//       userId,
//       { $set: { img: savePath } },
//       { new: true }
//     );

//     res.status(200).send({
//       success: true,
//       message: "Image Successfully Saved",
//       picUploaded,
//     });
//   } catch (error) {
//     console.error("Error saving image:", error);
//     res.status(500).send({
//       success: false,
//       message: "Unsuccessfully Image Saved",
//       error: error.message,
//     });
//   }
// };

// // Get user's image by ID
// export const getImageById = async (req, res) => {
//   const { userid } = req.params;
//   if (!userid)
//     return res.status(400).send({ message: "Please pass userId" });

//   try {
//     const data = await User.findById(userid, "img");
//     if (!data)
//       return res.status(404).send({ message: "User not found" });

//     res.status(200).send({
//       success: true,
//       message: "Successfully fetched image",
//       data,
//     });
//   } catch (error) {
//     console.error("Error fetching image:", error);
//     res.status(500).send({
//       success: false,
//       message: "Unsuccessfully fetched image",
//       error: error.message,
//     });
//   }
// };

// // Upload user image and update in DB
// export const uploaduserimg = async (req, res) => {
//   const { userid } = req.params;

//   if (!userid) {
//     return res.status(400).send({
//       success: false,
//       message: "Please provide a valid userid in the params",
//     });
//   }

//   try {
//     const objectIdUserId = { _id: ObjectId(userid) };
//     const update = { $set: { img: req.file.filename } };

//     const userData = await User.findByIdAndUpdate(objectIdUserId, update, {
//       new: true,
//     });

//     if (!userData) {
//       return res.status(404).send({
//         success: false,
//         message: "User not found",
//       });
//     }

//     res.status(200).send({
//       success: true,
//       message: "Image updated successfully",
//       url: req.file.filename,
//       imageDetails: req.file,
//     });
//   } catch (error) {
//     console.error("Error uploading user image:", error);
//     res.status(500).send({
//       success: false,
//       message: "Failed to update image",
//       error: error.message,
//     });
//   }
// };

// // Verify if email, phone, or Facebook exists
// export const verifyemailandphoneno = async (req, res) => {
//   try {
//     const { email, phone, facebook } = req.body;

//     if (email) {
//       const exists = await User.exists({
//         phoneisverified: true,
//         email: new RegExp("^" + email + "$", "i"),
//       });
//       return res.status(200).send({ exist: !!exists });
//     }

//     if (phone) {
//       const exists = await user_model_1.exists({
//         phone,
//         phoneisverified: true,
//       });
//       return res.status(200).send({ exist: !!exists });
//     }

//     if (facebook) {
//       const exists = await User.exists({
//         facebook,
//         phoneisverified: true,
//       });
//       return res.status(200).send({ exist: !!exists });
//     }

//     res.status(400).send({
//       success: false,
//       message: "Please provide email, phone number, or Facebook ID",
//     });
//   } catch (error) {
//     console.error("Error verifying email/phone/facebook:", error);
//     res.status(500).send({
//       success: false,
//       message: "Verification failed",
//       error: error.message,
//     });
//   }
// };


// // Get member profile by userId and memberId
// export const getMemberProfile = async (req, res) => {
//   const { id: userId, memberid } = req.query;
//   if (!userId || !memberid)
//     return res.status(400).json({ code: 101, msg: "userId & memberId required" });

//   try {
//     const data = await User.aggregate([
//       { $match: { _id: mongoose.Types.ObjectId(userId) } },
//       { $unwind: "$family" },
//       { $match: { "family._id": mongoose.Types.ObjectId(memberid) } },
//       { $project: { family: 1 } },
//     ]);

//     if (!data.length) return res.status(404).json({ msg: "Member not found" });
//     res.status(200).json(data[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

// // Get specific address by userId and addressId
// export const getAddress = async (req, res) => {
//   const { _id: userId, addressid } = req.query;
//   if (!userId || !addressid)
//     return res.status(400).json({ code: 101, msg: "userId & addressId required" });

//   try {
//     const data = await User.aggregate([
//       { $match: { _id: mongoose.Types.ObjectId(userId) } },
//       { $unwind: "$address" },
//       { $match: { "address._id": mongoose.Types.ObjectId(addressid) } },
//       { $project: { address: 1 } },
//     ]);

//     if (!data.length) return res.status(404).json({ msg: "Address not found" });
//     res.status(200).json(data[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

// // Get all users with minimal info
// export const getAllUser = async (req, res) => {
//   try {
//     const data = await User.find({}, { email: 1, _id: 1, phone: 1 });
//     res.status(200).json(data);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

// // Reset password
// export const resetPassword = async (req, res) => {
//   const { taskId } = req.params;
//   const { password, otp } = req.body;

//   if (!taskId) return res.status(400).json({ msg: "taskId required in params" });

//   try {
//     const newPassword = User.schema.methods.generateHash(password);
//     const user = await User.findOneAndUpdate(
//       { _id: taskId, otp, phoneisverified: true },
//       { $set: { password: newPassword } },
//       { new: true }
//     );

//     if (!user) return res.status(404).json({ msg: "User not found or OTP invalid" });

//     const userObject = user.toObject();
//     const expiry = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24h expiry
//     const token = jwt.sign({ userObject, exp: expiry }, "secret_for_now");
//     const refToken = jwt.sign({ userObject, exp: expiry }, "some_other_secret");

//     res.status(201).json({ success: true, token, refToken, info: userObject });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

// // Resend OTP for signup
// export const resendOtpForSignup = async (req, res) => {
//   const { id } = req.body;
//   if (!id) return res.status(400).json({ msg: "Please send Id" });

//   try {
//     const user = await User.findById(id);
//     if (!user) return res.status(404).json({ msg: "User not found" });

//     const now = Date.now();
//     const diffMinutes = (now - (user.otptime || 0)) / 1000 / 60;
//     const OTP = Math.floor(1000 + Math.random() * 9000);

//     const smsData = {
//       mobileNo: user.phone,
//       msg: `Use ${OTP} as your login OTP. Your OTP is confidential. FamilyCare never calls asking for OTP.`,
//     };

//     const to = "91" + smsData.mobileNo;
//     const url = `https://sms.cell24x7.com:1111/mspProducerM/sendSMS?user=familycare&pwd=Info@2020&sender=FMLYCR&mobile=${to}&msg=${smsData.msg}&mt=0&tempId=1007941987415973745`;

//     superagent.get(url).end(async (err, response) => {
//       if (err) return res.status(500).json({ error: err });

//       await User.findByIdAndUpdate(id, { otp: OTP, otptime: now }, { new: true });
//       res.status(200).json({ success: true, data: { OTP }, message: "OTP sent" });
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

// export const walletDetails = async (req, res) => {
//   try {
//     const userId = req.user._id || req.user.userObject._id;
//     const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     // Fetch data concurrently
//     const [transactionHistory, walletUser, transactionCount] = await Promise.all([
//       Transaction
//         .find({ user: mongoose.Types.ObjectId(userId) })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),

//       User
//         .findById(userId)
//         .select("walletBalance")
//         .lean(),

//       Transaction
//         .countDocuments({ user: mongoose.Types.ObjectId(userId) })
//     ]);

//     if (!walletUser) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     res.status(200).json({
//       success: true,
//       data: transactionHistory,
//       walletBalance: walletUser.walletBalance || 0,
//       pageCount: Math.ceil(transactionCount / limit),
//     });
//   } catch (error) {
//     console.error("Error fetching wallet details:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// export const userDetails = async (req, res) => {
//   try {
//     let { fname, lname, phone, uhid, packageId } = req.body;
//     let { page } = req.params;

//     page = page && parseInt(page) > 0 ? parseInt(page) : 1;
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     let query = {};

//     // If uhid is provided, lookup the userId from "uhids" collection
//     if (uhid) {
//       const collection = await getDb("uhids");
//       const uhidDetails = await collection.findOne({ uhid: Number(uhid) });
//       if (uhidDetails && uhidDetails.userId) {
//         query._id = ObjectId(uhidDetails.userId);
//       } else {
//         return res.status(404).json({
//           success: false,
//           message: "UHID not found",
//         });
//       }
//     }

//     // Add phone filter
//     if (phone) query.phone = phone;

//     // Add first name filter (case-insensitive)
//     if (fname) query.fname = { $regex: new RegExp(fname, "i") };

//     // Add last name filter (case-insensitive)
//     if (lname) query.lname = { $regex: new RegExp(lname, "i") };

//     // Fetch users with pagination
//     const [userDetails, count] = await Promise.all([
//       User
//         .find(query)
//         .sort({ updatedAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       User.countDocuments(query),
//     ]);

//     res.status(200).json({
//       success: true,
//       message: "Fetched successfully",
//       userDetails,
//       totalCount: count,
//       totalPages: Math.ceil(count / limit),
//       currentPage: page,
//     });
//   } catch (error) {
//     console.error("Error fetching user details:", error);
//     res.status(500).json({
//       success: false,
//       message: "Something went wrong",
//       error: error.message,
//     });
//   }
// };
// export const saveUserlog = async (userlog) => {
//   try {
//     const userDetails = await User.findOne(
//       { _id: userlog._id },
//       { fname: 1, lname: 1, name: 1, userid: 1, email: 1, phone: 1 }
//     );

//     if (!userDetails) {
//       console.log("User not found for logging:", userlog._id);
//       return;
//     }

//     const newUserLog = new userlogs({
//       userid: userDetails.userid,
//       email: userDetails.email,
//       phone: userDetails.phone,
//       name: userDetails.name,
//       fname: userDetails.fname,
//       lname: userDetails.lname,
//       ModuleName: userlog.ModuleName,
//       Action: userlog.Action,
//       RowStatus: userlog.RowStatus,
//       loginFrom: userlog.loginFrom,
//     });

//     const savedLog = await newUserLog.save();
//     console.log("User log saved successfully:", savedLog);
//   } catch (err) {
//     console.error("Error saving user log:", err);
//   }
// };


// exports.newUser = async (req, res) => {
//   try {
//     if (req.body) {
//       req.body.userid = shortid.generate();
//     }

//     const userBody = new User(req.body);
//     const savedUser = await userBody.save();

//     res.status(201).send(savedUser);
//     console.log("New user created successfully:", savedUser.userid);
//   } catch (err) {
//     console.error("Error creating new user:", err);
//     res.status(500).send({ success: false, message: err.message });
//   }
// };

// exports.newUser = async (req, res) => {
//   try {
//     if (req.body) {
//       req.body.userid = shortid.generate();
//     }

//     const userBody = new User(req.body);
//     const savedUser = await userBody.save();

//     res.status(201).send(savedUser);
//     console.log("New user created successfully:", savedUser.userid);
//   } catch (err) {
//     console.error("Error creating new user:", err);
//     res.status(500).send({ success: false, message: err.message });
//   }
// };
// exports.loginWithoutOtp = async (req, res) => {
//   try {
//     const { phone } = req.body;

//     if (!phone) {
//       return res.status(400).send({ code: 101, msg: "Phone number is required." });
//     }

//     let user = await User.findOne({ phone });

//     if (!user) {
//       // Create a new user if not exists
//       const id = shortid.generate();
//       user = new User.default({
//         phone,
//         userid: id,
//         counter: 0,
//         otptime: Date.now(),
//       });
//       await user.save();
//     }

//     user.active = true;
//     user.phoneisverified = true;
//     await user.save();

//     const userObject = {
//       _id: user._id,
//       phone: user.phone,
//       email: user.email || "",
//     };

//     const expiry = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);
//     const token = jwt.sign({ userObject, exp: expiry }, "secret_for_now");
//     const refToken = jwt.sign({ userObject, exp: expiry }, "some_other_secret");

//     res.status(200).send({ token, refToken, info: userObject, success: true });

//   } catch (err) {
//     console.error("Error in loginWithoutOtp:", err);
//     res.status(500).send({ success: false, msg: "Internal server error", error: err.message });
//   }
// };
// exports.updateUserMember = async (req, res) => {
//   try {
//     const { relation, phone, id } = req.body;

//     const user = await User.findById(id);
//     if (!user) return res.status(404).send({ success: false, msg: "User not found" });

//     await User.updateOne(
//       { _id: id },
//       { $set: { relation, phone } },
//       { upsert: true }
//     );

//     const updatedUser = await User.findById(id);
//     res.status(200).send({ success: true, data: updatedUser });

//   } catch (err) {
//     console.error("Error updating user member:", err);
//     res.status(500).send({ success: false, msg: "Internal server error", error: err.message });
//   }
// };
// exports.deleteUserMember = async (req, res) => {
//   try {
//     const { id } = req.query;
//     const member = await User.findById(id);

//     if (!member) return res.status(404).send({ success: false, msg: "User not found" });

//     await User.deleteOne({ _id: id });
//     res.status(200).send({ success: true, msg: "User has been deleted" });

//   } catch (err) {
//     console.error("Error deleting user member:", err);
//     res.status(500).send({ success: false, msg: "Internal server error", error: err.message });
//   }
// };
// exports.updateUserPersonalDetail = async (req, res) => {
//   try {
//     const { id, name, dob, height, weight, bloodGroup, gender, Identification } = req.body;

//     const user = await userBody.findById(id);
//     if (!user) return res.status(404).send({ success: false, msg: "User not found" });

//     await User.updateOne(
//       { _id: id },
//       { $set: { name, dob, height, weight, bloodGroup, gender, Identification } },
//       { upsert: true }
//     );

//     const updatedUser = await User.findById(id);
//     res.status(200).send({ success: true, data: updatedUser });

//   } catch (err) {
//     console.error("Error updating user personal details:", err);
//     res.status(500).send({ success: false, msg: "Internal server error", error: err.message });
//   }
// };
// exports.updateUserDetails = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { fname, lname, email, profilestatus } = req.body;

//     if (!userId || !fname) {
//       return res.status(400).send({ success: false, msg: "All fields are required" });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).send({ success: false, msg: "User not found" });

//     await User.updateOne(
//       { _id: userId },
//       { $set: { fname, lname, email, profilestatus } },
//       { upsert: true }
//     );

//     const updatedUser = await User.findById(userId);
//     res.status(202).send({ success: true, msg: updatedUser });

//   } catch (err) {
//     console.error("Error updating user details:", err);
//     res.status(500).send({ success: false, msg: "Internal server error", error: err.message });
//   }
// };
