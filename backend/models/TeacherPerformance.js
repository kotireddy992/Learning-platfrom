const mongoose = require('mongoose');

const teacherPerformanceSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    metrics: {
        lessonsCreated: { type: Number, default: 0 },
        assignmentsCreated: { type: Number, default: 0 },
        assignmentsGraded: { type: Number, default: 0 },
        attendanceMarked: { type: Number, default: 0 },
        videosShared: { type: Number, default: 0 },
        avgGradingTime: { type: Number, default: 0 }, // in hours
        studentFeedbackAvg: { type: Number, default: 0 },
        loginCount: { type: Number, default: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('TeacherPerformance', teacherPerformanceSchema);
