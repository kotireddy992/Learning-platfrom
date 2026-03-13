const mongoose = require('./backend/node_modules/mongoose');
const SharedVideo = require('./backend/models/SharedVideo');
const Student = require('./backend/models/Student');
const ApprovedStudent = require('./backend/models/ApprovedStudent');
const User = require('./backend/models/User');
const Teacher = require('./backend/models/Teacher');

async function testVideoAccess() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        console.log('\n=== SHARED VIDEOS ===');
        const videos = await SharedVideo.find();
        console.log(`Total shared videos: ${videos.length}`);
        
        videos.forEach(video => {
            console.log(`- Video: ${video.title}`);
            console.log(`  Target: Class ${video.class}, Section ${video.section}`);
            console.log(`  Type: ${video.type}`);
            console.log(`  Created: ${video.createdAt}`);
            console.log('');
        });

        console.log('\n=== STUDENTS BY CLASS ===');
        const students = await Student.find().populate('userId', 'firstName lastName email');
        const approvedStudents = await ApprovedStudent.find();
        
        const classDistribution = {};
        
        students.forEach(s => {
            const key = `${s.class}${s.section}`;
            if (!classDistribution[key]) classDistribution[key] = { regular: [], approved: [] };
            classDistribution[key].regular.push({
                email: s.userId?.email || 'No email',
                name: `${s.userId?.firstName || 'Unknown'} ${s.userId?.lastName || 'Student'}`
            });
        });
        
        approvedStudents.forEach(s => {
            const key = `${s.grade}${s.section}`;
            if (!classDistribution[key]) classDistribution[key] = { regular: [], approved: [] };
            classDistribution[key].approved.push({
                email: s.email,
                name: s.studentName
            });
        });

        Object.keys(classDistribution).sort().forEach(classKey => {
            const data = classDistribution[classKey];
            console.log(`\nClass ${classKey}:`);
            console.log(`  Regular students: ${data.regular.length}`);
            data.regular.forEach(s => console.log(`    - ${s.name} (${s.email})`));
            console.log(`  Approved students: ${data.approved.length}`);
            data.approved.forEach(s => console.log(`    - ${s.name} (${s.email})`));
        });

        console.log('\n=== VIDEO ACCESS TEST ===');
        const videoClasses = [...new Set(videos.map(v => `${v.class}${v.section}`))];
        
        for (const classKey of videoClasses) {
            const classData = classDistribution[classKey];
            if (classData) {
                const totalStudents = classData.regular.length + classData.approved.length;
                const videosForClass = videos.filter(v => `${v.class}${v.section}` === classKey).length;
                console.log(`Class ${classKey}: ${totalStudents} students can access ${videosForClass} videos`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testVideoAccess();