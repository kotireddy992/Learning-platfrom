const mongoose = require('mongoose');

const lessonAssignmentSchema = new mongoose.Schema({
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    assignedDate: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['assigned', 'in_progress', 'completed'], 
        default: 'assigned' 
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    videoWatched: { type: Boolean, default: false },
    assignmentCompleted: { type: Boolean, default: false },
    progress: { type: Number, default: 0 }, // 0-100
    timeSpent: { type: Number, default: 0 }, // in minutes
    notes: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('LessonAssignment', lessonAssignmentSchema);