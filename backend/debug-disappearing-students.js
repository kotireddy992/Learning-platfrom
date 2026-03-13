const mongoose = require('mongoose');
const User = require('./models/User');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const ApprovedStudent = require('./models/ApprovedStudent');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function debugDisappearingStudents() {
    try {
        console.log('\n=== DEBUGGING DISAPPEARING STUDENTS ===\n');
        
        // Get all teachers
        const teachers = await Teacher.find().populate('userId', 'name email');
        
        console.log('📚 TEACHERS AND THEIR STUDENTS:\n');
        
        for (const teacher of teachers) {
            console.log(`\n👨‍🏫 Teacher: ${teacher.userId.name} (${teacher.userId.email})`);
            console.log(`   Teacher ID: ${teacher._id}`);
            
            // Get approved students for this teacher
            const approvedStudents = await ApprovedStudent.find({ teacherId: teacher._id });
            console.log(`   Approved Students: ${approvedStudents.length}`);
            
            if (approvedStudents.length > 0) {
                console.log('   Students:');
                for (const approved of approvedStudents) {
                    console.log(`     - ${approved.studentName} (${approved.email})`);
                    console.log(`       Class: ${approved.grade} Section: ${approved.section}`);
                    console.log(`       Roll: ${approved.rollNumber}`);
                    console.log(`       Approved Student ID: ${approved._id}`);
                    
                    // Check if student has registered
                    const user = await User.findOne({ email: approved.email });
                    if (user) {
                        const student = await Student.findOne({ userId: user._id });
                        if (student) {
                            console.log(`       ✓ Registered - Student ID: ${student._id}`);
                        } else {
                            console.log(`       ⚠ User exists but no Student profile`);
                        }
                    } else {
                        console.log(`       ○ Not registered yet`);
                    }
                }
            }
        }
        
        // Check for orphaned approved students
        console.log('\n\n🔍 CHECKING FOR ISSUES:\n');
        
        const allApproved = await ApprovedStudent.find();
        console.log(`Total ApprovedStudent records: ${allApproved.length}`);
        
        let orphanedCount = 0;
        let duplicateCount = 0;
        const emailTeacherMap = new Map();
        
        for (const approved of allApproved) {
            // Check if teacher exists
            const teacher = await Teacher.findById(approved.teacherId);
            if (!teacher) {
                console.log(`❌ Orphaned: ${approved.studentName} (${approved.email}) - Teacher ${approved.teacherId} not found`);
                orphanedCount++;
            }
            
            // Check for duplicates
            const key = `${approved.email}-${approved.teacherId}`;
            if (emailTeacherMap.has(key)) {
                console.log(`⚠ Duplicate: ${approved.studentName} (${approved.email}) for same teacher`);
                duplicateCount++;
            }
            emailTeacherMap.set(key, approved);
        }
        
        console.log(`\nOrphaned records: ${orphanedCount}`);
        console.log(`Duplicate records: ${duplicateCount}`);
        
        // Check registered students
        console.log('\n\n🎓 REGISTERED STUDENTS:\n');
        const students = await Student.find().populate('userId', 'name email');
        
        console.log(`Total: ${students.length}`);
        for (const student of students) {
            console.log(`\n  - ${student.userId?.name || 'Unknown'} (${student.userId?.email})`);
            console.log(`    Student ID: ${student._id}`);
            console.log(`    Class: ${student.class} Section: ${student.section}`);
            
            // Check how many teachers have approved this student
            const approvals = await ApprovedStudent.find({ email: student.userId.email });
            console.log(`    Approved by ${approvals.length} teacher(s)`);
        }
        
        console.log('\n=== DEBUG COMPLETE ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Debug error:', error);
        process.exit(1);
    }
}

debugDisappearingStudents();
