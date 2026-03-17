const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/school-performance-system')
    .then(async () => {
        console.log('Connected to MongoDB');
        
        // Find admin user
        let admin = await User.findOne({ email: 'admin@school.edu' });
        
        if (!admin) {
            console.log('Admin not found, creating new admin...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            admin = new User({
                username: 'admin',
                name: 'Admin Administrator',
                email: 'admin@school.edu',
                password: hashedPassword,
                role: 'admin',
                firstName: 'Admin',
                lastName: 'Administrator',
                isActive: true
            });
            await admin.save();
            console.log('✓ Admin created successfully');
        } else {
            console.log('Admin found, resetting password...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            admin.password = hashedPassword;
            admin.isActive = true;
            await admin.save();
            console.log('✓ Admin password reset successfully');
        }
        
        console.log('\n=== Admin Credentials ===');
        console.log('Email: admin@school.edu');
        console.log('Password: admin123');
        console.log('========================\n');
        
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
