const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function fixPradeepAdmin() {
    try {
        console.log('=== FIXING PRADEEP ADMIN ACCOUNT ===\n');
        
        const email = 'pradeep123@gmail.com';
        const password = 'pradeep123';
        
        // Find user
        let user = await User.findOne({ email: email });
        
        if (!user) {
            console.log(`User not found with email: ${email}`);
            console.log('Creating new admin account...\n');
            
            user = new User({
                username: 'pradeep123',
                email: email,
                name: 'Pradeep',
                password: password,
                role: 'admin',
                isActive: true
            });
            
            await user.save();
            console.log('✅ New admin account created!\n');
        } else {
            console.log(`Found existing user: ${user.email}`);
            console.log('Updating account...\n');
            
            user.username = 'pradeep123';
            user.password = password; // Will be hashed by pre-save hook
            user.role = 'admin';
            user.isActive = true;
            
            await user.save();
            console.log('✅ Admin account updated!\n');
        }
        
        console.log('=== LOGIN CREDENTIALS ===');
        console.log(`Email/Username: pradeep123@gmail.com`);
        console.log(`Password: pradeep123`);
        console.log(`Role: admin`);
        console.log(`Status: Active\n`);
        
        console.log('✅ You can now login with these credentials!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

fixPradeepAdmin();
