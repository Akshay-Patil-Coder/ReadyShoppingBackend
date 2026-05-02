const { ObjectId } = require('mongodb');
const CoachingCourseOrder = require('./CoachingOrder.model');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken')
const { CoachingCourseModel, CoachingVideoModel, QuizModel } = require('../CoachingCourse/CoachingCourse.model');
const UserController = require('../user/user.model')
const CoachingCourseController = require('../CoachingCourse/CoachingCourse.controller')
const CompanyModel = require('../../CompanyBase/Company/Company.model')
const TransactionModel = require('../payment/transaction.model');
const fs = require('fs');

class CourseOrderService {
    constructor() {
    }



    async deleteData(req, resp) {
        try {
            // let { id } = req.params;
            let { UserId, courseId } = req.body;
            let companyId = req.query.companyId;

            let course = await CoachingCourseOrder.findById(id)

            if (!course) {
                return res.status(404).json({ success: false, message: "Course not Found" })
            }

            let result = await CoachingCourseOrder.deleteOne({ _id: courseId, UserId: UserId, companyId, companyId })
            if (!result) {
                res.status(400).json({ success: false, message: "Course not deleted" })
            }

            res.status(200).json({ success: true, message: "Course deleted", data: result })

        } catch (error) {
            console.log("error", error)
            res.status(500).json({ success: false, message: "Something Went Wrong", error: error.message })
        }
    }





    async addCoachingCourseOrder(req, res) {
        try {
            let { UserId, CourseId, companyId, TotalAmount, OfferPercentage } = req.body
            if (!UserId || !CourseId || !companyId || !TotalAmount || !OfferPercentage) {
                throw new Error('please provide valid data')
            }
            let existingCourse = await CoachingCourseModel.findOne({ _id: CourseId })
            if (!existingCourse) {
                throw new Error('course not found')
            }
            else {

                let CourseData = {
                    companyId: companyId,
                    UserId: UserId,
                    CourseId: CourseId,
                    TotalAmount: TotalAmount,
                    OfferPercentage: OfferPercentage,
                }


                if (existingCourse.CourseContent || existingCourse.CourseContent.length !== 0 || existingCourse.CourseContent[0].CourseData.length !== 0) {
                    let PlayList = [];
                    for (let EachPlaylist of existingCourse.CourseContent) {
                        let VideoIds = [];
                        let QuizData = [];
                        let PlayListData = {
                            Heading: EachPlaylist.Heading,
                            PlayListId: EachPlaylist._id
                        }
                        for (let EachVideoId of EachPlaylist.CourseData) {
                            let VideoData = {
                                VideoId: EachVideoId
                            }
                            let findedVideo = await CoachingVideoModel.findOne({ _id: EachVideoId })
                            if (findedVideo.Quizes) {
                                findedVideo.Quizes.forEach((EachQuizId) => {
                                    let EachQuiz = {
                                        QuizId: EachQuizId
                                    }
                                    QuizData.push(EachQuiz)
                                })
                            }
                            VideoData.QuizData = QuizData
                            QuizData = [];
                            VideoIds.push(VideoData)
                        }
                        PlayListData.VideoData = VideoIds
                        PlayList.push(PlayListData)
                    }
                    CourseData.CourseContent = PlayList
                    let token = jwt.sign({ CourseId: CourseId, UserId: UserId }, 'secret-for-now')
                    CourseData.TokenOfCourse = token
                    let result = new CoachingCourseOrder(CourseData)

                    result = await result.save();
                    if (!result) {
                        return res.status(400).json({ message: 'Data not added something went wrong', success: false })
                    }
                    return res.status(200).json({ data: result, success: true });

                }

            }


            if (existingCourse.CourseContent || existingCourse.CourseContent.length !== 0 || existingCourse.CourseContent[0].CourseData.length !== 0) {
                let PlayList = [];
                for (let EachPlaylist of existingCourse.CourseContent) {
                    let VideoIds = [];
                    let QuizData = [];
                    let PlayListData = {
                        Heading: EachPlaylist.Heading,
                        PlayListId: EachPlaylist._id
                    }
                    for (let EachVideoId of EachPlaylist.CourseData) {
                        let VideoData = {
                            VideoId: EachVideoId
                        }
                        let findedVideo = await CoachingVideoModel.findOne({ _id: EachVideoId })
                        if (findedVideo.Quizes) {
                            findedVideo.Quizes.forEach((EachQuizId) => {
                                let EachQuiz = {
                                    QuizId: EachQuizId
                                }
                                QuizData.push(EachQuiz)
                            })
                        }
                        VideoData.QuizData = QuizData
                        QuizData = [];
                        VideoIds.push(VideoData)
                    }
                    PlayListData.VideoData = VideoIds
                    PlayList.push(PlayListData)
                }
                CourseData.CourseContent = PlayList
                let token = jwt.sign({ CourseId: CourseId, UserId: UserId }, process.env.ACCESS_TOKEN_SECRET)
                CourseData.TokenOfCourse = token
                let result = new CoachingCourseOrder(CourseData)
                result = await result.save();
                if (!result) {
                    return res.status(400).json({ message: 'Data not added something went wrong', success: false })
                }
                return res.status(200).json({ data: result, success: true });

            }


        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                error: error.message,
                success: false
            });
        }
    }
    async getCoachingCourseOrderData(matchCondition) {
        let result = await CoachingCourseOrder.aggregate([
            { $match: matchCondition },
            { $unwind: { path: "$CourseContent", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$CourseContent.VideoData", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$CourseContent.VideoData.QuizData", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "coachingvideos",
                    localField: "CourseContent.VideoData.VideoId",
                    foreignField: "_id",
                    as: "CourseContent.VideoData.VideoInfo"
                }
            },

            {
                $lookup: {
                    from: "Coursequizes",
                    localField: "CourseContent.VideoData.QuizData.QuizId",
                    foreignField: "_id",
                    as: "CourseContent.VideoData.QuizData.QuizInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingCourses",
                    localField: "CourseId",
                    foreignField: "_id",
                    as: "CourseData"
                }
            },
            {
                $group: {
                    _id: {
                        orderId: "$_id",
                        CourseHeading: "$CourseContent.Heading",
                        VideoId: "$CourseContent.VideoData.VideoId"
                    },
                    QuizData: { $push: "$CourseContent.VideoData.QuizData" },
                    VideoCompleted: { $first: "$CourseContent.VideoData.VideoCompleted" },
                    VideoInfo: { $first: "$CourseContent.VideoData.VideoInfo" },
                    baseDoc: { $first: "$$ROOT" }
                }
            },

            {
                $group: {
                    _id: {
                        orderId: "$_id.orderId",
                        CourseHeading: "$_id.CourseHeading"
                    },
                    Videos: {
                        $push: {
                            VideoId: "$_id.VideoId",
                            VideoCompleted: "$VideoCompleted",
                            VideoInfo: "$VideoInfo",
                            QuizData: "$QuizData"
                        }
                    },
                    baseDoc: { $first: "$baseDoc" }
                }
            },

            {
                $group: {
                    _id: "$_id.orderId",
                    CourseContent: {
                        $push: {
                            Heading: "$_id.CourseHeading",
                            VideoData: "$Videos",
                            CourseDuration: "$_id.CourseDuration",
                            CourseName: "$_id.CourseName",
                            CourseThumbnail: "$_id.CourseThumbnail"
                        }
                    },
                    baseDoc: { $first: "$baseDoc" }
                }
            },

            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: ["$baseDoc", { CourseContent: "$CourseContent" }]
                    }
                }
            },
            {
                $sort: { _id: -1 } 
            },
            {
                $limit: 1         
            }
        ]);

        if (result) {
            let CourseInfo = await Promise.all(result.map(async (EachResult) => {
                let data = await CoachingCourseController.getCoachingCourseData({ _id: EachResult.CourseId });
                return data;
            }));

            result = result.map((EachCourse) => {
                return {
                    ...EachCourse,
                    CourseInfo: CourseInfo.filter((EachData) => EachData._id === EachCourse.CourseId)
                };
            });

            return result;
        }
    }


    async getCoachingCourseOrder(req, res) {
        let { CourseId, UserId, companyId } = req.query;
        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (CourseId) {
                if (!mongoose.Types.ObjectId.isValid(CourseId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.CourseId = mongoose.Types.ObjectId.createFromHexString(CourseId)
            }
            if (UserId) {
                if (!mongoose.Types.ObjectId.isValid(UserId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.UserId = mongoose.Types.ObjectId.createFromHexString(UserId)
            }

            const data = await this.getCoachingCourseOrderData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Course Found', success: false });
            }
            return res.status(200).json({ data: data, success: true });

        }
        catch (error) {
            console.error(error);
            return res.status(400).json({ error: error.message, success: false });
        }
    }
    async updateCoachingPaymentStatus(req, resp) {
        try {
            let { TokenOfPayment } = req.body
            if (!TokenOfPayment) {
                return resp.status(400).json({ message: "Please Provide Token Of Payment", success: false })
            }
            let TokenData = jwt.verify(TokenOfPayment, process.env.ACCESS_TOKEN_SECRET)
            let findedCourse = await CoachingCourseOrder.findOne({ CourseId: TokenData.CourseId, UserId: TokenData.UserId })
            if (!findedCourse) {
                return resp.status(400).json({ message: "Course Not Found", success: false })
            }
            let FindedTransaction = await TransactionModel.default.findOne({ _id: PaymentId })
            if (!FindedTransaction) {
                return resp.status(400).json({ message: "Transaction Detail Not Found", success: false })
            }
            let updateStatus = await CoachingCourseOrder.findOneAndUpdate({
                _id: TokenData.CourseId, UserId: TokenData.UserId
            },
                {

                    $set: { PaymentStatus: findedCourse.status }
                },
                {

                    $set: { PaymentStatus: findedCourse.status }
                },
                {
                    new: true
                }
            )
            if (updateStatus) {
                return resp.status(200).json({ message: 'Transaction Status Updated', Staus: updateStatus.PaymentStatus, success: true })
            }
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });

        }
    }
    async getTokenOfCourse(req, resp) {
        try {
            let { UserId, companyId, CourseId } = req.body
            if (!companyId || !UserId || !CourseId) {
                return resp.status(400).json({ message: 'please provide valid data', success: false })
            }
            let findedCourse = await CoachingCourseOrder.findOne({
                companyId, UserId, CourseId
            })
            if (!findedCourse) {
                return resp.status(400).json({ message: "Course Not Found", success: false })
            }
            resp.status(200).json({ message: "token founded", TokenOfCourse: findedCourse.TokenOfCourse, success: true })
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });

        }
    }
    async changeStateOfCourseContent(req, resp) {
        try {
            let { QuizId, companyId, PlayListId, VideoId, UserId, CourseId } = req.body;
            if (!companyId || !UserId || !CourseId) {
                return resp.status(400).json({ message: 'please provide valid data', success: false })
            }
            let findedCourse = await CoachingCourseOrder.findOne({
                companyId, UserId, CourseId
            })
            if (!findedCourse) {
                return resp.status(400), json({ message: "Course not found", success: false })
            }
            if (QuizId && PlayListId && VideoId) {
                let orderDoc = await CoachingCourseOrder.findOne({
                    companyId,
                    UserId,
                    CourseId
                });

                if (!orderDoc) {
                    return resp.status(404).json({ message: 'order not found', success: false });
                }

                orderDoc.CourseContent.forEach((content) => {
                    if (content.PlayListId == PlayListId) {
                        content.VideoData.forEach((video) => {
                            if (video.VideoId == VideoId) {
                                video.QuizData.forEach((quiz) => {
                                    if (quiz.QuizId == QuizId) {
                                        quiz.QuizCompleted = true;
                                    }
                                });
                            }
                        });
                    }
                });

                await orderDoc.save();

                resp.status(200).json({ message: 'data updated', data: orderDoc, success: true });

            }
            else if (PlayListId && VideoId) {
                let orderDoc = await CoachingCourseOrder.findOne({
                    companyId,
                    UserId,
                    CourseId
                });

                if (!orderDoc) {
                    return resp.status(404).json({ message: 'order not found', success: false });
                }

                orderDoc.CourseContent.forEach((content) => {
                    if (content.PlayListId == PlayListId) {
                        content.VideoData.forEach((video) => {
                            if (video.VideoId == VideoId) {
                                video.VideoCompleted = true

                            }
                        });
                    }
                });

                await orderDoc.save();

                resp.status(200).json({ message: 'data updated', data: orderDoc, success: true });
            }
            else if (PlayListId) {
                let orderDoc = await CoachingCourseOrder.findOne({
                    companyId,
                    UserId,
                    CourseId
                });

                if (!orderDoc) {
                    return resp.status(404).json({ message: 'order not found', success: false });
                }

                orderDoc.CourseContent.forEach((content) => {
                    if (content.PlayListId == PlayListId) {
                        content.PlayListCompleted = true;
                    }
                });

                await orderDoc.save();

                resp.status(200).json({ message: 'data updated', data: orderDoc, success: true });
            }

        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });

        }
    }

    async generateCoachingCertificate(req, resp) {
        try {
            const { UserId, CourseId, companyId } = req.body;
            if (!UserId || !CourseId || !companyId) {
                return resp.status(400).json({ message: 'Please provide valid data', success: false });
            }

            const courseOrder = await CoachingCourseOrder.findOne({ UserId, CourseId, companyId });
            if (!courseOrder) {
                return resp.status(404).json({ message: 'Course order not found', success: false });
            }
            if (!courseOrder.TokenOfCourse) {
                return resp.status(404).json({ message: 'Course Token Not Found', success: false });
            }
            let TokenData = jwt.verify(courseOrder.TokenOfCourse, process.env.ACCESS_TOKEN_SECRET)
            if (!TokenData) {
                return resp.status(404).json({ message: 'Course Token Not Verified', success: false });

            }
            if (TokenData.Status !== 'Completed') {
                return resp.status(404).json({ message: 'Your Payment Is Not Completed', success: false });
            }
            let allVideosCompleted = true, allQuizzesCompleted = true, allPlaylistsCompleted = true;
            courseOrder.PlayLists.forEach((playlist) => {
                if (!playlist.PlayListCompleted) allPlaylistsCompleted = false;
                playlist.VideoData.forEach((video) => {
                    if (!video.VideoCompleted) allVideosCompleted = false;
                    video.QuizData.forEach((quiz) => {
                        if (!quiz.QuizCompleted) allQuizzesCompleted = false;
                    });
                });
            });

            if (!(allVideosCompleted && allQuizzesCompleted && allPlaylistsCompleted)) {
                return resp.status(400).json({ message: 'Course not yet completed', success: false });
            }

            await CoachingCourseOrder.findOneAndUpdate(
                { UserId, CourseId, companyId },
                { $set: { CourseCompleted: true } },
                { new: true }
            );

            const matchCondition = { companyId, _id: CourseId };
            const OriginalCourseData = await CoachingCourseController.getCoachingCourseData(matchCondition);
            const user = await UserController.default.findOne({ _id: UserId });
            if (!OriginalCourseData || !user) {
                return resp.status(404).json({ message: 'Course or User not found', success: false });
            }

            if (!OriginalCourseData.config) {
                return resp.status(404).json({ message: 'Certificate template config not found', success: false });
            }

            const config = OriginalCourseData.config;
            const templatePath = path.join(__dirname, '..', '..', 'public', `${OriginalCourseData.CourseName}-${OriginalCourseData.ProviderId}`, 'Certificate', OriginalCourseData.Certificate);
            const { width, height } = sizeOf(templatePath);
            const doc = new PDFDocument({ size: [width, height], margin: 0 });
            const filePath = path.join(__dirname, '..', '..', 'public', 'MyCertificate', `${OriginalCourseData.CourseName}-${CourseId}-${UserId.replace(/\s+/g, '_')}.pdf`);
            doc.pipe(fs.createWriteStream(filePath));

            doc.image(templatePath, 0, 0, { width, height }).fillColor('black');

            for (const [key, pos] of Object.entries(config.fields)) {
                if (user[key]) {
                    doc.fontSize(pos.fontSize).text(user[key], pos.x, pos.y, { lineBreak: false });
                } else if (key === 'startDate') {
                    doc.fontSize(pos.fontSize).text(courseOrder.OrderDate, pos.x, pos.y, { lineBreak: false });
                } else if (key === 'endDate') {
                    const endDate = new Date(courseOrder.updatedAt).toLocaleDateString();
                    doc.fontSize(pos.fontSize).text(endDate, pos.x, pos.y, { lineBreak: false });
                } else if (key === 'Company') {
                    const company = await CompanyModel.findOne({ _id: companyId });
                    if (company) {
                        doc.fontSize(pos.fontSize).text(company.CompanyName, pos.x, pos.y, { lineBreak: false });

                        const logoPath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', company.CompanyLogo);
                        if (fs.existsSync(logoPath)) {
                            const logoConfig = config.CompanyLogo;
                            doc.image(logoPath, logoConfig.x, logoConfig.y, { width: logoConfig.width, height: logoConfig.height });
                        }
                    }
                } else if (key === 'Provider') {

                    if (OriginalCourseData.ProviderInfo[0]) {
                        let logoPath
                        if (OriginalCourseData.ProviderTypeValue.CourseProviderType == 'Tutor') {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', OriginalCourseData.ProviderInfo[0].TutorImage);
                            doc.fontSize(pos.fontSize).text(OriginalCourseData.ProviderInfo[0].TutorName, pos.x, pos.y, { lineBreak: false });
                        }
                        if (OriginalCourseData.ProviderTypeValue.CourseProviderType == 'Class') {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', OriginalCourseData.ProviderTypeValue[0].ClassLogo);
                            doc.fontSize(pos.fontSize).text(OriginalCourseData.ProviderInfo[0].ClassName, pos.x, pos.y, { lineBreak: false });
                        }
                        if (OriginalCourseData.ProviderTypeValue.CourseProviderType == 'Company') {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', OriginalCourseData.ProviderTypeValue[0].CourseCompanyLogo);
                            doc.fontSize(pos.fontSize).text(OriginalCourseData.ProviderInfo[0].CourseCompanyName, pos.x, pos.y, { lineBreak: false });
                        }
                        if (OriginalCourseData.ProviderTypeValue.CourseProviderType == 'University') {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', OriginalCourseData.ProviderTypeValue[0].UniversityLogo);
                            doc.fontSize(pos.fontSize).text(OriginalCourseData.ProviderInfo[0].UniversityName, pos.x, pos.y, { lineBreak: false });

                        }

                        if (fs.existsSync(logoPath)) {
                            const logoConfig = config.ProviderLogo;
                            doc.image(logoPath, logoConfig.x, logoConfig.y, { width: logoConfig.width, height: logoConfig.height });
                        }

                    }
                }

                const courseOrder = await CoachingCourseOrder.findOne({ UserId, CourseId, companyId });
                if (!courseOrder) {
                    return resp.status(404).json({ message: 'Course order not found', success: false });
                }
                if (!courseOrder.TokenOfCourse) {
                    return resp.status(404).json({ message: 'Course Token Not Found', success: false });
                }
                let TokenData = jwt.verify(courseOrder.TokenOfCourse, 'secret-for-now')
                if (!TokenData) {
                    return resp.status(404).json({ message: 'Course Token Not Verified', success: false });

                }
                if (TokenData.Status !== 'Completed') {
                    return resp.status(404).json({ message: 'Your Payment Is Not Completed', success: false });
                }
                let allVideosCompleted = true, allQuizzesCompleted = true, allPlaylistsCompleted = true;
                courseOrder.PlayLists.forEach((playlist) => {
                    if (!playlist.PlayListCompleted) allPlaylistsCompleted = false;
                    playlist.VideoData.forEach((video) => {
                        if (!video.VideoCompleted) allVideosCompleted = false;
                        video.QuizData.forEach((quiz) => {
                            if (!quiz.QuizCompleted) allQuizzesCompleted = false;
                        });
                    });
                });

                if (!(allVideosCompleted && allQuizzesCompleted && allPlaylistsCompleted)) {
                    return resp.status(400).json({ message: 'Course not yet completed', success: false });
                }

                await CoachingCourseOrder.findOneAndUpdate(
                    { UserId, CourseId, companyId },
                    { $set: { CourseCompleted: true } },
                    { new: true }
                );

                const matchCondition = { companyId, _id: CourseId };
                const OriginalCourseData = await CoachingCourseController.getCoachingCourseData(matchCondition);
                const user = await UserController.default.findOne({ _id: UserId });
                if (!OriginalCourseData || !user) {
                    return resp.status(404).json({ message: 'Course or User not found', success: false });
                }

                if (!OriginalCourseData.config) {
                    return resp.status(404).json({ message: 'Certificate template config not found', success: false });
                }

                const config = OriginalCourseData.config;
                const templatePath = path.join(__dirname, '..', '..', 'public', `${OriginalCourseData.CourseName}-${OriginalCourseData.ProviderId}`, 'Certificate', OriginalCourseData.Certificate);
                const { width, height } = sizeOf(templatePath);
                const doc = new PDFDocument({ size: [width, height], margin: 0 });
                const filePath = path.join(__dirname, '..', '..', 'public', 'MyCertificate', `${OriginalCourseData.CourseName}-${CourseId}-${UserId.replace(/\s+/g, '_')}.pdf`);
                doc.pipe(fs.createWriteStream(filePath));

                doc.image(templatePath, 0, 0, { width, height }).fillColor('black');

                for (const [key, pos] of Object.entries(config.fields)) {
                    if (user[key]) {
                        doc.fontSize(pos.fontSize).text(user[key], pos.x, pos.y, { lineBreak: false });
                    } else if (key === 'startDate') {
                        doc.fontSize(pos.fontSize).text(courseOrder.OrderDate, pos.x, pos.y, { lineBreak: false });
                    } else if (key === 'endDate') {
                        const endDate = new Date(courseOrder.updatedAt).toLocaleDateString();
                        doc.fontSize(pos.fontSize).text(endDate, pos.x, pos.y, { lineBreak: false });
                    } else if (key === 'Company') {
                        const company = await CompanyModel.findOne({ _id: companyId });
                        if (company) {
                            doc.fontSize(pos.fontSize).text(company.CompanyName, pos.x, pos.y, { lineBreak: false });

                            const logoPath = path.join(__dirname, '..', '..', 'public', 'CompanyLogos', company.CompanyLogo);
                            if (fs.existsSync(logoPath)) {
                                const logoConfig = config.CompanyLogo;
                                doc.image(logoPath, logoConfig.x, logoConfig.y, { width: logoConfig.width, height: logoConfig.height });
                            }
                        }
                    } else if (key === 'Provider') {

                        if (OriginalCourseData.ProviderInfo[0]) {
                            let logoPath
                            if (OriginalCourseData.ProviderTypeValue.CourseProviderType == 'Tutor') {
                                logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', OriginalCourseData.ProviderInfo[0].TutorImage);
                                doc.fontSize(pos.fontSize).text(OriginalCourseData.ProviderInfo[0].TutorName, pos.x, pos.y, { lineBreak: false });
                            }
                            if (OriginalCourseData.ProviderTypeValue.CourseProviderType == 'Class') {
                                logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', OriginalCourseData.ProviderTypeValue[0].ClassLogo);
                                doc.fontSize(pos.fontSize).text(OriginalCourseData.ProviderInfo[0].ClassName, pos.x, pos.y, { lineBreak: false });
                            }
                            if (OriginalCourseData.ProviderTypeValue.CourseProviderType == 'Company') {
                                logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', OriginalCourseData.ProviderTypeValue[0].CourseCompanyLogo);
                                doc.fontSize(pos.fontSize).text(OriginalCourseData.ProviderInfo[0].CourseCompanyName, pos.x, pos.y, { lineBreak: false });
                            }
                            if (OriginalCourseData.ProviderTypeValue.CourseProviderType == 'University') {
                                logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', OriginalCourseData.ProviderTypeValue[0].UniversityLogo);
                                doc.fontSize(pos.fontSize).text(OriginalCourseData.ProviderInfo[0].UniversityName, pos.x, pos.y, { lineBreak: false });

                            }

                            if (fs.existsSync(logoPath)) {
                                const logoConfig = config.ProviderLogo;
                                doc.image(logoPath, logoConfig.x, logoConfig.y, { width: logoConfig.width, height: logoConfig.height });
                            }

                        }
                    }

                }

                if (OriginalCourseData.ConnectedInfo) {
                    const logoDirArr = [];
                    OriginalCourseData.ConnectedInfo.forEach((conn) => {
                        let logoPath;
                        if (conn.TutorImage) {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', conn.TutorImage);
                        } else if (conn.ClassLogo) {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', conn.ClassLogo);
                        } else if (conn.UniversityLogo) {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', conn.UniversityLogo);
                        } else if (conn.CourseCompanyLogo) {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', conn.CourseCompanyLogo);
                        }
                        if (fs.existsSync(logoPath)) logoDirArr.push(logoPath);
                    });

                    if (config.logoRow && logoDirArr.length > 0) {
                        const { x, y, width: rowWidth, height: rowHeight } = config.logoRow;
                        const spacing = 10;
                        const logoWidth = (rowWidth - spacing * (logoDirArr.length - 1)) / logoDirArr.length;

                        logoDirArr.forEach((logo, index) => {
                            const posX = x + index * (logoWidth + spacing);
                            doc.image(logo, posX, y, { width: logoWidth, height: rowHeight });
                        });
                    }
                }
                const token = jwt.sign({ CourseId: CourseId, UserId: UserId, CourseName: OriginalCourseData.CourseName, UserName: user.name, UserEmail: user.email, UserPhone: user.phone });
                let dataOfCertificate = {
                    companyId: companyId,
                    CertificateToken: token
                }
                let savedToken = new CoachingCourseOrder.CertificateModel(dataOfCertificate)
                savedToken = await savedToken.save();
                let CertificateConfig = config.fields.CertificateId
                doc.fontSize(CertificateConfig.fontSize).text(savedToken._id, CertificateConfig.x, CertificateConfig.y, { lineBreak: false });
                return resp.json({ success: true, file: filePath });
            }

        } catch (error) {
            console.error(error);
            return resp.status(500).json({ message: 'Server error', error: error.message, success: false });
        }
    }
    async verifyCertificate(req, resp) {
        try {
            let { companyId, CertificateId } = req.body;
            if (!companyId || !CertificateId) {
                return resp.status(400).json({ message: 'please provide certificate id or compnay id', success: false })
            }
            let FindCertificate = await CoachingCourseOrder.CertificateModel.findOne({ companyId: companyId, _id: CertificateId })
            if (!FindCertificate) {
                return resp.status(400).json({ message: 'certificate not found', success: false })
            }
            if (FindCertificate.CertificateToken) {
                let CertiFicateData = jwt.verify(FindCertificate.CertificateToken, process.env.ACCESS_TOKEN_SECRET)
                if (!CertiFicateData) {
                    return resp.status(400).json({ message: 'certificate data not found or token not vbe verified', success: false })
                }
                let FindCertificate = await CoachingCourseOrder.CertificateModel.findOne({ companyId: companyId, _id: CertificateId })
                if (!FindCertificate) {
                    return resp.status(400).json({ message: 'certificate not found', success: false })
                }
                if (FindCertificate.CertificateToken) {
                    let CertiFicateData = jwt.verify(FindCertificate.CertificateToken, 'secret-for-now')
                    if (!CertiFicateData) {
                        return resp.status(400).json({ message: 'certificate data not found or token not vbe verified', success: false })
                    }
                    return resp.status(200).json({ data: CertiFicateData, success: true, message: "certificated data fetched successfully" })
                }
            }
        } catch (error) {
            console.error(error);
            return resp.status(500).json({ message: 'Server error', error: error.message, success: false });
        }
    }
}

module.exports = new CourseOrderService();