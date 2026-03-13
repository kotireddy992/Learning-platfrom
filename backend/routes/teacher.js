const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Lesson = require('../models/Lesson');
const Feedback = require('../models/Feedback');
const LessonProgress = require('../models/LessonProgress');
const SharedVideo = require('../models/SharedVideo');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { auth, authorize } = require('../middleware/auth');
const { ensureTeacherProfileMiddleware } = require('../middleware/teacherProfile');
const { ensureCompleteTeacherProfile, validateTeacherProfile } = require('../utils/teacherProfileSetup');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer configuration for video uploads (2GB limit)
const uploadVideo = multer({ 
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit for videos
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /\.(mp4|avi|mov|wmv|mkv|flv|webm|m4v)$/i;
        if (allowedTypes.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'));
        }
    }
});

// Multer configuration for assignment uploads (10MB limit)
const uploadAssignment = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for assignments
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /\.(pdf|doc|docx|txt|ppt|pptx|jpg|jpeg|png)$/i;
        if (allowedTypes.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, DOCX, TXT, PPT, PPTX, JPG, PNG files are allowed'));
        }
    }
});

// Keep the old 'upload' for backward compatibility (use uploadAssignment)
const upload = uploadAssignment;

// Helper function to ensure teacher profile exists with all features
async function ensureTeacherProfile(userId) {
    try {
        const teacher = await ensureCompleteTeacherProfile(userId);
        
        // Validate profile completeness
        if (!validateTeacherProfile(teacher)) {
            console.warn('Teacher profile validation failed, but continuing...');
        }
        
        return teacher;
    } catch (error) {
        console.error('Error ensuring teacher profile:', error);
        throw error;
    }
}

// Serve uploaded files (videos, assignments, etc.) - No auth required for video streaming
router.get('/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../uploads', filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }
        
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const ext = path.extname(filename).toLowerCase();
        
        // Set CORS headers for all file types
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
        
        // Handle OPTIONS request for CORS preflight
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        // Set appropriate headers for video files with range support
        if (ext === '.mp4' || ext === '.webm' || ext === '.ogg' || ext === '.avi' || ext === '.mov' || ext === '.mkv') {
            const range = req.headers.range;
            
            if (range) {
                // Handle range requests for video streaming
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                
                const file = fs.createReadStream(filePath, { start, end });
                
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': `video/${ext.substring(1)}`,
                    'Cache-Control': 'public, max-age=31536000'
                });
                
                file.pipe(res);
            } else {
                // No range request, serve entire file
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': `video/${ext.substring(1)}`,
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'public, max-age=31536000'
                });
                
                fs.createReadStream(filePath).pipe(res);
            }
        } else if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', fileSize);
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Length', fileSize);
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error('File serving error:', error);
        res.status(500).json({ message: 'Error serving file' });
    }
});

// All teacher routes require authentication and complete profile
router.use(auth);
router.use(authorize('teacher'));
router.use(ensureTeacherProfileMiddleware);

// Delete student endpoint - AFTER middleware but with proper authorization
router.delete('/students/:studentId', async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const { studentId } = req.params;
        const ApprovedStudent = require('../models/ApprovedStudent');
        
        console.log('Delete request for studentId:', studentId, 'by teacher:', teacher._id);
        
        // Try to find approved student by this teacher
        let approvedStudent = await ApprovedStudent.findOne({
            _id: studentId,
            teacherId: teacher._id
        });
        
        // If not found by ID, try to find by email (in case studentId is actually a Student._id)
        if (!approvedStudent) {
            const student = await Student.findById(studentId).populate('userId', 'email');
            if (student?.userId?.email) {
                approvedStudent = await ApprovedStudent.findOne({
                    email: student.userId.email,
                    teacherId: teacher._id
                });
            }
        }
        
        if (!approvedStudent) {
            console.log('Student not found for deletion');
            return res.status(404).json({ message: 'Student not found in your class' });
        }
        
        console.log('Found approved student:', approvedStudent.email);
        
        // Delete from User and Student collections if registered
        const user = await User.findOne({ email: approvedStudent.email });
        if (user) {
            const student = await Student.findOne({ userId: user._id });
            if (student) {
                await Attendance.deleteMany({ studentId: student._id });
                await Student.findByIdAndDelete(student._id);
            }
            await User.findByIdAndDelete(user._id);
        }
        
        // Delete attendance records
        await Attendance.deleteMany({ approvedStudentId: approvedStudent._id });
        
        // Delete approved student
        await ApprovedStudent.findByIdAndDelete(approvedStudent._id);
        
        res.json({ message: 'Student removed successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error removing student', error: error.message });
    }
});

// Get all students added by this teacher
router.get('/students', async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const ApprovedStudent = require('../models/ApprovedStudent');
        
        // Get only students approved by this teacher
        const approvedStudents = await ApprovedStudent.find({ teacherId: teacher._id })
            .sort({ grade: 1, section: 1, rollNumber: 1 });
        
        // Get registered students from approved list
        const registeredStudents = [];
        for (const approved of approvedStudents) {
            const user = await User.findOne({ email: approved.email });
            if (user && user.role === 'student') {
                const student = await Student.findOne({ userId: user._id });
                if (student) {
                    registeredStudents.push({
                        _id: student._id,
                        userId: {
                            _id: user._id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                            isActive: user.isActive
                        },
                        studentId: student.studentId,
                        rollNumber: approved.rollNumber,
                        class: approved.grade,
                        section: approved.section,
                        parentPhone: approved.parentPhone,
                        enrollmentDate: approved.createdAt,
                        hasSignedUp: true,
                        attendanceRate: approved.totalSchoolDays > 0 ? 
                            Math.round((approved.attendanceDays / approved.totalSchoolDays) * 100) : 0
                    });
                }
            }
        }
        
        // Format approved students (not yet registered)
        const pendingStudents = approvedStudents.filter(approved => {
            return !registeredStudents.find(reg => reg.userId.email === approved.email);
        }).map(approved => ({
            _id: approved._id,
            userId: {
                _id: approved._id,
                firstName: approved.studentName.split(' ')[0] || '',
                lastName: approved.studentName.split(' ').slice(1).join(' ') || '',
                email: approved.email,
                isActive: false
            },
            studentId: approved._id,
            rollNumber: approved.rollNumber,
            class: approved.grade,
            section: approved.section,
            parentPhone: approved.parentPhone,
            enrollmentDate: approved.createdAt,
            hasSignedUp: false,
            attendanceRate: approved.totalSchoolDays > 0 ? 
                Math.round((approved.attendanceDays / approved.totalSchoolDays) * 100) : 0
        }));
        
        const allStudents = [...registeredStudents, ...pendingStudents];
        res.json(allStudents);
        
    } catch (error) {
        console.error('Error fetching teacher students:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get teacher dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const TeacherAttendance = require('../models/TeacherAttendance');
        
        // Get attendance from TeacherAttendance collection
        const attendanceRecords = await TeacherAttendance.find({ teacherId: teacher._id });
        const totalDays = attendanceRecords.length;
        const presentDays = attendanceRecords.filter(r => r.status === 'Present').length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        // Get lesson stats
        const totalLessons = await Lesson.countDocuments({ teacherId: teacher._id });
        const completedLessons = await Lesson.countDocuments({ 
            teacherId: teacher._id, 
            isCompleted: true 
        });
        
        // Get recent lessons
        const recentLessons = await Lesson.find({ teacherId: teacher._id })
            .sort({ createdAt: -1 })
            .limit(5);
        
        // Get recent feedback
        const recentFeedback = await Feedback.find({ teacherId: teacher._id })
            .populate('studentId', 'rollNumber')
            .populate('lessonId', 'title')
            .sort({ createdAt: -1 })
            .limit(5);
        
        res.json({
            stats: {
                attendanceRate,
                presentDays,
                totalDays,
                totalLessons,
                completedLessons,
                completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
            },
            lessons: recentLessons,
            recentFeedback
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Mark attendance
router.post('/attendance', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const { status, notes } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            teacherId: teacher._id,
            date: today
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked for today' });
        }

        const attendance = new Attendance({
            teacherId: teacher._id,
            date: today,
            status,
            checkInTime: new Date(),
            notes
        });

        await attendance.save();
        res.status(201).json({ message: 'Attendance marked successfully', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get attendance history
router.get('/attendance', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const attendance = await Attendance.find({ teacherId: teacher._id })
            .sort({ date: -1 })
            .limit(30);
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create lesson - NEW API endpoint
router.post('/lessons', async (req, res) => {
    try {
        // Use teacher from middleware
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);

        const { title, description, subject, class: lessonClass, section, attachment } = req.body;

        // Validate required fields
        if (!title || !description || !subject || !lessonClass || !section) {
            return res.status(400).json({ 
                message: 'Missing required fields: title, description, subject, class, section' 
            });
        }

        const lesson = new Lesson({
            teacherId: teacher._id,
            title,
            description,
            subject,
            class: lessonClass,
            section,
            grade: lessonClass, // For backward compatibility
            attachment_url: attachment,
            scheduledDate: new Date(),
            duration: 60,
            status: 'published'
        });

        await lesson.save();

        res.status(201).json({ 
            success: true,
            message: 'Lesson created successfully', 
            lesson 
        });
    } catch (error) {
        console.error('Lesson creation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create lesson', 
            error: error.message 
        });
    }
});

// Get lessons
router.get('/lessons', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const lessons = await Lesson.find({ teacherId: teacher._id })
            .sort({ scheduledDate: -1 });
        res.json(lessons);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Mark lesson as completed
router.patch('/lessons/:id/complete', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const lesson = await Lesson.findOneAndUpdate(
            { _id: req.params.id, teacherId: teacher._id },
            { isCompleted: true, completedDate: new Date() },
            { new: true }
        );

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        // Create progress records for ALL students if not already created
        const students = await Student.find().populate('userId', 'email');
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find();
        
        const progressRecords = [];
        
        // Add ALL regular students
        for (const student of students) {
            if (student.userId && student.userId.name && student.userId.name !== 'Unknown Student') {
                const existingProgress = await LessonProgress.findOne({
                    studentId: student._id,
                    lessonId: lesson._id
                });
                
                if (!existingProgress) {
                    progressRecords.push({
                        studentId: student._id,
                        lessonId: lesson._id,
                        teacherId: teacher._id,
                        status: 'not_started'
                    });
                }
            }
        }
        
        // Add ALL approved students
        for (const approvedStudent of approvedStudents) {
            const user = await User.findOne({ email: approvedStudent.email });
            if (user) {
                const student = await Student.findOne({ userId: user._id });
                if (student) {
                    const existingProgress = await LessonProgress.findOne({
                        studentId: student._id,
                        lessonId: lesson._id
                    });
                    
                    if (!existingProgress) {
                        progressRecords.push({
                            studentId: student._id,
                            lessonId: lesson._id,
                            teacherId: teacher._id,
                            status: 'not_started'
                        });
                    }
                }
            }
        }
        
        if (progressRecords.length > 0) {
            await LessonProgress.insertMany(progressRecords);
        }

        res.json({ message: 'Lesson marked as completed', lesson });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get feedback for teacher's lessons
router.get('/feedback', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const feedback = await Feedback.find({ teacherId: teacher._id })
            .populate('studentId', 'rollNumber')
            .populate('lessonId', 'title')
            .sort({ createdAt: -1 });
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get performance analytics
router.get('/analytics', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        
        // Attendance stats
        const totalDays = await Attendance.countDocuments({ teacherId: teacher._id });
        const presentDays = await Attendance.countDocuments({ 
            teacherId: teacher._id, 
            status: 'present' 
        });
        
        // Lesson stats
        const totalLessons = await Lesson.countDocuments({ teacherId: teacher._id });
        const completedLessons = await Lesson.countDocuments({ 
            teacherId: teacher._id, 
            isCompleted: true 
        });
        
        // Feedback stats
        const feedbackStats = await Feedback.aggregate([
            { $match: { teacherId: teacher._id } },
            { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        res.json({
            attendance: {
                total: totalDays,
                present: presentDays,
                percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
            },
            lessons: {
                total: totalLessons,
                completed: completedLessons,
                percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
            },
            feedback: {
                count: feedbackStats[0]?.count || 0,
                avgRating: feedbackStats[0]?.avgRating || 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get teacher's assigned classes for dropdown
router.get('/assigned-classes', async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const ApprovedStudent = require('../models/ApprovedStudent');
        
        // Get classes from students approved by THIS teacher only
        const approvedClasses = await ApprovedStudent.distinct('grade', { teacherId: teacher._id });
        const validApprovedClasses = approvedClasses.filter(c => c && c.trim() !== '');
        
        // Always return all standard classes (1-12) so teachers can add students to any class
        const allClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
        
        // Merge existing classes with all possible classes
        const uniqueClasses = [...new Set([...validApprovedClasses, ...allClasses])];
        
        res.json(uniqueClasses.sort((a, b) => parseInt(a) - parseInt(b)));
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Helper function to calculate attendance rate
async function calculateAttendanceRate(studentId, isApprovedStudent = false) {
    try {
        let attendanceRecords;
        if (isApprovedStudent) {
            attendanceRecords = await Attendance.find({ approvedStudentId: studentId });
        } else {
            attendanceRecords = await Attendance.find({ 
                $or: [
                    { studentId: studentId },
                    { approvedStudentId: studentId }
                ]
            });
        }
        
        const totalDays = attendanceRecords.length;
        const presentDays = attendanceRecords.filter(record => 
            record.status === 'present' || record.status === 'late'
        ).length;
        
        return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    } catch (error) {
        console.error('Error calculating attendance rate:', error);
        return 0;
    }
}

router.get('/students/attendance', async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const { date, class: selectedClass } = req.query;
        const selectedDate = date ? new Date(date) : new Date();
        selectedDate.setHours(0, 0, 0, 0);
        
        if (!selectedClass) {
            return res.json([]);
        }
        
        // Get only students approved by this teacher for the selected class
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find({ 
            teacherId: teacher._id,
            grade: selectedClass 
        });
        
        const studentsForAttendance = [];
        
        // Add registered students
        for (const approved of approvedStudents) {
            const user = await User.findOne({ email: approved.email });
            if (user && user.role === 'student') {
                const student = await Student.findOne({ userId: user._id });
                if (student) {
                    const attendance = await Attendance.findOne({
                        $or: [
                            { studentId: student._id, date: selectedDate },
                            { approvedStudentId: approved._id, date: selectedDate }
                        ]
                    });
                    
                    // Calculate attendance rate for THIS teacher's classes only
                    const myRecords = await Attendance.find({
                        teacherId: teacher._id,  // KEY: Filter by this teacher
                        $or: [
                            { studentId: student._id },
                            { approvedStudentId: approved._id }
                        ]
                    });
                    
                    const workingDays = myRecords.filter(r => {
                        const day = new Date(r.date).getDay();
                        return day !== 0 && day !== 6;
                    });
                    
                    const totalMyClasses = workingDays.length;
                    const presentInMyClasses = workingDays.filter(r => r.status === 'present' || r.status === 'late').length;
                    const myAttendanceRate = totalMyClasses > 0 ? 
                        Math.round((presentInMyClasses / totalMyClasses) * 100) : 0;
                    
                    studentsForAttendance.push({
                        _id: student._id,
                        userId: {
                            _id: user._id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                            isActive: user.isActive
                        },
                        studentId: student.studentId,
                        rollNumber: approved.rollNumber,
                        class: approved.grade,
                        section: approved.section,
                        attendanceStatus: attendance ? attendance.status : null,
                        attendanceRate: myAttendanceRate,  // Only this teacher's percentage
                        type: 'registered'
                    });
                }
            } else {
                // Add approved but not registered students
                const attendance = await Attendance.findOne({
                    approvedStudentId: approved._id,
                    date: selectedDate
                });
                
                // Calculate attendance rate for THIS teacher's classes only
                const myRecords = await Attendance.find({
                    teacherId: teacher._id,  // KEY: Filter by this teacher
                    approvedStudentId: approved._id
                });
                
                const workingDays = myRecords.filter(r => {
                    const day = new Date(r.date).getDay();
                    return day !== 0 && day !== 6;
                });
                
                const totalMyClasses = workingDays.length;
                const presentInMyClasses = workingDays.filter(r => r.status === 'present' || r.status === 'late').length;
                const myAttendanceRate = totalMyClasses > 0 ? 
                    Math.round((presentInMyClasses / totalMyClasses) * 100) : 0;
                
                studentsForAttendance.push({
                    _id: approved._id,
                    userId: {
                        _id: approved._id,
                        firstName: approved.studentName.split(' ')[0] || '',
                        lastName: approved.studentName.split(' ').slice(1).join(' ') || '',
                        email: approved.email,
                        isActive: false
                    },
                    studentId: approved._id,
                    rollNumber: approved.rollNumber,
                    class: approved.grade,
                    section: approved.section,
                    attendanceStatus: attendance ? attendance.status : null,
                    attendanceRate: myAttendanceRate,  // Only this teacher's percentage
                    type: 'approved'
                });
            }
        }
        
        res.json(studentsForAttendance);
    } catch (error) {
        console.error('Error in students/attendance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Mark student attendance
router.post('/students/attendance', async (req, res) => {
    try {
        const { studentId, date, status } = req.body;
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);
        
        console.log('Marking attendance for student:', studentId, 'Status:', status, 'Date:', attendanceDate);
        
        // First check if it's an approved student
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudent = await ApprovedStudent.findById(studentId);
        
        if (approvedStudent) {
            console.log('Found approved student:', approvedStudent.studentName);
            
            // Check if attendance already exists for this student on this date (from ANY teacher)
            let attendance = await Attendance.findOne({
                $or: [
                    { approvedStudentId: studentId, date: attendanceDate },
                    { studentId: studentId, date: attendanceDate }
                ]
            });
            
            if (attendance) {
                attendance.status = status;
                await attendance.save();
            } else {
                attendance = new Attendance({
                    approvedStudentId: studentId,
                    class: approvedStudent.grade,
                    section: approvedStudent.section,
                    date: attendanceDate,
                    status
                });
                await attendance.save();
            }
            
            // Calculate and return updated attendance rate
            const updatedAttendanceRate = await calculateAttendanceRate(studentId, true);
            
            return res.json({ 
                message: 'Attendance marked successfully', 
                attendance,
                attendanceRate: updatedAttendanceRate
            });
        }
        
        // Handle regular student attendance
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        console.log('Found regular student:', student.rollNumber);
        
        // Check if attendance already exists for this student on this date (from ANY teacher)
        let attendance = await Attendance.findOne({
            $or: [
                { studentId: student._id, date: attendanceDate },
                { approvedStudentId: student._id, date: attendanceDate }
            ]
        });
        
        if (attendance) {
            attendance.status = status;
            await attendance.save();
        } else {
            attendance = new Attendance({
                studentId: student._id,
                class: student.class,
                section: student.section,
                date: attendanceDate,
                status
            });
            await attendance.save();
        }
        
        // Calculate and return updated attendance rate
        const updatedAttendanceRate = await calculateAttendanceRate(student._id, false);
        
        res.json({ 
            message: 'Attendance marked successfully', 
            attendance,
            attendanceRate: updatedAttendanceRate
        });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get student progress
router.get('/students/:id/progress', async (req, res) => {
    try {
        // Check if it's an approved student first
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudent = await ApprovedStudent.findById(req.params.id);
        
        if (approvedStudent) {
            // Handle approved student progress
            const attendanceHistory = await Attendance.find({ approvedStudentId: approvedStudent._id })
                .sort({ date: -1 })
                .limit(30);
            
            return res.json({
                student: {
                    _id: approvedStudent._id,
                    userId: {
                        firstName: approvedStudent.studentName.split(' ')[0] || '',
                        lastName: approvedStudent.studentName.split(' ').slice(1).join(' ') || '',
                        name: approvedStudent.studentName,
                        email: approvedStudent.email
                    },
                    rollNumber: approvedStudent.rollNumber,
                    grade: approvedStudent.grade,
                    section: approvedStudent.section
                },
                stats: {
                    learningProgress: 0,
                    completedLessons: 0,
                    attendanceRate: approvedStudent.totalSchoolDays > 0 ? 
                        Math.round((approvedStudent.attendanceDays / approvedStudent.totalSchoolDays) * 100) : 0,
                    averageRating: 0
                },
                feedbackHistory: [],
                attendanceHistory
            });
        }
        
        // Handle regular student progress
        const student = await Student.findById(req.params.id)
            .populate('userId', 'name email username');
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        const feedbackHistory = await Feedback.find({ studentId: student._id })
            .populate('lessonId', 'title subject')
            .sort({ createdAt: -1 });
        
        const attendanceHistory = await Attendance.find({ studentId: student._id })
            .sort({ date: -1 })
            .limit(30);
        
        const avgRating = feedbackHistory.length > 0 ? 
            feedbackHistory.reduce((sum, f) => sum + f.rating, 0) / feedbackHistory.length : 0;
        
        res.json({
            student,
            stats: {
                learningProgress: student.learningProgress,
                completedLessons: student.completedLessons,
                attendanceRate: student.totalSchoolDays > 0 ? 
                    Math.round((student.attendanceDays / student.totalSchoolDays) * 100) : 0,
                averageRating: Math.round(avgRating * 10) / 10
            },
            feedbackHistory,
            attendanceHistory
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get student attendance history
router.get('/students/:id/attendance', async (req, res) => {
    try {
        // Check if it's an approved student first
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudent = await ApprovedStudent.findById(req.params.id);
        
        if (approvedStudent) {
            // Handle approved student attendance
            const attendanceRecords = await Attendance.find({ approvedStudentId: approvedStudent._id })
                .sort({ date: -1 });
            
            const monthlyStats = {};
            attendanceRecords.forEach(record => {
                const monthKey = record.date.toISOString().substring(0, 7);
                if (!monthlyStats[monthKey]) {
                    monthlyStats[monthKey] = { present: 0, absent: 0, late: 0, total: 0 };
                }
                monthlyStats[monthKey][record.status]++;
                monthlyStats[monthKey].total++;
            });
            
            return res.json({
                student: {
                    _id: approvedStudent._id,
                    userId: {
                        firstName: approvedStudent.studentName.split(' ')[0] || '',
                        lastName: approvedStudent.studentName.split(' ').slice(1).join(' ') || '',
                        name: approvedStudent.studentName,
                        email: approvedStudent.email
                    },
                    rollNumber: approvedStudent.rollNumber,
                    grade: approvedStudent.grade,
                    section: approvedStudent.section
                },
                stats: {
                    totalDays: approvedStudent.totalSchoolDays,
                    presentDays: approvedStudent.attendanceDays,
                    attendanceRate: approvedStudent.totalSchoolDays > 0 ? 
                        Math.round((approvedStudent.attendanceDays / approvedStudent.totalSchoolDays) * 100) : 0
                },
                attendanceRecords,
                monthlyStats
            });
        }
        
        // Handle regular student attendance
        const student = await Student.findById(req.params.id)
            .populate('userId', 'name email username');
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        const attendanceRecords = await Attendance.find({ studentId: student._id })
            .sort({ date: -1 });
        
        const monthlyStats = {};
        attendanceRecords.forEach(record => {
            const monthKey = record.date.toISOString().substring(0, 7);
            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = { present: 0, absent: 0, late: 0, total: 0 };
            }
            monthlyStats[monthKey][record.status]++;
            monthlyStats[monthKey].total++;
        });
        
        res.json({
            student,
            stats: {
                totalDays: student.totalSchoolDays,
                presentDays: student.attendanceDays,
                attendanceRate: student.totalSchoolDays > 0 ? 
                    Math.round((student.attendanceDays / student.totalSchoolDays) * 100) : 0
            },
            attendanceRecords,
            monthlyStats
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get approved students
router.get('/approved-students', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const ApprovedStudent = require('../models/ApprovedStudent');
        
        const approvedStudents = await ApprovedStudent.find({ teacherId: teacher._id })
            .sort({ createdAt: -1 });
        
        const formattedStudents = approvedStudents.map(student => ({
            _id: student._id,
            userId: {
                name: student.studentName,
                email: student.email,
                isActive: !student.isUsed
            },
            rollNumber: student.rollNumber,
            grade: student.grade,
            section: student.section,
            parentPhone: student.parentPhone,
            enrollmentDate: student.createdAt,
            isApproved: true,
            hasSignedUp: student.isUsed,
            attendanceRate: student.totalSchoolDays > 0 ? 
                Math.round((student.attendanceDays / student.totalSchoolDays) * 100) : 0,
            totalSchoolDays: student.totalSchoolDays || 0,
            attendanceDays: student.attendanceDays || 0
        }));
        
        res.json(formattedStudents);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Mark student attendance for approved students
router.post('/approved-students/attendance', async (req, res) => {
    try {
        const { studentId, date, status } = req.body;
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);
        
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudent = await ApprovedStudent.findById(studentId);
        
        if (!approvedStudent) {
            return res.status(404).json({ message: 'Approved student not found' });
        }
        
        // Create attendance record for approved student
        const attendance = new Attendance({
            approvedStudentId: studentId,
            date: attendanceDate,
            status
        });
        
        await attendance.save();
        res.json({ message: 'Attendance marked successfully', attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get student lessons with progress
router.get('/students/:id/lessons', async (req, res) => {
    try {
        // Check if it's an approved student first
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudent = await ApprovedStudent.findById(req.params.id);
        
        let student;
        if (approvedStudent) {
            // Handle approved student
            const user = await User.findOne({ email: approvedStudent.email });
            if (user) {
                student = await Student.findOne({ userId: user._id });
            }
            
            if (!student) {
                return res.json({
                    student: {
                        _id: approvedStudent._id,
                        userId: {
                            firstName: approvedStudent.studentName.split(' ')[0] || '',
                            lastName: approvedStudent.studentName.split(' ').slice(1).join(' ') || '',
                            name: approvedStudent.studentName,
                            email: approvedStudent.email
                        },
                        rollNumber: approvedStudent.rollNumber,
                        grade: approvedStudent.grade,
                        section: approvedStudent.section
                    },
                    lessons: []
                });
            }
        } else {
            // Handle regular student
            student = await Student.findById(req.params.id)
                .populate('userId', 'name email username');
        }
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Get lessons assigned to this student (through progress records)
        const progressRecords = await LessonProgress.find({ studentId: student._id })
            .populate('lessonId')
            .sort({ createdAt: -1 });
        
        const lessonsWithProgress = progressRecords.map(progress => ({
            _id: progress.lessonId._id,
            title: progress.lessonId.title,
            description: progress.lessonId.description,
            subject: progress.lessonId.subject,
            class: progress.lessonId.class,
            section: progress.lessonId.section,
            createdAt: progress.lessonId.createdAt,
            progress: {
                status: progress.status,
                progress: progress.progress,
                videoWatched: progress.videoWatched,
                videoProgress: progress.videoProgress,
                assignmentCompleted: progress.assignmentCompleted,
                timeSpent: progress.timeSpent,
                startedAt: progress.startedAt,
                completedAt: progress.completedAt,
                lastAccessedAt: progress.lastAccessedAt
            }
        }));
        
        res.json({
            student,
            lessons: lessonsWithProgress
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get lesson progress for all students
router.get('/lessons/:lessonId/student-progress', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const lesson = await Lesson.findOne({ 
            _id: req.params.lessonId, 
            teacherId: teacher._id 
        });
        
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
        
        const ApprovedStudent = require('../models/ApprovedStudent');
        
        // Get only students approved by this teacher
        const approvedStudents = await ApprovedStudent.find({ teacherId: teacher._id });
        const approvedEmails = approvedStudents.map(s => s.email);
        
        const students = await Student.find()
            .populate('userId', 'name email');
        
        const teacherStudents = students.filter(student => 
            student.userId && approvedEmails.includes(student.userId.email)
        );
        
        // Get progress for each student
        const studentProgress = await Promise.all(teacherStudents.map(async (student) => {
            const progress = await LessonProgress.findOne({
                studentId: student._id,
                lessonId: req.params.lessonId
            });
            
            // Get attendance rate for this student
            const approvedStudent = await ApprovedStudent.findOne({ 
                email: student.userId.email,
                teacherId: teacher._id 
            });
            
            let attendanceRecords = [];
            if (approvedStudent) {
                attendanceRecords = await Attendance.find({ approvedStudentId: approvedStudent._id });
            }
            const studentAttendance = await Attendance.find({ studentId: student._id });
            attendanceRecords = [...attendanceRecords, ...studentAttendance];
            
            const workingDayRecords = attendanceRecords.filter(record => {
                const date = new Date(record.date);
                const dayOfWeek = date.getDay();
                return dayOfWeek !== 0 && dayOfWeek !== 6;
            });
            
            const presentDays = workingDayRecords.filter(r => r.status === 'present').length;
            const attendanceRate = workingDayRecords.length > 0 ? 
                (presentDays / workingDayRecords.length) * 100 : 0;
            
            return {
                student: {
                    _id: student._id,
                    name: student.userId.name,
                    email: student.userId.email,
                    rollNumber: student.rollNumber,
                    grade: student.grade,
                    section: student.section
                },
                attendanceRate: Math.round(attendanceRate * 10) / 10,
                canAccessLesson: true,
                progress: progress ? {
                    status: progress.status,
                    progress: progress.progress,
                    videoWatched: progress.videoWatched,
                    videoProgress: progress.videoProgress,
                    assignmentCompleted: progress.assignmentCompleted,
                    timeSpent: progress.timeSpent,
                    startedAt: progress.startedAt,
                    completedAt: progress.completedAt,
                    lastAccessedAt: progress.lastAccessedAt
                } : {
                    status: 'not_started',
                    progress: 0,
                    videoWatched: false,
                    videoProgress: 0,
                    assignmentCompleted: false,
                    timeSpent: 0
                }
            };
        }));
        
        res.json({
            lesson: {
                _id: lesson._id,
                title: lesson.title,
                subject: lesson.subject,
                grade: lesson.grade
            },
            studentProgress: studentProgress.filter(sp => sp.student.name && sp.student.name !== 'Unknown Student')
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get overall student progress analytics
router.get('/student-progress-analytics', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const ApprovedStudent = require('../models/ApprovedStudent');
        
        // Get all lessons by this teacher
        const lessons = await Lesson.find({ teacherId: teacher._id });
        
        // Get only students approved by this teacher
        const approvedStudents = await ApprovedStudent.find({ teacherId: teacher._id });
        const approvedEmails = approvedStudents.map(s => s.email);
        
        const students = await Student.find()
            .populate('userId', 'name email');
        
        const teacherStudents = students.filter(student => 
            student.userId && approvedEmails.includes(student.userId.email)
        );
        
        const analytics = {
            totalLessons: lessons.length,
            totalStudents: teacherStudents.filter(s => s.userId.name && s.userId.name !== 'Unknown Student').length,
            studentsWithAccess: 0,
            studentsWithoutAccess: 0,
            averageProgress: 0,
            completedLessons: 0,
            inProgressLessons: 0,
            notStartedLessons: 0
        };
        
        let totalProgress = 0;
        let progressCount = 0;
        
        for (const student of teacherStudents) {
            if (!student.userId.name || student.userId.name === 'Unknown Student') continue;
            
            // All students have access now
            analytics.studentsWithAccess++;
            
            // Get progress for all lessons
            const progressRecords = await LessonProgress.find({ 
                studentId: student._id,
                teacherId: teacher._id 
            });
            
            for (const progress of progressRecords) {
                totalProgress += progress.progress;
                progressCount++;
                
                if (progress.status === 'completed') {
                    analytics.completedLessons++;
                } else if (progress.status === 'in_progress') {
                    analytics.inProgressLessons++;
                } else {
                    analytics.notStartedLessons++;
                }
            }
        }
        
        analytics.averageProgress = progressCount > 0 ? Math.round(totalProgress / progressCount) : 0;
        
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Update student details
router.patch('/students/:userId/update', async (req, res) => {
    try {
        const { section, parentPhone } = req.body;
        
        const student = await Student.findOne({ userId: req.params.userId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        if (section) student.section = section;
        if (parentPhone) student.parentPhone = parentPhone;
        
        await student.save();
        res.json({ message: 'Student updated successfully', student });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get lesson assignments for teacher
router.get('/lesson-assignments', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const LessonAssignment = require('../models/LessonAssignment');
        
        const assignments = await LessonAssignment.find({ teacherId: teacher._id })
            .populate('lessonId', 'title subject grade')
            .populate('studentId', 'rollNumber')
            .populate({
                path: 'studentId',
                populate: {
                    path: 'userId',
                    select: 'name email'
                }
            })
            .sort({ assignedDate: -1 });
        
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get lesson progress for specific lesson
router.get('/lessons/:lessonId/progress', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const LessonAssignment = require('../models/LessonAssignment');
        
        const assignments = await LessonAssignment.find({ 
            lessonId: req.params.lessonId,
            teacherId: teacher._id 
        })
        .populate('studentId', 'rollNumber')
        .populate({
            path: 'studentId',
            populate: {
                path: 'userId',
                select: 'name email'
            }
        });
        
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Approve student email for signup
router.post('/approve-student', async (req, res) => {
    try {
        // Use teacher from middleware
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);

        const { email, studentName, rollNumber, grade, section, parentPhone } = req.body;
        const ApprovedStudent = require('../models/ApprovedStudent');

        // Check if email already approved by this teacher
        const existing = await ApprovedStudent.findOne({ email, teacherId: teacher._id });
        if (existing) {
            return res.status(400).json({ 
                success: false,
                message: 'You have already approved this student email' 
            });
        }

        const approvedStudent = new ApprovedStudent({
            email,
            teacherId: teacher._id,
            studentName,
            rollNumber,
            grade,
            section,
            parentPhone
        });

        await approvedStudent.save();
        res.status(201).json({ 
            success: true,
            message: 'Student email approved successfully. Student can now sign up with this email.',
            approvedStudent 
        });
    } catch (error) {
        console.error('Student approval error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to approve student', 
            error: error.message 
        });
    }
});

// Share video with students
router.post('/share-video', auth, authorize('teacher'), uploadVideo.single('videoFile'), async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher profile not found' });
        }

        const { title, description, class: videoClass, section, subject, type, url } = req.body;

        if (!title || !videoClass || !section || !type) {
            return res.status(400).json({ message: 'Missing required fields: title, class, section, type' });
        }

        if (type === 'youtube' && !url) {
            return res.status(400).json({ message: 'YouTube URL is required' });
        }

        if (type === 'upload' && !req.file) {
            return res.status(400).json({ message: 'Video file is required for upload type' });
        }

        const sharedVideo = new SharedVideo({
            teacherId: teacher._id,
            title,
            description,
            class: videoClass,
            section,
            subject: subject || 'General',
            type,
            url: type === 'youtube' ? url : null,
            filename: type === 'upload' ? req.file.originalname : null,
            filePath: type === 'upload' ? req.file.filename : null
        });

        await sharedVideo.save();
        
        const populatedVideo = await SharedVideo.findById(sharedVideo._id)
            .populate('teacherId', 'subject')
            .populate({
                path: 'teacherId',
                populate: {
                    path: 'userId',
                    select: 'firstName lastName'
                }
            });

        res.status(201).json({ 
            success: true,
            message: 'Video shared successfully',
            video: populatedVideo 
        });
    } catch (error) {
        console.error('Video sharing error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to share video', 
            error: error.message 
        });
    }
});

// Get shared videos
router.get('/shared-videos', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const videos = await SharedVideo.find({ teacherId: teacher._id })
            .sort({ createdAt: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get videos by class
router.get('/shared-videos/class/:className', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const { className } = req.params;
        
        const videos = await SharedVideo.find({ 
            teacherId: teacher._id,
            class: className 
        }).sort({ createdAt: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all classes with video counts
router.get('/video-classes', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        
        const classes = await SharedVideo.aggregate([
            { $match: { teacherId: teacher._id } },
            { $group: { _id: '$class', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        const result = classes.map(classData => ({
            className: classData._id,
            videoCount: classData.count
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get videos for a specific class (alternative endpoint)
router.get('/video-classes/:className/videos', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const { className } = req.params;
        
        const videos = await SharedVideo.find({ 
            teacherId: teacher._id,
            class: className 
        }).sort({ createdAt: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create assignment
router.post('/assignments', uploadAssignment.single('assignmentFile'), async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const { title, description, class: assignmentClass, section, assignmentType, dueDate, externalLink } = req.body;

        console.log('Creating assignment with:', { title, class: assignmentClass, section, assignmentType, dueDate });

        if (!title || !description || !assignmentClass || !section || !dueDate) {
            return res.status(400).json({ 
                message: 'Missing required fields: title, description, class, section, dueDate' 
            });
        }

        // Normalize class and section values
        const normalizedClass = String(assignmentClass).trim();
        const normalizedSection = String(section).trim().toUpperCase();

        const assignment = new Assignment({
            teacherId: teacher._id,
            title,
            description,
            class: normalizedClass,
            section: normalizedSection,
            assignmentType: assignmentType || 'assignment',
            dueDate: new Date(dueDate),
            externalLink,
            filePath: req.file ? req.file.filename : null,
            filename: req.file ? req.file.originalname : null
        });

        await assignment.save();
        console.log('Assignment created successfully:', assignment._id, 'Class:', assignment.class, 'Section:', assignment.section);
        
        res.status(201).json({ 
            success: true,
            message: 'Assignment created successfully', 
            assignment 
        });
    } catch (error) {
        console.error('Assignment creation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create assignment', 
            error: error.message 
        });
    }
});

// Get assignments
router.get('/assignments', async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const assignments = await Assignment.find({ teacherId: teacher._id })
            .sort({ createdAt: -1 });
        
        // Get submission counts for each assignment
        const assignmentsWithCounts = await Promise.all(assignments.map(async (assignment) => {
            const submissionCount = await AssignmentSubmission.countDocuments({ 
                assignmentId: assignment._id 
            });
            
            return {
                ...assignment.toObject(),
                submissionCount
            };
        }));
        
        res.json(assignmentsWithCounts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get assignment submissions
router.get('/assignments/:id/submissions', async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const assignment = await Assignment.findOne({ 
            _id: req.params.id, 
            teacherId: teacher._id 
        });
        
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        
        const submissions = await AssignmentSubmission.find({ assignmentId: assignment._id })
            .populate('studentId', 'rollNumber')
            .populate({
                path: 'studentId',
                populate: {
                    path: 'userId',
                    select: 'firstName lastName email'
                }
            })
            .sort({ submittedAt: -1 });
        
        // Get total students in this class/section
        const ApprovedStudent = require('../models/ApprovedStudent');
        const totalStudents = await ApprovedStudent.countDocuments({
            teacherId: teacher._id,
            grade: assignment.class,
            section: assignment.section
        });
        
        const formattedSubmissions = submissions.map(submission => ({
            _id: submission._id,
            studentName: submission.studentId?.userId ? 
                `${submission.studentId.userId.firstName} ${submission.studentId.userId.lastName}` : 
                'Unknown Student',
            rollNumber: submission.studentId?.rollNumber || 'N/A',
            submittedAt: submission.submittedAt,
            status: submission.status,
            grade: submission.grade,
            feedback: submission.feedback,
            filename: submission.filename,
            comments: submission.comments
        }));
        
        res.json({
            assignment,
            submissions: formattedSubmissions,
            totalStudents,
            submissionCount: submissions.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Grade assignment submission
router.post('/assignments/:assignmentId/submissions/:submissionId/grade', async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const { grade, feedback } = req.body;
        
        const submission = await AssignmentSubmission.findById(req.params.submissionId);
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        
        submission.grade = grade;
        submission.feedback = feedback;
        submission.status = 'graded';
        submission.gradedAt = new Date();
        submission.gradedBy = teacher._id;
        
        await submission.save();
        
        res.json({ 
            message: 'Assignment graded successfully',
            submission
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete assignment
router.delete('/assignments/:id', async (req, res) => {
    try {
        const teacher = req.teacher || await ensureTeacherProfile(req.user._id);
        const assignment = await Assignment.findOneAndDelete({
            _id: req.params.id,
            teacherId: teacher._id
        });
        
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        
        // Delete associated submissions
        await AssignmentSubmission.deleteMany({ assignmentId: req.params.id });
        
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
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
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }
        
        res.download(filePath, assignment.filename);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Download submission file
router.get('/submissions/:id/download', async (req, res) => {
    try {
        const submission = await AssignmentSubmission.findById(req.params.id);
        if (!submission || !submission.filePath) {
            return res.status(404).json({ message: 'Submission file not found' });
        }
        
        const filePath = path.join(__dirname, '../uploads', submission.filePath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }
        
        res.download(filePath, submission.filename);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete shared video
router.delete('/shared-videos/:id', async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ userId: req.user._id });
        const video = await SharedVideo.findOneAndDelete({
            _id: req.params.id,
            teacherId: teacher._id
        });
        
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        
        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;