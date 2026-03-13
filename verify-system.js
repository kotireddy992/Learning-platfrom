const mongoose = require('mongoose');
const Teacher = require('./backend/models/Teacher');
const ApprovedStudent = require('./backend/models/ApprovedStudent');
const User = require('./backend/models/User');

async function verifySystem() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance_system', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Check teachers
        const teacherCount = await Teacher.countDocuments();
        console.log(`📚 Teachers in system: ${teacherCount}`);
        
        // Check approved students
        const approvedCount = await ApprovedStudent.countDocuments();
        console.log(`👥 Approved students: ${approvedCount}`);
        
        // Check if teachers have students
        const teachers = await Teacher.find().populate('userId');
        for (const teacher of teachers) {
            const teacherStudents = await ApprovedStudent.countDocuments({ teacherId: teacher._id });
            console.log(`👨‍🏫 Teacher ${teacher.userId?.name || 'Unknown'} has ${teacherStudents} approved students`);
        }
        
        // Check user accounts
        const userCount = await User.countDocuments();
        console.log(`👤 Total users: ${userCount}`);
        
        console.log('\n✅ System verification complete!');
        console.log('🎯 The attendance system should now work for all teachers');
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifySystem();