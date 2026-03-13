const mongoose = require('mongoose');

const teacherActivitySchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    activityType: { 
        type: String, 
        enum: ['login', 'lesson_created', 'assignment_created', 'attendance_marked', 'assignment_graded', 'video_shared'],
        required: true 
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TeacherActivity', teacherActivitySchema);
