// Improved assignment sharing backend - only fetch from enrolled teachers

router.get('/assignments', async (req, res) => {
    try {
        console.log('\n=== ASSIGNMENTS REQUEST ===');
        console.log('User:', req.user.email);
        
        let student = req.student || await ensureCompleteStudentProfile(req.user._id, req.user.email);
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find({ email: req.user.email });
        
        console.log('Approved by teachers:', approvedStudents.length);
        
        if (approvedStudents.length === 0) {
            return res.json([]);
        }
        
        // Sync student profile
        const primary = approvedStudents[0];
        student.class = primary.grade;
        student.grade = primary.grade;
        student.section = primary.section;
        await student.save();
        
        // Get teacher IDs
        const teacherIds = approvedStudents.map(a => a.teacherId);
        
        // Fetch ONLY from enrolled teachers
        const assignments = await Assignment.find({ 
            teacherId: { $in: teacherIds },
            isActive: true 
        })
        .populate('teacherId')
        .populate({ path: 'teacherId', populate: { path: 'userId', select: 'name email' } })
        .sort({ createdAt: -1 });
        
        console.log('Total from enrolled teachers:', assignments.length);
        
        // Filter by class/section
        const matched = [];
        for (const assignment of assignments) {
            const match = approvedStudents.some(approved => {
                const aC = String(assignment.class).trim().replace(/[^0-9]/g, '');
                const sC = String(approved.grade).trim().replace(/[^0-9]/g, '');
                const aS = String(assignment.section).trim().toUpperCase();
                const sS = String(approved.section).trim().toUpperCase();
                return aC === sC && aS === sS;
            });
            if (match) matched.push(assignment);
        }
        
        console.log('Matched:', matched.length);
        
        // Add submission status
        const result = await Promise.all(matched.map(async (a) => {
            const sub = await AssignmentSubmission.findOne({
                assignmentId: a._id,
                $or: [
                    { studentId: student._id },
                    { approvedStudentId: { $in: approvedStudents.map(x => x._id) } }
                ]
            });
            
            const overdue = new Date() > new Date(a.dueDate);
            
            return {
                _id: a._id,
                title: a.title,
                description: a.description,
                class: a.class,
                section: a.section,
                assignmentType: a.assignmentType,
                dueDate: a.dueDate,
                filePath: a.filePath,
                filename: a.filename,
                externalLink: a.externalLink,
                teacherName: a.teacherId?.userId?.name || 'Teacher',
                teacherEmail: a.teacherId?.userId?.email || '',
                submissionStatus: sub ? sub.status : 'not_submitted',
                isSubmitted: !!sub,
                isOverdue: overdue && !sub,
                grade: sub?.grade,
                feedback: sub?.feedback,
                submittedAt: sub?.submittedAt,
                createdAt: a.createdAt
            };
        }));
        
        console.log('Returning:', result.length);
        res.json(result);
    } catch (error) {
        console.error('Assignment error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
