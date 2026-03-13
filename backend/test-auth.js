const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testLogin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Test admin login
        const admin = await User.findOne({ username: 'admin' });
        if (admin) {
            const isValid = await admin.comparePassword('admin123');
            console.log(`Admin login test: ${isValid ? 'PASS' : 'FAIL'}`);
        }
        
        // Test teacher login
        const teacher = await User.findOne({ username: 'teacher1' });
        if (teacher) {
            const isValid = await teacher.comparePassword('teacher123');
            console.log(`Teacher login test: ${isValid ? 'PASS' : 'FAIL'}`);
        }
        
        // List all users
        const users = await User.find({}).select('username role isActive');
        console.log('\nAll users:');
        users.forEach(user => {
            console.log(`- ${user.username} (${user.role}) - Active: ${user.isActive}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testLogin();