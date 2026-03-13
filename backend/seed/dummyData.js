const mongoose = require('mongoose');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Lesson = require('../models/Lesson');
const Feedback = require('../models/Feedback');
const connectDB = require('../config/db');

const seedData = async () => {
    try {
        await connectDB();
        
        // Clear existing data
        await User.deleteMany({});
        await Teacher.deleteMany({});
        await Student.deleteMany({});
        await Attendance.deleteMany({});
        await Lesson.deleteMany({});
        await Feedback.deleteMany({});

        console.log('Cleared existing data');

        // Create admin user
        const admin = new User({
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            name: 'System Administrator',
            email: 'admin@school.gov'
        });
        await admin.save();

        // Create teacher users
        const teacher1User = new User({
            username: 'teacher1',
            password: 'teacher123',
            role: 'teacher',
            name: 'John Smith',
            email: 'john.smith@school.gov'
        });
        await teacher1User.save();

        const teacher2User = new User({
            username: 'teacher2',
            password: 'teacher123',
            role: 'teacher',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@school.gov'
        });
        await teacher2User.save();

        // Create teacher profiles
        const teacher1 = new Teacher({
            userId: teacher1User._id,
            employeeId: 'T001',
            subject: 'Mathematics',
            grade: '10',
            phone: '9876543210',
            performanceScore: 85
        });
        await teacher1.save();

        const teacher2 = new Teacher({
            userId: teacher2User._id,
            employeeId: 'T002',
            subject: 'Science',
            grade: '10',
            phone: '9876543211',
            performanceScore: 92
        });
        await teacher2.save();

        // Create student users
        const student1User = new User({
            username: 'student1',
            password: 'student123',
            role: 'student',
            name: 'Alice Brown',
            email: 'alice.brown@student.school.gov'
        });
        await student1User.save();

        const student2User = new User({
            username: 'student2',
            password: 'student123',
            role: 'student',
            name: 'Bob Wilson',
            email: 'bob.wilson@student.school.gov'
        });
        await student2User.save();

        // Create student profiles
        const student1 = new Student({
            userId: student1User._id,
            rollNumber: 'S001',
            grade: '10',
            section: 'A',
            parentPhone: '9876543212',
            learningProgress: 78
        });
        await student1.save();

        const student2 = new Student({
            userId: student2User._id,
            rollNumber: 'S002',
            grade: '10',
            section: 'A',
            parentPhone: '9876543213',
            learningProgress: 65
        });
        await student2.save();

        // Create sample attendance records
        const attendanceData = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            attendanceData.push({
                teacherId: teacher1._id,
                date,
                status: Math.random() > 0.1 ? 'present' : 'absent',
                checkInTime: new Date(date.getTime() + 8 * 60 * 60 * 1000) // 8 AM
            });

            attendanceData.push({
                teacherId: teacher2._id,
                date,
                status: Math.random() > 0.05 ? 'present' : 'absent',
                checkInTime: new Date(date.getTime() + 8 * 60 * 60 * 1000) // 8 AM
            });
        }
        await Attendance.insertMany(attendanceData);

        // Create sample lessons
        const lessons = [
            {
                teacherId: teacher1._id,
                title: 'Quadratic Equations',
                subject: 'Mathematics',
                grade: '10',
                description: 'Introduction to quadratic equations and their solutions',
                materials: [
                    {
                        type: 'note',
                        title: 'Quadratic Formula Notes',
                        content: 'The quadratic formula is x = (-b ± √(b²-4ac)) / 2a'
                    },
                    {
                        type: 'video',
                        title: 'Quadratic Equations Video',
                        content: 'https://example.com/quadratic-video'
                    }
                ],
                isCompleted: true,
                completedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            },
            {
                teacherId: teacher2._id,
                title: 'Photosynthesis',
                subject: 'Science',
                grade: '10',
                description: 'Understanding the process of photosynthesis in plants',
                materials: [
                    {
                        type: 'note',
                        title: 'Photosynthesis Process',
                        content: '6CO2 + 6H2O + light energy → C6H12O6 + 6O2'
                    },
                    {
                        type: 'link',
                        title: 'Interactive Diagram',
                        content: 'https://example.com/photosynthesis-diagram'
                    }
                ],
                isCompleted: true,
                completedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            }
        ];
        const savedLessons = await Lesson.insertMany(lessons);

        // Create sample feedback
        const feedback = [
            {
                studentId: student1._id,
                teacherId: teacher1._id,
                lessonId: savedLessons[0]._id,
                rating: 4,
                comment: 'Very clear explanation of quadratic equations',
                understanding: 'good'
            },
            {
                studentId: student2._id,
                teacherId: teacher1._id,
                lessonId: savedLessons[0]._id,
                rating: 3,
                comment: 'Need more practice problems',
                understanding: 'average'
            },
            {
                studentId: student1._id,
                teacherId: teacher2._id,
                lessonId: savedLessons[1]._id,
                rating: 5,
                comment: 'Excellent visual aids for photosynthesis',
                understanding: 'excellent'
            }
        ];
        await Feedback.insertMany(feedback);

        console.log('Seed data created successfully!');
        console.log('\n✨ Database seeded successfully!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();