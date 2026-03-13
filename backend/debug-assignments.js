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

async function debugAssignments() {
    try {
        console.log('\n=== ASSIGNMENT DEBUG ===\n');
        
        // 1. Check all assignments
        const assignments = await Assignment.find({ isActive: true });
        
        console.log('📋 ASSIGNMENTS IN DATABASE:', assignments.length);
        assignments.forEach(a => {
            console.log(`  - "${a.title}"`);
            console.log(`    Class: "${a.class}" | Section: "${a.section}"`);
            console.log(`    Type: ${a.assignmentType}`);
            console.log(`    Due: ${a.dueDate}`);
            console.log('');
        });
        
        // 2. Check all approved students
        const approvedStudents = await ApprovedStudent.find();
        console.log('\n👥 APPROVED STUDENTS:', approvedStudents.length);
        approvedStudents.forEach(s => {
            console.log(`  - ${s.studentName} (${s.email})`);
            console.log(`    Class: "${s.grade}" | Section: "${s.section}"`);
            console.log('');
        });
        
        // 3. Check all registered students
        const students = await Student.find().populate('userId', 'email name');
        console.log('\n🎓 REGISTERED STUDENTS:', students.length);
        students.forEach(s => {
            console.log(`  - ${s.userId?.name || 'Unknown'} (${s.userId?.email})`);
            console.log(`    Class: "${s.class}" | Section: "${s.section}"`);
            console.log('');
        });
        
        // 4. Test matching logic
        console.log('\n🔍 TESTING MATCHING LOGIC:\n');
        
        for (const approved of approvedStudents) {
            console.log(`Student: ${approved.studentName} - Class "${approved.grade}" Section "${approved.section}"`);
            
            const matched = assignments.filter(assignment => {
                const assignmentClass = String(assignment.class).trim().replace(/[^0-9]/g, '');
                const studentClass = String(approved.grade).trim().replace(/[^0-9]/g, '');
                const assignmentSection = String(assignment.section).trim().toUpperCase();
                const studentSection = String(approved.section).trim().toUpperCase();
                
                const classMatch = assignmentClass === studentClass;
                const sectionMatch = assignmentSection === studentSection;
                
                console.log(`  Assignment "${assignment.title}": Class "${assignment.class}"(${assignmentClass}) vs "${approved.grade}"(${studentClass}) = ${classMatch}, Section "${assignment.section}"(${assignmentSection}) vs "${approved.section}"(${studentSection}) = ${sectionMatch}`);
                
                return classMatch && sectionMatch;
            });
            
            console.log(`  ✓ Matched ${matched.length} assignments`);
            matched.forEach(m => console.log(`    - ${m.title}`));
            console.log('');
        }
        
        console.log('\n=== DEBUG COMPLETE ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Debug error:', error);
        process.exit(1);
    }
}

debugAssignments();
