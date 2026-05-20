'use strict';

const mongoose = require('mongoose');
const https = require('https');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const PaytmChecksum = require('paytmchecksum');
const PDFDocument = require('pdfkit');
const sizeOf = require('image-size');
const path = require('path');
const fs = require('fs');
const CoachingCourseOrder = require('../CoachingOrder/CoachingOrder.model');
const { CoachingCart, CoachingOrder } = require('./CoachingCart.model');
const { CoachingCourseModel, CoachingVideoModel } = require('../CoachingCourse/CoachingCourse.model');
const CompanyModel = require('../../CompanyBase/Company/Company.model');
const { User } = require('../../UserBase/User/User.model');
const { CertificateModel } = require('../CoachingOrder/CoachingOrder.model');
const { QuizModel } = require('../CoachingCourse/CoachingCourse.model');
const CoachingTutorModel = require('../CoachingTutors/CoachingTutors.model');
const CoachingClassModel = require('../CoachingClasses/CoachingClasses.model');
const CoachingUniversityModel = require('../CoachingUniversity/CoachingUniversity.model');
const CoachingCompanyModel = require('../CoachingCompanies/CoachingCompanies.model');
const CoachingProviderType = require('../CoachingProviderType/CoachingProviderType.model');


const PRIVATE_DIR = path.join(__dirname, '..', '..', 'private');
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const CERTIFICATE_OUT = path.join(PUBLIC_DIR, 'MyCertificate');


const resolveOrder = async (orderId, UserId, companyId) => {
    if (!mongoose.isValidObjectId(orderId))
        throw Object.assign(new Error('Invalid orderId'), { status: 400 });

    const order = await CoachingOrder.findOne({
        _id: orderId,
        UserId,
        companyId,
    });
    if (!order)
        throw Object.assign(new Error('Order not found'), { status: 404 });
    if (order.PaymentStatus !== 'Completed')
        throw Object.assign(new Error('Course not yet paid'), { status: 403 });

    return order;
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
        throw Object.assign(new Error('Invalid or expired course token'), { status: 401 });
    }
};

const resolveProvider = async (courseDoc) => {
    const providerType = await CoachingProviderType.findById(courseDoc.ProviderType);
    const type = providerType?.CourseProviderType || '';

    let providerName = '';
    let logoFile = '';
    let logoSubDir = '';

    if (type === 'Tutor') {
        const p = await CoachingTutorModel.findById(courseDoc.ProviderId);
        providerName = p?.TutorName || '';
        logoFile = p?.TutorImage || '';
        logoSubDir = 'CoachingTutorImage';
    } else if (type === 'Class') {
        const p = await CoachingClassModel.findById(courseDoc.ProviderId);
        providerName = p?.ClassName || '';
        logoFile = p?.ClassLogo || '';
        logoSubDir = 'CoachingClassesImage';
    } else if (type === 'University') {
        const p = await CoachingUniversityModel.findById(courseDoc.ProviderId);
        providerName = p?.UniversityName || '';
        logoFile = p?.UniversityLogo || '';
        logoSubDir = 'CoachingUniversityImage';
    } else if (type === 'Company') {
        const p = await CoachingCompanyModel.findById(courseDoc.ProviderId);
        providerName = p?.CourseCompanyName || '';
        logoFile = p?.CourseCompanyLogo || '';
        logoSubDir = 'CoachingCompanyImage';
    }

    return { type, providerName, logoFile, logoSubDir };
};

const computeProgress = (order) => {
    let totalVideos = 0, doneVideos = 0;
    let totalQuizzes = 0, doneQuizzes = 0;
    let totalPlaylists = 0, donePlaylists = 0;

    for (const pl of order.CourseContent || []) {
        totalPlaylists++;
        if (pl.PlayListCompleted) donePlaylists++;

        for (const v of pl.VideoData || []) {
            totalVideos++;
            if (v.VideoCompleted) doneVideos++;

            for (const q of v.QuizData || []) {
                totalQuizzes++;
                if (q.QuizCompleted) doneQuizzes++;
            }
        }
    }

    const pct = (done, total) => (total === 0 ? 100 : Math.round((done / total) * 100));

    return {
        playlists: { done: donePlaylists, total: totalPlaylists, pct: pct(donePlaylists, totalPlaylists) },
        videos: { done: doneVideos, total: totalVideos, pct: pct(doneVideos, totalVideos) },
        quizzes: { done: doneQuizzes, total: totalQuizzes, pct: pct(doneQuizzes, totalQuizzes) },
        overall: pct(doneVideos + doneQuizzes, totalVideos + totalQuizzes),
        courseCompleted: order.CourseCompleted,
    };
};
/**
 * @param {Object} courseDoc
 * @returns {{ total, discount, final }}
 */
const calculateCourse = (courseDoc) => {
    const base = courseDoc.Price || 0;
    const discount =
        courseDoc.offerPercentage > 0
            ? parseFloat(((base * courseDoc.offerPercentage) / 100).toFixed(2))
            : 0;
    const final = parseFloat((base - discount).toFixed(2));

    return {
        total: parseFloat(base.toFixed(2)),
        discount,
        final,
    };
};

/**
 * @param {Object} cart 
 */
const recalcCartTotals = (cart) => {
    let total = 0, discount = 0, final = 0;
    for (const c of cart.Courses) {
        if (c.IsActive !== false && c.Reserved !== true) {
            total += c.TotalPrice || 0;
            discount += c.DiscountPrice || 0;
            final += c.FinalPrice || 0;
        }
    }
    cart.TotalCartPrice = parseFloat(total.toFixed(2));
    cart.DiscountCartPrice = parseFloat(discount.toFixed(2));
    cart.FinalCartPrice = parseFloat(final.toFixed(2));
};

/**
 * @param {Object} courseDoc – CoachingCourseModel document
 * @returns {Array} CourseContent array
 */
const buildCourseContent = async (courseDoc) => {
    const content = [];
    for (const playlist of courseDoc.CourseContent || []) {
        const videoData = [];
        for (const videoId of playlist.CourseData || []) {
            const video = await CoachingVideoModel.findById(videoId);
            const quizData = (video?.Quizes || []).map((qId) => ({ QuizId: qId, QuizCompleted: false }));
            videoData.push({ VideoId: videoId, VideoCompleted: false, QuizData: quizData });
        }
        content.push({
            Heading: playlist.Heading,
            PlayListId: playlist._id,
            VideoData: videoData,
            PlayListCompleted: false,
        });
    }
    return content;
};

module.exports = {


    addCourseToCart: async (req, res) => {
        let { UserId, companyId, CourseId, Operation } = req.body;

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        try {
            if (!UserId || !companyId)
                return res.status(400).json({ message: 'User or Company missing', success: false });

            if (!['add', 'remove'].includes(Operation))
                return res.status(400).json({ message: 'Invalid operation. Use "add" or "remove"', success: false });

            const foundCourse = await CoachingCourseModel.findOne({
                _id: CourseId,
                companyId,
                isActive: true,
            });
            if (!foundCourse)
                return res.status(404).json({ message: 'Course not found', success: false });

            const alreadyPurchased = await CoachingCourseOrder.findOne({
                UserId,
                companyId,
                CourseId,
                PaymentStatus: 'Completed',
            });
            if (alreadyPurchased)
                return res.status(400).json({ message: 'Course already purchased', success: false });

            let cart = await CoachingCart.findOne({ UserId, companyId });
            if (!cart) cart = new CoachingCart({ UserId, companyId, Courses: [] });

            const existingIndex = cart.Courses.findIndex(
                (c) => c.CourseId.toString() === String(CourseId)
            );

            if (Operation === 'add') {
                const { total, discount, final } = calculateCourse(foundCourse);

                if (existingIndex !== -1) {
                    cart.Courses[existingIndex].IsActive = true;
                    cart.Courses[existingIndex].TotalPrice = total;
                    cart.Courses[existingIndex].DiscountPrice = discount;
                    cart.Courses[existingIndex].FinalPrice = final;
                } else {
                    cart.Courses.push({
                        CourseId,
                        TotalPrice: total,
                        DiscountPrice: discount,
                        FinalPrice: final,
                        IsActive: true,
                        Reserved: false,
                    });
                }
            } else if (Operation === 'remove') {
                if (existingIndex === -1)
                    return res.status(404).json({ message: 'Course not found in cart', success: false });
                cart.Courses.splice(existingIndex, 1);
            }

            recalcCartTotals(cart);
            const saved = await cart.save();

            return res.status(200).json({
                message: 'Coaching cart updated',
                success: true,
                data: saved,
            });

        } catch (err) {
            console.error('addCourseToCart Error:', err);
            return res.status(500).json({ message: 'Internal Server Error', error: err.message, success: false });
        }
    },


    validateCoachingCart: async ({ body }) => {
        const { UserId, companyId } = body;

        const cart = await CoachingCart.findOne({ UserId, companyId });
        if (!cart) return;

        const valid = [];
        for (const item of cart.Courses) {
            const course = await CoachingCourseModel.findOne({
                _id: item.CourseId,
                companyId,
                isActive: true,
            });
            if (!course) continue;

            const purchased = await CoachingCourseOrder.findOne({
                UserId,
                companyId,
                CourseId: item.CourseId,
                PaymentStatus: 'Completed',
            });
            if (purchased && item.Reserved !== true) continue;

            const { total, discount, final } = calculateCourse(course);
            item.TotalPrice = total;
            item.DiscountPrice = discount;
            item.FinalPrice = final;

            valid.push(item);
        }

        cart.Courses = valid;
        recalcCartTotals(cart);
        await cart.save();
    },

    getCoachingCart: async (req, res) => {
        let { UserId, companyId } = req.query;

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        try {
            if (!mongoose.isValidObjectId(companyId) || !mongoose.isValidObjectId(UserId))
                return res.status(400).json({ message: 'Invalid User or Company', success: false });

            const matchCondition = {
                companyId: new mongoose.Types.ObjectId(String(companyId)),
                UserId: new mongoose.Types.ObjectId(String(UserId)),
            };

            let data = await module.exports.getCoachingCartData(matchCondition);

            if (!data?.length || !data[0]?.Courses?.length)
                return res.status(400).json({ message: 'Cart is empty', success: false });

            data = data.map((cart) => {
                cart.Courses = cart.Courses
                    .filter((c) => c.IsActive !== false)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                return cart;
            });

            if (!data[0]?.Courses?.length)
                return res.status(400).json({ message: 'Cart is empty', success: false });

            return res.status(200).json({
                message: 'Coaching cart fetched successfully',
                success: true,
                data,
            });

        } catch (err) {
            console.error('getCoachingCart Error:', err.message);
            return res.status(500).json({ message: 'Internal Server Error', success: false });
        }
    },
    getCoachingCartData: async (matchCondition) => {
        try {
            const data = await CoachingCart.aggregate([
                { $match: matchCondition },

                {
                    $lookup: {
                        from: 'coachingcourses',
                        localField: 'Courses.CourseId',
                        foreignField: '_id',
                        as: '_CourseInfo',
                    },
                },

                {
                    $addFields: {
                        Courses: {
                            $map: {
                                input: '$Courses',
                                as: 'c',
                                in: {
                                    $mergeObjects: [
                                        '$$c',
                                        {
                                            CourseInfo: {
                                                $let: {
                                                    vars: {
                                                        course: {
                                                            $arrayElemAt: [
                                                                {
                                                                    $filter: {
                                                                        input: '$_CourseInfo',
                                                                        as: 'ci',
                                                                        cond: { $eq: ['$$ci._id', '$$c.CourseId'] },
                                                                    },
                                                                },
                                                                0,
                                                            ],
                                                        },
                                                    },
                                                    in: {
                                                        CourseId: '$$course._id',
                                                        CourseName: '$$course.CourseName',
                                                        CourseThumbnail: '$$course.CourseThumbnail',
                                                        Price: '$$course.Price',
                                                        offerPercentage: '$$course.offerPercentage',
                                                        Level: '$$course.Level',
                                                        Language: '$$course.Language',
                                                        ProviderId: '$$course.ProviderId',
                                                        ProviderType: '$$course.ProviderType',
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },

                { $project: { _CourseInfo: 0 } },
            ]);

            return data || null;
        } catch (err) {
            console.error('getCoachingCartData Error:', err);
            throw new Error('Failed to fetch coaching cart data');
        }
    },

    proceedToPaymentForCoachingCart: async (req, res) => {
        let { UserId, companyId, AddressId } = req.body;
        let { RenderingDomain = 'public' } = req.query;

        RenderingDomain = ['private', 'public'].includes((RenderingDomain || '').toLowerCase())
            ? RenderingDomain.toLowerCase()
            : 'public';

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        let rollback = { orderIds: [], reservedUpdates: [] };

        const RollBackFunction = async () => {
            try {
                if (rollback.reservedUpdates.length) {
                    await Promise.all(
                        rollback.reservedUpdates.map(({ _id, previousReserved }) =>
                            CoachingCart.findOneAndUpdate(
                                { companyId, UserId, 'Courses._id': _id },
                                { $set: { 'Courses.$.Reserved': previousReserved } }
                            )
                        )
                    );
                }
                if (rollback.orderIds.length) {
                    await CoachingOrder.deleteMany({ _id: { $in: rollback.orderIds } });
                }
            } catch (err) {
                console.error('RollBackFunction Error:', err.message);
            }
        };

        try {
            await module.exports.validateCoachingCart({ body: { UserId, companyId } });

            const foundUser = await User.findOne({ companyId, _id: UserId });
            if (!foundUser)
                return res.status(400).json({ message: 'User not found', success: false });

            if (!foundUser.Address?.length)
                return res.status(400).json({ message: 'No address found for user', success: false });

            let address;
            if (!AddressId) {
                address = foundUser.Address.find((a) => a.DefaultAddress === true) || foundUser.Address[0];
            } else {
                address = foundUser.Address.find((a) => String(a._id) === String(AddressId));
            }
            if (!address)
                return res.status(400).json({ message: 'Address not found', success: false });

            const cart = await CoachingCart.findOne({ UserId, companyId });
            if (!cart || !cart.Courses?.length)
                return res.status(400).json({ message: 'Cart is empty', success: false });

            const activeCourses = cart.Courses.filter((c) => c.IsActive !== false && c.Reserved !== true);
            if (!activeCourses.length)
                return res.status(400).json({ message: 'No valid courses to process', success: false });

            const now = new Date();
            const reservationExpiry = new Date(now.getTime() + 15 * 60 * 1000);

            const userDetails = {
                UserName: foundUser.UserName || '',
                Email: foundUser.Email || '',
                Phone: foundUser.Phone,
                AddresserName: address.AddresserName || foundUser.UserName || 'Guest',
                AddresserNumber: address.AddresserNumber || foundUser.Phone,
                AddressType: address.AddressType || 'Home',
                Street: address.Street || '',
                City: address.City || '',
                State: address.State || '',
                Country: address.Country || '',
                PostalCode: address.PostalCode || '',
                Latitude: address.Latitude || '',
                Longitude: address.Longitude || '',
                ManualAddress: address.ManualAddress || '',
            };

            // Build one CoachingOrder per cart course
            const savedOrders = [];

            for (const item of activeCourses) {
                const courseDoc = await CoachingCourseModel.findOne({
                    _id: item.CourseId,
                    companyId,
                    isActive: true,
                });
                if (!courseDoc) continue;

                const { total, discount, final } = calculateCourse(courseDoc);
                const courseContent = await buildCourseContent(courseDoc);

                const token = jwt.sign(
                    { CourseId: item.CourseId, UserId },
                    process.env.ACCESS_TOKEN_SECRET
                );

                const orderData = {
                    UserId,
                    companyId,
                    CartId: cart._id,
                    CartCourseId: item._id,
                    CourseId: item.CourseId,
                    CourseContent: courseContent,
                    TokenOfCourse: token,
                    TotalAmount: total,
                    OfferPercentage: courseDoc.offerPercentage || 0,
                    PaidAmount: 0,
                    PendingAmount: final,
                    PaymentStatus: 'Pending',
                    OrderDate: now.toLocaleDateString(),
                    OrderTime: now.toLocaleTimeString(),
                    ReservationStartedAt: now,
                    ReservationExpiresAt: reservationExpiry,
                    UserDetails: userDetails,
                };

                const saved = await new CoachingOrder(orderData).save();
                rollback.orderIds.push(saved._id);
                savedOrders.push(saved);
            }

            if (!savedOrders.length) {
                return res.status(400).json({ message: 'No valid courses could be processed', success: false });
            }

            const totalAmount = parseFloat(
                savedOrders.reduce((sum, o) => sum + (o.PendingAmount || o.TotalAmount || 0), 0).toFixed(2)
            );

            for (const order of savedOrders) {
                const cartItem = cart.Courses.find((c) => c._id.toString() === order.CartCourseId?.toString());
                if (cartItem) {
                    rollback.reservedUpdates.push({ _id: cartItem._id, previousReserved: cartItem.Reserved });
                    cartItem.Reserved = true;
                }
            }
            await cart.save();

            const paytmOrderId = `COACH_${savedOrders[0]._id.toString().slice(-6)}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

            const paytmParams = {
                body: {
                    requestType: 'Payment',
                    mid: process.env.PAYTM_MID,
                    websiteName: process.env.PAYTM_WEBSITE,
                    orderId: paytmOrderId,
                    callbackUrl: `${process.env.BASE_URL}coachingcart/handlePaymentStatus?RenderingDomain=${RenderingDomain}&companyId=${companyId}`,
                    txnAmount: { value: totalAmount.toString(), currency: 'INR' },
                    userInfo: { custId: UserId.toString() },
                },
            };

            const checksum = await PaytmChecksum.generateSignature(
                JSON.stringify(paytmParams.body),
                process.env.PAYTM_KEY
            );
            paytmParams.head = { signature: checksum };

            const post_data = JSON.stringify(paytmParams);
            const paytmOptions = {
                hostname: process.env.PAYTM_HOSTNAME,
                port: 443,
                path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${paytmOrderId}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(post_data),
                },
            };

            let paytmResponse;
            try {
                paytmResponse = await new Promise((resolve, reject) => {
                    let raw = '';
                    const pReq = https.request(paytmOptions, (pRes) => {
                        pRes.on('data', (chunk) => (raw += chunk));
                        pRes.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
                    });
                    pReq.on('error', reject);
                    pReq.write(post_data);
                    pReq.end();
                });
            } catch (err) {
                console.error('Paytm initiation error:', err);
                await RollBackFunction();
                return res.status(500).json({ message: 'Failed to initiate payment', success: false });
            }

            if (!paytmResponse?.body?.txnToken) {
                await RollBackFunction();
                console.error('No txnToken in Paytm response:', paytmResponse);
                return res.status(500).json({ message: 'Payment gateway did not return txnToken', success: false });
            }

            await CoachingOrder.updateMany(
                { _id: { $in: savedOrders.map((o) => o._id) } },
                {
                    $set: {
                        'PaymentSession.orderId': paytmOrderId,
                        'PaymentSession.txnId': null,
                        'PaymentSession.status': 'INITIATED',
                        'PaymentSession.amount': totalAmount,
                        'PaymentSession.paymentGateway': 'Paytm',
                        ReservationStartedAt: now,
                    },
                }
            );

            return res.status(200).json({
                success: true,
                message: 'Payment initiated',
                url: `https://${process.env.PAYTM_HOSTNAME}/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${paytmOrderId}`,
                txnToken: paytmResponse.body.txnToken,
                orderId: paytmOrderId,
                mid: process.env.PAYTM_MID,
                amount: totalAmount,
                orderIds: savedOrders.map((o) => o._id),
            });

        } catch (err) {
            console.error('proceedToPaymentForCoachingCart Error:', err);
            await RollBackFunction();
            return res.status(500).json({ message: 'Internal Server Error', success: false });
        }
    },
    proceedToPaymentForSingleCourse: async (req, res) => {
        let { UserId, companyId, CourseId, AddressId } = req.body;
        let { RenderingDomain = 'public' } = req.query;

        RenderingDomain = ['private', 'public'].includes((RenderingDomain || '').toLowerCase())
            ? RenderingDomain.toLowerCase()
            : 'public';

        if (req.user?.UserId) UserId = req.user.UserId;
        if (req.user?.companyId) companyId = req.user.companyId;

        let rollback = { orderId: null };

        const RollBack = async () => {
            try {
                if (rollback.orderId) await CoachingOrder.findByIdAndDelete(rollback.orderId);
            } catch (err) {
                console.error('SingleCourse Rollback Error:', err.message);
            }
        };

        try {
            if (!CourseId)
                return res.status(400).json({ message: 'CourseId is required', success: false });

            if (!UserId || !companyId)
                return res.status(400).json({ message: 'User or Company not provided', success: false });

            const foundUser = await User.findOne({ _id: UserId, companyId });
            if (!foundUser)
                return res.status(404).json({ message: 'User not found', success: false });

            let address;
            if (!AddressId) {
                address = foundUser.Address?.find((a) => a.DefaultAddress === true) || foundUser.Address?.[0];
            } else {
                address = foundUser.Address?.find((a) => String(a._id) === String(AddressId));
            }
            if (!address)
                return res.status(400).json({ message: 'Address not found', success: false });

            const courseDoc = await CoachingCourseModel.findOne({ _id: CourseId, companyId, isActive: true });
            if (!courseDoc)
                return res.status(404).json({ message: 'Course not found', success: false });

            const alreadyPurchased = await CoachingCourseOrder.findOne({
                UserId,
                companyId,
                CourseId,
                PaymentStatus: 'Completed',
            });
            if (alreadyPurchased)
                return res.status(400).json({ message: 'Course already purchased', success: false });

            const { total, discount, final } = calculateCourse(courseDoc);
            const courseContent = await buildCourseContent(courseDoc);

            const token = jwt.sign(
                { CourseId, UserId },
                process.env.ACCESS_TOKEN_SECRET
            );

            const now = new Date();
            const reservationExpiry = new Date(now.getTime() + 15 * 60 * 1000);

            const orderData = {
                UserId,
                companyId,
                CourseId,
                CourseContent: courseContent,
                TokenOfCourse: token,
                TotalAmount: total,
                OfferPercentage: courseDoc.offerPercentage || 0,
                PaidAmount: 0,
                PendingAmount: final,
                PaymentStatus: 'Pending',
                OrderDate: now.toLocaleDateString(),
                OrderTime: now.toLocaleTimeString(),
                ReservationStartedAt: now,
                ReservationExpiresAt: reservationExpiry,
                UserDetails: {
                    UserName: foundUser.UserName || '',
                    Email: foundUser.Email || '',
                    Phone: foundUser.Phone,
                    AddresserName: address.AddresserName || foundUser.UserName || 'Guest',
                    AddresserNumber: address.AddresserNumber || foundUser.Phone,
                    AddressType: address.AddressType || 'Home',
                    Street: address.Street || '',
                    City: address.City || '',
                    State: address.State || '',
                    Country: address.Country || '',
                    PostalCode: address.PostalCode || '',
                    Latitude: address.Latitude || '',
                    Longitude: address.Longitude || '',
                    ManualAddress: address.ManualAddress || '',
                },
            };

            const savedOrder = await new CoachingOrder(orderData).save();
            rollback.orderId = savedOrder._id;

            const paytmOrderId = `COACH_${savedOrder._id.toString().slice(-6)}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

            const paytmParams = {
                body: {
                    requestType: 'Payment',
                    mid: process.env.PAYTM_MID,
                    websiteName: process.env.PAYTM_WEBSITE,
                    orderId: paytmOrderId,
                    callbackUrl: `${process.env.BASE_URL}coachingcart/handlePaymentStatus?RenderingDomain=${RenderingDomain}&companyId=${companyId}`,
                    txnAmount: { value: final.toString(), currency: 'INR' },
                    userInfo: { custId: UserId.toString() },
                },
            };

            const checksum = await PaytmChecksum.generateSignature(
                JSON.stringify(paytmParams.body),
                process.env.PAYTM_KEY
            );
            paytmParams.head = { signature: checksum };

            const post_data = JSON.stringify(paytmParams);
            const paytmOptions = {
                hostname: process.env.PAYTM_HOSTNAME,
                port: 443,
                path: `/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${paytmOrderId}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(post_data),
                },
            };

            let paytmResponse;
            try {
                paytmResponse = await new Promise((resolve, reject) => {
                    let raw = '';
                    const pReq = https.request(paytmOptions, (pRes) => {
                        pRes.on('data', (chunk) => (raw += chunk));
                        pRes.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
                    });
                    pReq.on('error', reject);
                    pReq.write(post_data);
                    pReq.end();
                });
            } catch (err) {
                console.error('Paytm initiation error:', err);
                await RollBack();
                return res.status(500).json({ message: 'Failed to initiate payment', success: false });
            }

            if (!paytmResponse?.body?.txnToken) {
                await RollBack();
                console.error('No txnToken in Paytm response:', paytmResponse);
                return res.status(500).json({ message: 'Payment gateway did not return txnToken', success: false });
            }

            savedOrder.PaymentSession = {
                orderId: paytmOrderId,
                txnId: null,
                status: 'INITIATED',
                amount: final,
                paymentGateway: 'Paytm',
            };
            savedOrder.ReservationStartedAt = now;
            await savedOrder.save();

            return res.status(200).json({
                success: true,
                message: 'Payment initiated',
                url: `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${paytmOrderId}`,
                txnToken: paytmResponse.body.txnToken,
                orderId: paytmOrderId,
                mid: process.env.PAYTM_MID,
                amount: final,
                courseOrderId: savedOrder._id,
            });

        } catch (err) {
            console.error('proceedToPaymentForSingleCourse Error:', err);
            await RollBack();
            return res.status(500).json({ message: 'Internal Server Error', success: false, error: err.message });
        }
    },

    handleCoachingPaymentStatus: async (req, res) => {
        let FrontendRenderDomain;

        try {
            const paytmBody = req.body || {};
            const orderId = paytmBody?.ORDERID;

            const paymentInfo = {
                orderId,
                txnId: paytmBody.TXNID,
                amount: paytmBody.TXNAMOUNT,
                respMsg: paytmBody.RESPMSG,
                status: paytmBody.STATUS,
            };

            let { RenderingDomain = 'public', companyId } = req.query;
            RenderingDomain = ['private', 'public'].includes((RenderingDomain || '').toLowerCase())
                ? RenderingDomain.toLowerCase()
                : 'public';

            try {
                const foundCompany = companyId ? await CompanyModel.findById(companyId) : null;
                if (foundCompany) {
                    if (RenderingDomain === 'private' && foundCompany.PredifinedDomain) {
                        FrontendRenderDomain = `${foundCompany.PredifinedDomain.replace(/\/+$/, '')}/coaching`;
                    } else if (foundCompany.CompanyDomain) {
                        FrontendRenderDomain = `https://${foundCompany.CompanyDomain.trim()}.shop.readytechnologies.in/coaching`;
                    }
                }
            } catch (err) {
                console.error('Error fetching company domain:', err?.message);
            }
            if (!FrontendRenderDomain) FrontendRenderDomain = 'http://localhost:4200/coaching';

            let verifyPaytmStatus;
            try {
                const verifyParams = {
                    body: { mid: process.env.PAYTM_MID, orderId: paymentInfo.orderId },
                };
                const verifyChecksum = await PaytmChecksum.generateSignature(
                    JSON.stringify(verifyParams.body),
                    process.env.PAYTM_KEY
                );
                verifyParams.head = { signature: verifyChecksum };

                const verifyData = JSON.stringify(verifyParams);
                const verifyOptions = {
                    hostname: 'securegw.paytm.in',
                    port: 443,
                    path: '/v3/order/status',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(verifyData),
                    },
                };

                verifyPaytmStatus = await new Promise((resolve, reject) => {
                    let raw = '';
                    const vReq = https.request(verifyOptions, (vRes) => {
                        vRes.on('data', (chunk) => (raw += chunk));
                        vRes.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
                    });
                    vReq.on('error', reject);
                    vReq.write(verifyData);
                    vReq.end();
                });
            } catch (err) {
                console.error('Paytm verify error:', err?.message);
                return res.redirect(
                    `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=PAYTM-VERIFY-ERROR`
                );
            }

            const resultStatus = verifyPaytmStatus?.body?.resultInfo?.resultStatus || 'UNKNOWN';

            const foundOrders = await CoachingOrder.find({ 'PaymentSession.orderId': orderId });

            if (!foundOrders.length) {
                return res.redirect(
                    `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=ORDER-NOT-FOUND`
                );
            }

            if (resultStatus === 'TXN_SUCCESS') {
                if (foundOrders[0].PaymentSession?.status === 'SUCCESS') {
                    return res.redirect(
                        `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=SUCCESS&coachingorderids=${foundOrders.map((o) => o._id).join(',')}`
                    );
                }

                const confirmedAt = new Date();

                for (const order of foundOrders) {
                    order.PaymentSession.status = 'SUCCESS';
                    order.PaymentSession.txnId = paymentInfo.txnId;
                    order.PaymentSession.amount = paymentInfo.amount;
                    order.PaymentStatus = 'Completed';
                    order.PaidAmount = order.PendingAmount || order.TotalAmount || 0;
                    order.PendingAmount = 0;
                    order.valid = true;
                    await order.save();
                }

                try {
                    const cart = await CoachingCart.findOne({
                        UserId: foundOrders[0].UserId,
                        companyId: foundOrders[0].companyId,
                    });
                    if (cart) {
                        for (const order of foundOrders) {
                            const cartItem = cart.Courses.find(
                                (c) => c._id.toString() === order.CartCourseId?.toString()
                            );
                            if (cartItem) {
                                cartItem.IsActive = false;
                                cartItem.Reserved = false;
                            }
                        }
                        recalcCartTotals(cart);
                        await cart.save();
                    }
                } catch (err) {
                    console.error('Post-payment cart cleanup error:', err?.message);
                }

                return res.redirect(
                    `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=SUCCESS&coachingorderids=${foundOrders.map((o) => o._id).join(',')}`
                );
            }

            if (resultStatus === 'TXN_FAILURE' || resultStatus === 'FAILURE') {
                if (foundOrders[0].PaymentSession?.status === 'FAILED') {
                    return res.redirect(
                        `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=FAILED&coachingorderids=${foundOrders.map((o) => o._id).join(',')}`
                    );
                }

                try {
                    const cart = await CoachingCart.findOne({
                        UserId: foundOrders[0].UserId,
                        companyId: foundOrders[0].companyId,
                    });
                    if (cart) {
                        for (const order of foundOrders) {
                            const cartItem = cart.Courses.find(
                                (c) => c._id.toString() === order.CartCourseId?.toString()
                            );
                            if (cartItem) cartItem.Reserved = false;
                        }
                        await cart.save();
                    }
                } catch (err) {
                    console.error('Cart reserved-flag reset error:', err?.message);
                }

                for (const order of foundOrders) {
                    order.PaymentSession.status = 'FAILED';
                    order.PaymentSession.txnId = paymentInfo.txnId || order.PaymentSession.txnId;
                    order.PaymentSession.amount = paymentInfo.amount || order.PaymentSession.amount;
                    order.PaymentStatus = 'Cancelled';
                    await order.save();
                }

                const resultMsg = (verifyPaytmStatus?.body?.resultInfo?.resultMsg || '').toLowerCase();
                const respMsg = (paymentInfo?.respMsg || '').toLowerCase();
                const isCancelled =
                    resultMsg.includes('cancelled') ||
                    respMsg.includes('user has not completed transaction');

                return res.redirect(
                    `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=${isCancelled ? 'CANCELLED' : 'FAILED'}&coachingorderids=${foundOrders.map((o) => o._id).join(',')}`
                );
            }

            return res.redirect(
                `${FrontendRenderDomain}/order-checked?paytmorderId=${encodeURIComponent(paymentInfo.orderId || '')}&status=${encodeURIComponent(resultStatus)}&coachingorderids=${foundOrders.map((o) => o._id).join(',')}`
            );

        } catch (err) {
            console.error('handleCoachingPaymentStatus Error:', err);
            const paytmorderId = req.body?.ORDERID ? encodeURIComponent(req.body.ORDERID) : '';
            const fallback = FrontendRenderDomain || 'http://localhost:4200/coaching';
            return res.redirect(
                `${fallback}/order-checked?paytmorderId=${paytmorderId}&status=INTERNAL-SERVER-ERROR`
            );
        }
    },

    getCoachingOrders: async (req, res) => {
        try {
            let { UserId, companyId, CourseId, OrderId, PaymentStatus } = req.query;

            if (req.user?.UserId) UserId = req.user.UserId;
            if (req.user?.companyId) companyId = req.user.companyId;

            if (!mongoose.isValidObjectId(companyId) || !mongoose.isValidObjectId(UserId))
                return res.status(400).json({ message: 'Invalid CompanyId or UserId', success: false });

            const toObjectId = (id) =>
                mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : null;

            const allowedPaymentStatus = ['Pending', 'Completed', 'Cancelled', 'In Progress'];
            if (PaymentStatus && !allowedPaymentStatus.includes(PaymentStatus))
                return res.status(400).json({
                    message: `Invalid PaymentStatus. Allowed: ${allowedPaymentStatus.join(', ')}`,
                    success: false,
                });

            const matchCondition = {
                companyId: toObjectId(companyId),
                UserId: toObjectId(UserId),
            };
            if (CourseId) matchCondition.CourseId = toObjectId(CourseId);
            if (OrderId) matchCondition._id = toObjectId(OrderId);
            if (PaymentStatus) matchCondition.PaymentStatus = PaymentStatus;

            const orders = await CoachingOrder.find(matchCondition).sort({ createdAt: -1 });

            if (!orders.length)
                return res.status(404).json({ message: 'No coaching orders found', success: false });

            return res.status(200).json({ message: 'Coaching orders fetched', data: orders, success: true });

        } catch (err) {
            console.error('getCoachingOrders Error:', err.message);
            return res.status(500).json({ message: 'Internal Server Error', error: err.message, success: false });
        }
    },

    getAllCoachingOrders: async (req, res) => {
        try {
            let { UserId, companyId, CourseId, OrderId, PaymentStatus, SortOrder, StartDate, EndDate } = req.query;

            if (req.user?.companyId) companyId = req.user.companyId;

            if (!mongoose.isValidObjectId(companyId))
                return res.status(400).json({ message: 'Invalid CompanyId', success: false });

            const toObjectId = (id) =>
                mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : null;

            const allowedPaymentStatus = ['Pending', 'Completed', 'Cancelled', 'In Progress'];
            if (PaymentStatus && !allowedPaymentStatus.includes(PaymentStatus))
                return res.status(400).json({
                    message: `Invalid PaymentStatus. Allowed: ${allowedPaymentStatus.join(', ')}`,
                    success: false,
                });

            if (UserId && !mongoose.isValidObjectId(UserId))
                return res.status(400).json({ message: 'Invalid UserId', success: false });
            if (OrderId && !mongoose.isValidObjectId(OrderId))
                return res.status(400).json({ message: 'Invalid OrderId', success: false });

            const matchCondition = { companyId: toObjectId(companyId) };

            if (UserId) matchCondition.UserId = toObjectId(UserId);
            if (CourseId) matchCondition.CourseId = toObjectId(CourseId);
            if (OrderId) matchCondition._id = toObjectId(OrderId);
            if (PaymentStatus) matchCondition.PaymentStatus = PaymentStatus;

            if (StartDate || EndDate) {
                matchCondition.createdAt = {};
                if (StartDate) matchCondition.createdAt.$gte = new Date(StartDate);
                if (EndDate) matchCondition.createdAt.$lte = new Date(EndDate);
            }

            const sortOption = SortOrder === 'older' ? { createdAt: 1 } : { createdAt: -1 };
            const orders = await CoachingOrder.find(matchCondition).sort(sortOption);

            if (!orders.length)
                return res.status(404).json({ message: 'No coaching orders found', success: false });

            return res.status(200).json({ message: 'Coaching orders fetched', data: orders, success: true });

        } catch (err) {
            console.error('getAllCoachingOrders Error:', err.message);
            return res.status(500).json({ message: 'Internal Server Error', error: err.message, success: false });
        }
    },


    verifyCourseAccess: async (req, res) => {
        try {
            const { TokenOfCourse } = req.body;
            if (!TokenOfCourse)
                return res.status(400).json({ message: 'TokenOfCourse is required', success: false });

            const payload = verifyToken(TokenOfCourse);

            // Token must belong to the authenticated user
            const UserId = req.user?.UserId || payload.UserId;
            const companyId = req.user?.companyId;

            const order = await CoachingOrder.findOne({
                CourseId: payload.CourseId,
                UserId,
                companyId,
                TokenOfCourse,
                PaymentStatus: 'Completed',
            });

            if (!order)
                return res.status(403).json({ message: 'Access denied – course not purchased', success: false });

            return res.status(200).json({
                success: true,
                message: 'Access granted',
                data: {
                    orderId: order._id,
                    CourseId: order.CourseId,
                    TokenOfCourse: order.TokenOfCourse,
                    PaymentStatus: order.PaymentStatus,
                    CourseCompleted: order.CourseCompleted,
                    progress: computeProgress(order),
                },
            });
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message, success: false });
        }
    },


    getMyCourseContent: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { TokenOfCourse } = req.query;
            const UserId = req.user?.UserId;
            const companyId = req.user?.companyId;

            let order;
            if (TokenOfCourse) {
                const payload = verifyToken(TokenOfCourse);
                order = await CoachingOrder.findOne({
                    CourseId: payload.CourseId,
                    UserId: payload.UserId,
                    companyId,
                    TokenOfCourse,
                    PaymentStatus: 'Completed',
                });
            } else {
                order = await resolveOrder(orderId, UserId, companyId);
            }

            if (!order)
                return res.status(403).json({ message: 'Access denied', success: false });

            const enrichedContent = await Promise.all(
                (order.CourseContent || []).map(async (playlist) => {
                    const enrichedVideos = await Promise.all(
                        (playlist.VideoData || []).map(async (v) => {
                            const videoDoc = await CoachingVideoModel.findById(v.VideoId).select(
                                'title description VideoDuration order Streaming paid Subtitles VideoLanguages Quizes'
                            );

                            const quizMeta = await Promise.all(
                                (v.QuizData || []).map(async (q) => {
                                    const quiz = await QuizModel.findById(q.QuizId).select(
                                        'QuizType McqQuiz.McqQuestion McqQuiz.McqOptions PractiseTestQuiz.PractiseTestQuestion CodingQuiz.CodingQuestion'
                                    );
                                    return {
                                        QuizId: q.QuizId,
                                        QuizCompleted: q.QuizCompleted,
                                        QuizInfo: quiz || null,
                                    };
                                })
                            );

                            return {
                                VideoId: v.VideoId,
                                VideoCompleted: v.VideoCompleted,
                                VideoInfo: videoDoc || null,
                                QuizData: quizMeta,
                            };
                        })
                    );

                    return {
                        Heading: playlist.Heading,
                        PlayListId: playlist.PlayListId,
                        PlayListCompleted: playlist.PlayListCompleted,
                        VideoData: enrichedVideos,
                    };
                })
            );

            return res.status(200).json({
                success: true,
                message: 'Course content fetched',
                data: {
                    orderId: order._id,
                    CourseId: order.CourseId,
                    CourseCompleted: order.CourseCompleted,
                    progress: computeProgress(order),
                    CourseContent: enrichedContent,
                },
            });
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message, success: false });
        }
    },


    accessVideo: async (req, res) => {
        try {
            const { orderId, videoId } = req.params;
            const { TokenOfCourse } = req.query;
            const UserId = req.user?.UserId;
            const companyId = req.user?.companyId;

            // Verify ownership via user-JWT or course token
            let order;
            if (TokenOfCourse) {
                const payload = verifyToken(TokenOfCourse);
                order = await CoachingOrder.findOne({
                    CourseId: payload.CourseId,
                    UserId: payload.UserId,
                    companyId,
                    TokenOfCourse,
                    PaymentStatus: 'Completed',
                });
            } else {
                order = await resolveOrder(orderId, UserId, companyId);
            }

            if (!order)
                return res.status(403).json({ message: 'Access denied', success: false });

            // Confirm the requested video is actually in this order
            let videoExistsInOrder = false;
            for (const pl of order.CourseContent || []) {
                if (pl.VideoData.some(v => v.VideoId.toString() === videoId)) {
                    videoExistsInOrder = true;
                    break;
                }
            }
            if (!videoExistsInOrder)
                return res.status(403).json({ message: 'Video not part of this course order', success: false });

            const videoDoc = await CoachingVideoModel.findById(videoId);
            if (!videoDoc)
                return res.status(404).json({ message: 'Video not found', success: false });

            if (videoDoc.Streaming?.masterM3U8) {
                return res.status(200).json({
                    success: true,
                    streamType: 'hls',
                    masterM3U8: videoDoc.Streaming.masterM3U8,
                    audioTracks: videoDoc.Streaming.audioTracks || [],
                    subtitles: videoDoc.Streaming.subtitles || [],
                    title: videoDoc.title,
                    duration: videoDoc.VideoDuration,
                });
            }

            const courseDoc = await CoachingCourseModel.findOne({ _id: order.CourseId, companyId });
            if (!courseDoc)
                return res.status(404).json({ message: 'Course not found', success: false });

            let playlistHeading = '';
            for (const pl of order.CourseContent || []) {
                if (pl.VideoData.some(v => v.VideoId.toString() === videoId)) {
                    playlistHeading = pl.Heading;
                    break;
                }
            }

            const courseDirName = `${courseDoc.CourseName}-${courseDoc.ProviderId}`;
            const videoFilePath = path.join(
                PRIVATE_DIR,
                courseDirName,
                playlistHeading,
                'VideoFiles',
                videoDoc.videoFile
            );

            if (!fs.existsSync(videoFilePath))
                return res.status(404).json({ message: 'Video file not found on server', success: false });

            return res.sendFile(path.resolve(videoFilePath));

        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message, success: false });
        }
    },


    getQuizForVideo: async (req, res) => {
        try {
            const { orderId, videoId } = req.params;
            const UserId = req.user?.UserId;
            const companyId = req.user?.companyId;

            const order = await resolveOrder(orderId, UserId, companyId);

            let quizIds = [];
            for (const pl of order.CourseContent || []) {
                for (const v of pl.VideoData || []) {
                    if (v.VideoId.toString() === videoId) {
                        quizIds = v.QuizData.map(q => q.QuizId);
                    }
                }
            }

            if (!quizIds.length)
                return res.status(404).json({ message: 'No quizzes found for this video', success: false });

            const quizzes = await QuizModel.find({ _id: { $in: quizIds } }).select(
                '-CodingQuiz.CodingAnswer -McqQuiz.McqAnswer -PractiseTestQuiz.PractiseTestAnswer'
            );

            // Annotate with completion status from the order
            const orderVideo = order.CourseContent
                .flatMap(pl => pl.VideoData)
                .find(v => v.VideoId.toString() === videoId);

            const annotated = quizzes.map(quiz => ({
                ...quiz.toObject(),
                QuizCompleted: orderVideo?.QuizData.find(
                    q => q.QuizId.toString() === quiz._id.toString()
                )?.QuizCompleted || false,
            }));

            return res.status(200).json({
                success: true,
                message: 'Quizzes fetched',
                data: annotated,
            });
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message, success: false });
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // 5. SUBMIT QUIZ ANSWER
    //    POST /coaching-access/quiz/:orderId/:videoId/:quizId/submit
    //    Body: { answer } – string for MCQ/Coding, string for PractiseTest
    //    Grades the answer and marks the quiz as completed if correct.
    // ──────────────────────────────────────────────────────────────────────────
    submitQuizAnswer: async (req, res) => {
        try {
            const { orderId, videoId, quizId } = req.params;
            const { answer } = req.body;
            const UserId = req.user?.UserId;
            const companyId = req.user?.companyId;

            if (answer === undefined || answer === null || answer === '')
                return res.status(400).json({ message: 'answer is required', success: false });

            const order = await resolveOrder(orderId, UserId, companyId);

            // Find the playlist + video + quiz entry inside the order
            let targetPlaylist = null, targetVideo = null, targetQuiz = null;
            for (const pl of order.CourseContent) {
                for (const v of pl.VideoData) {
                    if (v.VideoId.toString() === videoId) {
                        for (const q of v.QuizData) {
                            if (q.QuizId.toString() === quizId) {
                                targetPlaylist = pl;
                                targetVideo = v;
                                targetQuiz = q;
                            }
                        }
                    }
                }
            }

            if (!targetQuiz)
                return res.status(404).json({ message: 'Quiz not found in order', success: false });

            if (targetQuiz.QuizCompleted)
                return res.status(200).json({ success: true, message: 'Quiz already completed', correct: true });

            // Fetch the real quiz document with answers
            const quizDoc = await QuizModel.findById(quizId);
            if (!quizDoc)
                return res.status(404).json({ message: 'Quiz document not found', success: false });

            let correct = false;
            let correctAnswer = null;

            if (quizDoc.QuizType === 'MCQ') {
                // answer should be the McqAnswer string
                const matched = quizDoc.McqQuiz.find(
                    q => q.McqAnswer?.toLowerCase().trim() === String(answer).toLowerCase().trim()
                );
                correct = !!matched;
                correctAnswer = null; // don't reveal on wrong attempt
            } else if (quizDoc.QuizType === 'Coding') {
                correct = quizDoc.CodingQuiz?.CodingAnswer?.trim() === String(answer).trim();
                correctAnswer = null;
            } else if (quizDoc.QuizType === 'PractiseTest') {
                // PractiseTest is treated as open-ended – auto-mark complete on submission
                correct = true;
            }

            if (correct) {
                targetQuiz.QuizCompleted = true;
                order.markModified('CourseContent');
                await order.save();
            }

            return res.status(200).json({
                success: true,
                correct,
                message: correct ? 'Correct answer – quiz marked as completed!' : 'Incorrect answer – please try again.',
                ...(correct ? {} : {}),
            });
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message, success: false });
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // 6. MARK VIDEO COMPLETED
    //    PATCH /coaching-access/progress/:orderId/video
    //    Body: { PlayListId, VideoId }
    // ──────────────────────────────────────────────────────────────────────────
    markVideoCompleted: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { PlayListId, VideoId } = req.body;
            const UserId = req.user?.UserId;
            const companyId = req.user?.companyId;

            if (!PlayListId || !VideoId)
                return res.status(400).json({ message: 'PlayListId and VideoId are required', success: false });

            const order = await resolveOrder(orderId, UserId, companyId);

            let updated = false;
            for (const pl of order.CourseContent) {
                if (pl.PlayListId.toString() === PlayListId) {
                    for (const v of pl.VideoData) {
                        if (v.VideoId.toString() === VideoId) {
                            v.VideoCompleted = true;
                            updated = true;
                        }
                    }
                }
            }

            if (!updated)
                return res.status(404).json({ message: 'Video not found in this order', success: false });

            order.markModified('CourseContent');
            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Video marked as completed',
                progress: computeProgress(order),
            });
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message, success: false });
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // 7. MARK PLAYLIST COMPLETED
    //    PATCH /coaching-access/progress/:orderId/playlist
    //    Body: { PlayListId }
    //    (auto-marks all videos + quizzes inside it)
    // ──────────────────────────────────────────────────────────────────────────
    markPlaylistCompleted: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { PlayListId } = req.body;
            const UserId = req.user?.UserId;
            const companyId = req.user?.companyId;

            if (!PlayListId)
                return res.status(400).json({ message: 'PlayListId is required', success: false });

            const order = await resolveOrder(orderId, UserId, companyId);

            let updated = false;
            for (const pl of order.CourseContent) {
                if (pl.PlayListId.toString() === PlayListId) {
                    pl.PlayListCompleted = true;
                    // Also mark all videos and quizzes inside
                    for (const v of pl.VideoData) {
                        v.VideoCompleted = true;
                        for (const q of v.QuizData) q.QuizCompleted = true;
                    }
                    updated = true;
                }
            }

            if (!updated)
                return res.status(404).json({ message: 'Playlist not found in this order', success: false });

            order.markModified('CourseContent');
            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Playlist marked as completed',
                progress: computeProgress(order),
            });
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message, success: false });
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // 8. GET COURSE PROGRESS
    //    GET /coaching-access/progress/:orderId
    // ──────────────────────────────────────────────────────────────────────────
    getCourseProgress: async (req, res) => {
        try {
            const { orderId } = req.params;
            const UserId = req.user?.UserId;
            const companyId = req.user?.companyId;

            const order = await resolveOrder(orderId, UserId, companyId);

            return res.status(200).json({
                success: true,
                message: 'Progress fetched',
                data: computeProgress(order),
            });
        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message, success: false });
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // 9. GENERATE CERTIFICATE
    //    POST /coaching-access/certificate/:orderId/generate
    //    Builds a PDF from the course's Certificate template + CertificateConfig.
    //    Requires: all videos watched + all quizzes done (100 % progress).
    // ──────────────────────────────────────────────────────────────────────────
    generateCertificate: async (req, res) => {
        try {
            const { orderId } = req.params;
            const UserId = req.user?.UserId;
            const companyId = req.user?.companyId;

            const order = await resolveOrder(orderId, UserId, companyId);

            // ── Guard: already generated ──────────────────────────────────────
            if (order.CertificatePath && fs.existsSync(order.CertificatePath)) {
                return res.status(200).json({
                    success: true,
                    message: 'Certificate already generated',
                    CertificatePath: order.CertificatePath,
                    CertificateId: order.CertificateId || null,
                });
            }

            // ── Guard: course must be 100 % complete ─────────────────────────
            const progress = computeProgress(order);
            if (progress.overall < 100) {
                return res.status(400).json({
                    success: false,
                    message: `Course not yet completed (${progress.overall}% done). Finish all videos and quizzes first.`,
                    progress,
                });
            }

            // ── Load course + user + company ──────────────────────────────────
            const courseDoc = await CoachingCourseModel.findOne({ _id: order.CourseId, companyId });
            if (!courseDoc)
                return res.status(404).json({ message: 'Course not found', success: false });

            if (!courseDoc.Certificate || !courseDoc.CertificateConfig?.fields)
                return res.status(400).json({ message: 'Certificate template not configured for this course', success: false });

            const user = await User.findById(UserId);
            if (!user)
                return res.status(404).json({ message: 'User not found', success: false });

            const company = await CompanyModel.findById(companyId);
            const { providerName, logoFile, logoSubDir } = await resolveProvider(courseDoc);

            // ── Resolve file paths ────────────────────────────────────────────
            const courseDirName = `${courseDoc.CourseName}-${courseDoc.ProviderId}`;
            const templatePath = path.join(PRIVATE_DIR, courseDirName, 'Certificate', courseDoc.Certificate);

            if (!fs.existsSync(templatePath))
                return res.status(404).json({ message: 'Certificate template file not found on server', success: false });

            // Ensure output directory exists
            if (!fs.existsSync(CERTIFICATE_OUT))
                fs.mkdirSync(CERTIFICATE_OUT, { recursive: true });

            const safeUser = (user.UserName || UserId).toString().replace(/\s+/g, '_');
            const fileName = `${courseDoc.CourseName}-${order.CourseId}-${safeUser}-${Date.now()}.pdf`;
            const outputPath = path.join(CERTIFICATE_OUT, fileName);

            // ── Build PDF ─────────────────────────────────────────────────────
            const { width, height } = sizeOf(templatePath);
            const doc = new PDFDocument({ size: [width, height], margin: 0 });
            const writeStream = fs.createWriteStream(outputPath);
            doc.pipe(writeStream);

            // Background: the certificate template image
            doc.image(templatePath, 0, 0, { width, height }).fillColor('black');

            const config = courseDoc.CertificateConfig.fields;

            // Helper: draw text at a configured position
            const drawField = (key, text) => {
                const pos = config[key];
                if (pos && text) {
                    doc.fontSize(pos.fontSize || 16).text(String(text), pos.x, pos.y, { lineBreak: false });
                }
            };

            // ── Standard fields ───────────────────────────────────────────────
            drawField('UserName', user.UserName || user.name || '');
            drawField('Email', user.Email || user.email || '');
            drawField('CourseName', courseDoc.CourseName);
            drawField('startDate', order.OrderDate || '');
            drawField('endDate', new Date(order.updatedAt).toLocaleDateString());
            drawField('Level', courseDoc.Level || '');

            // Provider name
            drawField('Provider', providerName);

            // Provider logo
            if (logoFile && logoSubDir && config.ProviderLogo) {
                const pLogoPath = path.join(PUBLIC_DIR, logoSubDir, logoFile);
                if (fs.existsSync(pLogoPath)) {
                    const lc = config.ProviderLogo;
                    doc.image(pLogoPath, lc.x, lc.y, { width: lc.width, height: lc.height });
                }
            }

            // Company name + logo
            if (company) {
                drawField('Company', company.CompanyName);
                if (config.CompanyLogo && company.CompanyLogo) {
                    const cLogoPath = path.join(PUBLIC_DIR, 'CompanyLogos', company.CompanyLogo);
                    if (fs.existsSync(cLogoPath)) {
                        const lc = config.CompanyLogo;
                        doc.image(cLogoPath, lc.x, lc.y, { width: lc.width, height: lc.height });
                    }
                }
            }

            // ── Create & embed certificate token ──────────────────────────────
            const certPayload = {
                CourseId: order.CourseId,
                UserId: UserId,
                CourseName: courseDoc.CourseName,
                UserName: user.UserName || user.name || '',
                UserEmail: user.Email || user.email || '',
                IssuedAt: new Date().toISOString(),
            };
            const certJwt = jwt.sign(certPayload, process.env.ACCESS_TOKEN_SECRET);

            // Save certificate token record
            const certRecord = await new CertificateModel({
                companyId,
                CertificateToken: certJwt,
            }).save();

            // Embed certificate ID on the PDF
            if (config.CertificateId) {
                const cid = config.CertificateId;
                doc.fontSize(cid.fontSize || 10).text(certRecord._id.toString(), cid.x, cid.y, { lineBreak: false });
            }

            doc.end();

            // Wait for write to finish before responding
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            // Mark order as completed + save cert reference
            order.CourseCompleted = true;
            order.CertificatePath = outputPath;
            order.CertificateId = certRecord._id;
            order.valid = true;
            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Certificate generated successfully',
                CertificatePath: outputPath,
                CertificateId: certRecord._id,
            });

        } catch (err) {
            console.error('generateCertificate Error:', err);
            return res.status(err.status || 500).json({ message: err.message, success: false });
        }
    },


    downloadCertificate: async (req, res) => {
        try {
            const { orderId } = req.params;
            const UserId = req.user?.UserId;
            const companyId = req.user?.companyId;

            const order = await resolveOrder(orderId, UserId, companyId);

            if (!order.CertificatePath)
                return res.status(404).json({
                    success: false,
                    message: 'Certificate not generated yet. Call /generate first.',
                });

            if (!fs.existsSync(order.CertificatePath))
                return res.status(404).json({
                    success: false,
                    message: 'Certificate file missing from server. Please regenerate.',
                });

            const fileName = path.basename(order.CertificatePath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return fs.createReadStream(order.CertificatePath).pipe(res);

        } catch (err) {
            const status = err.status || 500;
            return res.status(status).json({ message: err.message, success: false });
        }
    },

    verifyCertificate: async (req, res) => {
        try {
            const certificateId = req.params.certificateId || req.body.CertificateId;
            const companyId = req.query.companyId || req.body.companyId;

            if (!certificateId)
                return res.status(400).json({ message: 'CertificateId is required', success: false });
            if (!companyId)
                return res.status(400).json({ message: 'companyId is required', success: false });

            if (!mongoose.isValidObjectId(certificateId))
                return res.status(400).json({ message: 'Invalid CertificateId format', success: false });

            const certRecord = await CertificateModel.findOne({
                _id: certificateId,
                companyId,
            });

            if (!certRecord)
                return res.status(404).json({
                    success: false,
                    message: 'Certificate not found. It may be invalid or belong to a different organisation.',
                });

            let payload;
            try {
                payload = jwt.verify(certRecord.CertificateToken, process.env.ACCESS_TOKEN_SECRET);
            } catch {
                return res.status(400).json({
                    success: false,
                    message: 'Certificate token is invalid or has been tampered with.',
                });
            }

            // Confirm the underlying order still exists and is valid
            const order = await CoachingOrder.findOne({
                CourseId: payload.CourseId,
                UserId: payload.UserId,
                companyId,
                PaymentStatus: 'Completed',
                CourseCompleted: true,
            });

            if (!order)
                return res.status(400).json({
                    success: false,
                    message: 'Certificate exists but the associated course order could not be verified.',
                });

            return res.status(200).json({
                success: true,
                message: 'Certificate is valid ✓',
                data: {
                    CertificateId: certRecord._id,
                    IssuedAt: certRecord.createdAt,
                    CourseName: payload.CourseName,
                    UserName: payload.UserName,
                    UserEmail: payload.UserEmail,
                    CourseId: payload.CourseId,
                },
            });

        } catch (err) {
            console.error('verifyCertificate Error:', err);
            return res.status(500).json({ message: err.message, success: false });
        }
    },
};