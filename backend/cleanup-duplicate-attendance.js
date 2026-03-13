const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const Student = require('./models/Student');
const ApprovedStudent = require('./models/ApprovedStudent');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function cleanupDuplicateAttendance() {
    try {
        console.log('Starting duplicate attendance cleanup...');
        
        // Get all attendance records
        const allAttendance = await Attendance.find().sort({ date: 1, createdAt: 1 });
        console.log(`Found ${allAttendance.length} total attendance records`);
        
        // Group by student and date to find duplicates
        const attendanceMap = new Map();
        const duplicatesToRemove = [];
        
        for (const record of allAttendance) {
            // Create a unique key for student-date combination
            let studentKey = '';
            if (record.studentId) {
                studentKey = record.studentId.toString();
            } else if (record.approvedStudentId) {
                // For approved students, we need to find the corresponding student email
                const approvedStudent = await ApprovedStudent.findById(record.approvedStudentId);
                if (approvedStudent) {
                    studentKey = approvedStudent.email; // Use email as unique identifier
                }
            }
            
            if (!studentKey) continue;
            
            const dateKey = record.date.toISOString().split('T')[0];
            const uniqueKey = `${studentKey}-${dateKey}`;
            
            if (attendanceMap.has(uniqueKey)) {
                // This is a duplicate - mark for removal
                duplicatesToRemove.push(record._id);
                console.log(`Found duplicate attendance for ${studentKey} on ${dateKey}`);
            } else {
                // First occurrence - keep this one
                attendanceMap.set(uniqueKey, record);
            }
        }
        
        console.log(`Found ${duplicatesToRemove.length} duplicate records to remove`);
        
        if (duplicatesToRemove.length > 0) {
            // Remove duplicate records
            const result = await Attendance.deleteMany({ _id: { $in: duplicatesToRemove } });
            console.log(`Removed ${result.deletedCount} duplicate attendance records`);
            
            // Recalculate attendance statistics for all students
            console.log('Recalculating attendance statistics...');
            
            // Update regular students
            const students = await Student.find();
            for (const student of students) {
                const attendanceRecords = await Attendance.find({ studentId: student._id });
                const workingDayRecords = attendanceRecords.filter(record => {
                    const date = new Date(record.date);
                    const dayOfWeek = date.getDay();
                    return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude weekends
                });
                
                const presentDays = workingDayRecords.filter(r => r.status === 'present').length;
                
                student.totalSchoolDays = workingDayRecords.length;
                student.attendanceDays = presentDays;
                await student.save();
            }
            
            // Update approved students
            const approvedStudents = await ApprovedStudent.find();
            for (const approvedStudent of approvedStudents) {
                const attendanceRecords = await Attendance.find({ approvedStudentId: approvedStudent._id });
                const workingDayRecords = attendanceRecords.filter(record => {
                    const date = new Date(record.date);
                    const dayOfWeek = date.getDay();
                    return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude weekends
                });
                
                const presentDays = workingDayRecords.filter(r => r.status === 'present').length;
                
                approvedStudent.totalSchoolDays = workingDayRecords.length;
                approvedStudent.attendanceDays = presentDays;
                await approvedStudent.save();
            }
            
            console.log('Attendance statistics recalculated for all students');
        }
        
        // Final verification
        const finalCount = await Attendance.countDocuments();
        console.log(`Final attendance record count: ${finalCount}`);
        
        console.log('Duplicate attendance cleanup completed successfully!');
        
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the cleanup
cleanupDuplicateAttendance();