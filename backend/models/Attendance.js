const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    approvedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovedStudent' },
    class: { type: String, required: true }, // Student's class for organization
    section: { type: String, required: true }, // Student's section for organization
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    checkInTime: { type: Date },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

attendanceSchema.index({ teacherId: 1, date: 1 });
attendanceSchema.index({ studentId: 1, date: 1 });
attendanceSchema.index({ approvedStudentId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);