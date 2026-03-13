const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const User = require('./models/User');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const ApprovedStudent = require('./models/ApprovedStudent');
const Assignment = require('./models/Assignment');
const SharedVideo = require('./models/SharedVideo');
const Attendance = require('./models/Attendance');

async function setupTestData() {
    console.log('\n=== SETTING UP TEST DATA ===\n');
    
    try {
        // Clear all data
        console.log('Clearing database...');
        await User.deleteMany({});
        await Teacher.deleteMany({});
        await Student.deleteMany({});
        await ApprovedStudent.deleteMany({});
        await Assignment.deleteMany({});
        await SharedVideo.deleteMany({});
        await Attendance.deleteMany({});
        console.log('✅ Database cleared\n');

        // Create Admin
        console.log('Creating admin...');
        const adminPass = await bcrypt.hash('admin123', 10);
        const admin = await User.create({
            username: 'admin',
            name: 'Admin User',
            email: 'admin@school.com',
            password: adminPass,
            role: 'admin',
            isActive: true
        });
        console.log('✅ Admin: admin@school.com / admin123\n');

        // Create Teachers
        console.log('Creating teachers...');
        const teacher1Pass = await bcrypt.hash('teacher123', 10);
        const teacher1User = await User.create({
            username: 'john.smith',
            name: 'John Smith',
            email: 'john.smith@school.com',
            password: teacher1Pass,
            role: 'teacher',
            isActive: true
        });
        const teacher1 = await Teacher.create({
            userId: teacher1User._id,
            employeeId: 'T001',
            subject: 'Mathematics',
            assignedClasses: [
                { class: '9', section: 'A' },
                { class: '10', section: 'B' }
            ]
        });
        console.log('✅ Teacher 1: john.smith@school.com / teacher123 (Math)');

        const teacher2Pass = await bcrypt.hash('teacher123', 10);
        const teacher2User = await User.create({
            username: 'sarah.johnson',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@school.com',
            password: teacher2Pass,
            role: 'teacher',
            isActive: true
        });
        const teacher2 = await Teacher.create({
            userId: teacher2User._id,
            employeeId: 'T002',
            subject: 'Science',
            assignedClasses: [
                { class: '9', section: 'A' }
            ]
        });
        console.log('✅ Teacher 2: sarah.johnson@school.com / teacher123 (Science)\n');

        // Approve Students (Teacher 1)
        console.log('Teacher 1 approving students...');
        const approvedStudents = [];
        for (let i = 1; i <= 5; i++) {
            const approved = await ApprovedStudent.create({
                email: `student${i}@test.com`,
                teacherId: teacher1._id,
                studentName: `Student ${i}`,
                rollNumber: `10${i}`,
                grade: '9',
                section: 'A',
                parentPhone: `98765432${i}0`
            });
            approvedStudents.push(approved);
            console.log(`✅ Approved: student${i}@test.com (9-A, Roll: 10${i})`);
        }
        console.log('');

        // Register Students
        console.log('Registering students...');
        for (let i = 1; i <= 3; i++) {
            const studentPass = await bcrypt.hash('student123', 10);
            const studentUser = await User.create({
                username: `student${i}`,
                name: `Student ${i}`,
                email: `student${i}@test.com`,
                password: studentPass,
                role: 'student',
                isActive: true
            });
            
            const approved = approvedStudents[i-1];
            await Student.create({
                userId: studentUser._id,
                studentId: `STU00${i}`,
                rollNumber: approved.rollNumber,
                class: approved.grade,
                grade: approved.grade,
                section: approved.section,
                parentPhone: approved.parentPhone
            });
            console.log(`✅ Registered: student${i}@test.com / student123`);
        }
        console.log('');

        // Multi-teacher assignment
        console.log('Teacher 2 approving student1 (multi-teacher)...');
        await ApprovedStudent.create({
            email: 'student1@test.com',
            teacherId: teacher2._id,
            studentName: 'Student 1',
            rollNumber: '101',
            grade: '9',
            section: 'A',
            parentPhone: '9876543210'
        });
        console.log('✅ Student1 approved by both teachers\n');

        // Mark Attendance
        console.log('Marking attendance...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 3; i++) {
            await Attendance.create({
                approvedStudentId: approvedStudents[i]._id,
                teacherId: teacher1._id,
                class: '9',
                section: 'A',
                date: today,
                status: 'present'
            });
        }
        console.log('✅ Attendance marked for 3 students\n');

        // Create Assignment
        console.log('Creating assignment...');
        await Assignment.create({
            teacherId: teacher1._id,
            title: 'Algebra Homework',
            description: 'Solve problems 1-10',
            class: '9',
            section: 'A',
            assignmentType: 'assignment',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isActive: true
        });
        console.log('✅ Assignment created\n');

        // Share Video
        console.log('Sharing video...');
        await SharedVideo.create({
            teacherId: teacher1._id,
            title: 'Introduction to Algebra',
            description: 'Basic concepts',
            class: '9',
            section: 'A',
            subject: 'Mathematics',
            type: 'youtube',
            url: 'https://www.youtube.com/watch?v=example'
        });
        console.log('✅ Video shared\n');

        console.log('=== TEST DATA READY ===\n');
        console.log('LOGIN CREDENTIALS:');
        console.log('Admin: admin@school.com / admin123');
        console.log('Teacher 1: john.smith@school.com / teacher123');
        console.log('Teacher 2: sarah.johnson@school.com / teacher123');
        console.log('Students: student1@test.com to student3@test.com / student123');
        console.log('\nPending: student4@test.com, student5@test.com (not registered yet)\n');
        console.log('Access: http://localhost:5000/pages/login.html\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

setupTestData();
