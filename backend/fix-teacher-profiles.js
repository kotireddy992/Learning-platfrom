const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/school_performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function fixTeacherProfiles() {
    try {
        console.log('Fixing teacher profiles...');
        
        // Find all teachers missing required fields
        const teachers = await Teacher.find({
            $or: [
                { assigned_class: { $exists: false } },
                { assigned_section: { $exists: false } },
                { assigned_class: null },
                { assigned_section: null },
                { assigned_class: '' },
                { assigned_section: '' }
            ]
        });
        
        console.log(`Found ${teachers.length} teacher profiles to fix`);
        
        for (const teacher of teachers) {
            console.log(`Fixing teacher profile: ${teacher.employeeId}`);
            
            // Update missing fields with defaults
            const updateData = {};
            if (!teacher.assigned_class) {
                updateData.assigned_class = 'Grade 10A';
            }
            if (!teacher.assigned_section) {
                updateData.assigned_section = 'A';
            }
            if (!teacher.grade) {
                updateData.grade = '10';
            }
            if (!teacher.phone) {
                updateData.phone = '0000000000';
            }
            
            await Teacher.findByIdAndUpdate(teacher._id, updateData);
            console.log(`Updated teacher ${teacher.employeeId} with:`, updateData);
        }
        
        console.log('Teacher profiles fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing teacher profiles:', error);
        process.exit(1);
    }
}

fixTeacherProfiles();