const mongoose = require('mongoose');
const Student = require('./models/Student');
const User = require('./models/User');
const { ensureCompleteStudentProfile, validateStudentProfile } = require('./utils/studentProfileSetup');

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

async function fixExistingStudentProfiles() {
    try {
        console.log('Starting student profile fix...');
        
        // Get all users with student role
        const studentUsers = await User.find({ role: 'student' });
        console.log(`Found ${studentUsers.length} student users`);
        
        let fixedCount = 0;
        let createdCount = 0;
        
        for (const user of studentUsers) {
            console.log(`\nProcessing student: ${user.name} (${user.email})`);
            
            try {
                // Check if student profile exists
                let student = await Student.findOne({ userId: user._id });
                
                if (!student) {
                    console.log('  - No student profile found, creating complete profile...');
                    student = await ensureCompleteStudentProfile(user._id, user.email);
                    createdCount++;
                } else {
                    console.log('  - Student profile exists, checking completeness...');
                    
                    // Validate current profile
                    const isValid = validateStudentProfile(student);
                    
                    if (!isValid) {
                        console.log('  - Profile incomplete, updating...');
                        student = await ensureCompleteStudentProfile(user._id, user.email);
                        fixedCount++;
                    } else {
                        console.log('  - Profile is complete');
                    }
                }
                
                // Verify final profile
                const finalValidation = validateStudentProfile(student);
                console.log(`  - Final validation: ${finalValidation ? 'PASSED' : 'FAILED'}`);
                
            } catch (error) {
                console.error(`  - Error processing student ${user.email}:`, error.message);
            }
        }
        
        console.log(`\n=== Student Profile Fix Summary ===`);
        console.log(`Total student users: ${studentUsers.length}`);
        console.log(`Profiles created: ${createdCount}`);
        console.log(`Profiles fixed: ${fixedCount}`);
        console.log(`Profiles already complete: ${studentUsers.length - createdCount - fixedCount}`);
        
    } catch (error) {
        console.error('Error fixing student profiles:', error);
    }
}

async function verifyAllStudentProfiles() {
    try {
        console.log('\n=== Verifying All Student Profiles ===');
        
        const students = await Student.find().populate('userId', 'name email');
        console.log(`Found ${students.length} student profiles`);
        
        let validCount = 0;
        let invalidCount = 0;
        
        for (const student of students) {
            const isValid = validateStudentProfile(student);
            const userName = student.userId ? student.userId.name : 'Unknown';
            const userEmail = student.userId ? student.userId.email : 'Unknown';
            
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
        console.error('Error verifying student profiles:', error);
    }
}

async function main() {
    await connectDB();
    
    console.log('=== Student Profile Maintenance Script ===\n');
    
    // Fix existing profiles
    await fixExistingStudentProfiles();
    
    // Verify all profiles
    await verifyAllStudentProfiles();
    
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