const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    approvedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovedStudent' },
    filePath: { type: String }, // student's submission file path
    filename: { type: String }, // original filename
    comments: { type: String }, // student's comments
    submittedAt: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['submitted', 'graded', 'late', 'pending'], 
        default: 'submitted' 
    },
    grade: { type: Number, min: 0, max: 100 },
    feedback: { type: String }, // teacher's feedback
    gradedAt: { type: Date },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
});

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 });
assignmentSubmissionSchema.index({ studentId: 1, submittedAt: -1 });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);