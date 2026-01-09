const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const { type } = require("os");
const { Certificate } = require("crypto");

const QuizSchema = new mongoose.Schema({
    ProviderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ProviderType: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ConnectedWith: [{
        connectedType: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        connectedIds: [{
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        }]
    }],
    HeadCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    SubCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true,
    },
    QuizType: {
        type: String
    },
    CodingQuiz: {
        CodingQuestion: {
            type: String
        },
        CodingAnswer: {
            type: String
        }
    },
    PractiseTestQuiz: [{
        PractiseTestQuestion: {
            type: String
        },
        PractiseTestAnswer: {
            type: String
        }
    }],
    McqQuiz: [{
        McqQuestion: {
            type: String
        },
        McqOptions: [{
            type: String
        }],
        McqAnswer: {
            type: String
        }
    }]
}, {
    timestamps: true
})

let QuizModel = mongoose.model("CourseQuize", QuizSchema);

module.exports.QuizModel = QuizModel


const CourseVideoSchema = new mongoose.Schema({
    videoFile: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    paid: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
    },
    VideoDuration: {
        type: Number
    },
    ProviderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ProviderType: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ConnectedWith: [{
        connectedType: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        connectedIds: [{
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        }]
    }],
    HeadCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    SubCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true,
    },
    Subtitles: [{
        Language: {
            type: String
        },
        SubtitleFile: {
            type: String
        }
    }],
    VideoLanguages: [{
        Language: {
            type: String
        },
        VideoLanguagesFile: {
            type: String
        }
    }],
    Quizes: [{
        type: mongoose.Schema.Types.ObjectId,
    }]
}, {
    timestamps: true
})

let CoachingVideoModel = mongoose.model("CoachingVideo", CourseVideoSchema);

module.exports.CoachingVideoModel = CoachingVideoModel

const coachingCourseSchema = new mongoose.Schema({
    CourseName: {
        type: String,
        required: true
    },
    Skills: [
        {
            type: String,
            required: true
        }
    ],
    SkillsId: [
        {
            type: mongoose.Schema.Types.ObjectId
        }
    ],
    ProviderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ProviderType: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    ConnectedWith: [{
        connectedType: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        connectedIds: [{
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        }]
    }],
    HeadCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    SubCourseCatId: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }],
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    CourseDuration: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true,
    },
    CourseThumbnail: {
        type: String,
        required: true
    },
    Certificate: {
        type: String
    },
    CertificateConfig:{
      fields:{},
    //   logoRow:{},
    //   ProviderLogo:{},
    //   CompanyLogo:{}
    },
    CourseContent: [{
        Heading: {
            type: String
        },
        CourseData: [{
            type: mongoose.Schema.Types.ObjectId,
        }]
    }],
    Price: {
        type: Number,
        default: null
    },
    TextAreas: [
        {
            Head: {
                type: String
            },
            Points: [{
                type: String
            }],
            Description: {
                type: String
            }
        }
    ],
    Level: {
        type: String,
    },
    offerPercentage: {
        type: Number,
        default: null
    },
    Students: [
        {
            type: mongoose.Schema.Types.ObjectId
        }
    ]
}, {
    timestamps: true
});
let CoachingCourseModel = mongoose.model("CoachingCourse", coachingCourseSchema);

module.exports.CoachingCourseModel = CoachingCourseModel



