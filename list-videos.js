const mongoose = require('./backend/node_modules/mongoose');
const SharedVideo = require('./backend/models/SharedVideo');

async function fixVideosSimple() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        // List all videos without populate
        const allVideos = await SharedVideo.find({});

        console.log(`Found ${allVideos.length} videos:`);
        allVideos.forEach((video, index) => {
            console.log(`\n${index + 1}. ${video.title}`);
            console.log(`   Type: ${video.type}`);
            console.log(`   Class: ${video.class}`);
            console.log(`   Section: ${video.section}`);
            console.log(`   URL: ${video.url || 'N/A'}`);
            console.log(`   Filename: ${video.filename || 'N/A'}`);
        });

        console.log('\nVideo listing completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error listing videos:', error);
        process.exit(1);
    }
}

fixVideosSimple();