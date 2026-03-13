const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const User = require('./models/User');
const Teacher = require('./models/Teacher');
const Assignment = require('./models/Assignment');

async function addMoreAssignments() {
    console.log('\n=== ADDING MORE TEST ASSIGNMENTS ===\n');
    
    try {
        // Get teachers
        const teacher1User = await User.findOne({ email: 'john.smith@school.com' });
        const teacher1 = await Teacher.findOne({ userId: teacher1User._id });
        
        const teacher2User = await User.findOne({ email: 'sarah.johnson@school.com' });
        const teacher2 = await Teacher.findOne({ userId: teacher2User._id });
        
        console.log('Found teachers:');
        console.log('  Teacher 1:', teacher1User.name);
        console.log('  Teacher 2:', teacher2User.name);
        console.log('');
        
        // Clear existing assignments
        await Assignment.deleteMany({});
        console.log('Cleared existing assignments\n');
        
        // Create multiple assignments for Class 9-A
        const assignments = [
            {
                teacherId: teacher1._id,
                title: 'Algebra Homework',
                description: 'Solve problems 1-10 from chapter 3',
                class: '9',
                section: 'A',
                assignmentType: 'assignment',
                dueDate: new Date('2026-03-13'),
                isActive: true
            },
            {
                teacherId: teacher1._id,
                title: 'Geometry Quiz',
                description: 'Complete the geometry quiz on triangles',
                class: '9',
                section: 'A',
                assignmentType: 'quiz',
                dueDate: new Date('2026-03-12'),
                isActive: true
            },
            {
                teacherId: teacher2._id,
                title: 'Science Project',
                description: 'Complete your science project on photosynthesis',
                class: '9',
                section: 'A',
                assignmentType: 'project',
                dueDate: new Date('2026-03-14'),
                isActive: true
            },
            {
                teacherId: teacher1._id,
                title: 'Math Practice',
                description: 'Practice problems for upcoming test',
                class: '9',
                section: 'A',
                assignmentType: 'assignment',
                dueDate: new Date('2026-03-05'),
                isActive: true
            },
            {
                teacherId: teacher2._id,
                title: 'Physics Lab Report',
                description: 'Submit your lab report on Newton\'s laws',
                class: '9',
                section: 'A',
                assignmentType: 'assignment',
                dueDate: new Date('2026-01-31'),
                isActive: true
            }
        ];
        
        for (const assignmentData of assignments) {
            const assignment = await Assignment.create(assignmentData);
            console.log(`✅ Created: "${assignment.title}" - Due: ${assignment.dueDate.toLocaleDateString()}`);
        }
        
        console.log('\n✅ All assignments created successfully!\n');
        console.log('Students in Class 9-A should now see 5 assignments:\n');
        console.log('1. Algebra Homework (Math)');
        console.log('2. Geometry Quiz (Math)');
        console.log('3. Science Project (Science)');
        console.log('4. Math Practice (Math) - LATE');
        console.log('5. Physics Lab Report (Science) - LATE');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

addMoreAssignments();
