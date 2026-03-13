const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    subject: { type: String, required: true },
    class: { type: String, required: true }, // Target class for lesson
    section: { type: String, required: true }, // Target section for lesson
    grade: { type: String, required: true }, // For backward compatibility
    attachment_url: { type: String }, // File attachment URL
    videoUrl: { type: String },
    videoFile: { type: String },
    assignmentFile: { type: String },
    notes: { type: String },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    isCompleted: { type: Boolean, default: false },
    completedDate: { type: Date },
    scheduledDate: { type: Date, required: true },
    duration: { type: Number, required: true },
    objectives: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lesson', lessonSchema);