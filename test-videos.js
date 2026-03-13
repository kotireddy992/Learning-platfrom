const mongoose = require('./backend/node_modules/mongoose');
const SharedVideo = require('./backend/models/SharedVideo');
const Teacher = require('./backend/models/Teacher');
const User = require('./backend/models/User');

async function testVideoSharing() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        // Check if there are any shared videos
        const videos = await SharedVideo.find({})
            .populate('teacherId', 'subject')
            .populate({
                path: 'teacherId',
                populate: {
                    path: 'userId',
                    select: 'name'
                }
            });

        console.log(`Found ${videos.length} shared videos:`);
        
        videos.forEach((video, index) => {
            console.log(`\n${index + 1}. ${video.title}`);
            console.log(`   Type: ${video.type}`);
            console.log(`   Class: ${video.class}`);
            console.log(`   Section: ${video.section}`);
            console.log(`   Teacher: ${video.teacherId?.userId?.name || 'Unknown'}`);
            console.log(`   URL/File: ${video.url || video.filename}`);
            console.log(`   Created: ${video.createdAt}`);
        });

        if (videos.length === 0) {
            console.log('\nNo videos found. Creating a test video...');
            
            // Find a teacher to create test video
            const teacher = await Teacher.findOne().populate('userId');
            
            if (teacher) {
                const testVideo = new SharedVideo({
                    teacherId: teacher._id,
                    title: 'Test YouTube Video',
                    description: 'This is a test video for debugging',
                    type: 'youtube',
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    class: '10',
                    section: 'A'
                });
                
                await testVideo.save();
                console.log('Test video created successfully!');
            } else {
                console.log('No teacher found to create test video');
            }
        }

        console.log('\nTest completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error testing video sharing:', error);
        process.exit(1);
    }
}

testVideoSharing();