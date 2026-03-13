const mongoose = require('mongoose');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Lesson = require('../models/Lesson');
require('dotenv').config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Teacher.deleteMany({});
        await Student.deleteMany({});
        await Lesson.deleteMany({});

        // Create admin user
        const adminUser = new User({
            username: 'admin',
            email: 'admin@school.edu',
            password: 'admin123',
            role: 'admin',
            firstName: 'System',
            lastName: 'Administrator'
        });
        await adminUser.save();

        // Create teacher user
        const teacherUser = new User({
            username: 'teacher1',
            email: 'teacher1@school.edu',
            password: 'teacher123',
            role: 'teacher',
            firstName: 'John',
            lastName: 'Smith'
        });
        await teacherUser.save();

        // Create teacher profile
        const teacher = new Teacher({
            userId: teacherUser._id,
            employeeId: 'T001',
            subject: 'Mathematics',
            grade: '10',
            phone: '9876543210'
        });
        await teacher.save();

        // Create sample students (without user accounts initially)
        const students = [
            {
                studentId: 'STU001',
                grade: '10',
                section: 'A',
                rollNumber: '1',
                parentPhone: '9876543211'
            },
            {
                studentId: 'STU002',
                grade: '10',
                section: 'A',
                rollNumber: '2',
                parentPhone: '9876543212'
            },
            {
                studentId: 'STU003',
                grade: '10',
                section: 'B',
                rollNumber: '1',
                parentPhone: '9876543213'
            }
        ];

        for (const studentData of students) {
            const student = new Student(studentData);
            await student.save();
        }

        // Create sample lesson
        const lesson = new Lesson({
            teacherId: teacher._id,
            title: 'Introduction to Algebra',
            subject: 'Mathematics',
            grade: '10',
            description: 'Basic concepts of algebra and linear equations',
            scheduledDate: new Date(),
            duration: 45,
            objectives: ['Understand variables', 'Solve linear equations', 'Apply algebraic concepts'],
            isCompleted: true,
            completedDate: new Date()
        });
        await lesson.save();

        console.log('Seed data created successfully!');
        console.log('Login credentials:');
        console.log('Admin: admin / admin123');
        console.log('Teacher: teacher1 / teacher123');
        console.log('Students can signup with: STU001, STU002, STU003');
        
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedData();