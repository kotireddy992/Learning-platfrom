const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function findPradeepAdmin() {
    try {
        console.log('=== SEARCHING FOR PRADEEP ADMIN ACCOUNT ===\n');
        
        const email = 'pradeep123@gmail.com';
        
        // Search for the user
        const user = await User.findOne({ email: email });
        
        if (!user) {
            console.log(`❌ No user found with email: ${email}\n`);
            console.log('Searching all users with "pradeep" in email or name...\n');
            
            const pradeepUsers = await User.find({
                $or: [
                    { email: /pradeep/i },
                    { name: /pradeep/i },
                    { username: /pradeep/i }
                ]
            });
            
            if (pradeepUsers.length > 0) {
                console.log(`Found ${pradeepUsers.length} user(s) with "pradeep":\n`);
                pradeepUsers.forEach(u => {
                    console.log(`  Email: ${u.email}`);
                    console.log(`  Username: ${u.username}`);
                    console.log(`  Name: ${u.name}`);
                    console.log(`  Role: ${u.role}`);
                    console.log(`  Active: ${u.isActive}`);
                    console.log(`  Created: ${u.createdAt}`);
                    console.log();
                });
            } else {
                console.log('No users found with "pradeep" in any field.\n');
            }
            
            console.log('=== ALL USERS IN DATABASE ===\n');
            const allUsers = await User.find();
            allUsers.forEach(u => {
                console.log(`  ${u.email} - ${u.name} - Role: ${u.role} - Active: ${u.isActive}`);
            });
            
        } else {
            console.log('✅ Found user with email: ' + email + '\n');
            console.log(`Details:`);
            console.log(`  Username: ${user.username}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Name: ${user.name}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Active: ${user.isActive}`);
            console.log(`  Created: ${user.createdAt}\n`);
            
            // Test password
            const testPassword = 'pradeep123';
            const isMatch = await bcrypt.compare(testPassword, user.password);
            console.log(`Password Test:`);
            console.log(`  Testing password: ${testPassword}`);
            console.log(`  Result: ${isMatch ? '✅ PASSWORD CORRECT' : '❌ PASSWORD INCORRECT'}\n`);
            
            if (!isMatch) {
                console.log('⚠️  Password does not match!');
                console.log('Run fix-pradeep-admin.js to reset the password.\n');
            }
            
            if (!user.isActive) {
                console.log('⚠️  Account is INACTIVE!');
                console.log('Run fix-pradeep-admin.js to activate the account.\n');
            }
            
            if (user.role !== 'admin') {
                console.log(`⚠️  Role is "${user.role}" not "admin"!`);
                console.log('Run fix-pradeep-admin.js to fix the role.\n');
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

findPradeepAdmin();
