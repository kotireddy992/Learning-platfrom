const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Lesson = require('../models/Lesson');
const Attendance = require('../models/Attendance');
const Feedback = require('../models/Feedback');
const TeacherAttendance = require('../models/TeacherAttendance');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Admin dashboard analytics
router.get('/dashboard', auth, authorize('admin'), async (req, res) => {
    try {
        const ApprovedStudent = require('../models/ApprovedStudent');
        const totalTeachers = await Teacher.countDocuments();
        const totalStudents = await ApprovedStudent.countDocuments();
        const totalLessons = await Lesson.countDocuments();
        const completedLessons = await Lesson.countDocuments({ isCompleted: true });

        // Teacher performance data
        const teachers = await Teacher.find().populate('userId', 'firstName lastName');
        const teacherPerformance = teachers.map(teacher => ({
            name: `${teacher.userId.firstName} ${teacher.userId.lastName}`,
            attendanceRate: teacher.totalWorkingDays > 0 ? 
                (teacher.attendanceDays / teacher.totalWorkingDays * 100).toFixed(1) : 0,
            completionRate: teacher.totalLessons > 0 ? 
                (teacher.completedLessons / teacher.totalLessons * 100).toFixed(1) : 0,
            totalLessons: teacher.totalLessons,
            completedLessons: teacher.completedLessons
        }));

        // Recent feedback analytics
        const recentFeedback = await Feedback.find()
            .populate('studentId', 'firstName lastName')
            .populate('teacherId', 'firstName lastName')
            .populate('lessonId', 'title')
            .sort({ createdAt: -1 })
            .limit(10);

        // Student progress distribution
        const students = await ApprovedStudent.find();
        const progressDistribution = {
            excellent: students.filter(s => s.learningProgress >= 80).length,
            good: students.filter(s => s.learningProgress >= 60 && s.learningProgress < 80).length,
            average: students.filter(s => s.learningProgress >= 40 && s.learningProgress < 60).length,
            poor: students.filter(s => s.learningProgress < 40).length
        };

        res.json({
            stats: {
                totalTeachers,
                totalStudents,
                totalLessons,
                completedLessons,
                completionRate: totalLessons > 0 ? (completedLessons / totalLessons * 100).toFixed(1) : 0
            },
            teacherPerformance,
            recentFeedback,
            progressDistribution
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all teachers (only show actual teachers, no default users)
router.get('/teachers', auth, authorize('admin'), async (req, res) => {
    try {
        // Get all users with teacher role
        const teacherUsers = await User.find({ role: 'teacher', isActive: true })
            .sort({ createdAt: -1 });
        
        const teachersData = [];
        
        for (const user of teacherUsers) {
            // Try to find existing teacher profile
            let teacher = await Teacher.findOne({ userId: user._id });
            
            // If no teacher profile exists, create one
            if (!teacher) {
                const { ensureCompleteTeacherProfile } = require('../utils/teacherProfileSetup');
                teacher = await ensureCompleteTeacherProfile(user._id);
            }
            
            // Add to results if valid
            if (teacher && user.name && user.name.trim() !== '') {
                teachersData.push({
                    _id: teacher._id,
                    userId: {
                        _id: user._id,
                        firstName: user.name.split(' ')[0] || user.name,
                        lastName: user.name.split(' ').slice(1).join(' ') || '',
                        email: user.email,
                        username: user.username,
                        isActive: user.isActive
                    },
                    employeeId: teacher.employeeId,
                    subject: teacher.subject,
                    grade: teacher.grade,
                    phone: teacher.phone,
                    assignedClasses: teacher.assignedClasses || [],
                    createdAt: teacher.createdAt
                });
            }
        }
        
        res.json(teachersData);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all students (only show students added by teachers)
router.get('/students', auth, authorize('admin'), async (req, res) => {
    try {
        console.log('Admin: Fetching students...');
        
        // Get all approved students (these are the ones teachers have added)
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find()
            .populate('teacherId')
            .populate({
                path: 'teacherId',
                populate: {
                    path: 'userId',
                    select: 'firstName lastName name'
                }
            })
            .sort({ grade: 1, section: 1, rollNumber: 1 });
        
        console.log('Admin: Found approved students:', approvedStudents.length);
        
        // Calculate real-time attendance for each student
        const studentsWithAttendance = await Promise.all(
            approvedStudents.map(async (approved) => {
                // Get all attendance records for this student
                let allAttendanceRecords = [];
                const user = await User.findOne({ email: approved.email, role: 'student' });
                if (user) {
                    const student = await Student.findOne({ userId: user._id });
                    if (student) {
                        const directAttendance = await Attendance.find({ studentId: student._id });
                        allAttendanceRecords = [...allAttendanceRecords, ...directAttendance];
                    }
                }
                const allApprovedRecords = await ApprovedStudent.find({ email: approved.email });
                for (const approvedRecord of allApprovedRecords) {
                    const approvedAttendance = await Attendance.find({ approvedStudentId: approvedRecord._id });
                    allAttendanceRecords = [...allAttendanceRecords, ...approvedAttendance];
                }
                const uniqueRecords = [];
                const seen = new Set();
                for (const record of allAttendanceRecords) {
                    const studentIdentifier = record.studentId || record.approvedStudentId || approved.email;
                    const teacherIdentifier = record.teacherId || 'unknown';
                    const dateKey = record.date.toISOString().split('T')[0];
                    const key = `${dateKey}-${studentIdentifier}-${teacherIdentifier}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueRecords.push(record);
                    }
                }
                const attendanceRecords = uniqueRecords;
                // Filter working days only
                const workingDays = attendanceRecords.filter(record => {
                    const date = new Date(record.date);
                    const dayOfWeek = date.getDay();
                    return dayOfWeek !== 0 && dayOfWeek !== 6;
                });

                const totalDays = workingDays.length;
                const presentDays = workingDays.filter(r => 
                    r.status === 'present' || r.status === 'late'
                ).length;
                const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

                // Check if student has registered
                
                // Get teacher name with better fallback
                let teacherName = 'Unknown Teacher';
                if (approved.teacherId && approved.teacherId.userId) {
                    if (approved.teacherId.userId.firstName && approved.teacherId.userId.lastName) {
                        teacherName = `${approved.teacherId.userId.firstName} ${approved.teacherId.userId.lastName}`;
                    } else if (approved.teacherId.userId.name) {
                        teacherName = approved.teacherId.userId.name;
                    }
                }
                
                return {
                    _id: approved._id,
                    studentName: approved.studentName,
                    email: approved.email,
                    rollNumber: approved.rollNumber,
                    class: approved.grade,
                    section: approved.section,
                    parentPhone: approved.parentPhone,
                    teacherName: teacherName,
                    hasRegistered: !!user,
                    isActive: user ? user.isActive : false,
                    attendanceRate,
                    totalDays,
                    presentDays,
                    createdAt: approved.createdAt
                };
            })
        );
        
        // Remove duplicates by email
        const uniqueStudents = [];
        const seenEmails = new Set();
        
        for (const student of studentsWithAttendance) {
            if (!seenEmails.has(student.email)) {
                seenEmails.add(student.email);
                uniqueStudents.push(student);
            }
        }
        
        console.log('Admin: Returning students data:', uniqueStudents.length);
        res.json(uniqueStudents);
    } catch (error) {
        console.error('Admin: Error fetching students:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Alternative endpoint for debugging - get all students including registered ones
router.get('/all-students', auth, authorize('admin'), async (req, res) => {
    try {
        console.log('Admin: Fetching all students (debug endpoint)...');
        
        // Get both approved students and registered students
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find()
            .populate('teacherId')
            .populate({
                path: 'teacherId',
                populate: {
                    path: 'userId',
                    select: 'firstName lastName name'
                }
            });
        const registeredStudents = await Student.find().populate('userId', 'firstName lastName email name');
        
        console.log('Debug: Found approved students:', approvedStudents.length);
        console.log('Debug: Found registered students:', registeredStudents.length);
        
        const allStudentsData = [];
        
        // Add approved students
        for (const approved of approvedStudents) {
            const user = await User.findOne({ email: approved.email, role: 'student' });
            
            let teacherName = 'Unknown Teacher';
            if (approved.teacherId && approved.teacherId.userId) {
                if (approved.teacherId.userId.firstName && approved.teacherId.userId.lastName) {
                    teacherName = `${approved.teacherId.userId.firstName} ${approved.teacherId.userId.lastName}`;
                } else if (approved.teacherId.userId.name) {
                    teacherName = approved.teacherId.userId.name;
                }
            }
            
            allStudentsData.push({
                _id: approved._id,
                studentName: approved.studentName,
                email: approved.email,
                rollNumber: approved.rollNumber,
                class: approved.grade,
                section: approved.section,
                teacherName: teacherName,
                type: 'approved',
                hasRegistered: !!user,
                isActive: user ? user.isActive : false,
                source: 'teacher_approved',
                createdAt: approved.createdAt
            });
        }
        
        // Add registered students that might not be in approved list
        for (const student of registeredStudents) {
            const email = student.userId.email;
            if (!seenEmails.has(email)) {
                seenEmails.add(email);
                const displayName = student.userId.firstName && student.userId.lastName ? 
                    `${student.userId.firstName} ${student.userId.lastName}` : 
                    (student.userId.name || 'Unknown Student');
                    
                allStudentsData.push({
                    _id: student._id,
                    studentName: displayName,
                    email: student.userId.email,
                    rollNumber: student.rollNumber,
                    class: student.class,
                    section: student.section,
                    teacherName: 'Direct Registration',
                    type: 'registered',
                    hasRegistered: true,
                    isActive: student.userId.isActive,
                    source: 'direct_registration',
                    createdAt: student.createdAt
                });
            }
        }
        
        console.log('Admin: All students data:', allStudentsData.length);
        res.json(allStudentsData);
    } catch (error) {
        console.error('Admin: Error fetching all students:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Debug endpoint to check raw database data
router.get('/debug-data', auth, authorize('admin'), async (req, res) => {
    try {
        const ApprovedStudent = require('../models/ApprovedStudent');
        
        const approvedCount = await ApprovedStudent.countDocuments();
        const studentCount = await Student.countDocuments();
        const userCount = await User.countDocuments({ role: 'student' });
        const teacherCount = await Teacher.countDocuments();
        
        const sampleApproved = await ApprovedStudent.find().limit(3);
        const sampleStudents = await Student.find().populate('userId').limit(3);
        
        res.json({
            counts: {
                approvedStudents: approvedCount,
                registeredStudents: studentCount,
                studentUsers: userCount,
                teachers: teacherCount
            },
            samples: {
                approvedStudents: sampleApproved,
                registeredStudents: sampleStudents
            }
        });
    } catch (error) {
        console.error('Debug data error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get students by class
router.get('/students/class/:className', auth, authorize('admin'), async (req, res) => {
    try {
        const { className } = req.params;
        const students = await Student.find({ class: className })
            .populate('userId', 'firstName lastName email username isActive')
            .sort({ rollNumber: 1 });
        res.json(students);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all classes with student counts
router.get('/classes', auth, authorize('admin'), async (req, res) => {
    try {
        const classes = await Student.aggregate([
            { $group: { _id: '$class', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json(classes.map(c => ({ className: c._id, studentCount: c.count })));
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add new student
router.post('/students', auth, authorize('admin'), async (req, res) => {
    try {
        const { firstName, lastName, email, username, password, class: studentClass, section, rollNumber, parentPhone, address } = req.body;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user account
        const user = new User({
            firstName,
            lastName,
            email,
            username,
            password: hashedPassword,
            role: 'student',
            isActive: true
        });
        await user.save();
        
        // Create student profile
        const student = new Student({
            userId: user._id,
            studentId: `STU${Date.now()}`,
            class: studentClass,
            section,
            rollNumber,
            parentPhone,
            address
        });
        await student.save();
        
        const populatedStudent = await Student.findById(student._id)
            .populate('userId', 'firstName lastName email username isActive');
        
        res.status(201).json({ message: 'Student added successfully', student: populatedStudent });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Mark attendance for a class
router.post('/attendance/class/:className', auth, authorize('admin'), async (req, res) => {
    try {
        const { className } = req.params;
        const { date, attendanceData } = req.body; // attendanceData: [{ studentId, status, notes }]
        
        const attendanceRecords = [];
        
        for (const record of attendanceData) {
            const student = await Student.findById(record.studentId);
            if (!student) continue;
            
            const attendance = new Attendance({
                studentId: record.studentId,
                class: student.class,
                section: student.section,
                date: new Date(date),
                status: record.status,
                notes: record.notes,
                checkInTime: record.status === 'present' ? new Date() : null
            });
            await attendance.save();
            attendanceRecords.push(attendance);
        }
        
        res.json({ message: 'Attendance marked successfully', records: attendanceRecords });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get attendance for a class on a specific date
router.get('/attendance/class/:className/:date', auth, authorize('admin'), async (req, res) => {
    try {
        const { className, date } = req.params;
        
        const students = await Student.find({ class: className })
            .populate('userId', 'firstName lastName')
            .sort({ rollNumber: 1 });
        
        const attendanceRecords = await Attendance.find({
            date: new Date(date),
            studentId: { $in: students.map(s => s._id) }
        });
        
        const studentsWithAttendance = students.map(student => {
            const attendance = attendanceRecords.find(a => a.studentId.toString() === student._id.toString());
            return {
                ...student.toObject(),
                attendance: attendance || null
            };
        });
        
        res.json(studentsWithAttendance);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Teacher performance trends (last 30 days)
router.get('/analytics/teacher-trends', auth, authorize('admin'), async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const teachers = await Teacher.find().populate('userId', 'firstName lastName');
        const trends = [];

        for (const teacher of teachers) {
            const attendanceData = await Attendance.find({
                teacherId: teacher._id,
                type: 'teacher',
                date: { $gte: thirtyDaysAgo }
            }).sort({ date: 1 });

            const lessonData = await Lesson.find({
                teacherId: teacher._id,
                completedDate: { $gte: thirtyDaysAgo }
            }).sort({ completedDate: 1 });

            trends.push({
                teacherName: `${teacher.userId.firstName} ${teacher.userId.lastName}`,
                attendance: attendanceData.map(a => ({
                    date: a.date.toISOString().split('T')[0],
                    status: a.status
                })),
                lessons: lessonData.map(l => ({
                    date: l.completedDate.toISOString().split('T')[0],
                    title: l.title
                }))
            });
        }

        res.json(trends);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Feedback analytics
router.get('/analytics/feedback', auth, authorize('admin'), async (req, res) => {
    try {
        const feedbackStats = await Feedback.aggregate([
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const understandingStats = await Feedback.aggregate([
            {
                $group: {
                    _id: '$understanding',
                    count: { $sum: 1 }
                }
            }
        ]);

        const difficultyStats = await Feedback.aggregate([
            {
                $group: {
                    _id: '$difficulty',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            ratings: feedbackStats,
            understanding: understandingStats,
            difficulty: difficultyStats
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Low performance alerts
router.get('/alerts', auth, authorize('admin'), async (req, res) => {
    try {
        const alerts = [];

        // Teachers with low attendance (< 80%)
        const teachers = await Teacher.find().populate('userId', 'firstName lastName');
        for (const teacher of teachers) {
            const attendanceRate = teacher.totalWorkingDays > 0 ? 
                (teacher.attendanceDays / teacher.totalWorkingDays * 100) : 0;
            
            if (attendanceRate < 80 && teacher.totalWorkingDays > 5) {
                alerts.push({
                    type: 'low_attendance',
                    message: `${teacher.userId.firstName} ${teacher.userId.lastName} has low attendance (${attendanceRate.toFixed(1)}%)`,
                    severity: 'high',
                    teacherId: teacher._id
                });
            }

            // Teachers with low lesson completion (< 70%)
            const completionRate = teacher.totalLessons > 0 ? 
                (teacher.completedLessons / teacher.totalLessons * 100) : 0;
            
            if (completionRate < 70 && teacher.totalLessons > 3) {
                alerts.push({
                    type: 'low_completion',
                    message: `${teacher.userId.firstName} ${teacher.userId.lastName} has low lesson completion (${completionRate.toFixed(1)}%)`,
                    severity: 'medium',
                    teacherId: teacher._id
                });
            }
        }

        res.json(alerts);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Remove default users endpoint
router.delete('/remove-default-users', auth, authorize('admin'), async (req, res) => {
    try {
        // Get approved students to preserve their emails
        const ApprovedStudent = require('../models/ApprovedStudent');
        const approvedStudents = await ApprovedStudent.find();
        const approvedEmails = approvedStudents.map(s => s.email);
        
        // Remove users that are NOT teachers, NOT admins, and NOT approved students
        const deletedUsers = await User.deleteMany({
            role: 'student',
            email: { $nin: approvedEmails }
        });
        
        // Get all valid user IDs (teachers, admins, approved students)
        const validUsers = await User.find({ 
            $or: [
                { role: 'teacher' },
                { role: 'admin' },
                { email: { $in: approvedEmails } }
            ]
        });
        const validUserIds = validUsers.map(u => u._id);
        
        // Remove orphaned student records
        const deletedStudents = await Student.deleteMany({
            userId: { $nin: validUserIds }
        });
        
        res.json({
            message: 'Default users removed successfully',
            deletedUsers: deletedUsers.deletedCount,
            deletedStudents: deletedStudents.deletedCount,
            preservedTeachers: validUsers.filter(u => u.role === 'teacher').length,
            preservedAdmins: validUsers.filter(u => u.role === 'admin').length,
            preservedApprovedStudents: approvedStudents.length
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add endpoint to assign classes to teacher
router.post('/assign-classes', auth, authorize('admin'), async (req, res) => {
    try {
        const { teacherId, assignedClasses } = req.body;
        
        if (!teacherId || !assignedClasses || !Array.isArray(assignedClasses)) {
            return res.status(400).json({ message: 'Teacher ID and assigned classes array are required' });
        }
        
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        teacher.assignedClasses = assignedClasses;
        await teacher.save();
        
        res.json({ message: 'Classes assigned successfully', teacher });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get teacher's assigned classes
router.get('/teacher-classes/:teacherId', auth, authorize('admin'), async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.teacherId)
            .populate('userId', 'firstName lastName');
        
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        res.json({
            teacher: {
                _id: teacher._id,
                name: `${teacher.userId.firstName} ${teacher.userId.lastName}`,
                subject: teacher.subject,
                assignedClasses: teacher.assignedClasses || []
            }
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Bulk activate students
router.put('/students/bulk-activate', auth, authorize('admin'), async (req, res) => {
    try {
        const result = await User.updateMany(
            { role: 'student', isActive: false },
            { isActive: true }
        );
        res.json({ message: 'Students activated successfully', count: result.modifiedCount });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Bulk deactivate students
router.put('/students/bulk-deactivate', auth, authorize('admin'), async (req, res) => {
    try {
        const result = await User.updateMany(
            { role: 'student', isActive: true },
            { isActive: false }
        );
        res.json({ message: 'Students deactivated successfully', count: result.modifiedCount });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete student
router.delete('/students/:studentId', auth, authorize('admin'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Delete user account
        await User.findByIdAndDelete(student.userId);
        // Delete student profile
        await Student.findByIdAndDelete(req.params.studentId);
        // Delete related attendance records
        await Attendance.deleteMany({ studentId: req.params.studentId });
        
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete teacher
router.delete('/teachers/:teacherId', auth, authorize('admin'), async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.teacherId);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        // Delete user account
        await User.findByIdAndDelete(teacher.userId);
        // Delete teacher profile
        await Teacher.findByIdAndDelete(req.params.teacherId);
        // Delete related lessons
        await Lesson.deleteMany({ teacherId: req.params.teacherId });
        // Delete teacher attendance records
        await TeacherAttendance.deleteMany({ teacherId: req.params.teacherId });
        
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update student
router.put('/students/:studentId', auth, authorize('admin'), async (req, res) => {
    try {
        const { firstName, lastName, email, class: studentClass, section, rollNumber, parentPhone, address } = req.body;
        
        const student = await Student.findById(req.params.studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Update user account
        await User.findByIdAndUpdate(student.userId, {
            firstName,
            lastName,
            email
        });
        
        // Update student profile
        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.studentId,
            {
                class: studentClass,
                section,
                rollNumber,
                parentPhone,
                address
            },
            { new: true }
        ).populate('userId', 'firstName lastName email username isActive');
        
        res.json({ message: 'Student updated successfully', student: updatedStudent });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update teacher
router.put('/teachers/:teacherId', auth, authorize('admin'), async (req, res) => {
    try {
        const { firstName, lastName, email, subject, phone, assignedClasses } = req.body;
        
        const teacher = await Teacher.findById(req.params.teacherId);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        // Update user account
        await User.findByIdAndUpdate(teacher.userId, {
            firstName,
            lastName,
            email
        });
        
        // Update teacher profile
        const updatedTeacher = await Teacher.findByIdAndUpdate(
            req.params.teacherId,
            {
                subject,
                phone,
                assignedClasses
            },
            { new: true }
        ).populate('userId', 'firstName lastName email username isActive');
        
        res.json({ message: 'Teacher updated successfully', teacher: updatedTeacher });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all users
router.get('/users', auth, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Toggle user status
router.put('/users/:userId/toggle-status', auth, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.isActive = !user.isActive;
        await user.save();
        
        res.json({ message: 'User status updated successfully', user });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== TEACHER ATTENDANCE ROUTES ====================

// Get today's attendance status for all teachers
router.get('/teachers/attendance/today', auth, authorize('admin'), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const teachers = await Teacher.find()
            .populate('userId', 'name email')
            .sort({ employeeId: 1 });
        
        const attendanceRecords = await TeacherAttendance.find({ date: today });
        
        // Filter out teachers whose User account no longer exists
        const teachersWithAttendance = teachers
            .filter(teacher => teacher.userId) // Only include if userId exists
            .map(teacher => {
                const attendance = attendanceRecords.find(
                    a => a.teacherId.toString() === teacher._id.toString()
                );
                
                const userName = teacher.userId.name || 'Unknown';
                const [firstName, ...lastNameParts] = userName.split(' ');
                
                return {
                    _id: teacher._id,
                    employeeId: teacher.employeeId,
                    name: userName,
                    firstName: firstName,
                    lastName: lastNameParts.join(' ') || '',
                    email: teacher.userId.email,
                    subject: teacher.subject,
                    assignedClasses: teacher.assignedClasses,
                    attendance: attendance ? {
                        status: attendance.status,
                        markedAt: attendance.markedAt,
                        notes: attendance.notes
                    } : null
                };
            });
        
        res.json(teachersWithAttendance);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Mark attendance for teachers (single or bulk)
router.post('/teachers/attendance/mark', auth, authorize('admin'), async (req, res) => {
    try {
        const { attendanceData, date } = req.body;
        
        if (!attendanceData || !Array.isArray(attendanceData)) {
            return res.status(400).json({ message: 'Attendance data array is required' });
        }
        
        const attendanceDate = date ? new Date(date) : new Date();
        attendanceDate.setHours(0, 0, 0, 0);
        
        // Validate date is not in future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (attendanceDate > today) {
            return res.status(400).json({ message: 'Cannot mark attendance for future dates' });
        }
        
        const results = [];
        const errors = [];
        
        for (const record of attendanceData) {
            try {
                const { teacherId, status, notes } = record;
                
                // Validate teacher exists
                const teacher = await Teacher.findById(teacherId);
                if (!teacher) {
                    errors.push({ teacherId, error: 'Teacher not found' });
                    continue;
                }
                
                // Check if attendance already marked
                let attendance = await TeacherAttendance.findOne({
                    teacherId,
                    date: attendanceDate
                });
                
                if (attendance) {
                    // Update existing attendance (allow same-day edits)
                    const previousStatus = attendance.status;
                    attendance.editHistory.push({
                        previousStatus,
                        newStatus: status,
                        editedBy: req.user._id,
                        editedAt: new Date(),
                        reason: notes || 'Updated by admin'
                    });
                    attendance.status = status;
                    attendance.notes = notes;
                    attendance.markedBy = req.user._id;
                    attendance.markedAt = new Date();
                    await attendance.save();
                } else {
                    // Create new attendance record
                    attendance = new TeacherAttendance({
                        teacherId,
                        date: attendanceDate,
                        status,
                        markedBy: req.user._id,
                        notes
                    });
                    await attendance.save();
                }
                
                // Note: Teacher attendance stats are calculated from TeacherAttendance collection
                // No need to update Teacher model directly
                
                results.push({
                    teacherId,
                    status: 'success',
                    attendance
                });
            } catch (err) {
                errors.push({ teacherId: record.teacherId, error: err.message });
            }
        }
        
        res.json({
            message: 'Attendance marking completed',
            successful: results.length,
            failed: errors.length,
            results,
            errors
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get attendance history with date range filter
router.get('/teachers/attendance/history', auth, authorize('admin'), async (req, res) => {
    try {
        const { startDate, endDate, teacherId } = req.query;
        
        const query = {};
        
        if (teacherId) {
            query.teacherId = teacherId;
        }
        
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }
        
        const attendanceRecords = await TeacherAttendance.find(query)
            .populate('teacherId')
            .populate({
                path: 'teacherId',
                populate: { path: 'userId', select: 'name email' }
            })
            .populate('markedBy', 'name email')
            .sort({ date: -1 });
        
        // Filter out records where teacher or userId doesn't exist
        const formattedRecords = attendanceRecords
            .filter(record => record.teacherId && record.teacherId.userId)
            .map(record => ({
                _id: record._id,
                date: record.date,
                status: record.status,
                teacherName: record.teacherId.userId.name || 'Unknown',
                employeeId: record.teacherId.employeeId,
                subject: record.teacherId.subject,
                markedBy: record.markedBy?.name || 'Unknown',
                markedAt: record.markedAt,
                notes: record.notes,
                editHistory: record.editHistory
            }));
        
        res.json(formattedRecords);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get specific teacher's attendance report
router.get('/teachers/attendance/report/:teacherId', auth, authorize('admin'), async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { startDate, endDate } = req.query;
        
        const teacher = await Teacher.findById(teacherId)
            .populate('userId', 'name email');
        
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        const query = { teacherId };
        
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }
        
        const attendanceRecords = await TeacherAttendance.find(query)
            .sort({ date: -1 });
        
        const totalDays = attendanceRecords.length;
        const presentDays = attendanceRecords.filter(r => r.status === 'Present').length;
        const absentDays = attendanceRecords.filter(r => r.status === 'Absent').length;
        const leaveDays = attendanceRecords.filter(r => r.status === 'Leave').length;
        const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0;
        
        // Monthly summary
        const monthlyData = {};
        attendanceRecords.forEach(record => {
            const month = record.date.toISOString().substring(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { present: 0, absent: 0, leave: 0, total: 0 };
            }
            monthlyData[month].total++;
            if (record.status === 'Present') monthlyData[month].present++;
            if (record.status === 'Absent') monthlyData[month].absent++;
            if (record.status === 'Leave') monthlyData[month].leave++;
        });
        
        res.json({
            teacher: {
                _id: teacher._id,
                name: teacher.userId.name,
                email: teacher.userId.email,
                employeeId: teacher.employeeId,
                subject: teacher.subject,
                joinDate: teacher.joinDate
            },
            summary: {
                totalDays,
                presentDays,
                absentDays,
                leaveDays,
                attendanceRate
            },
            monthlyData,
            records: attendanceRecords
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get attendance summary for dashboard widget
router.get('/teachers/attendance/summary', auth, authorize('admin'), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const totalTeachers = await Teacher.countDocuments();
        const markedToday = await TeacherAttendance.countDocuments({ date: today });
        const pendingToday = totalTeachers - markedToday;
        
        const presentToday = await TeacherAttendance.countDocuments({ 
            date: today, 
            status: 'Present' 
        });
        const absentToday = await TeacherAttendance.countDocuments({ 
            date: today, 
            status: 'Absent' 
        });
        const leaveToday = await TeacherAttendance.countDocuments({ 
            date: today, 
            status: 'Leave' 
        });
        
        res.json({
            totalTeachers,
            markedToday,
            pendingToday,
            presentToday,
            absentToday,
            leaveToday,
            date: today
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;


// Get student attendance details for admin
router.get('/students/:studentId/attendance', auth, authorize('admin'), async (req, res) => {
    try {
        const { studentId } = req.params;
        const ApprovedStudent = require('../models/ApprovedStudent');
        
        const approvedStudent = await ApprovedStudent.findById(studentId);
        if (!approvedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Get ALL attendance records for this student from ALL teachers (same as student panel)
        let allAttendanceRecords = [];
        
        // Method 1: Check if student has registered and get direct attendance
        const user = await User.findOne({ email: approvedStudent.email, role: 'student' });
        if (user) {
            const student = await Student.findOne({ userId: user._id });
            if (student) {
                const directAttendance = await Attendance.find({ studentId: student._id });
                allAttendanceRecords = [...allAttendanceRecords, ...directAttendance];
            }
        }
        
        // Method 2: Get attendance from ALL teachers' approved student records
        const allApprovedRecords = await ApprovedStudent.find({ email: approvedStudent.email });
        for (const approved of allApprovedRecords) {
            const approvedAttendance = await Attendance.find({ approvedStudentId: approved._id });
            allAttendanceRecords = [...allAttendanceRecords, ...approvedAttendance];
        }
        
        // Remove duplicates (one attendance per date per teacher)
        const uniqueRecords = [];
        const seen = new Set();
        for (const record of allAttendanceRecords) {
            const studentIdentifier = record.studentId || record.approvedStudentId || approvedStudent.email;
            const teacherIdentifier = record.teacherId || 'unknown';
            const dateKey = record.date.toISOString().split('T')[0];
            const key = `${dateKey}-${studentIdentifier}-${teacherIdentifier}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueRecords.push(record);
            }
        }
        
        // Filter working days only
        const workingDays = uniqueRecords.filter(record => {
            const date = new Date(record.date);
            const dayOfWeek = date.getDay();
            return dayOfWeek !== 0 && dayOfWeek !== 6;
        });
        
        const totalDays = workingDays.length;
        const presentDays = workingDays.filter(r => r.status === 'present' || r.status === 'late').length;
        const absentDays = workingDays.filter(r => r.status === 'absent').length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        const recordsWithTeacher = await Promise.all(workingDays.map(async (record) => {
            let teacherName = 'N/A';
            if (record.teacherId) {
                const teacher = await Teacher.findById(record.teacherId).populate('userId', 'firstName lastName');
                if (teacher && teacher.userId) {
                    teacherName = `${teacher.userId.firstName} ${teacher.userId.lastName}`;
                }
            }
            return {
                date: record.date,
                status: record.status,
                teacherName
            };
        }));
        
        res.json({
            studentName: approvedStudent.studentName,
            attendanceRate,
            totalDays,
            presentDays,
            absentDays,
            records: recordsWithTeacher
        });
        
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});







