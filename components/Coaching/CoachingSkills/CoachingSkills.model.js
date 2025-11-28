const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")

const coachingSkillsSchema = new mongoose.Schema({
    SkillName: {
        type: String,
        required: true
    },
    HeadCourseCatId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    SubCourseCatId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }, 
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
}, {
    timestamps: true
});
module.exports = mongoose.model("CoachingSkill", coachingSkillsSchema);
