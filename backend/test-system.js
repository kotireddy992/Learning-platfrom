const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
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

async function testSystem() {
    console.log('\n=== SCHOOL PERFORMANCE SYSTEM TEST ===\n');
    
    try {
        // Phase 1: Clear existing data
        console.log('Phase 1: Clearing existing data...');
        await User.deleteMany({});
        await Teacher.deleteMany({});
        await Student.deleteMany({});
        await ApprovedStudent.deleteMany({});
        await Assignment.deleteMany({});
        await SharedVideo.deleteMany({});
        await Attendance.deleteMany({});
        console.log('✅ Database cleared\n');

        // Phase 2: Create Admin
        console.log('Phase 2: Creating Admin account...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = await User.create({
            username: 'admin',
            name: 'Admin User',
            email: 'admin@school.com',
            password: hashedPassword,
            role: 'admin',
            isActive: true
        });
        console.log('✅ Admin created:', admin.email);
        console.log('   Username: admin');
        console.log('   Password: admin123\n');

        // Phase 3: Create Teachers
        console.log('Phase 3: Creating Teacher accounts...');
        const teachers = [];
        
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
            subject: 'Mathematics',
            qualification: 'M.Sc Mathematics',
            experience: 5,
            assignedClasses: ['9', '10']
        });
        teachers.push({ user: teacher1User, profile: teacher1 });
        console.log('✅ Teacher 1 created:', teacher1User.email, '(Math)');

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
            subject: 'Science',
            qualification: 'M.Sc Physics',
            experience: 7,
            assignedClasses: ['9', '10']
        });
        teachers.push({ user: teacher2User, profile: teacher2 });
        console.log('✅ Teacher 2 created:', teacher2User.email, '(Science)');

        const teacher3Pass = await bcrypt.hash('teacher123', 10);
        const teacher3User = await User.create({
            username: 'michael.brown',
            name: 'Michael Brown',
            email: 'michael.brown@school.com',
            password: teacher3Pass,
            role: 'teacher',
            isActive: true
        });
        const teacher3 = await Teacher.create({
            userId: teacher3User._id,
            subject: 'English',
            qualification: 'M.A English',
            experience: 10,
            assignedClasses: ['11', '12']
        });
        teachers.push({ user: teacher3User, profile: teacher3 });
        console.log('✅ Teacher 3 created:', teacher3User.email, '(English)');
        console.log('   All teacher passwords: teacher123\n');

        // Phase 4: Approve Students (Teacher 1)
        console.log('Phase 4: Teacher 1 approving students...');
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
            console.log(`✅ Approved: student${i}@test.com (Class 9-A, Roll: 10${i})`);
        }

        for (let i = 6; i <= 8; i++) {
            const approved = await ApprovedStudent.create({
                email: `student${i}@test.com`,
                teacherId: teacher1._id,
                studentName: `Student ${i}`,
                rollNumber: `20${i-5}`,
                grade: '10',
                section: 'B',
                parentPhone: `98765432${i}0`
            });
            approvedStudents.push(approved);
            console.log(`✅ Approved: student${i}@test.com (Class 10-B, Roll: 20${i-5})`);
        }
        console.log('');

        // Phase 5: Register Students
        console.log('Phase 5: Registering students...');
        const students = [];
        
        for (let i = 1; i <= 4; i++) {
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
            const student = await Student.create({
                userId: studentUser._id,
                studentId: `STU00${i}`,
                rollNumber: approved.rollNumber,
                class: approved.grade,
                grade: approved.grade,
                section: approved.section,
                parentPhone: approved.parentPhone,
                learningProgress: 0,
                completedLessons: 0,
                attendanceDays: 0,
                totalSchoolDays: 0
            });
            students.push({ user: studentUser, profile: student });
            console.log(`✅ Registered: student${i}@test.com (Class ${approved.grade}-${approved.section})`);
        }
        console.log('   All student passwords: student123\n');

        // Phase 6: Multi-teacher assignment (Teacher 2 approves student1)
        console.log('Phase 6: Teacher 2 approving student1 (multi-teacher test)...');
        const multiTeacherApproval = await ApprovedStudent.create({
            email: 'student1@test.com',
            teacherId: teacher2._id,
            studentName: 'Student 1',
            rollNumber: '101',
            grade: '9',
            section: 'A',
            parentPhone: '9876543210'
        });
        console.log('✅ Student1 now approved by both Teacher 1 and Teacher 2\n');

        // Phase 7: Mark Attendance (Teacher 1)
        console.log('Phase 7: Teacher 1 marking attendance...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Today's attendance
        await Attendance.create({
            approvedStudentId: approvedStudents[0]._id,
            teacherId: teacher1._id,
            class: '9',
            section: 'A',
            date: today,
            status: 'present'
        });
        await Attendance.create({
            approvedStudentId: approvedStudents[1]._id,
            teacherId: teacher1._id,
            class: '9',
            section: 'A',
            date: today,
            status: 'present'
        });
        await Attendance.create({
            approvedStudentId: approvedStudents[2]._id,
            teacherId: teacher1._id,
            class: '9',
            section: 'A',
            date: today,
            status: 'present'
        });
        await Attendance.create({
            approvedStudentId: approvedStudents[3]._id,
            teacherId: teacher1._id,
            class: '9',
            section: 'A',
            date: today,
            status: 'late'
        });
        await Attendance.create({
            approvedStudentId: approvedStudents[4]._id,
            teacherId: teacher1._id,
            class: '9',
            section: 'A',
            date: today,
            status: 'absent'
        });
        console.log('✅ Today: 3 Present, 1 Late, 1 Absent');

        // Yesterday's attendance
        await Attendance.create({
            approvedStudentId: approvedStudents[0]._id,
            teacherId: teacher1._id,
            class: '9',
            section: 'A',
            date: yesterday,
            status: 'present'
        });
        await Attendance.create({
            approvedStudentId: approvedStudents[1]._id,
            teacherId: teacher1._id,
            class: '9',
            section: 'A',
            date: yesterday,
            status: 'present'
        });
        console.log('✅ Yesterday: 2 Present\n');

        // Phase 8: Teacher 2 marks attendance for student1
        console.log('Phase 8: Teacher 2 marking attendance for student1...');
        await Attendance.create({
            approvedStudentId: multiTeacherApproval._id,
            teacherId: teacher2._id,
            class: '9',
            section: 'A',
            date: today,
            status: 'present'
        });
        console.log('✅ Student1 attendance marked by Teacher 2\n');

        // Phase 9: Create Assignments
        console.log('Phase 9: Creating assignments...');
        const assignment1 = await Assignment.create({
            teacherId: teacher1._id,
            title: 'Algebra Homework',
            description: 'Solve problems 1-10 from chapter 3',
            class: '9',
            section: 'A',
            assignmentType: 'assignment',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            isActive: true
        });
        console.log('✅ Assignment 1: Algebra Homework (Class 9-A)');

        const assignment2 = await Assignment.create({
            teacherId: teacher1._id,
            title: 'Geometry Quiz',
            description: 'Complete the geometry quiz',
            class: '10',
            section: 'B',
            assignmentType: 'quiz',
            dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
            isActive: true
        });
        console.log('✅ Assignment 2: Geometry Quiz (Class 10-B)');

        const assignment3 = await Assignment.create({
            teacherId: teacher2._id,
            title: 'Physics Lab Report',
            description: 'Submit your lab experiment report',
            class: '9',
            section: 'A',
            assignmentType: 'project',
            dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000), // 3 days
            isActive: true
        });
        console.log('✅ Assignment 3: Physics Lab Report (Class 9-A)\n');

        // Phase 10: Share Videos
        console.log('Phase 10: Sharing videos...');
        const video1 = await SharedVideo.create({
            teacherId: teacher1._id,
            title: 'Introduction to Algebra',
            description: 'Basic algebra concepts',
            class: '9',
            section: 'A',
            subject: 'Mathematics',
            type: 'youtube',
            url: 'https://www.youtube.com/watch?v=example123'
        });
        console.log('✅ Video 1: Introduction to Algebra (YouTube)');

        const video2 = await SharedVideo.create({
            teacherId: teacher2._id,
            title: 'Newton\'s Laws of Motion',
            description: 'Understanding the three laws',
            class: '9',
            section: 'A',
            subject: 'Science',
            type: 'youtube',
            url: 'https://www.youtube.com/watch?v=example456'
        });
        console.log('✅ Video 2: Newton\'s Laws (YouTube)\n');

        // Summary
        console.log('=== TEST DATA SUMMARY ===\n');
        console.log('📊 ACCOUNTS CREATED:');
        console.log('   Admin: admin@school.com (password: admin123)');
        console.log('   Teachers: 3 (password: teacher123)');
        console.log('     - john.smith@school.com (Math, Classes 9-10)');
        console.log('     - sarah.johnson@school.com (Science, Classes 9-10)');
        console.log('     - michael.brown@school.com (English, Classes 11-12)');
        console.log('   Students: 4 registered (password: student123)');
        console.log('     - student1@test.com (Class 9-A, approved by 2 teachers)');
        console.log('     - student2@test.com (Class 9-A)');
        console.log('     - student3@test.com (Class 9-A)');
        console.log('     - student4@test.com (Class 9-A)');
        console.log('   Pending: 4 students (student5-8@test.com)\n');
        
        console.log('📝 DATA CREATED:');
        console.log('   Approved Students: 9 (5 in Class 9-A, 3 in Class 10-B, 1 duplicate)');
        console.log('   Attendance Records: 8 (across 2 teachers, 2 days)');
        console.log('   Assignments: 3 (2 by Teacher 1, 1 by Teacher 2)');
        console.log('   Videos: 2 (1 Math, 1 Science)\n');

        console.log('🎯 READY TO TEST:');
        console.log('   ✅ Multi-teacher student assignment (student1)');
        console.log('   ✅ Attendance tracking across teachers');
        console.log('   ✅ Assignment creation and display');
        console.log('   ✅ Video sharing');
        console.log('   ✅ Student registration flow');
        console.log('   ✅ Role-based access (admin, teacher, student)\n');

        console.log('🌐 ACCESS THE SYSTEM:');
        console.log('   Frontend: http://localhost:5000');
        console.log('   Login Page: http://localhost:5000/pages/login.html\n');

        console.log('✅ TEST DATA SETUP COMPLETE!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

testSystem();
