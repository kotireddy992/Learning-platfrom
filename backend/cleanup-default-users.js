const mongoose = require('mongoose');
const User = require('./models/User');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const ApprovedStudent = require('./models/ApprovedStudent');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function cleanupDefaultUsers() {
    try {
        console.log('Starting cleanup of default users...');
        
        // Remove all default/test users except teachers
        const teacherUsers = await User.find({ role: 'teacher' });
        const teacherUserIds = teacherUsers.map(u => u._id);
        
        console.log(`Found ${teacherUsers.length} teacher users to keep`);
        
        // Remove all non-teacher users
        const deletedUsers = await User.deleteMany({ 
            role: { $ne: 'teacher' }
        });
        console.log(`Removed ${deletedUsers.deletedCount} non-teacher users`);
        
        // Remove orphaned student records
        const deletedStudents = await Student.deleteMany({
            userId: { $nin: teacherUserIds }
        });
        console.log(`Removed ${deletedStudents.deletedCount} orphaned student records`);
        
        // Keep teacher profiles and approved students
        console.log('Teacher profiles and approved students preserved');
        
        console.log('Cleanup completed successfully!');
        
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        mongoose.connection.close();
    }
}

cleanupDefaultUsers();