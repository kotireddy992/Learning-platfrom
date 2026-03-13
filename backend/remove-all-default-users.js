const mongoose = require('mongoose');
const User = require('./models/User');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const ApprovedStudent = require('./models/ApprovedStudent');
const Attendance = require('./models/Attendance');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function removeAllDefaultUsers() {
    try {
        console.log('Starting complete cleanup...');
        
        // Get all users
        const allUsers = await User.find();
        console.log(`Found ${allUsers.length} total users`);
        
        // Remove ALL users (including students and any default accounts)
        const deletedUsers = await User.deleteMany({});
        console.log(`Removed ${deletedUsers.deletedCount} users`);
        
        // Remove ALL student records
        const deletedStudents = await Student.deleteMany({});
        console.log(`Removed ${deletedStudents.deletedCount} student records`);
        
        // Remove ALL teacher records
        const deletedTeachers = await Teacher.deleteMany({});
        console.log(`Removed ${deletedTeachers.deletedCount} teacher records`);
        
        // Remove ALL approved students
        const deletedApproved = await ApprovedStudent.deleteMany({});
        console.log(`Removed ${deletedApproved.deletedCount} approved student records`);
        
        // Remove ALL attendance records
        const deletedAttendance = await Attendance.deleteMany({});
        console.log(`Removed ${deletedAttendance.deletedCount} attendance records`);
        
        console.log('Complete cleanup finished! Database is now clean.');
        console.log('Teachers can now sign up fresh and add their own students.');
        
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        mongoose.connection.close();
    }
}

removeAllDefaultUsers();