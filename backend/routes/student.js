const express = require('express');
const multer = require('multer');
const path = require('path');
const { auth, authorize } = require('../middleware/auth');
const { ensureStudentProfileMiddleware } = require('../middleware/studentProfile');
const { ensureCompleteStudentProfile, validateStudentProfile } = require('../utils/studentProfileSetup');
const Student = require('../models/Student');
const Lesson = require('../models/Lesson');
const Feedback = require('../models/Feedback');
const Attendance = require('../models/Attendance');
const LessonProgress = require('../models/LessonProgress');
const SharedVideo = require('../models/SharedVideo');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');

const router = express.Router();

// Configure multer for student file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'submission-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit for student submissions
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /\.(pdf|doc|docx|txt|jpg|jpeg|png)$/i;
        if (allowedTypes.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, DOCX, TXT, JPG, PNG files are allowed'));
        }
    }
});

// All student routes require authentication and complete profile
router.use(auth);
router.use(authorize('student'));
router.use(ensureStudentProfileMiddleware);

// Get student dashboard (no attendance restriction)
router.get('/dashboard', async (req, res) => {
    try {
        console.log('Student dashboard request for user:', req.user.email);
        
        // Use student from middleware or ensure profile exists
        let student = req.student || await ensureCompleteStudentProfile(req.user._id, req.user.email);
        
        // Ensure class field is set for existing students
        if (!student.class && student.grade) {
            student.class = student.grade;
            await student.save();
        }

        // Get all approved student records for this email
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find({ email: req.user.email });
        console.log('Found approved students:', approvedStudents.length);
        
        let attendanceRecords = [];
        let totalDays = 0;
        let presentDays = 0;
        let attendanceRate = 0;
        
        // Get comprehensive attendance from ALL teachers who have this student
        let allAttendanceRecords = [];
        
        // Method 1: Direct student attendance from any teacher
        if (student) {
            const directAttendance = await Attendance.find({ studentId: student._id });
            allAttendanceRecords = [...allAttendanceRecords, ...directAttendance];
        }
        
        // Method 2: Search ALL approved student records with this email across ALL teachers
        if (approvedStudents.length > 0) {
            for (const approvedStudent of approvedStudents) {
                const approvedAttendance = await Attendance.find({ approvedStudentId: approvedStudent._id });
                allAttendanceRecords = [...allAttendanceRecords, ...approvedAttendance];
            }
        }
        
        // Method 3: Search by email in case student exists in other teacher records
        const Teacher = require('../models/Teacher');
        const allTeachers = await Teacher.find();
        
        for (const teacher of allTeachers) {
            // Check if this teacher has approved this student email
            const teacherApprovedStudents = await ApprovedStudent.find({ 
                teacherId: teacher._id,
                email: req.user.email 
            });
            
            for (const teacherApproved of teacherApprovedStudents) {
                const teacherAttendance = await Attendance.find({ 
                    approvedStudentId: teacherApproved._id 
                });
                allAttendanceRecords = [...allAttendanceRecords, ...teacherAttendance];
            }
        }
        
        // Remove duplicates by date-student combination (ignore teacher to prevent same date multiple entries)
        const uniqueRecords = [];
        const seen = new Set();
        for (const record of allAttendanceRecords) {
            const studentIdentifier = record.studentId || record.approvedStudentId || req.user.email;
            const dateKey = record.date.toISOString().split('T')[0];
            const key = `${dateKey}-${studentIdentifier}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueRecords.push(record);
            }
        }
        
        // Filter working days only
        const workingDayRecords = uniqueRecords.filter(record => {
            const date = new Date(record.date);
            const dayOfWeek = date.getDay();
            return dayOfWeek !== 0 && dayOfWeek !== 6;
        });
        
        // Calculate comprehensive attendance statistics from ALL teachers
        totalDays = workingDayRecords.length;
        presentDays = workingDayRecords.filter(record => record.status === 'present').length;
        attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        console.log('Dashboard stats - Total:', totalDays, 'Present:', presentDays, 'Rate:', attendanceRate + '%');
        
        // Update student record with combined attendance data
        student.totalSchoolDays = totalDays;
        student.attendanceDays = presentDays;
        await student.save();

        // Get lessons assigned to this student by their teacher
        let assignedLessons = [];
        
        // First try to get lessons from progress records
        const progressRecords = await LessonProgress.find({ studentId: student._id });
        
        if (progressRecords.length > 0) {
            const lessonIds = progressRecords.map(p => p.lessonId);
            const lessons = await Lesson.find({ 
                _id: { $in: lessonIds }
            })
                .populate('teacherId', 'firstName lastName')
                .sort({ completedDate: -1 })
                .limit(10);
            
            // Get progress for each lesson
            assignedLessons = await Promise.all(lessons.map(async (lesson) => {
                const progress = await LessonProgress.findOne({
                    studentId: student._id,
                    lessonId: lesson._id
                });
                
                return {
                    _id: lesson._id,
                    lessonId: lesson,
                    teacherId: lesson.teacherId,
                    assignedDate: lesson.createdAt,
                    progress: progress ? progress.progress : 0,
                    status: progress ? progress.status : 'not_started'
                };
            }));
        } else {
            // Get all lessons
            const lessons = await Lesson.find()
                .populate('teacherId', 'firstName lastName')
                .sort({ createdAt: -1 });
            
            // Create progress records for all lessons
            const progressRecords = [];
            for (const lesson of lessons) {
                progressRecords.push({
                    studentId: student._id,
                    lessonId: lesson._id,
                    teacherId: lesson.teacherId,
                    status: 'not_started'
                });
            }
            
            if (progressRecords.length > 0) {
                await LessonProgress.insertMany(progressRecords);
            }
            
            // Return lessons with progress
            assignedLessons = lessons.map(lesson => ({
                _id: lesson._id,
                lessonId: {
                    _id: lesson._id,
                    title: lesson.title,
                    subject: lesson.subject,
                    grade: lesson.grade,
                    description: lesson.description,
                    scheduledDate: lesson.scheduledDate,
                    duration: lesson.duration,
                    objectives: lesson.objectives,
                    videoUrl: lesson.videoUrl,
                    notes: lesson.notes,
                    createdAt: lesson.createdAt
                },
                teacherId: lesson.teacherId,
                assignedDate: lesson.createdAt,
                progress: 0,
                status: 'not_started'
            }));
        }

        const myFeedback = await Feedback.find({ studentId: student._id })
            .populate('lessonId', 'title')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            student,
            assignedLessons,
            myFeedback,
            stats: {
                attendanceRate,
                completedLessons: student.completedLessons || 0,
                learningProgress: student.learningProgress || 0,
                totalDays,
                presentDays
            },
            canAccessLessons: true
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.json({
            student: {
                userId: req.user._id,
                rollNumber: 'STU001',
                class: '10',
                grade: '10',
                section: 'A',
                learningProgress: 0,
                completedLessons: 0,
                attendanceDays: 0,
                totalSchoolDays: 0
            },
            assignedLessons: [],
            myFeedback: [],
            stats: {
                attendanceRate: 0,
                completedLessons: 0,
                learningProgress: 0
            },
            canAccessLessons: true
        });
    }
});

// Get assignments for student's class - SHARED TO ALL STUDENTS IN CLASS
router.get('/assignments', async (req, res) => {
    try {
        console.log('\n=== ASSIGNMENTS REQUEST ===');
        console.log('User:', req.user.email);
        
        // Ensure student profile exists
        let student;
        try {
            student = req.student || await ensureCompleteStudentProfile(req.user._id, req.user.email);
        } catch (profileError) {
            console.error('Profile error:', profileError);
            return res.json([]);
        }
        
        // Get approved student records
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find({ email: req.user.email });
        
        console.log('Approved records:', approvedStudents.length);
        
        if (approvedStudents.length === 0) {
            console.log('Student not added to any class');
            return res.json([]);
        }
        
        // Get student's class and section
        const studentClass = approvedStudents[0].grade;
        const studentSection = approvedStudents[0].section;
        
        if (!studentClass || !studentSection) {
            console.log('Missing class or section data');
            return res.json([]);
        }
        
        console.log('Student Class:', studentClass, 'Section:', studentSection);
        
        // Sync student profile
        if (student) {
            student.class = studentClass;
            student.grade = studentClass;
            student.section = studentSection;
            await student.save();
        }
        
        // Get ALL active assignments
        const allAssignments = await Assignment.find({ isActive: true })
            .populate('teacherId')
            .populate({ path: 'teacherId', populate: { path: 'userId', select: 'name email' } })
            .sort({ createdAt: -1 });
        
        console.log('Total active assignments:', allAssignments.length);
        
        // Filter by class and section
        const matchedAssignments = allAssignments.filter(assignment => {
            if (!assignment.class || !assignment.section) return false;
            
            const assignmentClass = String(assignment.class).trim().replace(/[^0-9]/g, '');
            const studentClassNorm = String(studentClass).trim().replace(/[^0-9]/g, '');
            const assignmentSection = String(assignment.section).trim().toUpperCase();
            const studentSectionNorm = String(studentSection).trim().toUpperCase();
            
            const match = assignmentClass === studentClassNorm && assignmentSection === studentSectionNorm;
            
            if (match) {
                console.log(`✓ "${assignment.title}" - Class ${assignment.class} Section ${assignment.section}`);
            }
            
            return match;
        });
        
        console.log('Matched:', matchedAssignments.length);
        
        // Add submission status
        const result = await Promise.all(matchedAssignments.map(async (assignment) => {
            const submission = await AssignmentSubmission.findOne({
                assignmentId: assignment._id,
                $or: [
                    { studentId: student?._id },
                    { approvedStudentId: { $in: approvedStudents.map(a => a._id) } }
                ]
            });
            
            const now = new Date();
            const dueDate = new Date(assignment.dueDate);
            const isOverdue = now > dueDate;
            
            return {
                _id: assignment._id,
                title: assignment.title,
                description: assignment.description,
                class: assignment.class,
                section: assignment.section,
                assignmentType: assignment.assignmentType,
                dueDate: assignment.dueDate,
                filePath: assignment.filePath,
                filename: assignment.filename,
                externalLink: assignment.externalLink,
                teacherName: assignment.teacherId?.userId?.name || 'Teacher',
                teacherEmail: assignment.teacherId?.userId?.email || '',
                submissionStatus: submission ? submission.status : 'not_submitted',
                isSubmitted: !!submission,
                isOverdue: isOverdue && !submission,
                grade: submission?.grade,
                feedback: submission?.feedback,
                submittedAt: submission?.submittedAt,
                createdAt: assignment.createdAt
            };
        }));
        
        console.log('Returning:', result.length, 'assignments');
        res.json(result);
    } catch (error) {
        console.error('Assignment error:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Debug endpoint - check student assignment matching
router.get('/assignments/debug', async (req, res) => {
    try {
        let student = req.student || await ensureCompleteStudentProfile(req.user._id, req.user.email);
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find({ email: req.user.email });
        
        let studentClass = student.class || student.grade;
        let studentSection = student.section;
        
        if (approvedStudents.length > 0) {
            studentClass = approvedStudents[0].grade;
            studentSection = approvedStudents[0].section;
        }
        
        // Get all assignments
        const allAssignments = await Assignment.find({ isActive: true })
            .populate('teacherId', 'subject')
            .populate({
                path: 'teacherId',
                populate: { path: 'userId', select: 'firstName lastName' }
            });
        
        // Get matching assignments
        const matchingAssignments = allAssignments.filter(assignment => 
            assignment.class === studentClass && 
            assignment.section.toLowerCase() === studentSection.toLowerCase()
        );
        
        res.json({
            studentInfo: {
                email: req.user.email,
                class: studentClass,
                section: studentSection,
                approvedStudents: approvedStudents.length
            },
            allAssignments: allAssignments.map(a => ({
                title: a.title,
                class: a.class,
                section: a.section,
                teacher: a.teacherId?.userId ? 
                    `${a.teacherId.userId.firstName} ${a.teacherId.userId.lastName}` : 'Unknown'
            })),
            matchingAssignments: matchingAssignments.map(a => ({
                title: a.title,
                class: a.class,
                section: a.section
            })),
            totalAssignments: allAssignments.length,
            matchingCount: matchingAssignments.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit assignment
router.post('/assignments/:id/submit', upload.single('submissionFile'), async (req, res) => {
    try {
        const student = req.student || await ensureCompleteStudentProfile(req.user._id, req.user.email);
        const { comments } = req.body;
        
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        
        // Check if already submitted
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find({ email: req.user.email });
        
        const existingSubmission = await AssignmentSubmission.findOne({
            assignmentId: assignment._id,
            $or: [
                { studentId: student._id },
                { approvedStudentId: { $in: approvedStudents.map(a => a._id) } }
            ]
        });
        
        if (existingSubmission) {
            return res.status(400).json({ message: 'Assignment already submitted' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'Submission file is required' });
        }
        
        // Check if submission is late
        const now = new Date();
        const dueDate = new Date(assignment.dueDate);
        const isLate = now > dueDate;
        
        const submission = new AssignmentSubmission({
            assignmentId: assignment._id,
            studentId: student._id,
            approvedStudentId: approvedStudents.length > 0 ? approvedStudents[0]._id : null,
            filePath: req.file.filename,
            filename: req.file.originalname,
            comments,
            status: isLate ? 'late' : 'submitted'
        });
        
        await submission.save();
        
        res.json({ 
            message: 'Assignment submitted successfully',
            submission: {
                _id: submission._id,
                status: submission.status,
                submittedAt: submission.submittedAt,
                filename: submission.filename
            }
        });
    } catch (error) {
        console.error('Error submitting assignment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get student's assignment submissions
router.get('/assignments/submissions', async (req, res) => {
    try {
        const student = req.student || await ensureCompleteStudentProfile(req.user._id, req.user.email);
        
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find({ email: req.user.email });
        
        const submissions = await AssignmentSubmission.find({
            $or: [
                { studentId: student._id },
                { approvedStudentId: { $in: approvedStudents.map(a => a._id) } }
            ]
        })
        .populate('assignmentId', 'title description dueDate assignmentType')
        .populate({
            path: 'assignmentId',
            populate: {
                path: 'teacherId',
                select: 'subject',
                populate: {
                    path: 'userId',
                    select: 'firstName lastName'
                }
            }
        })
        .sort({ submittedAt: -1 });
        
        const formattedSubmissions = submissions.map(submission => ({
            _id: submission._id,
            assignment: {
                title: submission.assignmentId.title,
                description: submission.assignmentId.description,
                dueDate: submission.assignmentId.dueDate,
                type: submission.assignmentId.assignmentType,
                teacherName: submission.assignmentId.teacherId?.userId ? 
                    `${submission.assignmentId.teacherId.userId.firstName} ${submission.assignmentId.teacherId.userId.lastName}` : 'Unknown Teacher'
            },
            submittedAt: submission.submittedAt,
            status: submission.status,
            grade: submission.grade,
            feedback: submission.feedback,
            filename: submission.filename,
            comments: submission.comments
        }));
        
        res.json(formattedSubmissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Download assignment file
router.get('/assignments/:id/download', async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment || !assignment.filePath) {
            return res.status(404).json({ message: 'Assignment file not found' });
        }
        
        const filePath = path.join(__dirname, '../uploads', assignment.filePath);
        res.download(filePath, assignment.filename);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get student's lessons - NEW API endpoint
router.get('/my-lessons', async (req, res) => {
    try {
        // Use student from middleware or ensure profile exists
        let student = req.student || await ensureCompleteStudentProfile(req.user._id, req.user.email);
        
        // Ensure class field is set
        if (!student.class && student.grade) {
            student.class = student.grade;
            await student.save();
        }

        console.log('Student profile:', {
            class: student.class,
            section: student.section,
            grade: student.grade
        });

        // Get lessons that match student's class and section
        const lessons = await Lesson.find({
            class: student.class || student.grade,
            section: student.section,
            status: 'published'
        })
        .populate('teacherId', 'subject')
        .populate({
            path: 'teacherId',
            populate: {
                path: 'userId',
                select: 'name'
            }
        })
        .sort({ createdAt: -1 });

        console.log('Found lessons:', lessons.length);

        // Format lessons for response
        const formattedLessons = lessons.map(lesson => ({
            lesson_id: lesson._id,
            title: lesson.title,
            description: lesson.description,
            subject: lesson.subject,
            class: lesson.class,
            section: lesson.section,
            teacher_name: lesson.teacherId?.userId?.name || 'Unknown Teacher',
            attachment_url: lesson.attachment_url,
            created_at: lesson.createdAt,
            date_created: lesson.createdAt
        }));

        res.json({
            success: true,
            lessons: formattedLessons
        });
    } catch (error) {
        console.error('Student lessons error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch lessons', 
            error: error.message 
        });
    }
});

// Get specific lesson with progress tracking
router.get('/lessons/:id', async (req, res) => {
    try {
        // Use student from middleware or ensure profile exists
        const student = req.student || await ensureCompleteStudentProfile(req.user._id, req.user.email);
        
        const lesson = await Lesson.findById(req.params.id)
            .populate('teacherId', 'firstName lastName');
        
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
        
        // Get or create progress record
        let progress = await LessonProgress.findOne({
            studentId: student._id,
            lessonId: lesson._id
        });
        
        if (!progress) {
            progress = new LessonProgress({
                studentId: student._id,
                lessonId: lesson._id,
                teacherId: lesson.teacherId,
                status: 'not_started'
            });
            await progress.save();
        }
        
        // Update last accessed time
        progress.lastAccessedAt = new Date();
        if (progress.status === 'not_started') {
            progress.status = 'in_progress';
            progress.startedAt = new Date();
        }
        await progress.save();
        
        res.json({
            ...lesson.toObject(),
            progress: {
                status: progress.status,
                progress: progress.progress,
                videoWatched: progress.videoWatched,
                videoProgress: progress.videoProgress,
                assignmentDownloaded: progress.assignmentDownloaded,
                assignmentCompleted: progress.assignmentCompleted,
                timeSpent: progress.timeSpent,
                startedAt: progress.startedAt,
                completedAt: progress.completedAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Submit lesson feedback
router.post('/feedback', auth, authorize('student'), async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        const { lessonId, rating, understanding, difficulty, comments, suggestions } = req.body;

        const lesson = await Lesson.findById(lessonId);
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

        const existingFeedback = await Feedback.findOne({ studentId: student._id, lessonId });
        if (existingFeedback) {
            return res.status(400).json({ message: 'Feedback already submitted for this lesson' });
        }

        const feedback = new Feedback({
            studentId: student._id,
            lessonId,
            teacherId: lesson.teacherId,
            rating,
            understanding,
            difficulty,
            comments,
            suggestions
        });

        await feedback.save();

        // Update student progress
        student.completedLessons += 1;
        student.learningProgress = Math.min(100, student.learningProgress + 5);
        await student.save();

        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get student's progress
router.get('/progress', auth, authorize('student'), async (req, res) => {
    try {
        let student = await Student.findOne({ userId: req.user._id });
        
        if (!student) {
            return res.json({
                learningProgress: 0,
                completedLessons: 0,
                attendanceRate: 0,
                feedbackHistory: []
            });
        }
        
        const feedbackHistory = await Feedback.find({ studentId: student._id })
            .populate('lessonId', 'title subject')
            .sort({ createdAt: -1 });

        res.json({
            learningProgress: student.learningProgress || 0,
            completedLessons: student.completedLessons || 0,
            attendanceRate: student.totalSchoolDays > 0 ? 
                Math.round((student.attendanceDays / student.totalSchoolDays) * 100) : 0,
            feedbackHistory
        });
    } catch (error) {
        console.error('Student progress error:', error);
        res.json({
            learningProgress: 0,
            completedLessons: 0,
            attendanceRate: 0,
            feedbackHistory: []
        });
    }
});

// Get comprehensive attendance from all teachers who marked this student
router.get('/attendance-comprehensive', async (req, res) => {
    try {
        let allAttendanceRecords = [];
        
        // Get student profile
        const student = await Student.findOne({ userId: req.user._id });
        
        // Method 1: Get attendance where student is directly marked by any teacher
        if (student) {
            const directAttendance = await Attendance.find({ studentId: student._id });
            allAttendanceRecords = [...allAttendanceRecords, ...directAttendance];
        }
        
        // Method 2: Search ALL teachers for approved student records with this email
        const ApprovedStudent = require('../models/ApprovedStudent');
        const Teacher = require('../models/Teacher');
        
        // Get ALL teachers
        const allTeachers = await Teacher.find();
        
        // Search each teacher's approved students for this email
        for (const teacher of allTeachers) {
            const teacherApprovedStudents = await ApprovedStudent.find({ 
                teacherId: teacher._id,
                email: req.user.email 
            });
            
            // Get attendance for each approved student record
            for (const approvedStudent of teacherApprovedStudents) {
                const approvedAttendance = await Attendance.find({ 
                    approvedStudentId: approvedStudent._id 
                });
                allAttendanceRecords = [...allAttendanceRecords, ...approvedAttendance];
            }
        }
        
        // Remove duplicates based on date and student only (one attendance per student per date per teacher)
        const uniqueRecords = [];
        const seen = new Set();
        
        for (const record of allAttendanceRecords) {
            const studentIdentifier = record.studentId || record.approvedStudentId || req.user.email;
            const teacherIdentifier = record.teacherId || 'unknown';
            const dateKey = record.date.toISOString().split('T')[0];
            const key = `${dateKey}-${studentIdentifier}-${teacherIdentifier}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueRecords.push(record);
            }
        }
        
        // Filter working days only
        const workingDayRecords = uniqueRecords.filter(record => {
            const date = new Date(record.date);
            const dayOfWeek = date.getDay();
            return dayOfWeek !== 0 && dayOfWeek !== 6;
        });
        
        // Calculate comprehensive statistics from ALL teachers
        const totalWorkingDays = workingDayRecords.length;
        const presentDays = workingDayRecords.filter(record => record.status === 'present' || record.status === 'late').length;
        const absentDays = workingDayRecords.filter(record => record.status === 'absent').length;
        const lateDays = workingDayRecords.filter(record => record.status === 'late').length;
        
        const attendancePercentage = totalWorkingDays > 0 ? 
            Math.round((presentDays / totalWorkingDays) * 100) : 0;
        
        // Count unique teachers who marked attendance
        const teacherCount = new Set(workingDayRecords.map(r => r.teacherId?.toString())).size;
        
        res.json({
            totalWorkingDays,
            presentDays,
            absentDays,
            lateDays,
            attendancePercentage,
            records: workingDayRecords.sort((a, b) => new Date(b.date) - new Date(a.date)),
            teacherCount,
            message: `Overall attendance from ${teacherCount} subject teacher(s)`
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get attendance calendar - subject-wise monthly view
router.get('/attendance-calendar', async (req, res) => {
    try {
        const { month, year } = req.query;
        const student = await Student.findOne({ userId: req.user._id });
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approved = await ApprovedStudent.find({ email: req.user.email });
        
        const start = new Date(year, month-1, 1);
        const end = new Date(year, month, 0);
        
        const records = await Attendance.find({
            $or: [{ studentId: student?._id }, { approvedStudentId: { $in: approved.map(a => a._id) } }],
            date: { $gte: start, $lte: end }
        }).populate('teacherId', 'subject');
        
        const subjects = {};
        records.forEach(r => {
            const subjectName = r.teacherId?.subject || 'General';
            if (!subjects[subjectName]) {
                subjects[subjectName] = { days: {}, P: 0, A: 0, L: 0, H: 0 };
            }
            const day = new Date(r.date).getDate();
            const status = r.status === 'present' ? 'P' : 
                          r.status === 'absent' ? 'A' : 
                          r.status === 'leave' ? 'L' : 'H';
            subjects[subjectName].days[day] = status;
            subjects[subjectName][status]++;
        });
        
        res.json({ subjects, daysInMonth: end.getDate(), month, year });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get videos shared with student's class and section
router.get('/videos', auth, authorize('student'), async (req, res) => {
    try {
        console.log('Student videos request for user:', req.user.email);
        
        let student = await Student.findOne({ userId: req.user._id });
        
        // Check approved students first
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find({ email: req.user.email });
        
        let studentClass = null;
        let studentSection = null;
        
        if (approvedStudents.length > 0) {
            // Use approved student data (PRIORITY)
            const approvedStudent = approvedStudents[0];
            studentClass = approvedStudent.grade;
            studentSection = approvedStudent.section;
            console.log('Using approved student data - Class:', studentClass, 'Section:', studentSection);
            
            // Update student profile if exists
            if (student && (student.class !== studentClass || student.section !== studentSection)) {
                student.class = studentClass;
                student.grade = studentClass;
                student.section = studentSection;
                await student.save();
                console.log('Updated student profile');
            }
        } else if (student) {
            // Use regular student data
            studentClass = student.class || student.grade;
            studentSection = student.section;
            console.log('Using regular student data - Class:', studentClass, 'Section:', studentSection);
        }
        
        if (!studentClass || !studentSection) {
            console.log('No class/section found, returning empty');
            return res.json({ 
                videos: [],
                studentInfo: {
                    class: studentClass,
                    section: studentSection,
                    email: req.user.email,
                    message: 'Please contact your teacher to add you to a class'
                }
            });
        }
        
        console.log(`Looking for videos - Class: ${studentClass}, Section: ${studentSection}`);
        
        // Get ALL videos first
        const allVideos = await SharedVideo.find()
            .populate('teacherId', 'subject')
            .populate({
                path: 'teacherId',
                populate: {
                    path: 'userId',
                    select: 'name'
                }
            })
            .sort({ createdAt: -1 });
        
        console.log('Total videos:', allVideos.length);
        
        // Filter with flexible matching
        const videos = allVideos.filter(video => {
            const videoClassNum = String(video.class).replace(/[^0-9]/g, '');
            const studentClassNum = String(studentClass).replace(/[^0-9]/g, '');
            const classMatch = videoClassNum === studentClassNum;
            const sectionMatch = video.section.toLowerCase() === studentSection.toLowerCase();
            return classMatch && sectionMatch;
        });
        
        console.log('Found matching videos:', videos.length);
        
        const formattedVideos = videos.map(video => {
            let videoUrl = null;
            if (video.type === 'youtube') {
                videoUrl = video.url;
            } else if (video.type === 'upload' && video.filePath) {
                videoUrl = `/api/teacher/files/${video.filePath}`;
            }
            
            return {
                _id: video._id,
                title: video.title,
                description: video.description,
                subject: video.subject || video.teacherId?.subject || 'General',
                type: video.type,
                url: videoUrl,
                filename: video.filePath,
                filePath: video.filePath,
                class: video.class,
                section: video.section,
                teacher_name: video.teacherId?.userId?.name || 'Unknown Teacher',
                createdAt: video.createdAt
            };
        });
        
        res.json({ 
            videos: formattedVideos,
            studentInfo: {
                class: studentClass,
                section: studentSection,
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Student videos error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch videos', 
            error: error.message 
        });
    }
});

// Update lesson progress
router.put('/lessons/:id/progress', auth, authorize('student'), async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) return res.status(404).json({ message: 'Student profile not found' });
        
        const { 
            videoProgress, 
            videoWatched, 
            assignmentDownloaded, 
            assignmentCompleted, 
            timeSpent, 
            studentNotes 
        } = req.body;
        
        let progress = await LessonProgress.findOne({
            studentId: student._id,
            lessonId: req.params.id
        });
        
        if (!progress) {
            const lesson = await Lesson.findById(req.params.id);
            if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
            
            progress = new LessonProgress({
                studentId: student._id,
                lessonId: req.params.id,
                teacherId: lesson.teacherId
            });
        }
        
        // Update progress fields
        if (videoProgress !== undefined) {
            progress.videoProgress = Math.min(100, Math.max(0, videoProgress));
            if (videoProgress > 0 && !progress.videoStartedAt) {
                progress.videoStartedAt = new Date();
            }
        }
        
        if (videoWatched !== undefined) {
            progress.videoWatched = videoWatched;
            if (videoWatched && !progress.videoCompletedAt) {
                progress.videoCompletedAt = new Date();
            }
        }
        
        if (assignmentDownloaded !== undefined) {
            progress.assignmentDownloaded = assignmentDownloaded;
        }
        
        if (assignmentCompleted !== undefined) {
            progress.assignmentCompleted = assignmentCompleted;
            if (assignmentCompleted && !progress.assignmentSubmittedAt) {
                progress.assignmentSubmittedAt = new Date();
            }
        }
        
        if (timeSpent !== undefined) {
            progress.timeSpent += timeSpent;
        }
        
        if (studentNotes !== undefined) {
            progress.studentNotes = studentNotes;
        }
        
        // Calculate overall progress
        let overallProgress = 0;
        if (progress.videoWatched) overallProgress += 50;
        if (progress.assignmentCompleted) overallProgress += 50;
        
        progress.progress = overallProgress;
        progress.status = overallProgress >= 100 ? 'completed' : 'in_progress';
        
        if (progress.status === 'completed' && !progress.completedAt) {
            progress.completedAt = new Date();
            
            // Update student stats
            student.completedLessons += 1;
            student.learningProgress = Math.min(100, student.learningProgress + 5);
            await student.save();
        }
        
        await progress.save();
        
        res.json({ 
            message: 'Progress updated successfully', 
            progress: {
                status: progress.status,
                progress: progress.progress,
                videoWatched: progress.videoWatched,
                videoProgress: progress.videoProgress,
                assignmentCompleted: progress.assignmentCompleted,
                timeSpent: progress.timeSpent
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get lesson progress
router.get('/lessons/:id/progress', auth, authorize('student'), async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        if (!student) return res.status(404).json({ message: 'Student profile not found' });
        
        const progress = await LessonProgress.findOne({
            studentId: student._id,
            lessonId: req.params.id
        });
        
        if (!progress) {
            return res.json({
                status: 'not_started',
                progress: 0,
                videoWatched: false,
                videoProgress: 0,
                assignmentCompleted: false,
                timeSpent: 0
            });
        }
        
        res.json({
            status: progress.status,
            progress: progress.progress,
            videoWatched: progress.videoWatched,
            videoProgress: progress.videoProgress,
            assignmentDownloaded: progress.assignmentDownloaded,
            assignmentCompleted: progress.assignmentCompleted,
            timeSpent: progress.timeSpent,
            startedAt: progress.startedAt,
            completedAt: progress.completedAt,
            studentNotes: progress.studentNotes
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Start lesson
router.post('/lessons/:assignmentId/start', auth, authorize('student'), async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        const LessonAssignment = require('../models/LessonAssignment');
        
        const assignment = await LessonAssignment.findOne({
            _id: req.params.assignmentId,
            studentId: student._id
        });
        
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        
        assignment.status = 'in_progress';
        assignment.startedAt = new Date();
        await assignment.save();
        
        res.json({ message: 'Lesson started', assignment });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update lesson progress
router.put('/lessons/:assignmentId/progress', auth, authorize('student'), async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        const LessonAssignment = require('../models/LessonAssignment');
        const { progress, videoWatched, assignmentCompleted, timeSpent } = req.body;
        
        const assignment = await LessonAssignment.findOne({
            _id: req.params.assignmentId,
            studentId: student._id
        });
        
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        
        // Update progress
        if (progress !== undefined) assignment.progress = Math.min(100, Math.max(0, progress));
        if (videoWatched !== undefined) assignment.videoWatched = videoWatched;
        if (assignmentCompleted !== undefined) assignment.assignmentCompleted = assignmentCompleted;
        if (timeSpent !== undefined) assignment.timeSpent += timeSpent;
        
        // Mark as completed if progress is 100% or both video watched and assignment completed
        if (assignment.progress >= 100 || (assignment.videoWatched && assignment.assignmentCompleted)) {
            assignment.status = 'completed';
            assignment.completedAt = new Date();
            assignment.progress = 100;
            
            // Update student stats
            student.completedLessons += 1;
            student.learningProgress = Math.min(100, student.learningProgress + 5);
            await student.save();
        }
        
        await assignment.save();
        res.json({ message: 'Progress updated', assignment });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get specific lesson assignment
router.get('/lessons/:assignmentId', auth, authorize('student'), async (req, res) => {
    try {
        const student = await Student.findOne({ userId: req.user._id });
        const LessonAssignment = require('../models/LessonAssignment');
        
        const assignment = await LessonAssignment.findOne({
            _id: req.params.assignmentId,
            studentId: student._id
        })
        .populate('lessonId')
        .populate('teacherId', 'subject')
        .populate({
            path: 'teacherId',
            populate: {
                path: 'userId',
                select: 'name'
            }
        });
        
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
module.exports = router;