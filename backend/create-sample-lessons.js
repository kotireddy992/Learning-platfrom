// Test script to create sample lessons
const mongoose = require('mongoose');
const Lesson = require('./models/Lesson');
const Teacher = require('./models/Teacher');
const User = require('./models/User');

async function createSampleLessons() {
    try {
        // Connect to database
        await mongoose.connect('mongodb://localhost:27017/school-performance', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to database');

        // Find a teacher or create one
        let teacher = await Teacher.findOne().populate('userId');
        
        if (!teacher) {
            // Create a sample teacher user
            const teacherUser = new User({
                name: 'John Smith',
                email: 'teacher@test.com',
                username: 'teacher1',
                password: 'hashedpassword',
                role: 'teacher'
            });
            await teacherUser.save();

            teacher = new Teacher({
                userId: teacherUser._id,
                employeeId: 'T001',
                subject: 'Mathematics',
                assigned_class: '10',
                assigned_section: 'A',
                grade: '10'
            });
            await teacher.save();
            console.log('Created sample teacher');
        }

        // Create sample lessons
        const sampleLessons = [
            {
                teacherId: teacher._id,
                title: 'Introduction to Algebra',
                description: 'Basic algebraic concepts and equations',
                subject: 'Mathematics',
                class: '10',
                section: 'A',
                grade: '10',
                status: 'published',
                scheduledDate: new Date(),
                duration: 60
            },
            {
                teacherId: teacher._id,
                title: 'Quadratic Equations',
                description: 'Solving quadratic equations using various methods',
                subject: 'Mathematics',
                class: '10',
                section: 'A',
                grade: '10',
                status: 'published',
                scheduledDate: new Date(),
                duration: 45
            },
            {
                teacherId: teacher._id,
                title: 'Geometry Basics',
                description: 'Introduction to geometric shapes and properties',
                subject: 'Mathematics',
                class: '10',
                section: 'B',
                grade: '10',
                status: 'published',
                scheduledDate: new Date(),
                duration: 50
            }
        ];

        // Delete existing lessons to avoid duplicates
        await Lesson.deleteMany({});
        
        // Insert sample lessons
        const createdLessons = await Lesson.insertMany(sampleLessons);
        console.log(`Created ${createdLessons.length} sample lessons`);

        console.log('Sample lessons created successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error creating sample lessons:', error);
        process.exit(1);
    }
}

createSampleLessons();