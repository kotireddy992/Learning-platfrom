const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/school_performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkAndFixTeacherProfiles() {
    try {
        console.log('Checking all teacher profiles...');
        
        // Find all teachers
        const teachers = await Teacher.find({});
        
        console.log(`Found ${teachers.length} teacher profiles`);
        
        for (const teacher of teachers) {
            console.log(`\\nChecking teacher profile: ${teacher.employeeId}`);
            console.log(`Current data:`, {
                assigned_class: teacher.assigned_class,
                assigned_section: teacher.assigned_section,
                grade: teacher.grade,
                phone: teacher.phone
            });
            
            // Update missing fields with defaults
            const updateData = {};
            if (!teacher.assigned_class || teacher.assigned_class === '') {
                updateData.assigned_class = 'Grade 10A';
            }
            if (!teacher.assigned_section || teacher.assigned_section === '') {
                updateData.assigned_section = 'A';
            }
            if (!teacher.grade || teacher.grade === '') {
                updateData.grade = '10';
            }
            if (!teacher.phone || teacher.phone === '') {
                updateData.phone = '0000000000';
            }
            
            if (Object.keys(updateData).length > 0) {
                await Teacher.findByIdAndUpdate(teacher._id, updateData);
                console.log(`Updated teacher ${teacher.employeeId} with:`, updateData);
            } else {
                console.log(`Teacher ${teacher.employeeId} already has all required fields`);
            }
        }
        
        console.log('\\nAll teacher profiles checked and fixed!');
        process.exit(0);
    } catch (error) {
        console.error('Error checking teacher profiles:', error);
        process.exit(1);
    }
}

checkAndFixTeacherProfiles();