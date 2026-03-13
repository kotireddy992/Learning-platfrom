const mongoose = require('mongoose');
const User = require('./models/User');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');

mongoose.connect('mongodb://localhost:27017/school-performance', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkDatabaseUsers() {
    try {
        console.log('=== DATABASE USER ANALYSIS ===\n');
        
        // Get all users
        const allUsers = await User.find();
        console.log(`Total users in database: ${allUsers.length}`);
        
        if (allUsers.length > 0) {
            console.log('\nUsers by role:');
            const roleCount = {};
            allUsers.forEach(user => {
                roleCount[user.role] = (roleCount[user.role] || 0) + 1;
            });
            
            Object.entries(roleCount).forEach(([role, count]) => {
                console.log(`  ${role}: ${count}`);
            });
            
            console.log('\nAll users:');
            allUsers.forEach(user => {
                console.log(`  - ${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.isActive}`);
            });
        }
        
        // Check teacher profiles
        const teachers = await Teacher.find();
        console.log(`\nTotal teacher profiles: ${teachers.length}`);
        
        // Check student profiles
        const students = await Student.find();
        console.log(`Total student profiles: ${students.length}`);
        
        console.log('\n=== END ANALYSIS ===');
        
    } catch (error) {
        console.error('Error checking database:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkDatabaseUsers();