const { ObjectId } = require('mongodb');
const CoachingGainerCompanyOrder = require('./CoachingGainerCompanyOrder.model');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken')
const { CoachingCourseModel, CoachingVideoModel, QuizModel } = require('../CoachingCourse/CoachingCourse.model');
const CoachingCourseController = require('../CoachingCourse/CoachingCourse.controller')
const CompanyModel = require('../../CompanyBase/Company/Company.model')
const fs = require('fs');
const CoachingGainerCompaniesModel = require('../CoachingGainerCompnay/CoachingGainerCompnay.model')
const nodemailer = require('nodemailer')
const bcrypt = require('bcryptjs')
const transaction_model_1 = require("../payment/transaction.model");
const CoachingCourseOrder = require('../CoachingOrder/CoachingOrder.model');
const csvgenerator = require('csv-writer').createObjectCsvWriter
const csvParser = require("csv-parser");

class CourseOrderService {
    constructor() {
    }

    async addCoachingGainerCompanyOrder(req, res) {
        try {
            let { GainerCompanyId, ForHowManyLogins, CourseIds, companyId, TotalAmount } = req.body
            if (!GainerCompanyId || !ForHowManyLogins || !CourseIds || !companyId || !TotalAmount) {
                return res.status(400).json({ message: "please provide all data", success: false })
            }
            let CompanyGainerRequestData = {
                companyId: companyId,
                GainerCompanyId: GainerCompanyId,
                CourseIds: CourseIds,
                TotalAmount: TotalAmount,
                ForHowManyLogins: ForHowManyLogins,
            }
            let addRequest = await new CoachingGainerCompanyOrder.CompanyGainerRequestModel(CompanyGainerRequestData)
            addRequest = await addRequest.save();
            if (!addRequest) {
                return res.status(400).json({ message: 'failed to send request', success: false })
            }
            return res.status(200).json({ message: 'request sended to admin', success: true })
        } catch (error) {
            console.error('Error adding course:', error);

            return res.status(500).json({
                error: error.message,
                success: false
            });
        }
    }

    async updateCoachingNegotiatePayment(req, resp) {
        try {
            let { OrderId, NegotiatePayment, companyId } = req.body;
            if (!OrderId || !NegotiatePayment || !companyId) {
                return resp.status(400).json({ message: "please provide required data", success: false })
            }
            let findedOrder = await CoachingGainerCompanyOrder.CompanyGainerRequestModel.findOne({ _id: OrderId, companyId })
            if (!findedOrder) {
                return resp.status(400).json({ message: "order not found", success: false })

            }
            let updateTheOrderNegotiatePayment = await CoachingGainerCompanyOrder.CompanyGainerRequestModel.findOneAndUpdate({
                _id: OrderId, companyId: companyId
            },
                {
                    $set: {
                        NegotiatedAmount: NegotiatePayment
                    }
                },
                {
                    new: true
                }
            )
            if (updateTheOrderNegotiatePayment) {
                return resp.status(200).json({ message: 'status updated', success: true, data: updateTheOrderNegotiatePayment })
            }
            return resp.status(400).json({ message: 'status not updated', success: false })
        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });

        }
    }

    async generateBlankCSVForEmployessListWithPredifinedEmailAndPassword(req, resp) {
        try {
             const publicdirPath = path.join(__dirname, '..', '..', 'public', 'employeeListCsv');
            if (!fs.existsSync(publicdirPath)) {
                fs.mkdirSync(publicdirPath, { recursive: true });
            }
             
            const filepath = path.join(publicdirPath, 'employeeListPre.csv');
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }

            const generateCsv = csvgenerator({
                path: filepath,
                header: [
                    { id: 'EmployeeName', title: 'EmployeeName' },
                    { id: 'EmployeeEmail', title: 'EmployeeEmail' },
                    { id: 'EmployeePassword', title: 'EmployeePassword' },
                    { id: 'EmployeeMobileNo', title: 'EmployeeMobileNo' },
                    { id: 'EmployeePic', title: 'EmployeePic' },
                ],
            });

            await generateCsv.writeRecords([]);

            return resp.status(200).json({
                message: 'File generated successfully',
                file: 'employeeListPre.csv',
                success: true,
            });

        } catch (err) {
            console.error('CSV Generation Error:', err);
            return resp.status(500).json({
                err: err.message,
                message: 'File not generated',
                success: false,
            });
        }
    }

    async generateBlankCSVForEmployessListWithAutomaticIdAndPassword(req, resp) {
        try {
            const publicdirPath = path.join(__dirname, '..', '..', 'public', 'employeeListCsv');
            if (!fs.existsSync(publicdirPath)) {
                fs.mkdirSync(publicdirPath, { recursive: true });
            }

            const filepath = path.join(publicdirPath, 'employeeListAuto.csv');

            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }

            const generateCsv = csvgenerator({
                path: filepath,
                header: [
                    { id: 'EmployeeName', title: 'EmployeeName' },
                    { id: 'EmployeeEmail', title: 'EmployeeEmail' },
                    { id: 'EmployeeMobileNo', title: 'EmployeeMobileNo' },
                    { id: 'EmployeePic', title: 'EmployeePic' },
                ],
            });

            await generateCsv.writeRecords([]);

            return resp.status(200).json({
                message: 'File generated successfully',
                file: 'employeeListAuto.csv',
                success: true,
            });

        } catch (err) {
            console.error('CSV Generation Error:', err);
            return resp.status(500).json({
                err: err.message,
                message: 'File not generated',
                success: false,
            });
        }
    }

    cleanupUnusedImages(uploadedImages, csvListedImages) {
        const imagesDir = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage');

        uploadedImages.forEach((file) => {
            if (!csvListedImages.has(file)) {
                fs.unlinkSync(path.join(imagesDir, file), (err) => {
                    if (err) console.error(`Error deleting file ${file}:`, err);
                });
            }
        });
    }

    cleanupUploadedFiles(files) {
        if (!files) return;

        if (files.csvFile) {
            fs.unlinkSync(files.csvFile[0].path, (err) => {
                if (err) console.error('Error deleting CSV file:', err);
            });
        }

        if (files.serviceImages) {
            files.serviceImages.forEach((file) => {
                const filePath = path.join(__dirname, '..', '..', 'public', 'ServiceProductImage', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    }

    ;
    async parseCSVFile(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    }

    async processEmployeeData(rows, uploadedImages) {
        const validEmployees = [];
        const invalidEmployees = [];
        const AllEmployeesEmailAndPassword = [];
        const csvListedImages = new Set();

        for (const row of rows) {
            try {
                const employeePic = uploadedImages.includes(row['EmployeePic'])
                    ? row['EmployeePic']
                    : null;

                if (row['EmployeePic']) {
                    csvListedImages.add(row['EmployeePic']);
                }

                if (row['EmployeeEmail'] && row['EmployeePassword']) {
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(row['EmployeePassword'], salt);

                    validEmployees.push({
                        EmployeeName: row['EmployeeName'],
                        EmployeeEmail: row['EmployeeEmail'],
                        EmployeeMobileNo: row['EmployeeMobileNo'],
                        EmployeePic: employeePic,
                        EmployeePassword: hashedPassword
                    });
                    AllEmployeesEmailAndPassword.push({
                        EmployeeName: row['EmployeeName'],
                        EmployeeEmail: row['EmployeeEmail'],
                        EmployeeMobileNo: row['EmployeeMobileNo'],
                        EmployeePic: employeePic,
                        EmployeePassword: row['EmployeePassword']
                    });
                } else {
                    invalidEmployees.push({
                        EmployeeName: row['EmployeeName'],
                        EmployeeEmail: row['EmployeeEmail'],
                        EmployeeMobileNo: row['EmployeeMobileNo'],
                        EmployeePic: employeePic,
                        EmployeePassword: row['EmployeePassword']
                    });
                }
            } catch (error) {
                console.error('Error processing row:', error);
                invalidEmployees.push({
                    ...row,
                    error: error.message
                });
            }
        }

        return { validEmployees, invalidEmployees, csvListedImages, AllEmployeesEmailAndPassword };
    }

    async processEmployeeWithAutomaticEmailAndPasswordData(rows, uploadedImages) {
        const validEmployees = [];
        const invalidEmployees = [];
        const csvListedImages = new Set();
        const AllEmployeesEmailAndPassword = [];

        for (const row of rows) {
            try {
                const employeePic = uploadedImages.includes(row['EmployeePic'])
                    ? row['EmployeePic']
                    : null;

                if (row['EmployeePic']) {
                    csvListedImages.add(row['EmployeePic']);
                }

                if (row['EmployeeEmail']) {
                    let AutoPassword = `EmployeePass:-` + Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(AutoPassword, salt);

                    validEmployees.push({
                        EmployeeName: row['EmployeeName'],
                        EmployeeEmail: row['EmployeeEmail'],
                        EmployeeMobileNo: row['EmployeeMobileNo'],
                        EmployeePic: employeePic,
                        EmployeePassword: hashedPassword
                    });
                    AllEmployeesEmailAndPassword.push({
                        EmployeeName: row['EmployeeName'],
                        EmployeeEmail: row['EmployeeEmail'],
                        EmployeeMobileNo: row['EmployeeMobileNo'],
                        EmployeePic: employeePic,
                        EmployeePassword: AutoPassword
                    });
                } else {
                    invalidEmployees.push({
                        EmployeeName: row['EmployeeName'],
                        EmployeeEmail: row['EmployeeEmail'],
                        EmployeeMobileNo: row['EmployeeMobileNo'],
                        EmployeePic: employeePic,
                        EmployeePassword: row['EmployeePassword']
                    });
                }
            } catch (error) {
                console.error('Error processing row:', error);
                invalidEmployees.push({
                    ...row,
                    error: error.message
                });
            }
        }

        return { validEmployees, invalidEmployees, csvListedImages, AllEmployeesEmailAndPassword };
    }
    async updateCourseOrders({
        courseId,
        gainerCompanyId,
        orderId,
        transactionId,
        validEmployees,
        forHowManyLogins
    }) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            let courseOrder = await CoachingGainerCompanyOrder.CoachingGainerCompnaiesOrder.findOneAndUpdate(
                {
                    CourseId: courseId,
                    GainerCompanyId: gainerCompanyId
                },
                {
                    $addToSet: {
                        OrderId: orderId,
                        Transaction: transactionId,
                        PaymentIds: transactionId
                    },
                    $inc: {
                        MyTotalLogins: forHowManyLogins
                    }
                },
                {
                    upsert: true,
                    new: true,
                    session
                }
            );

            const employeeAccessData = validEmployees.map(emp => ({
                LoginsAccess: true,
                EmployeeId: emp._id
            }));
            if (courseOrder.EmployeeIds) {

                for (let CurrentEmployee of employeeAccessData) {
                    for (let OldEachEmployee of courseOrder.EmployeeIds) {
                        if (CurrentEmployee.EmployeeId !== OldEachEmployee) {
                            employeeAccessData.push({
                                LoginsAccess: OldEachEmployee.LoginsAccess,
                                EmployeeId: OldEachEmployee.EmployeeId
                            })
                        }
                    }
                }
            }
            courseOrder = await CoachingGainerCompanyOrder.CoachingGainerCompnaiesOrder.findByIdAndUpdate(
                courseOrder._id,
                {
                    $set: {
                        EmployeeIds: employeeAccessData
                    },
                },
                { new: true, session }
            );
            courseOrder = await CoachingGainerCompanyOrder.CoachingGainerCompnaiesOrder.findByIdAndUpdate(
                courseOrder._id,
                {
                    $set: {
                        PendingLogins: courseOrder.MyTotalLogins - courseOrder.EmployeeIds.length - validEmployees.length
                    }
                },
                { new: true, session }
            );

            await session.commitTransaction();
            return courseOrder;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async uploadEmployeesListCsvForPredifinedEmailAndPassword(req, res) {
        try {
            if (!req.files.csvFile) {
                return res.status(400).json({
                    message: 'Please upload a CSV file',
                    success: false
                });
            }

            const { TokenOfCourse } = req.body;
            const tokenData = jwt.verify(TokenOfCourse, process.env.ACCESS_TOKEN_SECRET || 'secret-for-now');

            if (tokenData.Status !== 'Completed') {
                return res.status(400).json({
                    message: 'Your payment is not completed',
                    success: false
                });
            }

            const csvFilePath = req.files.csvFile[0].path;
            const csvData = await parseCSVFile(csvFilePath);
            const uploadedImages = req.files.employeesImages
                ? req.files.employeesImages.map(img => img.originalname)
                : [];

            const {
                validEmployees,
                invalidEmployees,
                csvListedImages,
                AllEmployeesEmailAndPassword
            } = await this.processEmployeeData(csvData, uploadedImages);

            const transaction = await transaction_model_1.default.findById(tokenData.PaymentId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            const order = await CoachingGainerCompanyOrder.CompanyGainerRequestModel.findOne({
                _id: transaction.orderId,
                GainerCompanyId: tokenData.GainerCompanyId
            });
            if (!order) {
                throw new Error('Order not found');
            }

            const gainerCompany = await CoachingGainerCompaniesModel.findByIdAndUpdate(
                tokenData.GainerCompanyId,
                {
                    $addToSet: {
                        Employees: { $each: validEmployees }
                    }
                },
                { new: true }
            );

            const newEmployeeIds = gainerCompany.Employees.filter(emp =>
                validEmployees.some(vEmp => vEmp.EmployeeEmail === emp.EmployeeEmail)
                    .map(emp => emp._id));


            await CompanyGainerRequestModel.findByIdAndUpdate(
                order._id,
                {
                    $addToSet: {
                        EmployeeIds: { $each: newEmployeeIds }
                    }
                }
            );

            const courseResults = [];
            for (const courseId of tokenData.CourseIds) {
                const result = await this.updateCourseOrders({
                    courseId,
                    gainerCompanyId: tokenData.GainerCompanyId,
                    orderId: order._id,
                    transactionId: transaction._id,
                    validEmployees: newEmployeeIds,
                    forHowManyLogins: order.ForHowManyLogins
                });
                courseResults.push(result);
            }

            await this.createEmployeeCourseAccess({
                companyId: tokenData.companyId,
                gainerCompanyId: tokenData.GainerCompanyId,
                orderId: order._id,
                courseIds: tokenData.CourseIds,
                employeeIds: newEmployeeIds
            });

            if (invalidEmployees.length > 0) {
                await this.sendInvalidEmployeesEmail(invalidEmployees);
            }
            if (AllEmployeesEmailAndPassword.length > 0) {
                await this.sendInvalidEmployeesEmail(AllEmployeesEmailAndPassword);
            }
            fs.unlinkSync(csvFilePath);
            this.cleanupUnusedImages(uploadedImages, csvListedImages);

            return res.status(200).json({
                message: 'CSV uploaded successfully',
                success: true,
                stats: {
                    validEmployees: validEmployees.length,
                    invalidEmployees: invalidEmployees.length,
                    coursesUpdated: courseResults.length
                }
            });

        } catch (error) {
            console.error('Upload error:', error);

            if (req.files.csvFile[0].path) {
                fs.unlinkSync(req.files.csvFile[0].path);
            }
            if (req.files.employeesImages) {
                this.cleanupUploadedFiles(req.files.employeesImages.map(img => img.originalname));
            }

            return res.status(500).json({
                message: 'Internal server error',
                error: error.message,
                success: false
            });
        }
    }
    async uploadEmployeesListCsvForAutomaticEmailAndPassword(req, res) {
        try {
            if (!req.files.csvFile) {
                return res.status(400).json({
                    message: 'Please upload a CSV file',
                    success: false
                });
            }

            const { TokenOfCourse } = req.body;
            const tokenData = jwt.verify(TokenOfCourse, process.env.ACCESS_TOKEN_SECRET || 'secret-for-now');

            if (tokenData.Status !== 'Completed') {
                return res.status(400).json({
                    message: 'Your payment is not completed',
                    success: false
                });
            }

            const csvFilePath = req.files.csvFile[0].path;
            const csvData = await parseCSVFile(csvFilePath);
            const uploadedImages = req.files.employeesImages
                ? req.files.employeesImages.map(img => img.originalname)
                : [];

            const {
                validEmployees,
                invalidEmployees,
                csvListedImages,
                AllEmployeesEmailAndPassword
            } = await this.processEmployeeWithAutomaticEmailAndPasswordData(csvData, uploadedImages);

            const transaction = await transaction_model_1.default.findById(tokenData.PaymentId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            const order = await CoachingGainerCompanyOrder.CompanyGainerRequestModel.findOne({
                _id: transaction.orderId,
                GainerCompanyId: tokenData.GainerCompanyId
            });
            if (!order) {
                throw new Error('Order not found');
            }

            const gainerCompany = await CoachingGainerCompaniesModel.findByIdAndUpdate(
                tokenData.GainerCompanyId,
                {
                    $addToSet: {
                        Employees: { $each: validEmployees }
                    }
                },
                { new: true }
            );

            const newEmployeeIds = gainerCompany.Employees.filter(emp =>
                validEmployees.some(vEmp => vEmp.EmployeeEmail === emp.EmployeeEmail)
                    .map(emp => emp._id));


            await CompanyGainerRequestModel.findByIdAndUpdate(
                order._id,
                {
                    $addToSet: {
                        EmployeeIds: { $each: newEmployeeIds }
                    }
                }
            );

            const courseResults = [];
            for (const courseId of tokenData.CourseIds) {
                const result = await this.updateCourseOrders({
                    courseId,
                    gainerCompanyId: tokenData.GainerCompanyId,
                    orderId: order._id,
                    transactionId: transaction._id,
                    validEmployees: newEmployeeIds,
                    forHowManyLogins: order.ForHowManyLogins
                });
                courseResults.push(result);
            }

            await this.createEmployeeCourseAccess({
                companyId: tokenData.companyId,
                gainerCompanyId: tokenData.GainerCompanyId,
                orderId: order._id,
                courseIds: tokenData.CourseIds,
                employeeIds: newEmployeeIds
            });

            if (invalidEmployees.length > 0) {
                await this.sendInvalidEmployeesEmail(invalidEmployees,gainerCompany.Email);
            }
            if (AllEmployeesEmailAndPassword.length > 0) {
                await this.sendValidEmployeesEmail(AllEmployeesEmailAndPassword,gainerCompany.Email);
            }
            fs.unlinkSync(csvFilePath);
            this.cleanupUnusedImages(uploadedImages, csvListedImages);

            return res.status(200).json({
                message: 'CSV uploaded successfully',
                success: true,
                stats: {
                    validEmployees: validEmployees.length,
                    invalidEmployees: invalidEmployees.length,
                    coursesUpdated: courseResults.length
                }
            });

        } catch (error) {
            console.error('Upload error:', error);

            if (req.files.csvFile[0].path) {
                fs.unlinkSync(req.files.csvFile[0].path);
            }
            if (req.files.employeesImages) {
                this.cleanupUploadedFiles(req.files.employeesImages.map(img => img.originalname));
            }

            return res.status(500).json({
                message: 'Internal server error',
                error: error.message,
                success: false
            });
        }
    }
    async createEmployeeCourseAccess({
        companyId,
        gainerCompanyId,
        orderId,
        courseIds,
        employeeIds
    }) {
        const courseAccessRecords = [];

        for (const courseId of courseIds) {
            const course = await CoachingCourseModel.findById(courseId);
            if (!course) continue;
            let PlayList = [];
            for (let EachPlaylist of course.CourseContent) {
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


            for (const employeeId of employeeIds) {

                const token = jwt.sign(
                    {
                        CourseId: courseId,
                        GainerCompanyId: gainerCompanyId,
                        OrderId: orderId
                    },
                    process.env.ACCESS_TOKEN_SECRET || 'secret-for-now'
                );

                courseAccessRecords.push({
                    companyId,
                    EmployeeId: employeeId,
                    GainerCompanyId: gainerCompanyId,
                    OrderId: orderId,
                    CourseId: courseId,
                    CourseContent: PlayList,
                    TokenOfCourse: token,
                    valid: true
                });
            }
        }

        if (courseAccessRecords.length > 0) {
            await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.insertMany(courseAccessRecords);
        }
    }

    async sendInvalidEmployeesEmail(invalidEmployees,Email) {
        const csvWriter = createCsvWriter({
            path: 'invalid_employees.csv',
            header: [
                { id: 'EmployeeName', title: 'EmployeeName' },
                { id: 'EmployeeEmail', title: 'EmployeeEmail' },
                { id: 'EmployeeMobileNo', title: 'EmployeeMobileNo' },
                { id: 'EmployeePassword', title: 'EmployeePassword' },
                { id: 'error', title: 'Error' }
            ]
        });

        await csvWriter.writeRecords(invalidEmployees);
        const transporter = nodemailer.createTransport({
            host: '192.168.1.112',
            port: 465,
            secure: true,
            auth: {
                user: 'hr@onelifecapital.in',
                pass: 'Desti@2017'
            },
            tls: {
                rejectUnauthorized: false
            }

        });
        const mailOptions = {
            from: '"HR" hr@onelifecapital.in',
            to: Email,
            subject: 'Invalid Employee Records',
            text: 'Please review the attached invalid employee records',
            attachments: [{
                filename: 'invalid_employees.csv',
                path: 'invalid_employees.csv'
            }]

        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending mail:', error);
            } else {
                console.log('Email sent:', info.response);
                resp.status(200).json({ message: "mail sent successfully" })
            }
        });


        fs.unlinkSync('invalid_employees.csv');
    }
    async sendValidEmployeesEmail(validEmployees,Email) {
        const csvWriter = createCsvWriter({
            path: 'valid_employees.csv',
            header: [
                { id: 'EmployeeName', title: 'EmployeeName' },
                { id: 'EmployeeEmail', title: 'EmployeeEmail' },
                { id: 'EmployeeMobileNo', title: 'EmployeeMobileNo' },
                { id: 'EmployeePassword', title: 'EmployeePassword' },
                { id: 'error', title: 'Error' }
            ]
        });

        await csvWriter.writeRecords(validEmployees);

        const transporter = nodemailer.createTransport({
            host: '192.168.1.112',
            port: 465,
            secure: true,
            auth: {
                user: 'hr@onelifecapital.in',
                pass: 'Desti@2017'
            },
            tls: {
                rejectUnauthorized: false
            }

        });
        const mailOptions = {
            from: '"HR" hr@onelifecapital.in',
            to: Email,
            subject: 'valid Uploaded Employee Records',
            text: 'Please review the attached valid employee records',
            attachments: [{
                filename: 'valid_employees.csv',
                path: 'valid_employees.csv'
            }],

        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending mail:', error);
            } else {
                console.log('Email sent:', info.response);
                resp.status(200).json({ message: "mail sent successfully" })
            }
        });

        fs.unlinkSync('valid_employees.csv');
    }


    async employeeLoginSystem(req, resp) {
        try {
            let { Email, Password, GainerCompanyId } = req.body;
            if (!Email || !Password || !GainerCompanyId) {
                return resp.status(400).json({ message: 'please provide email and password', success: false })
            }
            let findedCompany = await CoachingGainerCompaniesModel.findOne({
                _id: GainerCompanyId, 'Employees.EmployeeEmail': Email
            })
            if (findedCompany) {
                let findedEmployee = findedCompany.Employees.find((EachEmployee) => {
                    EachEmployee.EmployeeEmail == Email
                })
                if (findedEmployee) {
                    let passwordIsMatchedOrNot = await bcrypt.compare(Password, findedEmployee.EmployeePassword)
                    if (passwordIsMatchedOrNot) {
                        let Role = "Coaching Gainer Company Employee"
                        let token = jwt.sign(
                            { CoachingGainerCompanyId: findedEmployee._id, Email: findedEmployee.EmployeeEmail, companyId: findedCompany.companyId, Role: Role },
                            'secret-for-now',
                            { expiresIn: '24h' }
                        );
                        resp.status(200).json({ message: 'login successfully', token: token })
                    }
                    else {
                        return resp.status(400).json({ message: 'password not match', success: false })
                    }

                }
                else {
                    return resp.status(400).json({ message: 'Coaching gainer Company  or this employee not found', success: false })

                }
            }
            else {
                return resp.status(400).json({ message: 'Coaching gainer Company  or this employee not found', success: false })

            }



        } catch (error) {
            console.error('Login error:', error);
            resp.status(500).json({ message: 'Internal Server Error', success: false });
        }
    }
    async getCoachingCourseData(matchCondition) {
        let result = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.aggregate([
            { $match: matchCondition },
            { $unwind: { path: "$CourseContent", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$CourseContent.VideoData", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$CourseContent.VideoData.QuizData", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "coachingcompanygaineres",
                    localField: "EmployeeId",
                    foreignField: "Employees._id",
                    as: "EmployeeInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingcompanygaineres",
                    localField: "GainerCompanyId",
                    foreignField: "_id",
                    as: "CompanyGainerInfo"
                }
            },
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
                            VideoData: "$Videos"
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
                    CourseInfo: CourseInfo.filter((EachData) => EachData._id.toString() === EachCourse.CourseId.toString())
                };
            });

            return result;
        }
    }


    async getCoachingCourse(req, res) {
        let { CourseId, EmployeeId, companyId, GainerCompanyId, OrderId } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId(companyId) };


            if (CourseId) {
                if (!mongoose.Types.ObjectId.isValid(CourseId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.CourseId = mongoose.Types.ObjectId(CourseId)
            }
            if (EmployeeId) {
                if (!mongoose.Types.ObjectId.isValid(EmployeeId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.EmployeeId = mongoose.Types.ObjectId(EmployeeId)
            }
            if (GainerCompanyId) {
                if (!mongoose.Types.ObjectId.isValid(GainerCompanyId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.GainerCompanyId = mongoose.Types.ObjectId(GainerCompanyId)
            }
            if (OrderId) {
                if (!mongoose.Types.ObjectId.isValid(OrderId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.OrderId = mongoose.Types.ObjectId(OrderId)
            }
            const data = await this.getCoachingCourseData(matchCondition);

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
    async changeStateOfCourseContent(req, resp) {
        try {
            let { QuizId, companyId, PlayListId, VideoId, EmployeeId, CourseId } = req.body;
            if (!companyId || !EmployeeId || !CourseId) {
                return resp.status(400).json({ message: 'please provide valid data', success: false })
            }
            let findedCourse = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOne({
                companyId, EmployeeId, CourseId
            })
            if (!findedCourse) {
                return resp.status(400), json({ message: "Course not found", success: false })
            }
            if (QuizId && PlayListId && VideoId) {
                let updateResult = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOneAndUpdate({
                    companyId, EmployeeId, CourseId, 'CourseContent.PlayListId': PlayListId, 'CourseContent.VideoData.VideoId': VideoId, 'CourseContent.VideoData.QuizData.QuizId': QuizId
                },
                    {
                        $set: {
                            'CourseContent.$.[content].VideoData.$.[video].QuizData.$.[quiz].QuizCompleted': true
                        },
                    },
                    {
                        arrayFilters: [
                            { 'content.PlayListId': PlayListId, 'video.VideoId': VideoId, 'quiz.QuizId': QuizId, }
                        ],
                        new: true
                    }
                )
                if (!updateResult) {
                    return resp.status(400).json({ message: 'data not updated', success: false })
                }
                resp.status(200).json({ message: 'data updated', data: updateResult, success: true })

            }
            else if (PlayListId && VideoId) {
                let updateResult = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOneAndUpdate({
                    companyId, EmployeeId, CourseId, 'CourseContent.PlayListId': PlayListId, 'CourseContent.VideoData.VideoId': VideoId
                },
                    {
                        $set: {
                            'CourseContent.$.[content].VideoData.$.[video].VideoCompleted': true
                        },
                    },
                    {
                        arrayFilters: [
                            { 'content.PlayListId': PlayListId, 'video.VideoId': VideoId }
                        ],
                        new: true
                    }
                )
                if (!updateResult) {
                    return resp.status(400).json({ message: 'data not updated', success: false })
                }
                resp.status(200).json({ message: 'data updated', data: updateResult, success: true })
            }
            else if (PlayListId) {
                let updateResult = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOneAndUpdate({
                    companyId, EmployeeId, CourseId, 'CourseContent.PlayListId': PlayListId
                },
                    {
                        $set: {
                            'CourseContent.$.[content].PlayListCompleted': true
                        },
                    },
                    {
                        arrayFilters: [
                            { 'content.PlayListId': PlayListId }
                        ],
                        new: true
                    }
                )
                if (!updateResult) {
                    return resp.status(400).json({ message: 'data not updated', success: false })
                }
                resp.status(200).json({ message: 'data updated', data: updateResult, success: true })
            }

        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });

        }
    }
    async changeStateOfCourseContent(req, resp) {
        try {
            let { QuizId, companyId, PlayListId, VideoId, EmployeeId, CourseId } = req.body;
            if (!companyId || !EmployeeId || !CourseId) {
                return resp.status(400).json({ message: 'please provide valid data', success: false })
            }
            let findedCourse = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOne({
                companyId, EmployeeId, CourseId
            })
            if (!findedCourse) {
                return resp.status(400), json({ message: "Course not found", success: false })
            }
            if (QuizId && PlayListId && VideoId) {
                let orderDoc = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOne({
                    companyId,
                    EmployeeId,
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
                let orderDoc = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOne({
                    companyId,
                    EmployeeId,
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
                let orderDoc = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOne({
                    companyId,
                    EmployeeId,
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
            const { EmployeeId, CourseId, companyId } = req.body;
            if (!EmployeeId || !CourseId || !companyId) {
                return resp.status(400).json({ message: 'Please provide valid data', success: false });
            }

            const courseOrder = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOne({ EmployeeId, CourseId, companyId });
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

            await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOneAndUpdate(
                { EmployeeId, CourseId, companyId },
                { $set: { CourseCompleted: true } },
                { new: true }
            );

            const matchCondition = { companyId, _id: CourseId };
            const OriginalCourseData = await CoachingCourseController.getCoachingCourseData(matchCondition);
            const findedCompanyGainer = await CoachingGainerCompaniesModel.findOne({ _id: TokenData.GainerCompanyId })
            const user = await findedCompanyGainer.Employees.find((EachEmployee) => {
                EachEmployee._id == EmployeeId
            })
            if (!OriginalCourseData || !user || !findedCompanyGainer) {
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
            const token = jwt.sign({ CourseId: CourseId, UserId: EmployeeId, CourseName: OriginalCourseData.CourseName, UserName: user.EmployeeName, UserEmail: user.EmployeeEmail, UserPhone: user.EmployeeMobileNo });
            let dataOfCertificate = {
                companyId: companyId,
                CertificateToken: token
            }
            let savedToken = new CoachingCourseOrder.CertificateModel(dataOfCertificate)
            savedToken = await savedToken.save();
            let CertificateConfig = config.fields.CertificateId
            doc.fontSize(CertificateConfig.fontSize).text(savedToken._id, CertificateConfig.x, CertificateConfig.y, { lineBreak: false });
            return resp.json({ success: true, file: filePath });

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
                return resp.status(200).json({ data: CertiFicateData, success: true, message: "certificated data fetched successfully" })
            }
        } catch (error) {
            console.error(error);
            return resp.status(500).json({ message: 'Server error', error: error.message, success: false });
        }
    }
    // async uploadEmployeesListCsvForPredifinedEmailAndPassword(req, resp) {
    //     try {
    //         const { TokenOfCourse } = req.body;
    //         let TokenData = jwt.verify(TokenOfCourse, 'secret-for-now')
    //         let CourseIds = TokenData.CourseIds
    //         if (TokenData.Status !== 'Completed') {
    //             return resp.status(400).json({ message: 'your payment is not completed', success: false })
    //         }
    //         let findedTokenTransaction = await transaction_model_1.default.findOne({ _id: TokenData.PaymentId })
    //         if (!req.files || !req.files.csvFile) {
    //             return resp.status(400).json({ message: 'Please upload a CSV file', success: false });
    //         }
    //         const csvFilePath = req.files.csvFile[0].path;
    //         const uploadedImages = req.files.employeesImages ? req.files.employeesImages.map((img) => img.originalname) : [];

    //         const csvListedImages = new Set();

    //         const stream = fs.createReadStream(csvFilePath).pipe(csvParser());
    //         let EmployessList = [];
    //         let WrongEmployeeListData = [];
    //         let updatedEmployeeLoginsIds = [];
    //         let NotUpdatedEmployeeLoginsIds = [];
    //          for (let EachCourseId of CourseIds) {
    //             let FindedCourseOrder = await CoachingGainerCompanyOrder.CompanyGainerRequestModel.findOne({
    //                 GainerCompanyId: TokenData.GainerCompanyId,
    //                 _id: findedTokenTransaction.orderId
    //             })
    //             let FindedCourse = await CoachingCourseModel.findOne({ _id: EachCourseId })
    //             let FindedGainerCompany = await CoachingGainerCompaniesModel.findOne({ _id: TokenData.GainerCompanyId })
    //             if (!FindedCourseOrder || !FindedCourse || !FindedGainerCompany || !companyId || !findedTokenTransaction.orderId || !CourseIds || !TokenData.GainerCompanyId) {
    //                 this.cleanupUploadedFiles(uploadedImages)
    //                 return resp.status(400).json({ message: 'something wrong to find detail', success: false })
    //             }

    //             const csvListedImages = new Set();

    //             stream.on('data', async (row) => {
    //                 try {

    //                     let EmployeePic;
    //                     if (uploadedImages.includes(row['EmployeePic'])) {
    //                         EmployeePic = row['EmployeePic']
    //                         csvListedImages.add(img);
    //                     }
    //                     else {
    //                         EmployeePic = null;
    //                     }
    //                     if (row["EmployeeEmail"] && row["EmployeePassword"]) {
    //                         const salt = await bcrypt.genSalt(10);
    //                         Password = await bcrypt.hash(row["EmployeePassword"], salt);
    //                         EmployessList.push({
    //                             EmployeeName: row["EmployeeName"],
    //                             EmployeeEmail: row["EmployeeEmail"],
    //                             EmployeeMobileNo: row["EmployeeMobileNo"],
    //                             EmployeePic: EmployeePic,
    //                             EmployeePassword: Password
    //                         });
    //                     }
    //                     else {
    //                         WrongEmployeeListData.push({
    //                             EmployeeName: row["EmployeeName"],
    //                             EmployeeEmail: row["EmployeeEmail"],
    //                             EmployeeMobileNo: row["EmployeeMobileNo"],
    //                             EmployeePic: EmployeePic,
    //                             EmployeePassword: row["EmployeePassword"],
    //                         });
    //                     }

    //                 } catch (error) {
    //                     this.cleanupUploadedFiles(uploadedImages)
    //                     console.error("Error processing CSV row:", error.message);
    //                 }
    //             });

    //             stream.on("end", async () => {
    //                 try {

    //                     let FilteredEmployeeList;
    //                     let addEmployeeListInCoachingGainerCompany;
    //                     let EmployeesIdsOfCurrentCourse;
    //                     let FindedEmployeeList = await CoachingGainerCompaniesModel.findOne({ companyId: companyId, _id: GainerCompanyId })
    //                     if (FindedEmployeeList.Employees && FindedEmployeeList.Employees.length !== 0) {
    //                         for (let EachEmployee of FindedEmployeeList.Employees) {
    //                             FilteredEmployeeList = EmployessList.filter((EachCurrentEmployee) => {
    //                                 return EachEmployee.EmployeeEmail !== EachCurrentEmployee.EmployeeEmail
    //                             })
    //                         }
    //                         addEmployeeListInCoachingGainerCompany = await CoachingGainerCompaniesModel.findOneAndUpdate({
    //                             _id: TokenData.GainerCompanyId,
    //                         }, {
    //                             $addToSet: { Employees: { $each: FilteredEmployeeList } }
    //                         },
    //                             { new: true }
    //                         )
    //                     }
    //                     else {
    //                         addEmployeeListInCoachingGainerCompany = await CoachingGainerCompaniesModel.findOneAndUpdate({
    //                             _id: TokenData.GainerCompanyId,
    //                         }, {
    //                             $addToSet: { Employees: { $each: EmployessList } }
    //                         },
    //                             { new: true }
    //                         )
    //                     }

    //                     if (addEmployeeListInCoachingGainerCompany) {
    //                         for (let EachOldEmployee of addEmployeeListInCoachingGainerCompany.Employees) {
    //                             EmployeesIdsOfCurrentCourse = EmployessList.map((EachCurrentEmployee) => {
    //                                 if (EachCurrentEmployee.EmployeeEmail == EachOldEmployee.EmployeeEmail) {
    //                                     return EachOldEmployee._id
    //                                 }
    //                             })
    //                         }
    //                         let updateCoachingGainerCompanyOrder = await CoachingGainerCompanyOrder.CompanyGainerRequestModel.findOneAndUpdate({
    //                             _id: findedTokenTransaction.orderId
    //                         },
    //                             {
    //                                 $addToSet: { EmployeeIds: { $each: EmployeesIdsOfCurrentCourse } }
    //                             },
    //                             {
    //                                 new: true
    //                             }
    //                         )
    //                     }
    //                     let CoachingCompanyGainerOrder = await CoachingGainerCompanyOrder.CompanyGainerRequestModel.findOne({ _id: findedTokenTransaction.orderId })
    //                     let AvailableLogins = CoachingCompanyGainerOrder.ForHowManyLogins;
    //                     let CoachinOrderedCourse = await CoachingGainerCompanyOrder.CoachingGainerCompnaiesOrder.findOne({ GainerCompanyId: TokenData.GainerCompanyId, CourseId: EachCourseId })
    //                     if (CoachinOrderedCourse) {
    //                         if (CoachinOrderedCourse.OrderId) {
    //                             let MyNewTotalLogins;
    //                             for (let EachOrderId of CoachinOrderedCourse.OrderId) {
    //                                 let FindedCoachingGainerCompanyOrder = await CoachingGainerCompanyOrder.CompanyGainerRequestModel.findOne({
    //                                     _id: EachOrderId
    //                                 })
    //                                 if (FindedCoachingGainerCompanyOrder.ForHowManyLogins && FindedCoachingGainerCompanyOrder.PaymentStatus == 'Completed') {
    //                                     MyNewTotalLogins = MyNewTotalLogins + FindedCoachingGainerCompanyOrder.ForHowManyLogins
    //                                 }
    //                             }
    //                             if (!CoachinOrderedCourse.OrderId.includes(CoachingCompanyGainerOrder._id)) {
    //                                 MyNewTotalLogins = MyNewTotalLogins + CoachingCompanyGainerOrder.ForHowManyLogins
    //                                 CoachinOrderedCourse.OrderId.push(CoachingCompanyGainerOrder._id)
    //                             }
    //                             let PendingLogins = MyNewTotalLogins - CoachinOrderedCourse.EmployeeIds.length
    //                             let updatetheCoachingOrderLogins = await CoachingGainerCompanyOrder.CoachingGainerCompnaiesOrder.findOneAndUpdate({
    //                                 GainerCompanyId: TokenData.GainerCompanyId, CourseId: EachCourseId,
    //                             }, {
    //                                 $set: {
    //                                     MyTotalLogins: MyNewTotalLogins,
    //                                     OrderId: CoachinOrderedCourse.OrderId,
    //                                     PendingLogins: PendingLogins
    //                                 }
    //                             },
    //                                 {
    //                                     new: true
    //                                 })
    //                             if (updatetheCoachingOrderLogins.MyTotalLogins) {
    //                                 AvailableLogins = CoachinOrderedCourse.MyTotalLogins - updatetheCoachingOrderLogins.PendingLogins
    //                             }


    //                         }
    //                         else {
    //                             if (CoachinOrderedCourse.MyTotalLogins) {
    //                                 AvailableLogins = CoachingCompanyGainerOrder.ForHowManyLogins
    //                             }

    //                         }
    //                         let FilteredEmployeeData;
    //                         if (CoachingCompanyGainerOrder.status == 'Completed') {
    //                             TokenOfCourse = jwt.sign({ UserId: TokenData.GainerCompanyId, CourseId: EachCourseId, PaymentId: transaction._id, Status: 'Completed' }, 'secret-for-now')

    //                             if (CoachinOrderedCourse.EmployeeIds || CoachinOrderedCourse.EmployeeIds.length !== 0) {
    //                                 for (let EachOrderedEmployee of EmployessList) {

    //                                     FilteredEmployeeData = CoachinOrderedCourse.EmployeeIds.map((EachCurrentEmployee) => {
    //                                         if (EachCurrentEmployee.EmployeeId == EachOrderedEmployee) {
    //                                             return {
    //                                                 LoginsAccess: true,
    //                                                 EmployeeId: EachCurrentEmployee.EmployeeId
    //                                             }
    //                                         }
    //                                         else if (EachCurrentEmployee.EmployeeId !== EachOrderedEmployee) {
    //                                             return {
    //                                                 LoginsAccess: EachCurrentEmployee.LoginsAccess,
    //                                                 EmployeeId: EachCurrentEmployee.EmployeeId
    //                                             }
    //                                         }
    //                                         else {
    //                                             return {
    //                                                 LoginsAccess: true,
    //                                                 EmployeeId: EachOrderedEmployee
    //                                             }
    //                                         }

    //                                     })
    //                                 }
    //                             }
    //                             else {
    //                                 FilteredEmployeeData = EmployessList.map((EachEmployee) => {
    //                                     return {
    //                                         LoginsAccess: true,
    //                                         EmployeeId: EachEmployee
    //                                     }
    //                                 })
    //                             }
    //                             let updateEmployeeLogins = await CoachingGainerCompanyOrder.CoachingGainerCompnaiesOrder.findOneAndUpdate({
    //                                 GainerCompanyId: TokenData.GainerCompanyId, CourseId: EachCourseId
    //                             },
    //                                 {
    //                                     $addToSet: { OrderId: { $each: findedTokenTransaction.orderId } }
    //                                 },
    //                                 {
    //                                     $addToSet: { Transaction: { $each: findedTokenTransaction._id } }
    //                                 },
    //                                 {
    //                                     $addToSet: { PaymentIds: { $each: findedTokenTransaction._id } }
    //                                 },

    //                                 {
    //                                     $set: {
    //                                         EmployeeIds: FilteredEmployeeData,
    //                                         MyTotalLogins: CoachinOrderedCourse.MyTotalLogins + CoachingCompanyGainerOrder.ForHowManyLogins,
    //                                     }
    //                                 },
    //                                 { new: true }
    //                             )
    //                         }
    //                     }
    //                     else {

    //                         let FilteredEmployeeData;
    //                         if (CoachingCompanyGainerOrder.status == 'Completed') {
    //                             TokenOfCourse = jwt.sign({ UserId: TokenData.GainerCompanyId, CourseId: EachCourseId, PaymentId: transaction._id, Status: 'PendingAmount' }, 'secret-for-now')

    //                             let TokenOfCourse = jwt.sign({ UserId: TokenData.GainerCompanyId, })
    //                             for (let EachOrderedEmployee of EmployessList) {
    //                                 FilteredEmployeeData = CoachinOrderedCourse.EmployeeIds.map((EachCurrentEmployee) => {
    //                                     if (EachCurrentEmployee.EmployeeId == EachOrderedEmployee) {
    //                                         return {
    //                                             LoginsAccess: true,
    //                                             EmployeeId: EachCurrentEmployee.EmployeeId
    //                                         }
    //                                     }
    //                                     else if (EachCurrentEmployee.EmployeeId !== EachOrderedEmployee) {
    //                                         return {
    //                                             LoginsAccess: EachCurrentEmployee.LoginsAccess,
    //                                             EmployeeId: EachCurrentEmployee.EmployeeId
    //                                         }
    //                                     }
    //                                     else {
    //                                         return {
    //                                             LoginsAccess: true,
    //                                             EmployeeId: EachOrderedEmployee
    //                                         }
    //                                     }

    //                                 })
    //                             }
    //                             let updateEmployeeLogins = await CoachingGainerCompanyOrder.CoachingGainerCompnaiesOrder.findOneAndUpdate({
    //                                 GainerCompanyId: TokenData.GainerCompanyId, CourseId: EachCourseId
    //                             },
    //                                 {
    //                                     $addToSet: { OrderId: { $each: findedTokenTransaction.orderId } }
    //                                 },
    //                                 {
    //                                     $addToSet: { Transaction: { $each: findedTokenTransaction._id } }
    //                                 },
    //                                 {
    //                                     $addToSet: { PaymentIds: { $each: findedTokenTransaction._id } }
    //                                 },

    //                                 {
    //                                     $set: {
    //                                         EmployeeIds: FilteredEmployeeData,
    //                                     }
    //                                 },
    //                                 { new: true }
    //                             )
    //                             if (updateEmployeeLogins) {
    //                                 let updateLogins = await CoachingGainerCompanyOrder.CoachingGainerCompnaiesOrder.findOneAndUpdate({
    //                                     GainerCompanyId: TokenData.GainerCompanyId, CourseId: EachCourseId
    //                                 }, {
    //                                     $set: {
    //                                         MyTotalLogins: updateEmployeeLogins.MyTotalLogins + CoachingCompanyGainerOrder.ForHowManyLogins,
    //                                         PendingLogins: updateEmployeeLogins.MyTotalLogins - updateEmployeeLogins.EmployeeIds.length
    //                                     }
    //                                 })
    //                                 updatedEmployeeLoginsIds.push(updateEmployeeLogins._id)
    //                             }
    //                             else {
    //                                 NotUpdatedEmployeeLoginsIds.push(EachCourseId)
    //                             }
    //                         }
    //                     }

    //                     return resp.status(200).json({ message: "CSV uploaded successfully", success: true });
    //                 } catch (error) {
    //                     console.error("Error inserting data:", error.message);
    //                     this.cleanupUploadedFiles(req.files);
    //                     return resp.status(500).json({ message: 'Something went wrong', error: error.message, success: false });
    //                 } finally {
    //                     fs.unlink(csvFilePath, (err) => {
    //                         if (err) console.error('Error deleting CSV file:', err);
    //                     });
    //                 }
    //             });
    //         }

    //         if (updatedEmployeeLoginsIds || updatedEmployeeLoginsIds.length !== 0) {
    //             for (let EachOrder of updatedEmployeeLoginsIds) {
    //                 let FindedOrder = await CoachingGainerCompanyOrder.CoachingGainerCompnaiesOrder.findOne({
    //                     _id: EachOrder
    //                 })
    //                 if (FindedOrder) {
    //                     let existingCourse = await CoachingCourseController.getCoachingCourseData({ _id: FindedOrder.CourseId })
    //                     if (existingCourse) {
    //                         if (existingCourse.CourseContent || existingCourse.CourseContent.length !== 0 || existingCourse.CourseContent[0].CourseData.length !== 0) {
    //                             let PlayList = [];
    //                             let UpdateEmployees = [];
    //                             let NotUpdatedEmployees = [];
    //                             for (let EachPlaylist of existingCourse.CourseContent) {
    //                                 let VideoIds = [];
    //                                 let QuizData = [];
    //                                 let PlayListData = {
    //                                     Heading: EachPlaylist.Heading,
    //                                     PlayListId: EachPlaylist._id
    //                                 }
    //                                 for (let EachVideoId of EachPlaylist.CourseData) {
    //                                     let VideoData = {
    //                                         VideoId: EachVideoId
    //                                     }
    //                                     let findedVideo = await CoachingVideoModel.findOne({ _id: EachVideoId })
    //                                     if (findedVideo.Quizes) {
    //                                         findedVideo.Quizes.forEach((EachQuizId) => {
    //                                             let EachQuiz = {
    //                                                 QuizId: EachQuizId
    //                                             }
    //                                             QuizData.push(EachQuiz)
    //                                         })
    //                                     }
    //                                     VideoData.QuizData = QuizData
    //                                     VideoIds.push(VideoData)
    //                                 }
    //                                 PlayListData.VideoData = VideoIds
    //                                 PlayList.push(PlayListData)
    //                             }
    //                             let token = jwt.sign({ CourseId: EachCourseId, GainerCompanyId: GainerCompanyId, OrderId: transactionDetails.orderId }, 'secret-for-now')
    //                             let TotalLoginsSaved = 0;
    //                             for (let EachEmployee of FindedOrder.EmployeeIds) {
    //                                 let findedEmployeeData = await CoachingGainerCompanyOrder.coachingGainerCompanyEmployees.findOne({
    //                                     EmployeeId: EachEmployee,
    //                                     GainerCompanyId: TokenData.GainerCompanyId,
    //                                     OrderId: transactionDetails.orderId,
    //                                     CourseId: EachCourseId
    //                                 })
    //                                 if (!findedEmployeeData) {
    //                                     continue;

    //                                 }
    //                                 let EmployeeData = {
    //                                     companyId,
    //                                     EmployeeId: EachEmployee,
    //                                     GainerCompanyId: TokenData.GainerCompanyId,
    //                                     OrderId: transactionDetails.OrderId,
    //                                     CourseId: EachCourseId,
    //                                     CourseContent: PlayList,
    //                                     TokenOfCourse: token,
    //                                     valid: true
    //                                 }
    //                                 let result = new CoachingGainerCompanyOrder.coachingGainerCompanyEmployees(EmployeeData)
    //                                 result = await result.save();
    //                                 if (result) {
    //                                     TotalLoginsSaved = TotalLoginsSaved + 1;
    //                                     AvailableLogins = AvailableLogins - 1;
    //                                     FilteredEmployeeData.forEach((OldEachEmployee) => {
    //                                         if (OldEachEmployee._id == EachEmployee) {
    //                                             UpdateEmployees.push(result.EmployeeId)
    //                                         }
    //                                     })
    //                                 }
    //                                 else {
    //                                     FilteredEmployeeData.forEach((OldEachEmployee) => {
    //                                         if (OldEachEmployee._id == EachEmployee) {
    //                                             NotUpdatedEmployees.push(OldEachEmployee)
    //                                         }
    //                                     })

    //                                 }
    //                             }
    //                             if (NotUpdatedEmployeeLoginsIds || NotUpdatedEmployeeLoginsIds.length !== 0) {
    //                                 let upddateLogins = await CoachingGainerCompanyOrder.findOneAndUpdate({
    //                                     GainerCompanyId: TokenData.GainerCompanyId, CourseId: EachCourseId
    //                                 },
    //                                     {
    //                                         $set: {
    //                                             PendingLogins: FindedOrder.PendingLogins + NotUpdatedEmployees.length
    //                                         }
    //                                     }, {
    //                                     new: true
    //                                 }
    //                                 )

    //                                 const transporter = nodemailer.createTransport({
    //                                     service: 'Gmail',
    //                                     auth: {
    //                                         user: 'akshayp09988@gmail.com',
    //                                         pass: '12345678'
    //                                     }
    //                                 });
    //                                 const filepath = path.join(publicdirPath, 'WrongEmployeeListData.csv')
    //                                 if (fs.existsSync(filepath)) {
    //                                     fs.unlinkSync(filepath)
    //                                 }
    //                                 const csvWriter = createCsvWriter({
    //                                     path: filepath,
    //                                     header: [
    //                                         { id: 'EmployeeName', title: 'EmployeeName' },
    //                                         { id: 'EmployeeEmail', title: 'EmployeeEmail' },
    //                                         { id: 'EmployeeMobileNo', title: 'EmployeeMobileNo' },
    //                                         { id: 'EmployeePic', title: 'EmployeePic' },
    //                                         { id: 'EmployeePassword', title: 'EmployeePassword' },
    //                                     ]
    //                                 });

    //                                 csvWriter.writeRecords(NotUpdatedEmployees)
    //                                     .then(() => {
    //                                         console.log('CSV file created successfully!');
    //                                     });

    //                                 const mailOptions = {
    //                                     from: '"Your App" <akshayp09988@gmail.com>',
    //                                     to: 'useremail@gmail.com',
    //                                     subject: 'Complete your payment',
    //                                     attachments: [
    //                                         {
    //                                             filename: 'WrongEmployeeListData.csv',
    //                                             path: filepath
    //                                         }
    //                                     ],
    //                                     html: `<p>Hello,</p>
    //                                                  <p>The following employess is not added in ${existingCourse.CourseName}</p>
    //                                                  <p>And Please ensure All Data Are Correctlty Filled</p>`
    //                                 };
    //                                 transporter.sendMail(mailOptions, (error, info) => {
    //                                     if (error) {
    //                                         console.error('Error sending mail:', error);
    //                                     } else {
    //                                         console.log('Email sent:', info.response);
    //                                     }
    //                                 });

    //                             }
    //                             if (UpdateEmployees || UpdateEmployees.length !== 0) {
    //                                 let upddateLogins = await CoachingGainerCompanyOrder.findOneAndUpdate({
    //                                     GainerCompanyId: TokenData.GainerCompanyId, CourseId: EachCourseId
    //                                 },
    //                                     {
    //                                         $set: {
    //                                             PendingLogins: FindedOrder.PendingLogins - UpdateEmployees.length
    //                                         }
    //                                     }, {
    //                                     new: true
    //                                 }
    //                                 )
    //                                 const transporter = nodemailer.createTransport({
    //                                     service: 'Gmail',
    //                                     auth: {
    //                                         user: 'akshayp09988@gmail.com',
    //                                         pass: '12345678'
    //                                     }
    //                                 });
    //                                 const filepath = path.join(publicdirPath, `addedEmployeeData-${EachCourseId}-${TokenData.GainerCompanyId}.csv`)
    //                                 if (fs.existsSync(filepath)) {
    //                                     fs.unlinkSync(filepath)
    //                                 }
    //                                 const csvWriter = createCsvWriter({
    //                                     path: filepath,
    //                                     header: [
    //                                         { id: 'EmployeeName', title: 'EmployeeName' },
    //                                         { id: 'EmployeeEmail', title: 'EmployeeEmail' },
    //                                         { id: 'EmployeeMobileNo', title: 'EmployeeMobileNo' },
    //                                         { id: 'EmployeePic', title: 'EmployeePic' },
    //                                         { id: 'EmployeePassword', title: 'EmployeePassword' },
    //                                     ]
    //                                 });

    //                                 csvWriter.writeRecords(UpdateEmployees)
    //                                     .then(() => {
    //                                         console.log('CSV file created successfully!');
    //                                     });

    //                                 const mailOptions = {
    //                                     from: '"Your App" <akshayp09988@gmail.com>',
    //                                     to: 'useremail@gmail.com',
    //                                     subject: 'Complete your payment',
    //                                     attachments: [
    //                                         {
    //                                             filename: 'WrongEmployeeListData.csv',
    //                                             path: filepath
    //                                         }
    //                                     ],
    //                                     html: `<p>Hello,</p>
    //                                                  <p>The following employess is not added in ${existingCourse.CourseName}</p>
    //                                                  <p>And Please ensure All Data Are Correctlty Filled</p>`
    //                                 };
    //                                 transporter.sendMail(mailOptions, (error, info) => {
    //                                     if (error) {
    //                                         console.error('Error sending mail:', error);
    //                                     } else {
    //                                         console.log('Email sent:', info.response);
    //                                     }
    //                                 });

    //                             }

    //                             if (WrongEmployeeListData || WrongEmployeeListData.length !== 0) {
    //                                 const filepath = path.join(publicdirPath, 'WrongEmployeeListData.csv')
    //                                 if (fs.existsSync(filepath)) {
    //                                     fs.unlinkSync(filepath)
    //                                 }
    //                                 const csvWriter = createCsvWriter({
    //                                     path: filepath,
    //                                     header: [
    //                                         { id: 'EmployeeName', title: 'EmployeeName' },
    //                                         { id: 'EmployeeEmail', title: 'EmployeeEmail' },
    //                                         { id: 'EmployeeMobileNo', title: 'EmployeeMobileNo' },
    //                                         { id: 'EmployeePic', title: 'EmployeePic' },
    //                                         { id: 'EmployeePassword', title: 'EmployeePassword' },
    //                                     ]
    //                                 });

    //                                 csvWriter.writeRecords(WrongEmployeeListData)
    //                                     .then(() => {
    //                                         console.log('CSV file created successfully!');
    //                                     });

    //                                 const transporter = nodemailer.createTransport({
    //                                     service: 'Gmail',
    //                                     auth: {
    //                                         user: 'akshayp09988@gmail.com',
    //                                         pass: '12345678'
    //                                     }
    //                                 });

    //                                 const mailOptions = {
    //                                     from: '"Your App" <akshayp09988@gmail.com>',
    //                                     to: 'useremail@gmail.com',
    //                                     subject: 'Complete your payment',
    //                                     attachments: [
    //                                         {
    //                                             filename: 'WrongEmployeeListData.csv',
    //                                             path: filepath
    //                                         }
    //                                     ],
    //                                     html: `<p>Hello,</p>
    //                                                  <p>Please Check This Data And Reupload This Data</p>
    //                                                  <p>And Please ensure All Data Are Correctlty Filled</p>`
    //                                 };
    //                                 transporter.sendMail(mailOptions, (error, info) => {
    //                                     if (error) {
    //                                         console.error('Error sending mail:', error);
    //                                     } else {
    //                                         console.log('Email sent:', info.response);
    //                                     }
    //                                 });
    //                             }
    //                             if (!result) {
    //                                 return resp.status(400).json({ message: 'Data not added something went wrong', success: false })
    //                             }
    //                             return resp.status(200).json({ data: result, success: true });

    //                         }
    //                     }
    //                     if (FindedOrder && FindedOrder.EmployeeIds && FindedOrder.EmployeeIds.length !== 0 && existingCourse) {
    //                         for (let EachEployee of FindedOrder.EmployeeIds) {

    //                             this.cleanupUnusedImages(uploadedImages, csvListedImages);
    //                         }
    //                     }
    //                 }



    //             }
    //         }


    //     } catch (error) {
    //         console.error("Unexpected error:", error.message);
    //         return resp.status(500).json({ message: 'Internal server error', error: error.message, success: false });
    //     }
    // }
    // async uploadEmployeesListCsvForAutomaticPassword(req, resp) {
    //     try {
    //         const { GainerCompanyId, CourseIds, companyId, OrderId } = req.body;
    //         if (!req.files || !req.files.csvFile) {
    //             return resp.status(400).json({ message: 'Please upload a CSV file', success: false });
    //         }
    //         const csvFilePath = req.files.csvFile[0].path;
    //         const uploadedImages = req.files.employeesImages ? req.files.employeesImages.map((img) => img.originalname) : [];

    //         const csvListedImages = new Set();

    //         const stream = fs.createReadStream(csvFilePath).pipe(csvParser());
    //         let EmployessList = [];
    //         let WrongEmployeeListData = [];
    //         for (let EachCourseId of CourseIds) {
    //             let FindedCourseOrder = await CoachingGainerCompanyOrder.findOne({
    //                 GainerCompanyId: GainerCompanyId,
    //                 CourseId: EachCourseId
    //             })
    //             let FindedCourse = await CoachingCourseModel.findOne({ _id: EachCourseId })
    //             let FindedGainerCompany = await CoachingGainerCompaniesModel.findOne({ _id: GainerCompanyId })
    //             if (!FindedCourseOrder || !FindedCourse || !FindedGainerCompany || !companyId || !OrderId || !CourseIds || !GainerCompanyId) {
    //                 this.cleanupUploadedFiles(uploadedImages)
    //                 return resp.status(400).json({ message: 'something wrong to find detail', success: false })
    //             }

    //             const csvListedImages = new Set();

    //             stream.on('data', async (row) => {
    //                 try {

    //                     let EmployeePic;
    //                     if (uploadedImages.includes(row['EmployeePic'])) {
    //                         EmployeePic = row['EmployeePic']
    //                         csvListedImages.add(img);
    //                     }
    //                     else {
    //                         EmployeePic = null;
    //                     }
    //                     if (row["EmployeeEmail"]) {
    //                         let randomPassword = Date.now() + '-' + Math.round(Math.random() * 1E9)
    //                         const salt = await bcrypt.genSalt(10);
    //                         Password = await bcrypt.hash(randomPassword, salt);
    //                         EmployessList.push({
    //                             EmployeeName: row["EmployeeName"],
    //                             EmployeeEmail: row["EmployeeEmail"],
    //                             EmployeeMobileNo: row["EmployeeMobileNo"],
    //                             EmployeePic: EmployeePic,
    //                             EmployeePassword: Password
    //                         });
    //                     }
    //                     else {
    //                         WrongEmployeeListData.push({
    //                             EmployeeName: row["EmployeeName"],
    //                             EmployeeEmail: row["EmployeeEmail"],
    //                             EmployeeMobileNo: row["EmployeeMobileNo"],
    //                             EmployeePic: EmployeePic,
    //                         });
    //                     }

    //                 } catch (error) {
    //                     this.cleanupUploadedFiles(uploadedImages)
    //                     console.error("Error processing CSV row:", error.message);
    //                 }
    //             });

    //             stream.on("end", async () => {
    //                 try {

    //                     let FilteredEmployeeList;
    //                     let FindedEmployeeList = await CoachingGainerCompaniesModel.findOne({ companyId: companyId, _id: GainerCompanyId })
    //                     if (FindedEmployeeList.Employees && FindedEmployeeList.Employees.length !== 0) {
    //                         for (let EachEmployee of FindedEmployeeList.Employees) {
    //                             FilteredEmployeeList = EmployessList.filter((EachCurrentEmployee) => {
    //                                 return EachEmployee.EmployeeEmail !== EachCurrentEmployee.EmployeeEmail
    //                             })
    //                         }
    //                     }
    //                     let addEmployeeListInCoachingGainerCompany = await CoachingGainerCompaniesModel.findOneAndUpdate({
    //                         _id: GainerCompanyId, companyId: companyId
    //                     }, {
    //                         $addToSet: { Employees: { $each: FilteredEmployeeList } }
    //                     },
    //                         { new: true }
    //                     )
    //                     if (addEmployeeListInCoachingGainerCompany) {
    //                         let EmployeesIdsOfCurrentCourse;
    //                         for (let EachOldEmployee of addEmployeeListInCoachingGainerCompany.Employees) {
    //                             EmployeesIdsOfCurrentCourse = EmployessList.map((EachCurrentEmployee) => {
    //                                 if (EachCurrentEmployee.EmployeeEmail == EachOldEmployee.EmployeeEmail) {
    //                                     return EachOldEmployee._id
    //                                 }
    //                             })
    //                         }
    //                         let updateCoachingGainerCompanyOrder = await CoachingGainerCompanyOrder.findOneAndUpdate({
    //                             _id: OrderId, companyId: companyId
    //                         },
    //                             {
    //                                 $addToSet: { EmployeeIds: { $each: EmployeesIdsOfCurrentCourse } }
    //                             },
    //                             {
    //                                 new: true
    //                             }
    //                         )
    //                     }
    //                     for (let EachCourseId of CourseIds) {
    //                         let existingCourse = await CoachingCourseModel.findOne({ _id: EachCourseId })
    //                         let CoachingCompanyGainerOrder = await CoachingGainerCompanyOrder.findOne({ _id: OrderId })
    //                         let AvailableLogins = CoachingCompanyGainerOrder.MyTotalLogins - PendingLogins
    //                         if (existingCourse && CoachingCompanyGainerOrder) {

    //                             if (existingCourse.CourseContent || existingCourse.CourseContent.length !== 0 || existingCourse.CourseContent[0].CourseData.length !== 0) {
    //                                 let PlayList = [];
    //                                 for (let EachPlaylist of existingCourse.CourseContent) {
    //                                     let VideoIds = [];
    //                                     let QuizData = [];
    //                                     let PlayListData = {
    //                                         Heading: EachPlaylist.Heading,
    //                                         PlayListId: EachPlaylist._id
    //                                     }
    //                                     for (let EachVideoId of EachPlaylist.CourseData) {
    //                                         let VideoData = {
    //                                             VideoId: EachVideoId
    //                                         }
    //                                         let findedVideo = await CoachingVideoModel.findOne({ _id: EachVideoId })
    //                                         if (findedVideo.Quizes) {
    //                                             findedVideo.Quizes.forEach((EachQuizId) => {
    //                                                 let EachQuiz = {
    //                                                     QuizId: EachQuizId
    //                                                 }
    //                                                 QuizData.push(EachQuiz)
    //                                             })
    //                                         }
    //                                         VideoData.QuizData = QuizData
    //                                         VideoIds.push(VideoData)
    //                                     }
    //                                     PlayListData.VideoData = VideoIds
    //                                     PlayList.push(PlayListData)
    //                                 }
    //                                 let token = jwt.sign({ CourseId: EachCourseId, GainerCompanyId: GainerCompanyId }, 'secret-for-now')
    //                                 CourseData.TokenOfCourse = token
    //                                 let TotalLoginsSaved = 0;
    //                                 for (let EachEmployee of EmployeeIds) {
    //                                     if (AvailableLogins <= 0) {
    //                                         return;
    //                                     }
    //                                     let EmployeeData = {
    //                                         companyId,
    //                                         EmployeeId: EachEmployee,
    //                                         GainerCompanyId: GainerCompanyId,
    //                                         OrderId: OrderId,
    //                                         CourseId: EachCourseId,
    //                                         CourseContent: PlayList,
    //                                         TokenOfCourse: CoachingCompanyGainerOrder.TokenOfCourse,
    //                                     }
    //                                     if (CoachingCompanyGainerOrder.PaymentStatus == 'Completed') {
    //                                         EmployeeData.CourseCompleted = true
    //                                     }
    //                                     else {
    //                                         EmployeeData.CourseCompleted = false
    //                                     }
    //                                     let result = new CoachingGainerCompanyOrder.coachingGainerCompanyEmployees(EmployeeData)
    //                                     result = await result.save();
    //                                     if (result) {
    //                                         TotalLoginsSaved = TotalLoginsSaved + 1;
    //                                         AvailableLogins = AvailableLogins - 1;
    //                                     }
    //                                 }
    //                                 let upddateLogins = await CoachingGainerCompanyOrder.findOneAndUpdate({
    //                                     _id: OrderId, companyId: companyId
    //                                 },
    //                                     {
    //                                         $set: {
    //                                             PendingLogins: CoachingCompanyGainerOrder.MyTotalLogins - TotalLoginsSaved
    //                                         }
    //                                     }, {
    //                                     new: true
    //                                 }
    //                                 )
    //                                 if (WrongEmployeeListData || WrongEmployeeListData.length !== 0) {

    //                                     const filepath = path.join(publicdirPath, 'WrongEmployeeListData.csv')
    //                                     if (fs.existsSync(filepath)) {
    //                                         fs.unlinkSync(filepath)
    //                                     }
    //                                     const csvWriter = createCsvWriter({
    //                                         path: filepath,
    //                                         header: [
    //                                             { id: 'EmployeeName', title: 'EmployeeName' },
    //                                             { id: 'EmployeeEmail', title: 'EmployeeEmail' },
    //                                             { id: 'EmployeeMobileNo', title: 'EmployeeMobileNo' },
    //                                             { id: 'EmployeePic', title: 'EmployeePic' },
    //                                         ]
    //                                     });

    //                                     csvWriter.writeRecords(WrongEmployeeListData)
    //                                         .then(() => {
    //                                             console.log('CSV file created successfully!');
    //                                         });

    //                                     const transporter = nodemailer.createTransport({
    //                                         service: 'Gmail',
    //                                         auth: {
    //                                             user: 'akshayp09988@gmail.com',
    //                                             pass: '12345678'
    //                                         }
    //                                     });

    //                                     const mailOptions = {
    //                                         from: '"Your App" <akshayp09988@gmail.com>',
    //                                         to: 'useremail@gmail.com',
    //                                         subject: 'Complete your payment',
    //                                         attachments: [
    //                                             {
    //                                                 filename: 'WrongEmployeeListData.csv',
    //                                                 path: filepath
    //                                             }
    //                                         ],
    //                                         html: `<p>Hello,</p>
    //                                                          <p>Please Check This Data And Reupload This Data</p>
    //                                                          <p>And Please ensure All Data Are Correctlty Filled</p>`
    //                                     };
    //                                     transporter.sendMail(mailOptions, (error, info) => {
    //                                         if (error) {
    //                                             console.error('Error sending mail:', error);
    //                                         } else {
    //                                             console.log('Email sent:', info.response);
    //                                         }
    //                                     });
    //                                 }
    //                                 if (!result) {
    //                                     return resp.status(400).json({ message: 'Data not added something went wrong', success: false })
    //                                 }
    //                                 return resp.status(200).json({ data: result, success: true });

    //                             }
    //                         }
    //                     }
    //                     this.cleanupUnusedImages(uploadedImages, csvListedImages);

    //                     return resp.status(200).json({ message: "CSV uploaded successfully", success: true });
    //                 } catch (error) {
    //                     console.error("Error inserting data:", error.message);
    //                     this.cleanupUploadedFiles(req.files);
    //                     return resp.status(500).json({ message: 'Something went wrong', error: error.message, success: false });
    //                 } finally {
    //                     fs.unlink(csvFilePath, (err) => {
    //                         if (err) console.error('Error deleting CSV file:', err);
    //                     });
    //                 }
    //             });
    //         }

    //     } catch (error) {
    //         console.error("Unexpected error:", error.message);
    //         return resp.status(500).json({ message: 'Internal server error', error: error.message, success: false });
    //     }
    // }
}

module.exports = new CourseOrderService();