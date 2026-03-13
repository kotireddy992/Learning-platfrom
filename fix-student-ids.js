const mongoose = require('./backend/node_modules/mongoose');
const Student = require('./backend/models/Student');

async function fixStudentIds() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        // Find all students with null or missing studentId
        const studentsWithoutId = await Student.find({
            $or: [
                { studentId: null },
                { studentId: { $exists: false } },
                { studentId: '' }
            ]
        });

        console.log(`Found ${studentsWithoutId.length} students without studentId`);

        // Update each student with a unique studentId
        for (let i = 0; i < studentsWithoutId.length; i++) {
            const student = studentsWithoutId[i];
            const newStudentId = `STU${String(i + 1).padStart(3, '0')}`;
            
            await Student.updateOne(
                { _id: student._id },
                { 
                    $set: { 
                        studentId: newStudentId,
                        rollNumber: student.rollNumber || newStudentId
                    }
                }
            );
            
            console.log(`Updated student ${student._id} with studentId: ${newStudentId}`);
        }

        console.log('All student IDs fixed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing student IDs:', error);
        process.exit(1);
    }
}

fixStudentIds();