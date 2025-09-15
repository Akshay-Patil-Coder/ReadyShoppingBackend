import { default as Admin, AdminModel } from "./Admin.model";
import { Request, Response, NextFunction } from "express";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import * as async from "async";
import Log from "../log/log.model";
import AppointmentModel from "../appointment/appointment.model";
import doctorModel from "../doctor/doctor.model"; // Fixed typo
import userModel from '../user/user.model';
import reportModel from "../report/report.model";
import { throws } from "assert";
import { rescheduleAppointment } from "../appointment/appointment.controller";
import hospitalModel from "../hospital/hospital.model";
import diagnosticModel from "../diagnostic/diagnostic.model";
import appointmentModel from "../appointment/appointment.model";
import specialityModel from "../speciality/speciality.model";
import nursingModel from "../nursing/nursing.model";
import { fee, nursing, physician } from "./Admin.model";
import { create } from "domain";
import { forEach, concat } from "async";
import mongoose from "mongoose";
import pharmacyModel from "../pharmacy/pharmacy.model";
import _ from "lodash";
import moment from "moment";
import consultancyModel from "../consultancy/consultancy.model";
import homeAppointmentModel from "../homeappointment/home.appointment.model";
import { error, test } from "shelljs";
import { compare } from "bcrypt-nodejs";
import notificationModel from "../notification/notification.model";
import scheduleModel from "../doctor/schedule.model";
import { ObjectId, ObjectID } from "bson";
import { emit } from "cluster";
import { sendMessage } from "../../socket";
import { sendNotification } from "../pushnotifications/push.controller";
import { sendEmail, sendEmailForDoctor } from "../../util/utility";
import { Test } from "../diagnostic/diagnostic.model"; // Fixed import
import Geocoder from "node-geocoder";
import { exists } from "fs";

export let createAdmin = (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).send("arguments missing");
  } else {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        return res.status(500).send(err);
      }
      bcrypt.hash(req.body.password, salt, (err, hashedPassword) => {
        if (err) {
          return res.status(500).send(err);
        }
        const admin = new Admin({
          username: req.body.username,
          password: hashedPassword,
          name: req.body.name,
          permission: req.body.permission,
          image: req.body.image,
        });

        admin.save((err, value) => {
          if (err) {
            if (err.code === 11000) {
              return res.status(400).send("username already exists");
            } else {
              return res.status(400).send(err);
            }
          } else {
            const log = new Log();
            // log.user = req.user.userObject._id;
            // log.event = "Admin is created: " + value.username;
            // log.save();
            return res.status(201).send("User Created Successfully");
          }
        });
      });
    });
  }
};
export let getAdminList = async (req, res) => {
  try {
    const adminList = await Admin.find({});
    console.log(`adminList---${req.user}`);
    console.log("hello world");
    res.status(400).send(adminList);
  } catch (error) {
    res.status(400).send(error);
  }
};
export let adminLogin = async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).send("arguments missing");
  } else {
    try {
      const admin = await Admin.findOne(
        {
          isActive: true,
          username: req.body.username,
        },
        {
          username: 1,
          password: 1,
          permission: 1,
          image: 1,
          lastlogintime: 1,
          name: 1,
        }
      );

      if (admin) {
        const dateupdate = await Admin.updateOne(
          { _id: admin._id },
          { $set: { lastlogintime: new Date() } }
        );
        if (dateupdate.n) {
          console.log("get updated date");
        } else {
          console.log("error");
        }
      }

      const result = bcrypt.compareSync(req.body.password, admin.password);
      if (result) {
        const userObject = admin.toObject();
        delete userObject.password;

        const expiry = Math.floor(
          (Date.now() + 24 * 60 * 60 * 1000) / 1000
        ); // 1 day expiry

        const token = jwt.sign(
          {
            userObject,
            exp: expiry,
          },
          "secret_for_now"
        );

        const refToken = jwt.sign(
          {
            userObject,
            exp: expiry,
          },
          "some_other_secret"
        );

        res.status(200).send({
          token: token,
          refToken: refToken,
          Admin: admin,
        });
      } else {
        res.status(400).send("authentication error");
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }
};
export let getUnread = async (req, res) => {
  try {
    const data = await Admin.findOne({ _id: req.user._id }, { count: 1 });
    if (data) {
      res.status(201).send({
        unread: data.count,
      });
    } else {
      res.status(400).send({
        message: "Admin does not exist.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(400).send({ error: error });
  }
};

export const getUsers = async (req, res) => {
    try {
        const limit = 10;
        const page = req.params.page === undefined ? 1 : req.params.page;

        console.log("============", req.params);

        const usersCount = userModel.count({ phoneisverified: true });
        const users = userModel.aggregate([
            {
                $match: {
                    phoneisverified: true
                }
            },
            {
                $project: {
                    userid: 1,
                    email: 1,
                    phone: 1,
                    name: 1,
                    dob: 1,
                    createdAt: 1,
                    familyMember: { $size: "$family" }
                }
            }
        ])
            .sort({ _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const result = await Promise.all([users, usersCount]);

        res.status(200).send({
            success: true,
            data: result[0],
            count: result[1]
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            err: error
        });
    }
};

export const getUsersName = async (req, res) => {
    try {
        const limit = 10;
        const page = req.params.page === undefined ? 1 : req.params.page;

        console.log("============", req.params);

        const condition = {};
        if (req.body.name !== "") {
            condition.name = new RegExp(req.body.name, "i");
            condition.phoneisverified = true;
        }

        const usersCount = userModel.count(condition);
        const users = userModel.aggregate([
            {
                $match: condition
            },
            {
                $project: {
                    userid: 1,
                    email: 1,
                    phone: 1,
                    name: 1,
                    dob: 1,
                    createdAt: 1,
                    familyMember: { $size: "$family" }
                }
            }
        ])
            .sort({ _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const result = await Promise.all([users, usersCount]);

        res.status(200).send({
            success: true,
            data: result[0],
            count: result[1]
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            err: error
        });
    }
};
export const filterUser = async (req, res) => {
    console.log(req.body.name, "enter in log block7777777", req.body);

    if (
        req.body.name === undefined &&
        req.body.email === undefined &&
        req.body.phone === undefined &&
        (req.body.startDate === undefined || req.body.endDate === undefined)
    ) {
        console.log("enter in log block");
        return res.status(400).send({
            success: false,
            msg: 'At least one field required'
        });
    }

    try {
        const condition = {};

        if (req.body.name) condition.name = new RegExp('^' + req.body.name, "i");
        if (req.body.email) condition.email = new RegExp('^' + req.body.email, "i");
        if (req.body.phone) condition.phone = new RegExp('^' + req.body.phone, "i");

        if (req.body.startDate && req.body.endDate) {
            condition.dob = {};
            condition.dob.$gte = req.body.startDate;
            condition.dob.$lte = req.body.endDate;
        }

        console.log(
            moment.tz("1995-12-22", "America/Toronto").format("DD-MM-YYYY"),
            "=================condition",
            condition
        );

        const result = await userModel.aggregate([
            { $match: condition },
            {
                $project: {
                    email: 1,
                    phone: 1,
                    name: 1,
                    dob: 1,
                    familyMember: { $size: "$family" }
                }
            }
        ]).sort({ createdAt: -1 });

        res.status(200).send({
            success: true,
            result: result
        });
    } catch (error) {
        console.log('=======err', error);
        res.status(400).send({
            success: false,
            error: error
        });
    }
};

export const getuserdetails = async (req, res) => {
    console.log("=========req.body=>", req.body);

    if (!req.body.patientid) {
        return res.status(400).send({
            success: false,
            msg: 'User Required'
        });
    }

    try {
        const showCondition = {
            email: 1,
            phone: 1,
            name: 1,
            dob: 1,
            bloodGroup: 1,
            gender: 1,
            img: 1
        };

        const userdata = await userModel.find({ _id: req.body.patientid }, showCondition);

        res.status(200).send({
            success: true,
            userdata: userdata
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            err: error
        });
    }
};

export const getuserFamily = async (req, res) => {
    console.log("=========req.body=>", req.body);

    if (!req.body.patientid) {
        return res.status(400).send({
            success: false,
            msg: 'User Required'
        });
    }

    try {
        const userfamily = await userModel.find(
            { _id: req.body.patientid },
            { family: 1 }
        );

        res.status(200).send({
            success: true,
            userdata: userfamily
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            err: error
        });
    }
};

