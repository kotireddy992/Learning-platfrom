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

async function debugPrasadAssignments() {
    try {
        console.log('\n=== PRASAD TEACHER DEBUG ===\n');
        
        // 1. Find Prasad teacher
        const prasadUser = await User.findOne({ 
            $or: [
                { name: /prasad/i },
                { email: /prasad/i }
            ]
        });
        
        if (!prasadUser) {
            console.log('❌ No user found with name/email containing "prasad"');
            console.log('\nAll teachers:');
            const allUsers = await User.find({ role: 'teacher' });
            allUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`));
            process.exit(0);
        }
        
        console.log('✓ Found user:', prasadUser.name, '(', prasadUser.email, ')');
        
        const prasadTeacher = await Teacher.findOne({ userId: prasadUser._id });
        if (!prasadTeacher) {
            console.log('❌ No teacher profile found for this user');
            process.exit(0);
        }
        
        console.log('✓ Teacher ID:', prasadTeacher._id);
        console.log('  Subject:', prasadTeacher.subject);
        console.log('  Assigned Classes:', prasadTeacher.assignedClasses);
        
        // 2. Check Prasad's assignments
        console.log('\n📋 PRASAD\'S ASSIGNMENTS:');
        const prasadAssignments = await Assignment.find({ 
            teacherId: prasadTeacher._id,
            isActive: true 
        });
        
        console.log('Total:', prasadAssignments.length);
        prasadAssignments.forEach(a => {
            console.log(`\n  - "${a.title}"`);
            console.log(`    Class: "${a.class}" | Section: "${a.section}"`);
            console.log(`    Type: ${a.assignmentType}`);
            console.log(`    Due: ${a.dueDate}`);
        });
        
        // 3. Check Class 10 assignments
        console.log('\n\n📚 ALL CLASS 10 ASSIGNMENTS:');
        const class10Assignments = await Assignment.find({ 
            isActive: true,
            class: { $in: ['10', '10th', 'Class 10', 'X'] }
        }).populate('teacherId').populate({ path: 'teacherId', populate: { path: 'userId' } });
        
        console.log('Total:', class10Assignments.length);
        class10Assignments.forEach(a => {
            console.log(`\n  - "${a.title}"`);
            console.log(`    Class: "${a.class}" | Section: "${a.section}"`);
            console.log(`    Teacher: ${a.teacherId?.userId?.name || 'Unknown'}`);
        });
        
        // 4. Check Prasad's approved students
        console.log('\n\n👥 STUDENTS ADDED BY PRASAD:');
        const prasadStudents = await ApprovedStudent.find({ teacherId: prasadTeacher._id });
        
        console.log('Total:', prasadStudents.length);
        prasadStudents.forEach(s => {
            console.log(`\n  - ${s.studentName} (${s.email})`);
            console.log(`    Class: "${s.grade}" | Section: "${s.section}"`);
        });
        
        // 5. Check Class 10 students
        console.log('\n\n🎓 ALL CLASS 10 APPROVED STUDENTS:');
        const class10Students = await ApprovedStudent.find({
            grade: { $in: ['10', '10th', 'Class 10', 'X'] }
        });
        
        console.log('Total:', class10Students.length);
        class10Students.forEach(s => {
            console.log(`\n  - ${s.studentName} (${s.email})`);
            console.log(`    Class: "${s.grade}" | Section: "${s.section}"`);
        });
        
        // 6. Test matching
        console.log('\n\n🔍 TESTING MATCHING FOR CLASS 10 STUDENTS:\n');
        
        for (const student of class10Students) {
            console.log(`Student: ${student.studentName} - Class "${student.grade}" Section "${student.section}"`);
            
            const allAssignments = await Assignment.find({ isActive: true });
            const matched = allAssignments.filter(assignment => {
                const assignmentClass = String(assignment.class).trim().replace(/[^0-9]/g, '');
                const studentClass = String(student.grade).trim().replace(/[^0-9]/g, '');
                const assignmentSection = String(assignment.section).trim().toUpperCase();
                const studentSection = String(student.section).trim().toUpperCase();
                
                const classMatch = assignmentClass === studentClass;
                const sectionMatch = assignmentSection === studentSection;
                
                if (classMatch && sectionMatch) {
                    console.log(`  ✓ "${assignment.title}" - Class ${assignment.class}(${assignmentClass}) vs ${student.grade}(${studentClass}), Section ${assignment.section}(${assignmentSection}) vs ${student.section}(${studentSection})`);
                }
                
                return classMatch && sectionMatch;
            });
            
            console.log(`  Total matched: ${matched.length}`);
            console.log('');
        }
        
        console.log('\n=== DEBUG COMPLETE ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Debug error:', error);
        process.exit(1);
    }
}

debugPrasadAssignments();
