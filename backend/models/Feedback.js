const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    understanding: { type: String, enum: ['poor', 'fair', 'good', 'excellent'], required: true },
    difficulty: { type: String, enum: ['very_easy', 'easy', 'moderate', 'hard', 'very_hard'], required: true },
    comments: { type: String },
    suggestions: { type: String },
    createdAt: { type: Date, default: Date.now }
});

feedbackSchema.index({ lessonId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);