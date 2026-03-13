const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    assignedClasses: [{
        class: { type: String, required: true },
        section: { type: String, required: true }
    }],
    // Legacy fields for backward compatibility
    assigned_class: { type: String, default: 'Grade 10A' },
    assigned_section: { type: String, default: 'A' },
    grade: { type: String, default: '10' },
    phone: { type: String, default: '0000000000' },
    address: { type: String },
    joinDate: { type: Date, default: Date.now },
    performanceScore: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    completedLessons: { type: Number, default: 0 },
    attendanceDays: { type: Number, default: 0 },
    totalWorkingDays: { type: Number, default: 0 }
});

module.exports = mongoose.model('Teacher', teacherSchema);