const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Company'
    },
    assignvalues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'masterusers'
    }]
}, { timestamps: true });

module.exports = mongoose.model('companyaccesses', adminUserSchema);  
