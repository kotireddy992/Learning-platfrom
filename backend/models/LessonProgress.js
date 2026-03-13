const mongoose = require('mongoose');

const lessonProgressSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    
    // Progress tracking
    status: { 
        type: String, 
        enum: ['not_started', 'in_progress', 'completed'], 
        default: 'not_started' 
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    
    // Video tracking
    videoWatched: { type: Boolean, default: false },
    videoProgress: { type: Number, default: 0, min: 0, max: 100 },
    videoStartedAt: { type: Date },
    videoCompletedAt: { type: Date },
    
    // Assignment tracking
    assignmentDownloaded: { type: Boolean, default: false },
    assignmentCompleted: { type: Boolean, default: false },
    assignmentSubmittedAt: { type: Date },
    
    // Time tracking
    timeSpent: { type: Number, default: 0 }, // in minutes
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastAccessedAt: { type: Date, default: Date.now },
    
    // Notes
    studentNotes: { type: String },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
lessonProgressSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Indexes for better performance
lessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ teacherId: 1 });
lessonProgressSchema.index({ status: 1 });

module.exports = mongoose.model('LessonProgress', lessonProgressSchema);