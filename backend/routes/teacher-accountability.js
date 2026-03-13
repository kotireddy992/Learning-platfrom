
// ==================== TEACHER ACCOUNTABILITY ROUTES ====================

// Get teacher performance metrics
router.get('/teachers/performance', auth, authorize('admin'), async (req, res) => {
    try {
        const TeacherActivity = require('../models/TeacherActivity');
        const TeacherPerformance = require('../models/TeacherPerformance');
        const Assignment = require('../models/Assignment');
        const AssignmentSubmission = require('../models/AssignmentSubmission');
        const SharedVideo = require('../models/SharedVideo');
        
        const teachers = await Teacher.find().populate('userId', 'name email');
        const performanceData = [];
        
        for (const teacher of teachers) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const lessonsCreated = await Lesson.countDocuments({ teacherId: teacher._id, createdAt: { $gte: thirtyDaysAgo } });
            const assignmentsCreated = await Assignment.countDocuments({ teacherId: teacher._id, createdAt: { $gte: thirtyDaysAgo } });
            const videosShared = await SharedVideo.countDocuments({ teacherId: teacher._id, createdAt: { $gte: thirtyDaysAgo } });
            const attendanceMarked = await Attendance.countDocuments({ teacherId: teacher._id, date: { $gte: thirtyDaysAgo } });
            
            const pendingGrading = await AssignmentSubmission.countDocuments({ 
                assignmentId: { $in: (await Assignment.find({ teacherId: teacher._id }).select('_id')).map(a => a._id) },
                status: 'submitted'
            });
            
            const avgFeedback = await Feedback.aggregate([
                { $match: { teacherId: teacher._id } },
                { $group: { _id: null, avgRating: { $avg: '$rating' } } }
            ]);
            
            performanceData.push({
                teacherId: teacher._id,
                teacherName: teacher.userId.name,
                subject: teacher.subject,
                metrics: {
                    lessonsCreated,
                    assignmentsCreated,
                    videosShared,
                    attendanceMarked,
                    pendingGrading,
                    avgStudentRating: avgFeedback[0]?.avgRating || 0
                }
            });
        }
        
        res.json(performanceData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get inactive teachers alert
router.get('/teachers/inactive-alert', auth, authorize('admin'), async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const teachers = await Teacher.find().populate('userId', 'name email');
        const inactiveTeachers = [];
        
        for (const teacher of teachers) {
            const recentActivity = await Lesson.countDocuments({ 
                teacherId: teacher._id, 
                createdAt: { $gte: sevenDaysAgo } 
            });
            
            if (recentActivity === 0) {
                inactiveTeachers.push({
                    teacherId: teacher._id,
                    teacherName: teacher.userId.name,
                    subject: teacher.subject,
                    lastActivity: await Lesson.findOne({ teacherId: teacher._id }).sort({ createdAt: -1 }).select('createdAt')
                });
            }
        }
        
        res.json(inactiveTeachers);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
