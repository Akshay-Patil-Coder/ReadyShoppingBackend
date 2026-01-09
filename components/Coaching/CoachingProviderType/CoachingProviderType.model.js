const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")

const coachingProviderSchema = new mongoose.Schema({
    CourseProviderType: {
        type: String,
        required: true,
        unique:true
    },
    CourseProviderTypeImage: {
        type: String,
        required: true
    },
}, {
    timestamps: true
});
module.exports = mongoose.model("CoachingProviderType", coachingProviderSchema);
