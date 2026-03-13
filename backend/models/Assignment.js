const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    class: { type: String, required: true },
    section: { type: String, required: true },
    assignmentType: { 
        type: String, 
        enum: ['assignment', 'quiz', 'project'], 
        default: 'assignment' 
    },
    filePath: { type: String }, // uploaded file path
    filename: { type: String }, // original filename
    externalLink: { type: String }, // optional quiz/external link
    dueDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

assignmentSchema.index({ teacherId: 1, class: 1, section: 1 });
assignmentSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);