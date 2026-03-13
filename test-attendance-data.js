const mongoose = require('./backend/node_modules/mongoose');
const Student = require('./backend/models/Student');
const ApprovedStudent = require('./backend/models/ApprovedStudent');
const User = require('./backend/models/User');

async function testAttendanceData() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        console.log('\n=== REGULAR STUDENTS ===');
        const students = await Student.find().populate('userId', 'firstName lastName email');
        console.log(`Total regular students: ${students.length}`);
        
        students.forEach(student => {
            console.log(`- ID: ${student._id}`);
            console.log(`  Class: ${student.class}, Section: ${student.section}`);
            console.log(`  Roll: ${student.rollNumber}`);
            console.log(`  User: ${student.userId ? student.userId.firstName + ' ' + student.userId.lastName : 'No user linked'}`);
            console.log(`  Email: ${student.userId ? student.userId.email : 'No email'}`);
            console.log('');
        });

        console.log('\n=== APPROVED STUDENTS ===');
        const approvedStudents = await ApprovedStudent.find();
        console.log(`Total approved students: ${approvedStudents.length}`);
        
        approvedStudents.forEach(approved => {
            console.log(`- ID: ${approved._id}`);
            console.log(`  Class: ${approved.grade}, Section: ${approved.section}`);
            console.log(`  Roll: ${approved.rollNumber}`);
            console.log(`  Name: ${approved.studentName}`);
            console.log(`  Email: ${approved.email}`);
            console.log('');
        });

        console.log('\n=== CLASS DISTRIBUTION ===');
        const classDistribution = {};
        
        students.forEach(s => {
            const key = `${s.class}${s.section}`;
            if (!classDistribution[key]) classDistribution[key] = { regular: 0, approved: 0 };
            classDistribution[key].regular++;
        });
        
        approvedStudents.forEach(s => {
            const key = `${s.grade}${s.section}`;
            if (!classDistribution[key]) classDistribution[key] = { regular: 0, approved: 0 };
            classDistribution[key].approved++;
        });

        Object.keys(classDistribution).sort().forEach(classKey => {
            const data = classDistribution[classKey];
            console.log(`Class ${classKey}: ${data.regular} regular + ${data.approved} approved = ${data.regular + data.approved} total`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testAttendanceData();