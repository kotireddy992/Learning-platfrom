const mongoose = require('./backend/node_modules/mongoose');
const Student = require('./backend/models/Student');
const Attendance = require('./backend/models/Attendance');
const SharedVideo = require('./backend/models/SharedVideo');
const ApprovedStudent = require('./backend/models/ApprovedStudent');

async function organizeClassData() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        // 1. Ensure all students have proper class and section data
        console.log('\n1. Organizing student class data...');
        const students = await Student.find({});
        let updatedStudents = 0;

        for (const student of students) {
            let needsUpdate = false;
            
            // Ensure class field exists (use grade if class is missing)
            if (!student.class && student.grade) {
                student.class = student.grade;
                needsUpdate = true;
            }
            
            // Set default section if missing
            if (!student.section) {
                student.section = 'A';
                needsUpdate = true;
            }
            
            // Ensure rollNumber exists
            if (!student.rollNumber) {
                student.rollNumber = `STU${String(updatedStudents + 1).padStart(3, '0')}`;
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                await student.save();
                updatedStudents++;
                console.log(`Updated student ${student._id}: Class ${student.class}, Section ${student.section}`);
            }
        }
        console.log(`Updated ${updatedStudents} student records`);

        // 2. Update attendance records to include class and section
        console.log('\n2. Updating attendance records with class/section data...');
        const attendanceRecords = await Attendance.find({
            $or: [
                { class: { $exists: false } },
                { section: { $exists: false } }
            ]
        });
        
        let updatedAttendance = 0;
        for (const attendance of attendanceRecords) {
            let student = null;
            
            if (attendance.studentId) {
                student = await Student.findById(attendance.studentId);
            } else if (attendance.approvedStudentId) {
                const approvedStudent = await ApprovedStudent.findById(attendance.approvedStudentId);
                if (approvedStudent) {
                    attendance.class = approvedStudent.grade;
                    attendance.section = approvedStudent.section;
                    await attendance.save();
                    updatedAttendance++;
                    continue;
                }
            }
            
            if (student) {
                attendance.class = student.class || student.grade || '10';
                attendance.section = student.section || 'A';
                await attendance.save();
                updatedAttendance++;
                console.log(`Updated attendance record: Class ${attendance.class}, Section ${attendance.section}`);
            }
        }
        console.log(`Updated ${updatedAttendance} attendance records`);

        // 3. Verify shared videos have proper class/section targeting
        console.log('\n3. Verifying shared video class targeting...');
        const videos = await SharedVideo.find({});
        let videoCount = 0;
        
        for (const video of videos) {
            if (video.class && video.section) {
                videoCount++;
            }
        }
        console.log(`Found ${videoCount} videos with proper class/section targeting out of ${videos.length} total videos`);

        // 4. Generate class-wise summary
        console.log('\n4. Class-wise data summary:');
        const classSummary = await Student.aggregate([
            {
                $group: {
                    _id: { class: '$class', section: '$section' },
                    studentCount: { $sum: 1 },
                    avgAttendanceRate: { 
                        $avg: { 
                            $cond: [
                                { $gt: ['$totalSchoolDays', 0] },
                                { $multiply: [{ $divide: ['$attendanceDays', '$totalSchoolDays'] }, 100] },
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { '_id.class': 1, '_id.section': 1 } }
        ]);

        classSummary.forEach(summary => {
            console.log(`Class ${summary._id.class}${summary._id.section}: ${summary.studentCount} students, ${Math.round(summary.avgAttendanceRate)}% avg attendance`);
        });

        // 5. Video distribution by class
        console.log('\n5. Video distribution by class:');
        const videoSummary = await SharedVideo.aggregate([
            {
                $group: {
                    _id: { class: '$class', section: '$section' },
                    videoCount: { $sum: 1 }
                }
            },
            { $sort: { '_id.class': 1, '_id.section': 1 } }
        ]);

        videoSummary.forEach(summary => {
            console.log(`Class ${summary._id.class}${summary._id.section}: ${summary.videoCount} videos shared`);
        });

        console.log('\n✅ Class-wise data organization completed successfully!');
        console.log('\nKey improvements:');
        console.log('- All students now have proper class and section assignments');
        console.log('- Attendance records include class/section for better filtering');
        console.log('- Video sharing is organized by class and section');
        console.log('- Teachers can now efficiently manage students by class');
        
        process.exit(0);
    } catch (error) {
        console.error('Error organizing class data:', error);
        process.exit(1);
    }
}

organizeClassData();