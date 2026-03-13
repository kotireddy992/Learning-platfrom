const mongoose = require('mongoose');

const teacherAttendanceSchema = new mongoose.Schema({
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Teacher', 
        required: true 
    },
    date: { 
        type: Date, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Present', 'Absent', 'Leave'], 
        required: true 
    },
    markedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    markedAt: { 
        type: Date, 
        default: Date.now 
    },
    notes: { 
        type: String 
    },
    editHistory: [{
        previousStatus: String,
        newStatus: String,
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        editedAt: { type: Date, default: Date.now },
        reason: String
    }]
}, { timestamps: true });

// Compound index for efficient queries
teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });
teacherAttendanceSchema.index({ date: 1 });

module.exports = mongoose.model('TeacherAttendance', teacherAttendanceSchema);
