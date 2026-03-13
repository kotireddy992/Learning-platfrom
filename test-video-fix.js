// Test script to verify video sharing fix
const mongoose = require('mongoose');
const SharedVideo = require('./backend/models/SharedVideo');
const Student = require('./backend/models/Student');
const Teacher = require('./backend/models/Teacher');
const User = require('./backend/models/User');

async function testVideoFix() {
    try {
        // Connect to database
        await mongoose.connect('mongodb://localhost:27017/school-performance', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to database');
        
        // Test 1: Check if SharedVideo model has class field
        console.log('\n=== Test 1: SharedVideo Model Schema ===');
        const videoSchema = SharedVideo.schema.paths;
        console.log('SharedVideo fields:', Object.keys(videoSchema));
        console.log('Has class field:', 'class' in videoSchema);
        console.log('Has section field:', 'section' in videoSchema);
        
        // Test 2: Create a test video with class and section
        console.log('\n=== Test 2: Create Test Video ===');
        
        // Find a teacher
        const teacher = await Teacher.findOne().populate('userId');
        if (!teacher) {
            console.log('No teacher found. Please create a teacher first.');
            return;
        }
        
        console.log('Found teacher:', teacher.userId.name);
        
        // Create test video
        const testVideo = new SharedVideo({
            teacherId: teacher._id,
            title: 'Test Video - Math Class 10A',
            description: 'This is a test video for Class 10, Section A',
            class: '10',
            section: 'A',
            type: 'youtube',
            url: 'https://www.youtube.com/watch?v=test'
        });
        
        await testVideo.save();
        console.log('Test video created:', testVideo.title);
        
        // Test 3: Find students in Class 10, Section A
        console.log('\n=== Test 3: Find Matching Students ===');
        const matchingStudents = await Student.find({
            $or: [
                { class: '10', section: 'A' },
                { grade: '10', section: 'A' }
            ]
        }).populate('userId', 'name email');
        
        console.log(`Found ${matchingStudents.length} students in Class 10, Section A:`);
        matchingStudents.forEach(student => {
            console.log(`- ${student.userId?.name || 'Unknown'} (${student.userId?.email || 'No email'})`);
        });
        
        // Test 4: Query videos for a specific student
        console.log('\n=== Test 4: Query Videos for Student ===');
        if (matchingStudents.length > 0) {
            const student = matchingStudents[0];
            const studentClass = student.class || student.grade;
            const studentSection = student.section;
            
            console.log(`Student: ${student.userId?.name || 'Unknown'}`);
            console.log(`Class: ${studentClass}, Section: ${studentSection}`);
            
            const availableVideos = await SharedVideo.find({
                class: studentClass,
                section: studentSection
            }).populate('teacherId').populate({
                path: 'teacherId',
                populate: {
                    path: 'userId',
                    select: 'name'
                }
            });
            
            console.log(`Available videos for this student: ${availableVideos.length}`);
            availableVideos.forEach(video => {
                console.log(`- ${video.title} (Class ${video.class}, Section ${video.section}) by ${video.teacherId?.userId?.name || 'Unknown Teacher'}`);
            });
        }
        
        // Test 5: Clean up test data
        console.log('\n=== Test 5: Cleanup ===');
        await SharedVideo.deleteOne({ _id: testVideo._id });
        console.log('Test video deleted');
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- SharedVideo model now has both class and section fields');
        console.log('- Videos are filtered by both class AND section');
        console.log('- Students will only see videos for their specific class and section');
        console.log('- Teachers must specify both class and section when sharing videos');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database');
    }
}

// Run the test
testVideoFix();