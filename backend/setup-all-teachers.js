// Script to add test students for any teacher
const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');
const ApprovedStudent = require('./models/ApprovedStudent');
const User = require('./models/User');

async function addStudentsForAllTeachers() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to database');
        
        // Get all teachers
        const teachers = await Teacher.find().populate('userId');
        console.log(`Found ${teachers.length} teachers`);
        
        for (const teacher of teachers) {
            console.log(`\nProcessing teacher: ${teacher.userId?.email}`);
            
            // Check if teacher already has students
            const existingStudents = await ApprovedStudent.countDocuments({ teacherId: teacher._id });
            if (existingStudents > 0) {
                console.log(`  Teacher already has ${existingStudents} students, skipping...`);
                continue;
            }
            
            // Add test students for this teacher
            const testStudents = [
                {
                    email: `student1.${teacher._id}@test.com`,
                    studentName: 'John Smith',
                    rollNumber: '001',
                    grade: '10',
                    section: 'A',
                    parentPhone: '1234567890'
                },
                {
                    email: `student2.${teacher._id}@test.com`,
                    studentName: 'Jane Doe',
                    rollNumber: '002',
                    grade: '10',
                    section: 'A',
                    parentPhone: '1234567891'
                },
                {
                    email: `student3.${teacher._id}@test.com`,
                    studentName: 'Bob Johnson',
                    rollNumber: '003',
                    grade: '10',
                    section: 'B',
                    parentPhone: '1234567892'
                },
                {
                    email: `student4.${teacher._id}@test.com`,
                    studentName: 'Alice Brown',
                    rollNumber: '004',
                    grade: '11',
                    section: 'A',
                    parentPhone: '1234567893'
                },
                {
                    email: `student5.${teacher._id}@test.com`,
                    studentName: 'Charlie Wilson',
                    rollNumber: '005',
                    grade: '11',
                    section: 'B',
                    parentPhone: '1234567894'
                }
            ];
            
            let addedCount = 0;
            for (const studentData of testStudents) {
                try {
                    const approvedStudent = new ApprovedStudent({
                        ...studentData,
                        teacherId: teacher._id
                    });
                    
                    await approvedStudent.save();
                    addedCount++;
                } catch (error) {
                    console.error(`    Error adding student ${studentData.studentName}:`, error.message);
                }
            }\n            \n            console.log(`  Added ${addedCount} students for teacher ${teacher.userId?.email}`);\n        }\n        \n        console.log('\\nCompleted adding students for all teachers');\n        \n    } catch (error) {\n        console.error('Error:', error);\n    } finally {\n        await mongoose.disconnect();\n        console.log('Disconnected from database');\n    }\n}\n\naddStudentsForAllTeachers();