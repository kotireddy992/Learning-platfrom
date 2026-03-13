const mongoose = require('mongoose');
const User = require('./models/User');
const Teacher = require('./models/Teacher');
const { ensureCompleteTeacherProfile } = require('./utils/teacherProfileSetup');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function fixMissingTeacherProfiles() {
    try {
        console.log('Checking for teacher users without profiles...');
        
        // Find all users with teacher role
        const teacherUsers = await User.find({ role: 'teacher' });
        console.log(`Found ${teacherUsers.length} teacher users`);
        
        let fixed = 0;
        let existing = 0;
        
        for (const user of teacherUsers) {
            // Check if teacher profile exists
            const existingTeacher = await Teacher.findOne({ userId: user._id });
            
            if (!existingTeacher) {
                console.log(`Creating missing teacher profile for: ${user.name} (${user.email})`);
                
                // Create complete teacher profile
                const teacher = await ensureCompleteTeacherProfile(user._id);
                console.log(`✅ Created teacher profile: ${teacher.employeeId}`);
                fixed++;
            } else {
                console.log(`✓ Teacher profile exists for: ${user.name}`);
                existing++;
            }
        }
        
        console.log('\n=== SUMMARY ===');
        console.log(`Total teacher users: ${teacherUsers.length}`);
        console.log(`Existing profiles: ${existing}`);
        console.log(`Fixed missing profiles: ${fixed}`);
        console.log('All teacher profiles are now complete!');
        
    } catch (error) {
        console.error('Error fixing teacher profiles:', error);
    } finally {
        mongoose.connection.close();
    }
}

fixMissingTeacherProfiles();