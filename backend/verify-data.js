const mongoose = require('mongoose');

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

async function verifyData() {
    console.log('\n=== VERIFYING TEST DATA ===\n');
    
    try {
        const users = await User.countDocuments();
        const teachers = await Teacher.countDocuments();
        const students = await Student.countDocuments();
        const approved = await ApprovedStudent.countDocuments();
        const assignments = await Assignment.countDocuments();
        const videos = await SharedVideo.countDocuments();
        const attendance = await Attendance.countDocuments();

        console.log('📊 DATABASE COUNTS:');
        console.log(`   Users: ${users} (1 admin + 2 teachers + 3 students = 6)`);
        console.log(`   Teachers: ${teachers} (expected: 2)`);
        console.log(`   Students: ${students} (expected: 3)`);
        console.log(`   Approved Students: ${approved} (expected: 6)`);
        console.log(`   Assignments: ${assignments} (expected: 1)`);
        console.log(`   Videos: ${videos} (expected: 1)`);
        console.log(`   Attendance: ${attendance} (expected: 3)`);
        console.log('');

        // Verify multi-teacher assignment
        const student1Approvals = await ApprovedStudent.find({ email: 'student1@test.com' });
        console.log('🔍 MULTI-TEACHER VERIFICATION:');
        console.log(`   student1@test.com approved by ${student1Approvals.length} teachers`);
        if (student1Approvals.length === 2) {
            console.log('   ✅ Multi-teacher assignment working correctly');
        } else {
            console.log('   ❌ Multi-teacher assignment issue detected');
        }
        console.log('');

        // List all users
        const allUsers = await User.find().select('email role');
        console.log('👥 ALL USERS:');
        allUsers.forEach(u => {
            console.log(`   ${u.role.padEnd(10)} - ${u.email}`);
        });
        console.log('');

        // Check assignment details
        const assignmentDetails = await Assignment.findOne().populate('teacherId', 'subject');
        if (assignmentDetails) {
            console.log('📝 ASSIGNMENT DETAILS:');
            console.log(`   Title: ${assignmentDetails.title}`);
            console.log(`   Class: ${assignmentDetails.class}-${assignmentDetails.section}`);
            console.log(`   Type: ${assignmentDetails.assignmentType}`);
            console.log(`   Due: ${assignmentDetails.dueDate.toLocaleDateString()}`);
            console.log('');
        }

        // Check video details
        const videoDetails = await SharedVideo.findOne();
        if (videoDetails) {
            console.log('🎥 VIDEO DETAILS:');
            console.log(`   Title: ${videoDetails.title}`);
            console.log(`   Class: ${videoDetails.class}-${videoDetails.section}`);
            console.log(`   Type: ${videoDetails.type}`);
            console.log(`   Subject: ${videoDetails.subject}`);
            console.log('');
        }

        console.log('✅ VERIFICATION COMPLETE\n');
        console.log('🚀 READY TO START SERVER AND TEST UI\n');
        console.log('Run: cd backend && node server.js');
        console.log('Then open: http://localhost:5000/pages/login.html\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

verifyData();
