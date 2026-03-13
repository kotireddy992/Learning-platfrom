const mongoose = require('mongoose');
const Teacher = require('./backend/models/Teacher');
const ApprovedStudent = require('./backend/models/ApprovedStudent');
const User = require('./backend/models/User');

async function testTeacherIsolation() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance_system');
        
        console.log('🧪 TESTING TEACHER-STUDENT ISOLATION');
        console.log('=====================================');
        
        const teachers = await Teacher.find().populate('userId');
        
        for (let i = 0; i < teachers.length; i++) {
            const teacher = teachers[i];
            const teacherName = teacher.userId?.name || `Teacher ${i+1}`;
            
            console.log(`\n👨🏫 ${teacherName} (ID: ${teacher._id})`);
            console.log('─'.repeat(50));
            
            // Get students for this specific teacher
            const teacherStudents = await ApprovedStudent.find({ teacherId: teacher._id });
            
            if (teacherStudents.length === 0) {
                console.log('❌ NO STUDENTS FOUND');
            } else {
                console.log(`✅ Found ${teacherStudents.length} students:`);
                teacherStudents.forEach((student, idx) => {
                    console.log(`   ${idx+1}. ${student.studentName} (${student.email}) - Class ${student.grade}${student.section}`);
                });
                
                // Get classes for this teacher
                const classes = [...new Set(teacherStudents.map(s => s.grade))];
                console.log(`📚 Classes: ${classes.join(', ')}`);
            }
        }
        
        console.log('\n🎯 ISOLATION TEST RESULTS:');
        console.log('Each teacher should have their own unique students');
        console.log('No student should appear in multiple teacher lists');
        
        // Check for duplicate emails across teachers
        const allStudents = await ApprovedStudent.find();
        const emailCounts = {};
        
        allStudents.forEach(student => {
            emailCounts[student.email] = (emailCounts[student.email] || 0) + 1;
        });
        
        const duplicates = Object.entries(emailCounts).filter(([email, count]) => count > 1);
        
        if (duplicates.length > 0) {
            console.log('\n⚠️  DUPLICATE EMAILS FOUND:');
            duplicates.forEach(([email, count]) => {
                console.log(`   ${email} appears ${count} times`);
            });
        } else {
            console.log('\n✅ NO DUPLICATE EMAILS - ISOLATION IS WORKING!');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testTeacherIsolation();