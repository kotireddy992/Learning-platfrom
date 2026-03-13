const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');
const User = require('./models/User');
const { ensureCompleteTeacherProfile, validateTeacherProfile } = require('./utils/teacherProfileSetup');

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

async function fixExistingTeacherProfiles() {
    try {
        console.log('Starting teacher profile fix...');
        
        // Get all users with teacher role
        const teacherUsers = await User.find({ role: 'teacher' });
        console.log(`Found ${teacherUsers.length} teacher users`);
        
        let fixedCount = 0;
        let createdCount = 0;
        
        for (const user of teacherUsers) {
            console.log(`\nProcessing teacher: ${user.name} (${user.email})`);
            
            try {
                // Check if teacher profile exists
                let teacher = await Teacher.findOne({ userId: user._id });
                
                if (!teacher) {
                    console.log('  - No teacher profile found, creating complete profile...');
                    teacher = await ensureCompleteTeacherProfile(user._id);
                    createdCount++;
                } else {
                    console.log('  - Teacher profile exists, checking completeness...');
                    
                    // Validate current profile
                    const isValid = validateTeacherProfile(teacher);
                    
                    if (!isValid) {
                        console.log('  - Profile incomplete, updating...');
                        teacher = await ensureCompleteTeacherProfile(user._id);
                        fixedCount++;
                    } else {
                        console.log('  - Profile is complete');
                    }
                }
                
                // Verify final profile
                const finalValidation = validateTeacherProfile(teacher);
                console.log(`  - Final validation: ${finalValidation ? 'PASSED' : 'FAILED'}`);
                
            } catch (error) {
                console.error(`  - Error processing teacher ${user.email}:`, error.message);
            }
        }
        
        console.log(`\n=== Teacher Profile Fix Summary ===`);
        console.log(`Total teacher users: ${teacherUsers.length}`);
        console.log(`Profiles created: ${createdCount}`);
        console.log(`Profiles fixed: ${fixedCount}`);
        console.log(`Profiles already complete: ${teacherUsers.length - createdCount - fixedCount}`);
        
    } catch (error) {
        console.error('Error fixing teacher profiles:', error);
    }
}

async function verifyAllTeacherProfiles() {
    try {
        console.log('\n=== Verifying All Teacher Profiles ===');
        
        const teachers = await Teacher.find().populate('userId', 'name email');
        console.log(`Found ${teachers.length} teacher profiles`);
        
        let validCount = 0;
        let invalidCount = 0;
        
        for (const teacher of teachers) {
            const isValid = validateTeacherProfile(teacher);
            const userName = teacher.userId ? teacher.userId.name : 'Unknown';
            const userEmail = teacher.userId ? teacher.userId.email : 'Unknown';
            
            console.log(`${userName} (${userEmail}): ${isValid ? 'VALID' : 'INVALID'}`);
            
            if (isValid) {
                validCount++;
            } else {
                invalidCount++;
                console.log('  - Missing or invalid fields detected');
            }
        }
        
        console.log(`\nValidation Summary:`);
        console.log(`Valid profiles: ${validCount}`);
        console.log(`Invalid profiles: ${invalidCount}`);
        
    } catch (error) {
        console.error('Error verifying teacher profiles:', error);
    }
}

async function main() {
    await connectDB();
    
    console.log('=== Teacher Profile Maintenance Script ===\n');
    
    // Fix existing profiles
    await fixExistingTeacherProfiles();
    
    // Verify all profiles
    await verifyAllTeacherProfiles();
    
    console.log('\n=== Script completed ===');
    process.exit(0);
}

// Handle script errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
});

// Run the script
main();