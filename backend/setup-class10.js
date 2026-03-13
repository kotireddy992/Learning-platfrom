const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Teacher = require('./models/Teacher');
const ApprovedStudent = require('./models/ApprovedStudent');
const Assignment = require('./models/Assignment');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function setupClass10() {
    try {
        console.log('\n=== SETTING UP CLASS 10 ===\n');
        
        // 1. Create Prasad teacher
        console.log('Creating teacher Prasad...');
        
        let prasadUser = await User.findOne({ email: 'prasad@school.com' });
        if (!prasadUser) {
            const hashedPassword = await bcrypt.hash('teacher123', 10);
            prasadUser = new User({
                username: 'prasad',
                name: 'Prasad Kumar',
                email: 'prasad@school.com',
                password: hashedPassword,
                role: 'teacher',
                isActive: true
            });
            await prasadUser.save();
            console.log('✓ Created user: Prasad Kumar (prasad@school.com)');
        } else {
            console.log('✓ Teacher user already exists');
        }
        
        let prasadTeacher = await Teacher.findOne({ userId: prasadUser._id });
        if (!prasadTeacher) {
            prasadTeacher = new Teacher({
                userId: prasadUser._id,
                employeeId: 'T003',
                subject: 'Mathematics',
                assignedClasses: [
                    { class: '10', section: 'A' },
                    { class: '10', section: 'B' }
                ]
            });
            await prasadTeacher.save();
            console.log('✓ Created teacher profile');
        } else {
            console.log('✓ Teacher profile already exists');
        }
        
        // 2. Add Class 10 students
        console.log('\nAdding Class 10 Section A students...');
        
        const class10Students = [
            { name: 'Rahul Sharma', email: 'rahul@test.com', rollNumber: 'C10A01' },
            { name: 'Priya Patel', email: 'priya@test.com', rollNumber: 'C10A02' },
            { name: 'Amit Kumar', email: 'amit@test.com', rollNumber: 'C10A03' },
            { name: 'Sneha Reddy', email: 'sneha@test.com', rollNumber: 'C10A04' },
            { name: 'Vikram Singh', email: 'vikram@test.com', rollNumber: 'C10A05' }
        ];
        
        for (const studentData of class10Students) {
            const existing = await ApprovedStudent.findOne({
                email: studentData.email,
                teacherId: prasadTeacher._id
            });
            
            if (!existing) {
                const approved = new ApprovedStudent({
                    email: studentData.email,
                    teacherId: prasadTeacher._id,
                    studentName: studentData.name,
                    rollNumber: studentData.rollNumber,
                    grade: '10',
                    section: 'A',
                    parentPhone: '9876543210'
                });
                await approved.save();
                console.log(`  ✓ Added ${studentData.name}`);
            } else {
                console.log(`  - ${studentData.name} already added`);
            }
        }
        
        // 3. Create assignments for Class 10
        console.log('\nCreating assignments for Class 10 Section A...');
        
        const assignments = [
            {
                title: 'Quadratic Equations Practice',
                description: 'Solve all problems from Chapter 4',
                assignmentType: 'assignment',
                dueDate: new Date('2026-02-15')
            },
            {
                title: 'Trigonometry Quiz',
                description: 'Quiz on sin, cos, tan functions',
                assignmentType: 'quiz',
                dueDate: new Date('2026-02-20')
            },
            {
                title: 'Geometry Project',
                description: 'Create a model demonstrating Pythagoras theorem',
                assignmentType: 'project',
                dueDate: new Date('2026-02-28')
            }
        ];
        
        for (const assignmentData of assignments) {
            const existing = await Assignment.findOne({
                teacherId: prasadTeacher._id,
                title: assignmentData.title
            });
            
            if (!existing) {
                const assignment = new Assignment({
                    teacherId: prasadTeacher._id,
                    title: assignmentData.title,
                    description: assignmentData.description,
                    class: '10',
                    section: 'A',
                    assignmentType: assignmentData.assignmentType,
                    dueDate: assignmentData.dueDate,
                    isActive: true
                });
                await assignment.save();
                console.log(`  ✓ Created "${assignmentData.title}"`);
            } else {
                console.log(`  - "${assignmentData.title}" already exists`);
            }
        }
        
        console.log('\n=== SETUP COMPLETE ===');
        console.log('\nTeacher Login:');
        console.log('  Email: prasad@school.com');
        console.log('  Password: teacher123');
        console.log('\nStudent Emails (need to signup):');
        class10Students.forEach(s => console.log(`  - ${s.email} (password: student123)`));
        console.log('\n');
        
        process.exit(0);
    } catch (error) {
        console.error('Setup error:', error);
        process.exit(1);
    }
}

setupClass10();
