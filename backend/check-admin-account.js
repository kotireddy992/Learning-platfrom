const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkAdminAccount() {
    try {
        console.log('=== CHECKING ADMIN ACCOUNT ===\n');
        
        // Find all admin users
        const admins = await User.find({ role: 'admin' });
        
        if (admins.length === 0) {
            console.log('❌ NO ADMIN ACCOUNT FOUND!\n');
            console.log('Run fix-admin-account.js to create one.\n');
        } else {
            console.log(`Found ${admins.length} admin account(s):\n`);
            
            for (const admin of admins) {
                console.log(`Admin Account:`);
                console.log(`  Username: ${admin.username}`);
                console.log(`  Email: ${admin.email}`);
                console.log(`  Name: ${admin.name}`);
                console.log(`  Active: ${admin.isActive}`);
                console.log(`  Created: ${admin.createdAt}`);
                
                // Test password
                const testPassword = 'admin123';
                const isMatch = await bcrypt.compare(testPassword, admin.password);
                console.log(`  Password 'admin123' works: ${isMatch ? '✅ YES' : '❌ NO'}`);
                console.log();
            }
        }
        
        console.log('=== RECOMMENDATIONS ===');
        console.log('If login fails, run: node fix-admin-account.js');
        console.log('This will reset admin password to: admin123\n');
        
    } catch (error) {
        console.error('Error checking admin account:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkAdminAccount();
