const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function showAndFixAdmin() {
    try {
        console.log('\n========================================');
        console.log('  CHECKING DATABASE');
        console.log('========================================\n');
        
        // Show all users
        const allUsers = await User.find();
        console.log(`Total users in database: ${allUsers.length}\n`);
        
        if (allUsers.length > 0) {
            console.log('All users:');
            allUsers.forEach((user, index) => {
                console.log(`\n${index + 1}. ${user.name}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Username: ${user.username}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Active: ${user.isActive}`);
            });
        } else {
            console.log('No users found in database!');
        }
        
        console.log('\n========================================');
        console.log('  CREATING ADMIN ACCOUNT');
        console.log('========================================\n');
        
        // Delete old admin if exists
        await User.deleteMany({ email: 'pradeep123@gmail.com' });
        console.log('Cleaned up old accounts...\n');
        
        // Create new admin - MANUALLY hash password
        const plainPassword = 'pradeep123';
        const hashedPassword = await bcrypt.hash(plainPassword, 12);
        
        console.log('Creating admin with:');
        console.log(`  Email: pradeep123@gmail.com`);
        console.log(`  Password: pradeep123`);
        console.log(`  Hashed: ${hashedPassword.substring(0, 30)}...\n`);
        
        // Create admin directly in database to avoid pre-save hook
        const admin = await User.create({
            username: 'pradeep123@gmail.com',
            email: 'pradeep123@gmail.com',
            name: 'Pradeep Admin',
            password: plainPassword, // Let pre-save hook hash it
            role: 'admin',
            isActive: true
        });
        console.log('✅ Admin created!\n');
        
        // Verify
        const check = await User.findOne({ email: 'pradeep123@gmail.com' });
        console.log('Verification:');
        console.log(`  Found: ${check ? 'YES' : 'NO'}`);
        console.log(`  Email: ${check.email}`);
        console.log(`  Role: ${check.role}`);
        console.log(`  Active: ${check.isActive}`);
        
        // Test password
        const match = await bcrypt.compare(plainPassword, check.password);
        console.log(`  Password works: ${match ? '✅ YES' : '❌ NO'}\n`);
        
        if (match) {
            console.log('========================================');
            console.log('  ✅ SUCCESS!');
            console.log('========================================\n');
            console.log('Login with:');
            console.log('  Email: pradeep123@gmail.com');
            console.log('  Password: pradeep123\n');
        } else {
            console.log('❌ Password test failed!\n');
        }
        
    } catch (error) {
        console.error('ERROR:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
    }
}

showAndFixAdmin();
