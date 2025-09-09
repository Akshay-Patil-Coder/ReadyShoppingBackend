const mongoose = require("mongoose");
const { ObjectId } = require("mongodb")

const coachingProviderSchema = new mongoose.Schema({
    CourceProviderType: {
        type: String,
        required: true,
        unique:true
    },
    CourceProviderTypeImage: {
        type: String,
        required: true
    },
}, {
    timestamps: true
});
module.exports = mongoose.model("CoachingProviderType", coachingProviderSchema);
