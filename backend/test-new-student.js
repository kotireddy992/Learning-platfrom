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

async function testNewStudentSignup() {
    console.log('\n=== TESTING NEW STUDENT SIGNUP ===\n');
    
    try {
        // Get teacher
        const teacher1User = await User.findOne({ email: 'john.smith@school.com' });
        const teacher1 = await Teacher.findOne({ userId: teacher1User._id });
        
        // Step 1: Teacher approves new student
        console.log('Step 1: Teacher approves new student...');
        
        // Check if student6 already exists
        let existingUser = await User.findOne({ email: 'student6@test.com' });
        if (existingUser) {
            console.log('  Cleaning up existing student6...');
            await Student.deleteMany({ userId: existingUser._id });
            await User.deleteOne({ _id: existingUser._id });
        }
        await ApprovedStudent.deleteMany({ email: 'student6@test.com' });
        
        const approved = await ApprovedStudent.create({
            email: 'student6@test.com',
            teacherId: teacher1._id,
            studentName: 'Student Six',
            rollNumber: '106',
            grade: '9',
            section: 'A',
            parentPhone: '9876543216'
        });
        console.log('✅ Teacher approved: student6@test.com (Class 9-A)\n');
        
        // Step 2: Student signs up
        console.log('Step 2: Student signs up...');
        const studentPass = await bcrypt.hash('student123', 10);
        const studentUser = await User.create({
            username: 'student6',
            name: 'Student Six',
            email: 'student6@test.com',
            password: studentPass,
            role: 'student',
            isActive: true
        });
        
        const student = await Student.create({
            userId: studentUser._id,
            studentId: 'STU006',
            rollNumber: '106',
            class: '9',
            grade: '9',
            section: 'A',
            parentPhone: '9876543216'
        });
        console.log('✅ Student registered: student6@test.com\n');
        
        // Step 3: Check student profile
        console.log('Step 3: Checking student profile...');
        console.log('  Email:', studentUser.email);
        console.log('  Class:', student.class);
        console.log('  Section:', student.section);
        console.log('');
        
        // Step 4: Get assignments for this student
        console.log('Step 4: Fetching assignments...');
        const approvedStudents = await ApprovedStudent.find({ email: studentUser.email });
        console.log('  Approved records:', approvedStudents.length);
        
        const studentClass = approvedStudents[0]?.grade || student.class;
        const studentSection = approvedStudents[0]?.section || student.section;
        console.log('  Using Class:', studentClass, 'Section:', studentSection);
        console.log('');
        
        // Get all assignments
        const allAssignments = await Assignment.find({ isActive: true })
            .populate('teacherId', 'subject')
            .populate({
                path: 'teacherId',
                populate: { path: 'userId', select: 'name' }
            });
        
        console.log('  Total active assignments:', allAssignments.length);
        console.log('');
        
        // Filter with flexible matching
        const matchingAssignments = allAssignments.filter(assignment => {
            const assignmentClassNum = String(assignment.class).replace(/[^0-9]/g, '');
            const studentClassNum = String(studentClass).replace(/[^0-9]/g, '');
            const sectionMatch = assignment.section.toLowerCase() === studentSection.toLowerCase();
            const classMatch = assignmentClassNum === studentClassNum;
            
            console.log(`  Assignment: "${assignment.title}"`);
            console.log(`    Class: ${assignment.class} (${assignmentClassNum}) vs ${studentClass} (${studentClassNum}) = ${classMatch}`);
            console.log(`    Section: ${assignment.section} vs ${studentSection} = ${sectionMatch}`);
            console.log(`    Match: ${classMatch && sectionMatch}`);
            console.log('');
            
            return classMatch && sectionMatch;
        });
        
        console.log('RESULT:');
        console.log(`  Matching assignments: ${matchingAssignments.length}`);
        console.log('');
        
        if (matchingAssignments.length > 0) {
            console.log('✅ SUCCESS! Student6 can see these assignments:');
            matchingAssignments.forEach((a, i) => {
                const teacher = a.teacherId?.userId?.name || 'Unknown';
                const dueDate = new Date(a.dueDate).toLocaleDateString();
                console.log(`  ${i+1}. ${a.title} (${teacher}) - Due: ${dueDate}`);
            });
        } else {
            console.log('❌ ISSUE: No assignments found for student6');
        }
        console.log('');
        
        console.log('TEST CREDENTIALS:');
        console.log('  Email: student6@test.com');
        console.log('  Password: student123');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
    }
}

testNewStudentSignup();
