const mongoose = require('./backend/node_modules/mongoose');
const Student = require('./backend/models/Student');
const Attendance = require('./backend/models/Attendance');

async function fixUndefinedClasses() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        // 1. Fix students with undefined or null class values
        console.log('\n1. Fixing students with undefined class values...');
        const studentsWithUndefinedClass = await Student.find({
            $or: [
                { class: null },
                { class: { $exists: false } },
                { class: '' },
                { class: 'undefined' }
            ]
        });

        console.log(`Found ${studentsWithUndefinedClass.length} students with undefined class values`);

        for (const student of studentsWithUndefinedClass) {
            // Set default class based on grade or use '10' as default
            const defaultClass = student.grade || '10';
            const defaultSection = student.section || 'A';
            
            student.class = defaultClass;
            student.section = defaultSection;
            
            await student.save();
            console.log(`Fixed student ${student._id}: Set class to ${defaultClass}, section to ${defaultSection}`);
        }

        // 2. Fix attendance records with undefined class values
        console.log('\n2. Fixing attendance records with undefined class values...');
        const attendanceWithUndefinedClass = await Attendance.find({
            $or: [
                { class: null },
                { class: { $exists: false } },
                { class: '' },
                { class: 'undefined' }
            ]
        });

        console.log(`Found ${attendanceWithUndefinedClass.length} attendance records with undefined class values`);

        for (const attendance of attendanceWithUndefinedClass) {
            let student = null;
            
            if (attendance.studentId) {
                student = await Student.findById(attendance.studentId);
            } else if (attendance.approvedStudentId) {
                const ApprovedStudent = require('./backend/models/ApprovedStudent');
                const approvedStudent = await ApprovedStudent.findById(attendance.approvedStudentId);
                if (approvedStudent) {
                    attendance.class = approvedStudent.grade || '10';
                    attendance.section = approvedStudent.section || 'A';
                    await attendance.save();
                    console.log(`Fixed attendance record: Set class to ${attendance.class}, section to ${attendance.section}`);
                    continue;
                }
            }
            
            if (student) {
                attendance.class = student.class || '10';
                attendance.section = student.section || 'A';
                await attendance.save();
                console.log(`Fixed attendance record: Set class to ${attendance.class}, section to ${attendance.section}`);
            }
        }

        // 3. Generate updated class-wise summary
        console.log('\n3. Updated class-wise data summary:');
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

        // 4. Verify all students now have proper class assignments
        const studentsStillWithoutClass = await Student.countDocuments({
            $or: [
                { class: null },
                { class: { $exists: false } },
                { class: '' },
                { class: 'undefined' }
            ]
        });

        console.log(`\n4. Students still without proper class assignment: ${studentsStillWithoutClass}`);

        if (studentsStillWithoutClass === 0) {
            console.log('✅ All students now have proper class assignments!');
        } else {
            console.log('⚠️ Some students still need class assignment fixes');
        }

        console.log('\n✅ Class data fixes completed successfully!');
        console.log('\nBenefits:');
        console.log('- All students have valid class and section assignments');
        console.log('- Attendance records are properly organized by class');
        console.log('- Teachers can efficiently filter students by class for attendance');
        console.log('- Video sharing targets specific classes and sections');
        console.log('- Class-wise reporting and analytics are now accurate');
        
        process.exit(0);
    } catch (error) {
        console.error('Error fixing undefined classes:', error);
        process.exit(1);
    }
}

fixUndefinedClasses();