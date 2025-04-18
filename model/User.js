const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'user', 'seller'],
        default: 'user',
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;