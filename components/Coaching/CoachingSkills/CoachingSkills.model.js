const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")

const coachingSkillsSchema = new mongoose.Schema({
    SkillName: {
        type: String,
        required: true
    },
    HeadCourceCatId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    SubCourceCatId: {
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
