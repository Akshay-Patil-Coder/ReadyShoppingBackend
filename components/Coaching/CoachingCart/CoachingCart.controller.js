'use strict';

const mongoose = require('mongoose');
const https = require('https');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const PaytmChecksum = require('paytmchecksum');

const CoachingCourseOrder = require('../CoachingOrder/CoachingOrder.model');
const { CoachingCart, CoachingOrder } = require('./CoachingCart.model');
const { CoachingCourseModel, CoachingVideoModel } = require('../CoachingCourse/CoachingCourse.model');
const CompanyModel = require('../../CompanyBase/Company/Company.model');
const { User } = require('../../UserBase/User/User.model');

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
        if (c.IsActive !== false) {
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

            // Validate course existence
            const foundCourse = await CoachingCourseModel.findOne({
                _id: CourseId,
                companyId,
                isActive: true,
            });
            if (!foundCourse)
                return res.status(404).json({ message: 'Course not found', success: false });

            // Check if user already purchased this course
            const alreadyPurchased = await CoachingCourseOrder.findOne({
                UserId,
                companyId,
                CourseId,
                PaymentStatus: 'Completed',
            });
            if (alreadyPurchased)
                return res.status(400).json({ message: 'Course already purchased', success: false });

            // Load or create cart
            let cart = await CoachingCart.findOne({ UserId, companyId });
            if (!cart) cart = new CoachingCart({ UserId, companyId, Courses: [] });

            const existingIndex = cart.Courses.findIndex(
                (c) => c.CourseId.toString() === String(CourseId)
            );

            if (Operation === 'add') {
                const { total, discount, final } = calculateCourse(foundCourse);

                if (existingIndex !== -1) {
                    // Re-activate if it was soft-removed
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

            // Drop if already paid
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
                url: `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${process.env.PAYTM_MID}&orderId=${paytmOrderId}`,
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
};