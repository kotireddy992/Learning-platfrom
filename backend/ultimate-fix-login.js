const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function ultimateFix() {
    try {
        console.log('=== ULTIMATE LOGIN FIX ===\n');
        
        const email = 'pradeep123@gmail.com';
        const password = 'pradeep123';
        
        console.log('Target Credentials:');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${password}\n`);
        
        // Step 1: Delete any existing user with this email
        console.log('Step 1: Cleaning up existing accounts...');
        const deleted = await User.deleteMany({ 
            $or: [
                { email: email },
                { username: email }
            ]
        });
        console.log(`  Deleted ${deleted.deletedCount} existing account(s)\n`);
        
        // Step 2: Create fresh admin account
        console.log('Step 2: Creating fresh admin account...');
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const newUser = new User({
            username: email,
            email: email,
            name: 'Pradeep Admin',
            password: hashedPassword,
            role: 'admin',
            isActive: true
        });
        
        await newUser.save();
        console.log('  ✅ Admin account created!\n');
        
        // Step 3: Verify the account
        console.log('Step 3: Verifying account...');
        const verifyUser = await User.findOne({ email: email });
        
        if (!verifyUser) {
            console.log('  ❌ ERROR: Account not found after creation!\n');
            return;
        }
        
        console.log('  Account Details:');
        console.log(`    Email: ${verifyUser.email}`);
        console.log(`    Username: ${verifyUser.username}`);
        console.log(`    Name: ${verifyUser.name}`);
        console.log(`    Role: ${verifyUser.role}`);
        console.log(`    Active: ${verifyUser.isActive}`);
        console.log();
        
        // Step 4: Test password
        console.log('Step 4: Testing password...');
        const passwordMatch = await bcrypt.compare(password, verifyUser.password);
        console.log(`  Password test: ${passwordMatch ? '✅ PASS' : '❌ FAIL'}\n`);
        
        // Step 5: Simulate login
        console.log('Step 5: Simulating login process...');
        
        // Find user (like login does)
        const loginUser = await User.findOne({ 
            $or: [
                { username: email },
                { email: email }
            ],
            isActive: true 
        });
        
        if (!loginUser) {
            console.log('  ❌ Login simulation FAILED: User not found\n');
            return;
        }
        
        console.log('  User found: ✅');
        
        // Test password (like login does)
        const loginPasswordMatch = await loginUser.comparePassword(password);
        console.log(`  Password match: ${loginPasswordMatch ? '✅' : '❌'}\n`);
        
        if (loginPasswordMatch) {
            console.log('=== SUCCESS! ===');
            console.log('Login should work now!\n');
        } else {
            console.log('=== FAILED! ===');
            console.log('Password still not matching. This is unusual.\n');
        }
        
        console.log('=== FINAL CREDENTIALS ===');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log();
        console.log('Go to login page and try these credentials!');
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
    }
}

ultimateFix();
