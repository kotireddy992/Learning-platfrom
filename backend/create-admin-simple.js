const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function createAdmin() {
    try {
        console.log('\n=== CREATING ADMIN ACCOUNT ===\n');
        
        // Delete existing
        await User.deleteMany({ email: 'pradeep123@gmail.com' });
        console.log('Cleaned up existing accounts\n');
        
        // Create new admin (password will be auto-hashed by pre-save hook)
        const admin = new User({
            username: 'pradeep123@gmail.com',
            email: 'pradeep123@gmail.com',
            name: 'Pradeep Admin',
            password: 'pradeep123',
            role: 'admin',
            isActive: true
        });
        
        await admin.save();
        console.log('✅ Admin created successfully!\n');
        
        // Verify
        const verify = await User.findOne({ email: 'pradeep123@gmail.com' });
        console.log('Account Details:');
        console.log(`  Email: ${verify.email}`);
        console.log(`  Username: ${verify.username}`);
        console.log(`  Name: ${verify.name}`);
        console.log(`  Role: ${verify.role}`);
        console.log(`  Active: ${verify.isActive}\n`);
        
        // Test password using the model's method
        const passwordWorks = await verify.comparePassword('pradeep123');
        console.log(`Password Test: ${passwordWorks ? '✅ WORKS' : '❌ FAILED'}\n`);
        
        if (passwordWorks) {
            console.log('=== SUCCESS ===');
            console.log('Login with:');
            console.log('  Email: pradeep123@gmail.com');
            console.log('  Password: pradeep123\n');
        }
        
    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

createAdmin();
