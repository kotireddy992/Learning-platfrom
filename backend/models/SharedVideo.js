const mongoose = require('mongoose');

const sharedVideoSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    class: {
        type: String,
        required: true,
        trim: true
    },
    section: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['youtube', 'upload'],
        required: true
    },
    url: {
        type: String,
        trim: true
    },
    filename: {
        type: String,
        trim: true
    },
    filePath: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SharedVideo', sharedVideoSchema);