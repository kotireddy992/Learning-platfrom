const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function ensureUniqueAdmin() {
    try {
        console.log('\n=== ENSURING UNIQUE ADMIN ACCOUNT ===\n');
        
        // Delete ALL admin accounts
        const deletedAdmins = await User.deleteMany({ role: 'admin' });
        console.log(`Deleted ${deletedAdmins.deletedCount} existing admin account(s)\n`);
        
        // Create ONE unique admin
        const admin = new User({
            username: 'pradeep123@gmail.com',
            email: 'pradeep123@gmail.com',
            name: 'Pradeep Admin',
            password: 'pradeep123',
            role: 'admin',
            isActive: true
        });
        
        await admin.save();
        console.log('✅ Created ONE unique admin account\n');
        
        // Verify only one admin exists
        const adminCount = await User.countDocuments({ role: 'admin' });
        console.log(`Total admin accounts: ${adminCount}\n`);
        
        if (adminCount === 1) {
            console.log('✅ SUCCESS - Only ONE admin account exists\n');
            
            const verify = await User.findOne({ role: 'admin' });
            console.log('Admin Details:');
            console.log(`  Email: ${verify.email}`);
            console.log(`  Username: ${verify.username}`);
            console.log(`  Name: ${verify.name}`);
            console.log(`  Role: ${verify.role}`);
            console.log(`  Active: ${verify.isActive}\n`);
            
            const passwordWorks = await verify.comparePassword('pradeep123');
            console.log(`Password Test: ${passwordWorks ? '✅ WORKS' : '❌ FAILED'}\n`);
            
            console.log('=== LOGIN CREDENTIALS ===');
            console.log('Email: pradeep123@gmail.com');
            console.log('Password: pradeep123\n');
        } else {
            console.log(`⚠️ WARNING: ${adminCount} admin accounts exist!\n`);
        }
        
    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

ensureUniqueAdmin();
