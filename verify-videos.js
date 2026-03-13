const mongoose = require('./backend/node_modules/mongoose');
const SharedVideo = require('./backend/models/SharedVideo');

async function verifyVideoFix() {
    try {
        await mongoose.connect('mongodb://localhost:27017/school_performance');
        console.log('Connected to MongoDB');

        const videos = await SharedVideo.find({});
        
        console.log(`Found ${videos.length} videos:`);
        videos.forEach((video, index) => {
            console.log(`\n${index + 1}. ${video.title}`);
            console.log(`   Type: ${video.type}`);
            console.log(`   Class: ${video.class}`);
            console.log(`   Section: ${video.section}`);
            console.log(`   URL: ${video.url || 'N/A'}`);
            console.log(`   Filename: ${video.filename || 'N/A'}`);
        });

        console.log('\nVerification completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error verifying videos:', error);
        process.exit(1);
    }
}

verifyVideoFix();