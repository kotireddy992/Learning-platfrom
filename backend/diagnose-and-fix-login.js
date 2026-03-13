const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function diagnoseAndFix() {
    try {
        console.log('=== DIAGNOSING LOGIN ISSUE ===\n');
        
        const targetEmail = 'pradeep123@gmail.com';
        const targetPassword = 'pradeep123';
        
        // Step 1: Check if user exists
        console.log('Step 1: Searching for user...');
        let user = await User.findOne({ 
            $or: [
                { email: targetEmail },
                { username: targetEmail }
            ]
        });
        
        if (!user) {
            console.log('❌ User NOT found!\n');
            console.log('Creating new admin account...\n');
            
            user = new User({
                username: targetEmail,
                email: targetEmail,
                name: 'Pradeep Admin',
                password: targetPassword,
                role: 'admin',
                isActive: true
            });
            
            await user.save();
            console.log('✅ Admin account created successfully!\n');
            
            // Verify it was created
            user = await User.findOne({ email: targetEmail });
        } else {
            console.log('✅ User found!\n');
        }
        
        // Step 2: Check user details
        console.log('Step 2: User Details:');
        console.log(`  Email: ${user.email}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.isActive}`);
        console.log(`  Password Hash: ${user.password.substring(0, 20)}...`);
        console.log();
        
        // Step 3: Test password
        console.log('Step 3: Testing password...');
        const isPasswordCorrect = await bcrypt.compare(targetPassword, user.password);
        console.log(`  Password "${targetPassword}" matches: ${isPasswordCorrect ? '✅ YES' : '❌ NO'}`);
        console.log();
        
        // Step 4: Check issues
        const issues = [];
        if (!user.isActive) issues.push('Account is INACTIVE');
        if (user.role !== 'admin') issues.push(`Role is "${user.role}" not "admin"`);
        if (!isPasswordCorrect) issues.push('Password does not match');
        
        if (issues.length > 0) {
            console.log('⚠️  Issues found:');
            issues.forEach(issue => console.log(`  - ${issue}`));
            console.log();
            
            console.log('Step 5: Fixing issues...');
            
            // Fix all issues
            user.role = 'admin';
            user.isActive = true;
            user.password = targetPassword; // Will be re-hashed
            user.username = targetEmail;
            user.email = targetEmail;
            
            await user.save();
            console.log('✅ All issues fixed!\n');
            
            // Verify fix
            user = await User.findOne({ email: targetEmail });
            const newPasswordTest = await bcrypt.compare(targetPassword, user.password);
            console.log('Verification after fix:');
            console.log(`  Role: ${user.role}`);
            console.log(`  Active: ${user.isActive}`);
            console.log(`  Password works: ${newPasswordTest ? '✅ YES' : '❌ NO'}`);
            console.log();
        } else {
            console.log('✅ No issues found! Account should work.\n');
        }
        
        // Step 6: Test login simulation
        console.log('Step 6: Simulating login...');
        const loginUser = await User.findOne({ 
            $or: [
                { username: targetEmail },
                { email: targetEmail }
            ],
            isActive: true 
        });
        
        if (!loginUser) {
            console.log('❌ Login would FAIL: User not found or inactive\n');
        } else {
            const loginPasswordMatch = await loginUser.comparePassword(targetPassword);
            if (loginPasswordMatch) {
                console.log('✅ Login would SUCCEED!\n');
            } else {
                console.log('❌ Login would FAIL: Password incorrect\n');
            }
        }
        
        console.log('=== FINAL CREDENTIALS ===');
        console.log(`Email/Username: ${targetEmail}`);
        console.log(`Password: ${targetPassword}`);
        console.log(`Role: admin`);
        console.log();
        console.log('Try logging in now!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        mongoose.connection.close();
    }
}

diagnoseAndFix();
