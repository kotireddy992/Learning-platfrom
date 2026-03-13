const mongoose = require('mongoose');

const approvedStudentSchema = new mongoose.Schema({
    email: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    studentName: { type: String, required: true },
    rollNumber: { type: String, required: true },
    grade: { type: String, required: true },
    section: { type: String, required: true },
    parentPhone: { type: String },
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date },
    attendanceDays: { type: Number, default: 0 },
    totalSchoolDays: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Compound index to prevent same teacher from approving same email twice
approvedStudentSchema.index({ email: 1, teacherId: 1 }, { unique: true });

module.exports = mongoose.model('ApprovedStudent', approvedStudentSchema);