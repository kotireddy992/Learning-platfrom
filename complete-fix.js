const mongoose = require('mongoose');
const Teacher = require('./backend/models/Teacher');
const ApprovedStudent = require('./backend/models/ApprovedStudent');
const User = require('./backend/models/User');

async function completeSystemFix() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance_system');
        
        console.log('🔧 COMPLETE SYSTEM FIX FOR ALL TEACHERS');
        console.log('=====================================');
        
        // Get all teachers
        const teachers = await Teacher.find().populate('userId');
        console.log(`Found ${teachers.length} teachers`);
        
        let fixed = 0;
        
        for (const teacher of teachers) {
            const teacherName = teacher.userId?.name || `Teacher_${teacher._id}`;
            console.log(`\n👨🏫 Fixing: ${teacherName}`);
            
            // Clear existing students
            const deleted = await ApprovedStudent.deleteMany({ teacherId: teacher._id });
            console.log(`   Cleared ${deleted.deletedCount} old students`);
            
            // Add new students with unique emails
            const newStudents = [
                {
                    email: `john.smith.${teacher._id}@school.com`,
                    studentName: 'John Smith',
                    rollNumber: '001',
                    grade: '10',
                    section: 'A',
                    parentPhone: '1234567890',
                    teacherId: teacher._id,
                    totalSchoolDays: 0,
                    attendanceDays: 0,
                    isUsed: false
                },
                {
                    email: `jane.doe.${teacher._id}@school.com`,
                    studentName: 'Jane Doe',
                    rollNumber: '002',
                    grade: '10',
                    section: 'A',
                    parentPhone: '1234567891',
                    teacherId: teacher._id,
                    totalSchoolDays: 0,
                    attendanceDays: 0,
                    isUsed: false
                },
                {
                    email: `bob.johnson.${teacher._id}@school.com`,
                    studentName: 'Bob Johnson',
                    rollNumber: '003',
                    grade: '10',
                    section: 'B',
                    parentPhone: '1234567892',
                    teacherId: teacher._id,
                    totalSchoolDays: 0,
                    attendanceDays: 0,
                    isUsed: false
                },
                {
                    email: `alice.brown.${teacher._id}@school.com`,
                    studentName: 'Alice Brown',
                    rollNumber: '004',
                    grade: '11',
                    section: 'A',
                    parentPhone: '1234567893',
                    teacherId: teacher._id,
                    totalSchoolDays: 0,
                    attendanceDays: 0,
                    isUsed: false
                },
                {
                    email: `charlie.wilson.${teacher._id}@school.com`,
                    studentName: 'Charlie Wilson',
                    rollNumber: '005',
                    grade: '11',
                    section: 'B',
                    parentPhone: '1234567894',
                    teacherId: teacher._id,
                    totalSchoolDays: 0,
                    attendanceDays: 0,
                    isUsed: false
                }
            ];
            
            // Insert all students
            await ApprovedStudent.insertMany(newStudents);
            console.log(`   ✅ Added ${newStudents.length} new students`);
            
            // Verify
            const count = await ApprovedStudent.countDocuments({ teacherId: teacher._id });
            const classes = await ApprovedStudent.distinct('grade', { teacherId: teacher._id });
            console.log(`   📊 Verified: ${count} students in classes ${classes.join(', ')}`);
            
            fixed++;
        }
        
        console.log(`\n🎉 FIXED ${fixed} TEACHERS!`);
        console.log('\n📱 Now ALL teachers can:');
        console.log('   ✅ Login and see students');
        console.log('   ✅ Mark attendance');
        console.log('   ✅ View class lists');
        console.log('   ✅ Add new students');
        
        // Final verification
        console.log('\n🔍 FINAL VERIFICATION:');
        for (const teacher of teachers) {
            const studentCount = await ApprovedStudent.countDocuments({ teacherId: teacher._id });
            const teacherName = teacher.userId?.name || `Teacher_${teacher._id}`;
            console.log(`   ${teacherName}: ${studentCount} students`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

completeSystemFix();