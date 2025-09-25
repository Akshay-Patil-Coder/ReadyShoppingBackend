const { ObjectId } = require('mongodb');
const CoachingCourceOrder = require('./CoachingOrder.model');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken')
const { CoachingCourceModel, CoachingVideoModel, QuizModel } = require('../CoachingCource/CoachingCource.model');
const UserController = require('../user/user.model')
const CoachingCourceController = require('../CoachingCource/CoachingCource.controller')
const CompanyModel = require('../../CompanyBase/Company/Company.model')
const TransactionModel = require('../payment/transaction.model');
const fs = require('fs');

class CourseOrderService {
    constructor() {
    }



    async deleteData(req, resp) {
        console.log("^^^^^^^", req.body)
        try {
            // let { id } = req.params;
            let { UserId, courseId } = req.body;
            let companyId = req.query.companyId;

            let course = await CoachingCourceOrder.findById(id)

            if (!course) {
                return res.status(404).json({ success: false, message: "Course not Found" })
            }

            let result = await CoachingCourceOrder.deleteOne({ _id: courseId, UserId: UserId, companyId, companyId })
            console.log("result", result)
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
        console.log("xxxxxxxxxxxxxx", req.body)
        try {
            let { UserId, CourceId, companyId, TotalAmount, OfferPercentage } = req.body
            //  UserId    CourceId   companyId  TotalAmount  OfferPercentage
            if (!UserId || !CourceId || !companyId || !TotalAmount || !OfferPercentage) {
                throw new Error('please provide valid data')
            }
            let existingCource = await CoachingCourceModel.findOne({ _id: CourceId })
            if (!existingCource) {
                throw new Error('course not found')
            }
            else {

                let CourceData = {
                    companyId: companyId,
                    UserId: UserId,
                    CourceId: CourceId,
                    TotalAmount: TotalAmount,
                    OfferPercentage: OfferPercentage,
                }


                if (existingCource.CourceContent || existingCource.CourceContent.length !== 0 || existingCource.CourceContent[0].CourceData.length !== 0) {
                    let PlayList = [];
                    for (let EachPlaylist of existingCource.CourceContent) {
                        let VideoIds = [];
                        let QuizData = [];
                        let PlayListData = {
                            Heading: EachPlaylist.Heading,
                            PlayListId: EachPlaylist._id
                        }
                        for (let EachVideoId of EachPlaylist.CourceData) {
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
                    CourceData.CourceContent = PlayList
                    let token = jwt.sign({ CourceId: CourceId, UserId: UserId }, 'secret-for-now')
                    CourceData.TokenOfCource = token
                    console.log("vvvvvvvvvv", token)
                    let result = new CoachingCourceOrder(CourceData)
                    console.log("vvvvvvvvvv", result)

                    result = await result.save();
                    if (!result) {
                        return res.status(400).json({ message: 'Data not added something went wrong', success: false })
                    }
                    console.log("rrrrrrrrrrrrrrrrr", result)
                    return res.status(200).json({ data: result, success: true });

                }

            }


            if (existingCource.CourceContent || existingCource.CourceContent.length !== 0 || existingCource.CourceContent[0].CourceData.length !== 0) {
                let PlayList = [];
                for (let EachPlaylist of existingCource.CourceContent) {
                    let VideoIds = [];
                    let QuizData = [];
                    let PlayListData = {
                        Heading: EachPlaylist.Heading,
                        PlayListId: EachPlaylist._id
                    }
                    for (let EachVideoId of EachPlaylist.CourceData) {
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
                CourceData.CourceContent = PlayList
                let token = jwt.sign({ CourceId: CourceId, UserId: UserId }, process.env.ACCESS_TOKEN_SECRET)
                CourceData.TokenOfCource = token
                let result = new CoachingCourceOrder(CourceData)
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
    async getCoachingCourceOrderData(matchCondition) {
        let result = await CoachingCourceOrder.aggregate([
            { $match: matchCondition },
            { $unwind: { path: "$CourceContent", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$CourceContent.VideoData", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$CourceContent.VideoData.QuizData", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "coachingvideos",
                    localField: "CourceContent.VideoData.VideoId",
                    foreignField: "_id",
                    as: "CourceContent.VideoData.VideoInfo"
                }
            },

            {
                $lookup: {
                    from: "courcequizes",
                    localField: "CourceContent.VideoData.QuizData.QuizId",
                    foreignField: "_id",
                    as: "CourceContent.VideoData.QuizData.QuizInfo"
                }
            },
            //pri
            {
                $lookup: {
                    from: "coachingcources",
                    localField: "CourceId",
                    foreignField: "_id",
                    as: "CourceData"
                }
            },
            //
            {
                $group: {
                    _id: {
                        orderId: "$_id",
                        CourceHeading: "$CourceContent.Heading",
                        VideoId: "$CourceContent.VideoData.VideoId"
                    },
                    QuizData: { $push: "$CourceContent.VideoData.QuizData" },
                    VideoCompleted: { $first: "$CourceContent.VideoData.VideoCompleted" },
                    VideoInfo: { $first: "$CourceContent.VideoData.VideoInfo" },
                    baseDoc: { $first: "$$ROOT" }
                }
            },

            {
                $group: {
                    _id: {
                        orderId: "$_id.orderId",
                        CourceHeading: "$_id.CourceHeading"
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
                    CourceContent: {
                        $push: {
                            Heading: "$_id.CourceHeading",
                            VideoData: "$Videos",
                            //pri
                            CourceDuration: "$_id.CourceDuration",
                            CourceName: "$_id.CourceName",
                            CourceThumbnail: "$_id.CourceThumbnail"
                            //
                        }
                    },
                    baseDoc: { $first: "$baseDoc" }
                }
            },

            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: ["$baseDoc", { CourceContent: "$CourceContent" }]
                    }
                }
            },
            //pri
            {
                $sort: { _id: -1 } // <-- add this
            },
            {
                $limit: 1          // <-- and this
            }
            //
        ]);

        console.log("bbbbbbbbbbbbbb", result)
        if (result) {
            let CourceInfo = await Promise.all(result.map(async (EachResult) => {
                let data = await CoachingCourceController.getCoachingCourceData({ _id: EachResult.CourceId });
                return data;
            }));

            result = result.map((EachCource) => {
                return {
                    ...EachCource,
                    CourceInfo: CourceInfo.filter((EachData) => EachData._id === EachCource.CourceId)
                };
            });

            return result;
        }
    }


    async getCoachingCourceOrder(req, res) {
        let { CourseId, UserId, companyId } = req.query;
        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (CourseId) {
                if (!mongoose.Types.ObjectId.isValid(CourseId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.CourceId = mongoose.Types.ObjectId.createFromHexString(CourseId)
            }
            if (UserId) {
                if (!mongoose.Types.ObjectId.isValid(UserId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.UserId = mongoose.Types.ObjectId.createFromHexString(UserId)
            }

            const data = await this.getCoachingCourceOrderData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Cource Found', success: false });
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
            let findedCource = await CoachingCourceOrder.findOne({ CourceId: TokenData.CourceId, UserId: TokenData.UserId })
            if (!findedCource) {
                return resp.status(400).json({ message: "Course Not Found", success: false })
            }
            let FindedTransaction = await TransactionModel.default.findOne({ _id: PaymentId })
            if (!FindedTransaction) {
                return resp.status(400).json({ message: "Transaction Detail Not Found", success: false })
            }
            let updateStatus = await CoachingCourceOrder.findOneAndUpdate({
                _id: TokenData.CourceId, UserId: TokenData.UserId
            },
                {

                    $set: { PaymentStatus: findedCource.status }
                },
                {

                    $set: { PaymentStatus: findedCource.status }
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
    async getTokenOfCource(req, resp) {
        try {
            let { UserId, companyId, CourceId } = req.body
            if (!companyId || !UserId || !CourceId) {
                return resp.status(400).json({ message: 'please provide valid data', success: false })
            }
            let findedCource = await CoachingCourceOrder.findOne({
                companyId, UserId, CourceId
            })
            if (!findedCource) {
                return resp.status(400).json({ message: "Course Not Found", success: false })
            }
            resp.status(200).json({ message: "token founded", TokenOfCource: findedCource.TokenOfCource, success: true })
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });

        }
    }
    async changeStateOfCourceContent(req, resp) {
        try {
            let { QuizId, companyId, PlayListId, VideoId, UserId, CourceId } = req.body;
            if (!companyId || !UserId || !CourceId) {
                return resp.status(400).json({ message: 'please provide valid data', success: false })
            }
            let findedCource = await CoachingCourceOrder.findOne({
                companyId, UserId, CourceId
            })
            if (!findedCource) {
                return resp.status(400), json({ message: "Course not found", success: false })
            }
            if (QuizId && PlayListId && VideoId) {
                let orderDoc = await CoachingCourceOrder.findOne({
                    companyId,
                    UserId,
                    CourceId
                });

                if (!orderDoc) {
                    return resp.status(404).json({ message: 'order not found', success: false });
                }

                orderDoc.CourceContent.forEach((content) => {
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
                let orderDoc = await CoachingCourceOrder.findOne({
                    companyId,
                    UserId,
                    CourceId
                });

                if (!orderDoc) {
                    return resp.status(404).json({ message: 'order not found', success: false });
                }

                orderDoc.CourceContent.forEach((content) => {
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
                let orderDoc = await CoachingCourceOrder.findOne({
                    companyId,
                    UserId,
                    CourceId
                });

                if (!orderDoc) {
                    return resp.status(404).json({ message: 'order not found', success: false });
                }

                orderDoc.CourceContent.forEach((content) => {
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
            const { UserId, CourceId, companyId } = req.body;
            if (!UserId || !CourceId || !companyId) {
                return resp.status(400).json({ message: 'Please provide valid data', success: false });
            }

            const courseOrder = await CoachingCourceOrder.findOne({ UserId, CourceId, companyId });
            if (!courseOrder) {
                return resp.status(404).json({ message: 'Course order not found', success: false });
            }
            if (!courseOrder.TokenOfCource) {
                return resp.status(404).json({ message: 'Course Token Not Found', success: false });
            }
            let TokenData = jwt.verify(courseOrder.TokenOfCource, process.env.ACCESS_TOKEN_SECRET)
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

            await CoachingCourceOrder.findOneAndUpdate(
                { UserId, CourceId, companyId },
                { $set: { CourceCompleted: true } },
                { new: true }
            );

            const matchCondition = { companyId, _id: CourceId };
            const OriginalCourceData = await CoachingCourceController.getCoachingCourceData(matchCondition);
            const user = await UserController.default.findOne({ _id: UserId });
            if (!OriginalCourceData || !user) {
                return resp.status(404).json({ message: 'Course or User not found', success: false });
            }

            if (!OriginalCourceData.config) {
                return resp.status(404).json({ message: 'Certificate template config not found', success: false });
            }

            const config = OriginalCourceData.config;
            const templatePath = path.join(__dirname, '..', '..', 'public', `${OriginalCourceData.CourceName}-${OriginalCourceData.ProviderId}`, 'Certificate', OriginalCourceData.Certificate);
            const { width, height } = sizeOf(templatePath);
            const doc = new PDFDocument({ size: [width, height], margin: 0 });
            const filePath = path.join(__dirname, '..', '..', 'public', 'MyCertificate', `${OriginalCourceData.CourceName}-${CourceId}-${UserId.replace(/\s+/g, '_')}.pdf`);
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

                    if (OriginalCourceData.ProviderInfo[0]) {
                        let logoPath
                        if (OriginalCourceData.ProviderTypeValue.CourceProviderType == 'Tutor') {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', OriginalCourceData.ProviderInfo[0].TutorImage);
                            doc.fontSize(pos.fontSize).text(OriginalCourceData.ProviderInfo[0].TutorName, pos.x, pos.y, { lineBreak: false });
                        }
                        if (OriginalCourceData.ProviderTypeValue.CourceProviderType == 'Class') {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', OriginalCourceData.ProviderTypeValue[0].ClassLogo);
                            doc.fontSize(pos.fontSize).text(OriginalCourceData.ProviderInfo[0].ClassName, pos.x, pos.y, { lineBreak: false });
                        }
                        if (OriginalCourceData.ProviderTypeValue.CourceProviderType == 'Company') {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', OriginalCourceData.ProviderTypeValue[0].CourceCompanyLogo);
                            doc.fontSize(pos.fontSize).text(OriginalCourceData.ProviderInfo[0].CourseCompanyName, pos.x, pos.y, { lineBreak: false });
                        }
                        if (OriginalCourceData.ProviderTypeValue.CourceProviderType == 'University') {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', OriginalCourceData.ProviderTypeValue[0].UniversityLogo);
                            doc.fontSize(pos.fontSize).text(OriginalCourceData.ProviderInfo[0].UniversityName, pos.x, pos.y, { lineBreak: false });

                        }

                        if (fs.existsSync(logoPath)) {
                            const logoConfig = config.ProviderLogo;
                            doc.image(logoPath, logoConfig.x, logoConfig.y, { width: logoConfig.width, height: logoConfig.height });
                        }

                    }
                }

                const courseOrder = await CoachingCourceOrder.findOne({ UserId, CourceId, companyId });
                if (!courseOrder) {
                    return resp.status(404).json({ message: 'Course order not found', success: false });
                }
                if (!courseOrder.TokenOfCource) {
                    return resp.status(404).json({ message: 'Course Token Not Found', success: false });
                }
                let TokenData = jwt.verify(courseOrder.TokenOfCource, 'secret-for-now')
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

                await CoachingCourceOrder.findOneAndUpdate(
                    { UserId, CourceId, companyId },
                    { $set: { CourceCompleted: true } },
                    { new: true }
                );

                const matchCondition = { companyId, _id: CourceId };
                const OriginalCourceData = await CoachingCourceController.getCoachingCourceData(matchCondition);
                const user = await UserController.default.findOne({ _id: UserId });
                if (!OriginalCourceData || !user) {
                    return resp.status(404).json({ message: 'Course or User not found', success: false });
                }

                if (!OriginalCourceData.config) {
                    return resp.status(404).json({ message: 'Certificate template config not found', success: false });
                }

                const config = OriginalCourceData.config;
                const templatePath = path.join(__dirname, '..', '..', 'public', `${OriginalCourceData.CourceName}-${OriginalCourceData.ProviderId}`, 'Certificate', OriginalCourceData.Certificate);
                const { width, height } = sizeOf(templatePath);
                const doc = new PDFDocument({ size: [width, height], margin: 0 });
                const filePath = path.join(__dirname, '..', '..', 'public', 'MyCertificate', `${OriginalCourceData.CourceName}-${CourceId}-${UserId.replace(/\s+/g, '_')}.pdf`);
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

                        if (OriginalCourceData.ProviderInfo[0]) {
                            let logoPath
                            if (OriginalCourceData.ProviderTypeValue.CourceProviderType == 'Tutor') {
                                logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', OriginalCourceData.ProviderInfo[0].TutorImage);
                                doc.fontSize(pos.fontSize).text(OriginalCourceData.ProviderInfo[0].TutorName, pos.x, pos.y, { lineBreak: false });
                            }
                            if (OriginalCourceData.ProviderTypeValue.CourceProviderType == 'Class') {
                                logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', OriginalCourceData.ProviderTypeValue[0].ClassLogo);
                                doc.fontSize(pos.fontSize).text(OriginalCourceData.ProviderInfo[0].ClassName, pos.x, pos.y, { lineBreak: false });
                            }
                            if (OriginalCourceData.ProviderTypeValue.CourceProviderType == 'Company') {
                                logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', OriginalCourceData.ProviderTypeValue[0].CourceCompanyLogo);
                                doc.fontSize(pos.fontSize).text(OriginalCourceData.ProviderInfo[0].CourseCompanyName, pos.x, pos.y, { lineBreak: false });
                            }
                            if (OriginalCourceData.ProviderTypeValue.CourceProviderType == 'University') {
                                logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', OriginalCourceData.ProviderTypeValue[0].UniversityLogo);
                                doc.fontSize(pos.fontSize).text(OriginalCourceData.ProviderInfo[0].UniversityName, pos.x, pos.y, { lineBreak: false });

                            }

                            if (fs.existsSync(logoPath)) {
                                const logoConfig = config.ProviderLogo;
                                doc.image(logoPath, logoConfig.x, logoConfig.y, { width: logoConfig.width, height: logoConfig.height });
                            }

                        }
                    }

                }

                if (OriginalCourceData.ConnectedInfo) {
                    const logoDirArr = [];
                    OriginalCourceData.ConnectedInfo.forEach((conn) => {
                        let logoPath;
                        if (conn.TutorImage) {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingTutorImage', conn.TutorImage);
                        } else if (conn.ClassLogo) {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingClassesImage', conn.ClassLogo);
                        } else if (conn.UniversityLogo) {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingUniversityImage', conn.UniversityLogo);
                        } else if (conn.CourceCompanyLogo) {
                            logoPath = path.join(__dirname, '..', '..', 'public', 'CoachingCompanyImage', conn.CourceCompanyLogo);
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
                const token = jwt.sign({ CourceId: CourceId, UserId: UserId, CourceName: OriginalCourceData.CourceName, UserName: user.name, UserEmail: user.email, UserPhone: user.phone });
                let dataOfCertificate = {
                    companyId: companyId,
                    CertificateToken: token
                }
                let savedToken = new CoachingCourceOrder.CertificateModel(dataOfCertificate)
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
            let FindCertificate = await CoachingCourceOrder.CertificateModel.findOne({ companyId: companyId, _id: CertificateId })
            if (!FindCertificate) {
                return resp.status(400).json({ message: 'certificate not found', success: false })
            }
            if (FindCertificate.CertificateToken) {
                let CertiFicateData = jwt.verify(FindCertificate.CertificateToken, process.env.ACCESS_TOKEN_SECRET)
                if (!CertiFicateData) {
                    return resp.status(400).json({ message: 'certificate data not found or token not vbe verified', success: false })
                }
                let FindCertificate = await CoachingCourceOrder.CertificateModel.findOne({ companyId: companyId, _id: CertificateId })
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