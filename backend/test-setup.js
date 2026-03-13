const mongoose = require('mongoose');
const User = require('./models/User');

// Test database connection and create admin user
async function testSetup() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_performance_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected');

        // Check if admin exists
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const admin = new User({
                username: 'admin',
                email: 'admin@school.gov',
                password: 'admin123',
                role: 'admin',
                firstName: 'System',
                lastName: 'Administrator'
            });
            await admin.save();
            console.log('✅ Admin user created: admin / admin123');
        } else {
            console.log('✅ Admin user already exists');
        }

        console.log('✅ Setup complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

testSetup();