// Test script to verify teacher API endpoints
const mongoose = require('mongoose');
const Teacher = require('./backend/models/Teacher');
const Student = require('./backend/models/Student');
const ApprovedStudent = require('./backend/models/ApprovedStudent');
const User = require('./backend/models/User');

async function testTeacherAPI() {
    try {
        // Connect to database
        await mongoose.connect('mongodb://localhost:27017/school_performance', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to database');
        
        // Find a teacher
        const teacher = await Teacher.findOne().populate('userId');
        if (!teacher) {
            console.log('No teachers found in database');
            return;
        }
        
        console.log('Found teacher:', teacher.userId?.firstName || 'Unknown', teacher.userId?.email);
        
        // Check approved students for this teacher
        const approvedStudents = await ApprovedStudent.find({ teacherId: teacher._id });
        console.log(`Found ${approvedStudents.length} approved students for this teacher`);
        
        if (approvedStudents.length > 0) {
            console.log('Approved students:');
            approvedStudents.forEach((student, index) => {
                console.log(`  ${index + 1}. ${student.studentName} (${student.email}) - Grade ${student.grade}-${student.section}`);
            });
        }
        
        // Check regular students
        const allStudents = await Student.find().populate('userId');
        const validStudents = allStudents.filter(s => s.userId && s.userId.email);
        console.log(`Found ${validStudents.length} regular students in database`);
        
        // Check which approved students have signed up
        let registeredCount = 0;
        for (const approved of approvedStudents) {
            const user = await User.findOne({ email: approved.email });
            if (user && user.role === 'student') {
                const student = await Student.findOne({ userId: user._id });
                if (student) {
                    registeredCount++;
                    console.log(`  Registered: ${approved.studentName} -> ${user.firstName} ${user.lastName}`);
                }
            }
        }
        
        console.log(`${registeredCount} approved students have completed registration`);
        
        // Test the specific API endpoint logic
        console.log('\n--- Testing API endpoint logic ---');
        
        // Simulate the /api/teacher/students/attendance endpoint
        const testClass = '10'; // Test with class 10
        const classApprovedStudents = await ApprovedStudent.find({ 
            teacherId: teacher._id,
            grade: testClass 
        });
        
        console.log(`Found ${classApprovedStudents.length} approved students for class ${testClass}`);
        
        const studentsForAttendance = [];
        
        // Add registered students
        for (const approved of classApprovedStudents) {
            const user = await User.findOne({ email: approved.email });
            if (user && user.role === 'student') {
                const student = await Student.findOne({ userId: user._id });
                if (student) {
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
                        type: 'registered'
                    });
                }
            } else {
                // Add approved but not registered students
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
                    type: 'approved'
                });
            }
        }
        
        console.log(`API would return ${studentsForAttendance.length} students for attendance`);
        studentsForAttendance.forEach((student, index) => {
            console.log(`  ${index + 1}. ${student.userId.firstName} ${student.userId.lastName} (${student.type})`);
        });
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database');
    }
}

testTeacherAPI();