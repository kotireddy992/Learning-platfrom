const mongoose = require('mongoose');
const User = require('./models/User');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const ApprovedStudent = require('./models/ApprovedStudent');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function removeDefaultUsers() {
    try {
        console.log('=== REMOVING DEFAULT USERS ===\n');
        
        // Get approved students (these are the ones teachers have added)
        const approvedStudents = await ApprovedStudent.find();
        const approvedEmails = approvedStudents.map(s => s.email);
        
        console.log(`Found ${approvedStudents.length} teacher-approved students to preserve\n`);
        
        // Find default student users (not approved by any teacher)
        const defaultStudents = await User.find({
            role: 'student',
            email: { $nin: approvedEmails }
        });
        
        console.log(`Found ${defaultStudents.length} default student users to remove:`);
        defaultStudents.forEach(user => {
            console.log(`  - ${user.name || user.email} (${user.email})`);
        });
        
        // Delete default student users
        const deletedUsers = await User.deleteMany({
            role: 'student',
            email: { $nin: approvedEmails }
        });
        
        // Get valid user IDs (teachers, admins, approved students)
        const validUsers = await User.find({
            $or: [
                { role: 'teacher' },
                { role: 'admin' },
                { email: { $in: approvedEmails } }
            ]
        });
        const validUserIds = validUsers.map(u => u._id);
        
        // Delete orphaned student records
        const deletedStudents = await Student.deleteMany({
            userId: { $nin: validUserIds }
        });
        
        console.log(`\n=== CLEANUP COMPLETE ===`);
        console.log(`Deleted ${deletedUsers.deletedCount} default user accounts`);
        console.log(`Deleted ${deletedStudents.deletedCount} orphaned student records`);
        console.log(`\nPreserved:`);
        console.log(`  - ${validUsers.filter(u => u.role === 'teacher').length} teachers`);
        console.log(`  - ${validUsers.filter(u => u.role === 'admin').length} admins`);
        console.log(`  - ${approvedStudents.length} teacher-approved students`);
        
    } catch (error) {
        console.error('Error removing default users:', error);
    } finally {
        mongoose.connection.close();
    }
}

removeDefaultUsers();
