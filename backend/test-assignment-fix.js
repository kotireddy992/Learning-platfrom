const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const User = require('./models/User');
const Student = require('./models/Student');
const ApprovedStudent = require('./models/ApprovedStudent');
const Assignment = require('./models/Assignment');

async function testAssignmentDisplay() {
    console.log('\n=== TESTING ASSIGNMENT DISPLAY FIX ===\n');
    
    try {
        // Get student1
        const student1User = await User.findOne({ email: 'student1@test.com' });
        if (!student1User) {
            console.log('❌ student1@test.com not found');
            return;
        }
        
        const student1 = await Student.findOne({ userId: student1User._id });
        console.log('Student1 Profile:');
        console.log('  Email:', student1User.email);
        console.log('  Class:', student1.class);
        console.log('  Grade:', student1.grade);
        console.log('  Section:', student1.section);
        console.log('');
        
        // Get approved student records
        const approvedRecords = await ApprovedStudent.find({ email: 'student1@test.com' });
        console.log('Approved Student Records:', approvedRecords.length);
        approvedRecords.forEach((record, i) => {
            console.log(`  Record ${i+1}:`);
            console.log('    Class:', record.grade);
            console.log('    Section:', record.section);
            console.log('    Teacher ID:', record.teacherId);
        });
        console.log('');
        
        // Get all assignments
        const allAssignments = await Assignment.find({ isActive: true });
        console.log('Total Active Assignments:', allAssignments.length);
        allAssignments.forEach(assignment => {
            console.log(`  "${assignment.title}"`);
            console.log('    Class:', assignment.class);
            console.log('    Section:', assignment.section);
            console.log('    Type:', assignment.assignmentType);
        });
        console.log('');
        
        // Test matching logic
        console.log('TESTING MATCHING LOGIC:');
        const studentClass = approvedRecords[0]?.grade || student1.class;
        const studentSection = approvedRecords[0]?.section || student1.section;
        
        console.log('Student Class:', studentClass);
        console.log('Student Section:', studentSection);
        console.log('');
        
        const matchingAssignments = allAssignments.filter(assignment => {
            const assignmentClassNum = String(assignment.class).replace(/[^0-9]/g, '');
            const studentClassNum = String(studentClass).replace(/[^0-9]/g, '');
            const sectionMatch = assignment.section.toLowerCase() === studentSection.toLowerCase();
            const classMatch = assignmentClassNum === studentClassNum;
            
            console.log(`  Assignment "${assignment.title}"`);
            console.log(`    Assignment Class: ${assignment.class} (${assignmentClassNum})`);
            console.log(`    Student Class: ${studentClass} (${studentClassNum})`);
            console.log(`    Class Match: ${classMatch}`);
            console.log(`    Section Match: ${sectionMatch}`);
            console.log(`    Overall Match: ${classMatch && sectionMatch}`);
            console.log('');
            
            return classMatch && sectionMatch;
        });
        
        console.log('RESULT:');
        console.log(`  Matching Assignments: ${matchingAssignments.length}`);
        if (matchingAssignments.length > 0) {
            console.log('  ✅ SUCCESS: Student should see assignments!');
            matchingAssignments.forEach(a => {
                console.log(`    - ${a.title}`);
            });
        } else {
            console.log('  ❌ ISSUE: No matching assignments found');
        }
        console.log('');
        
        // Test the fix
        console.log('TESTING AUTO-UPDATE FIX:');
        if (approvedRecords.length > 0) {
            const approvedClass = approvedRecords[0].grade;
            const approvedSection = approvedRecords[0].section;
            
            if (student1.class !== approvedClass || student1.section !== approvedSection) {
                console.log('  Student profile needs update:');
                console.log(`    Current: Class ${student1.class}, Section ${student1.section}`);
                console.log(`    Should be: Class ${approvedClass}, Section ${approvedSection}`);
                console.log('  ✅ Fix will auto-update on next API call');
            } else {
                console.log('  ✅ Student profile already correct');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

testAssignmentDisplay();
