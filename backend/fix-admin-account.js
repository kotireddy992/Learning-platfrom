const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function fixAdminAccount() {
    try {
        console.log('=== FIXING ADMIN ACCOUNT ===\n');
        
        const adminEmail = 'admin@school.com';
        const adminUsername = 'admin';
        const adminPassword = 'admin123';
        const adminName = 'Administrator';
        
        // Check if admin exists
        let admin = await User.findOne({ 
            $or: [
                { email: adminEmail },
                { username: adminUsername },
                { role: 'admin' }
            ]
        });
        
        if (admin) {
            console.log('Found existing admin account');
            console.log(`  Current Username: ${admin.username}`);
            console.log(`  Current Email: ${admin.email}`);
            console.log(`  Current Name: ${admin.name}`);
            console.log(`  Active: ${admin.isActive}\n`);
            
            // Update admin account
            admin.username = adminUsername;
            admin.email = adminEmail;
            admin.name = adminName;
            admin.role = 'admin';
            admin.isActive = true;
            admin.password = adminPassword; // Will be hashed by pre-save hook
            
            await admin.save();
            console.log('✅ Admin account updated successfully!\n');
        } else {
            console.log('No admin account found. Creating new one...\n');
            
            // Create new admin
            admin = new User({
                username: adminUsername,
                email: adminEmail,
                name: adminName,
                password: adminPassword, // Will be hashed by pre-save hook
                role: 'admin',
                isActive: true
            });
            
            await admin.save();
            console.log('✅ Admin account created successfully!\n');
        }
        
        console.log('=== ADMIN LOGIN CREDENTIALS ===');
        console.log(`Username: ${adminUsername}`);
        console.log(`Password: ${adminPassword}`);
        console.log(`Email: ${adminEmail}\n`);
        
        console.log('You can now login with these credentials!');
        
    } catch (error) {
        console.error('❌ Error fixing admin account:', error);
    } finally {
        mongoose.connection.close();
    }
}

fixAdminAccount();
