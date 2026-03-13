const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentId: { type: String, unique: true, sparse: true },
    class: { type: String, default: '10' }, // Student's class
    section: { type: String, default: 'A' }, // Student's section
    grade: { type: String, default: '10' }, // For backward compatibility
    rollNumber: { type: String, required: true },
    parentPhone: { type: String },
    address: { type: String },
    enrollmentDate: { type: Date, default: Date.now },
    learningProgress: { type: Number, default: 0 },
    attendanceDays: { type: Number, default: 0 },
    totalSchoolDays: { type: Number, default: 0 },
    completedLessons: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);