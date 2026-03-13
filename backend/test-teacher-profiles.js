const mongoose = require('mongoose');
const User = require('./models/User');
const Teacher = require('./models/Teacher');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/school_performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function testTeacherProfileCreation() {
    try {
        console.log('Testing teacher profile creation...');
        
        // Find a teacher user without a teacher profile
        const teacherUsers = await User.find({ role: 'teacher' });
        console.log(`Found ${teacherUsers.length} teacher users`);
        
        for (const user of teacherUsers) {
            const existingProfile = await Teacher.findOne({ userId: user._id });
            if (existingProfile) {
                console.log(`Teacher ${user.email} already has profile`);
            } else {
                console.log(`Teacher ${user.email} missing profile - would be created automatically`);
            }
        }
        
        console.log('\nTest completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testTeacherProfileCreation();