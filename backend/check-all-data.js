const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const ApprovedStudent = require('./models/ApprovedStudent');
const Student = require('./models/Student');
const User = require('./models/User');
const Teacher = require('./models/Teacher');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkClass10() {
    try {
        console.log('\n=== CLASS 10 ANALYSIS ===\n');
        
        // 1. All assignments
        const allAssignments = await Assignment.find({ isActive: true })
            .populate('teacherId')
            .populate({ path: 'teacherId', populate: { path: 'userId', select: 'name email' } });
        
        console.log('📋 ALL ASSIGNMENTS IN SYSTEM:', allAssignments.length);
        allAssignments.forEach(a => {
            console.log(`\n  - "${a.title}"`);
            console.log(`    Class: "${a.class}" | Section: "${a.section}"`);
            console.log(`    Teacher: ${a.teacherId?.userId?.name || 'Unknown'} (${a.teacherId?.userId?.email || 'N/A'})`);
            console.log(`    Type: ${a.assignmentType}`);
        });
        
        // 2. All approved students
        console.log('\n\n👥 ALL APPROVED STUDENTS:');
        const allApproved = await ApprovedStudent.find();
        
        const byClass = {};
        allApproved.forEach(s => {
            const key = `${s.grade}-${s.section}`;
            if (!byClass[key]) byClass[key] = [];
            byClass[key].push(s);
        });
        
        Object.entries(byClass).forEach(([classSection, students]) => {
            console.log(`\n  Class ${classSection}: ${students.length} students`);
            students.forEach(s => {
                console.log(`    - ${s.studentName} (${s.email})`);
            });
        });
        
        // 3. All registered students
        console.log('\n\n🎓 ALL REGISTERED STUDENTS:');
        const allStudents = await Student.find().populate('userId', 'email name');
        
        allStudents.forEach(s => {
            console.log(`\n  - ${s.userId?.name || 'Unknown'} (${s.userId?.email})`);
            console.log(`    Class: "${s.class}" | Section: "${s.section}"`);
        });
        
        console.log('\n\n=== SUMMARY ===');
        console.log(`Total Assignments: ${allAssignments.length}`);
        console.log(`Total Approved Students: ${allApproved.length}`);
        console.log(`Total Registered Students: ${allStudents.length}`);
        
        console.log('\n=== COMPLETE ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkClass10();
